from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import math
import json

from database import engine, SessionLocal
from models import Base, UserSession, TimelineItem, Reflection, Message
from tasks import TASKS
from orchestrator import handle_turn
from llm.task_analyzer import analyze_task, generate_task_description, generate_task_insights, choose_similar_task
from llm.coach_agent import generate_task_feedback
from llm.manager_agent import generate_scenario_example
from llm.performance_analyzer import get_performance_history, calculate_difficulty_adjustment, adjust_difficulty_string, create_difficulty_context
from llm.prompt_generator import (
    generate_analysis_task, 
    generate_interpretation_task,
    generate_planning_task,
    generate_technique_task
)
from llm.evaluation_agent import (
    evaluate_analysis,
    evaluate_interpretation,
    evaluate_plan,
    evaluate_technique
)

app = FastAPI(title="SkillBuilder – Negotiation")

# Task Feedback 
@app.get("/task-feedback/{session_id}")
def task_feedback(session_id: str):
    db = SessionLocal()
    # Get all messages for the session
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.timestamp.asc())
        .all()
    )
    # Get current active task for the session
    current_task = (
        db.query(TimelineItem)
        .filter(TimelineItem.session_id == session_id, TimelineItem.status == "in_progress")
        .first()
    )
    chat_history = [
        {
            "sender": msg.sender,
            "text": msg.text,
        }
        for msg in messages
        if msg.sender in ["user", "manager"]
    ]
    # Use task title if available
    task_title = current_task.title if current_task else ""
    result = generate_task_feedback(chat_history, task_title)
    # Mark current task as completed (only if it was started by user)
    if current_task:
        # Only mark as completed if user actually started it
        if current_task.has_started == 1:
            current_task.status = "completed"
            # Save the grade to the database
            if result.get("grade") is not None:
                current_task.grade = result["grade"]
                current_task.feedback = result.get("feedback", "")
                print(f"[task_feedback] Marking task '{current_task.title}' as completed with grade {result['grade']}")
            else:
                print(f"[task_feedback] Marking task '{current_task.title}' as completed (no grade)")
        else:
            # Task was never started, don't mark as complete
            print(f"[task_feedback] Task '{current_task.title}' was never started, not marking as completed")
        # Set next planned task to in_progress
        next_task = db.query(TimelineItem).filter(TimelineItem.session_id == session_id, TimelineItem.status == "planned").first()
        if next_task:
            next_task.status = "in_progress"
        db.commit()
    db.close()
    return {"feedback": result["feedback"], "grade": result["grade"]}


# Scenario Example 
@app.get("/scenario-example/{session_id}")
def scenario_example(session_id: str):
    db = SessionLocal()
    current_task = (
        db.query(TimelineItem)
        .filter(
            TimelineItem.session_id == session_id,
            TimelineItem.status == "in_progress",
        )
        .first()
    )
    
    if not current_task:
        db.close()
        return {"error": "No active task"}
    
    # Only generate scenario for simulation tasks
    if current_task.task_type and current_task.task_type != "simulation":
        db.close()
        return {"scenario": ""}
    
    try:
        # First, check if scenario already exists in database (stored by orchestrator)
        existing_scenario = (
            db.query(Message)
            .filter(
                Message.session_id == session_id,
                Message.task_title == current_task.title,
                Message.sender == "system"
            )
            .first()
        )
        
        if existing_scenario:
            print(f"[scenario_example] Using stored scenario for task '{current_task.title}'")
            db.close()
            return {"scenario": existing_scenario.text}
        
        # If no stored scenario, generate and store it
        print(f"[scenario_example] Generating new scenario for task '{current_task.title}'")
        scenario = generate_scenario_example(current_task.title, current_task.coach_summary)
        
        # Store it for future use
        scenario_msg = Message(
            session_id=session_id,
            task_title=current_task.title,
            sender="system",
            text=scenario,
        )
        db.add(scenario_msg)
        db.commit()
        print(f"[scenario_example] Scenario stored in database")
        
        db.close()
        return {"scenario": scenario}
    except Exception as e:
        print(f"[scenario_example] LLM error: {e}")
        import traceback
        traceback.print_exc()
        db.close()
        
        # Fallback scenario if LLM fails
        fallback_scenarios = {
            "Light Negotiation Simulation": "You are Alex, a friend. Your counterpart is you, trying to decide on a movie. Alex prefers 'The Matrix' because of its groundbreaking visuals and philosophical depth. Alex says: 'Hey, I really want to watch The Matrix tonight - it's such an amazing film! What do you think?'",
            "High-Stakes Salary Negotiation": "You are Sarah, your manager. You're in a salary review meeting. Sarah believes the budget is tight but wants to retain good employees. Sarah says: 'I appreciate your request for a raise. Your performance has been solid. However, we're facing some budget constraints this quarter. What specifically would make you feel valued?'",
            "Medium-Stakes Conversation: Chronic Lateness": "You are Jordan, your supervisor. You need to address chronic lateness. Jordan says: 'I've noticed you've been arriving late pretty consistently over the past few weeks. I want to understand what's going on and how we can work together to fix this.'"
        }
        
        fallback = fallback_scenarios.get(current_task.title, "")
        if fallback:
            # Store fallback scenario for future use
            scenario_msg = Message(
                session_id=session_id,
                task_title=current_task.title,
                sender="system",
                text=fallback,
            )
            db.add(scenario_msg)
            db.commit()
            print(f"[scenario_example] Using fallback scenario for '{current_task.title}'")
        else:
            print(f"[scenario_example] No fallback scenario available for '{current_task.title}'")
        
        return {"scenario": fallback}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Get task content based on task type
@app.get("/task-content/{session_id}")
def get_task_content(session_id: str, task_title: str = Query(None)):
    """
    Get the content for the current active task or a specific task.
    For simulation tasks: returns scenario.
    For analysis tasks: returns transcript and question.
    For interpretation tasks: returns statement and instruction.
    For planning tasks: returns scenario, constraints, and instruction.
    For technique tasks: returns context, other person's statement, and technique instruction.
    
    If task_title is provided, returns content for that specific task.
    Otherwise, returns content for the current in_progress task.
    """
    db = SessionLocal()
    print(f"[task-content] Called with session_id={session_id}, task_title={task_title}")
    
    # If task_title is provided, find that specific task
    if task_title:
        print(f"[task-content] Searching for task with title: {task_title}")
        current_task = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id, TimelineItem.title == task_title)
            .first()
        )
        if not current_task:
            print(f"[task-content] Task not found with title: {task_title}")
    else:
        # Otherwise, find the in_progress task
        print(f"[task-content] Searching for in_progress task")
        current_task = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id, TimelineItem.status == "in_progress")
            .first()
        )
    
    if not current_task:
        print(f"[task-content] No task found")
        db.close()
        return {"error": "No active task", "task_type": None, "task_content": {}}
    
    print(f"[task-content] Found task: {current_task.title}, type: {current_task.task_type}")
    
    # If task_content is already generated, return it
    if current_task.task_content:
        try:
            print(f"[task-content] Returning stored task_content for {current_task.title}")
            db.close()
            # Return as string (already JSON in database)
            return {"task_type": current_task.task_type, "task_content": current_task.task_content}
        except Exception as e:
            print(f"[get_task_content] Error parsing stored content: {e}")
            pass
    
    # Generate content based on task type
    task_type = current_task.task_type or "simulation"
    print(f"[get_task_content] Generating content for task_type: {task_type}, title: {current_task.title}")
    content = {}
    
    # Get performance context for adaptive difficulty
    performance_context = create_difficulty_context(session_id, db)
    if performance_context:
        print(f"[get_task_content] Using performance context for task generation")
    
    try:
        if task_type == "analysis":
            content = generate_analysis_task(current_task.title, current_task.coach_summary, performance_context)
            print(f"[get_task_content] Analysis content generated: {bool(content)}")
        elif task_type == "interpretation":
            content = generate_interpretation_task(current_task.title, current_task.coach_summary, performance_context)
            print(f"[get_task_content] Interpretation content generated: {bool(content)}")
        elif task_type == "planning":
            content = generate_planning_task(current_task.title, current_task.coach_summary, performance_context)
            print(f"[get_task_content] Planning content generated: {bool(content)}")
        elif task_type == "technique":
            content = generate_technique_task(current_task.title, current_task.coach_summary, "", performance_context)
            print(f"[get_task_content] Technique content generated: {bool(content)}")
        elif task_type == "simulation":
            # For simulation, just return empty content
            content = {}
    except Exception as e:
        print(f"[get_task_content] Error generating {task_type} content: {e}")
        import traceback
        traceback.print_exc()
        content = {}
    
    # Save generated content to database
    if content:
        try:
            current_task.task_content = json.dumps(content)
            db.commit()
            print(f"[get_task_content] Content saved to database")
        except Exception as e:
            print(f"[get_task_content] Error saving content: {e}")
            db.rollback()
    
    db.close()
    # Return content as JSON string
    return {"task_type": task_type, "task_content": json.dumps(content)}


# Evaluate task response
class TaskResponseRequest(BaseModel):
    session_id: str
    task_title: str
    response: str


class AnalysisResponseRequest(TaskResponseRequest):
    question: str = ""


class InterpretationResponseRequest(TaskResponseRequest):
    position: str = ""


class PlanningResponseRequest(TaskResponseRequest):
    scenario: str = ""
    constraints: str = ""


class TechniqueResponseRequest(TaskResponseRequest):
    technique_name: str = ""
    other_person_statement: str = ""
    instruction: str = ""


@app.post("/evaluate-analysis")
def evaluate_analysis_response(req: AnalysisResponseRequest):
    """Evaluate an analysis task response."""
    try:
        result = evaluate_analysis(req.question, req.response, req.task_title)
        
        # Convert correctness level to grade (backend-controlled)
        correctness_level = result.get("correctness_level", "minimal").lower()
        grade_map = {
            "excellent": 5,
            "good": 4,
            "acceptable": 3,
            "weak": 2,
            "minimal": 1
        }
        grade = grade_map.get(correctness_level, 1)
        
        return {
            "correctness_level": correctness_level,
            "feedback": result.get("feedback", ""),
            "grade": grade,
            "task_title": req.task_title
        }
    except Exception as e:
        print(f"[evaluate-analysis] Error: {e}")
        return {"error": str(e)}


@app.post("/evaluate-interpretation")
def evaluate_interpretation_response(req: InterpretationResponseRequest):
    """Evaluate an interpretation task response."""
    try:
        result = evaluate_interpretation(req.position, req.response, req.task_title)
        
        # Convert insight level to grade (backend-controlled)
        insight_level = result.get("insight_level", "minimal").lower()
        grade_map = {
            "excellent": 5,
            "good": 4,
            "acceptable": 3,
            "weak": 2,
            "minimal": 1
        }
        grade = grade_map.get(insight_level, 1)
        
        # Build feedback text
        feedback_parts = []
        coach_message = result.get("coach_message", "")
        feedback = result.get("feedback", "")
        suggestion = result.get("suggestion", "")
        
        if coach_message:
            feedback_parts.append(f"Coach: {coach_message}")
        if feedback:
            feedback_parts.append(f"Feedback: {feedback}")
        if suggestion:
            feedback_parts.append(f"Suggestion: {suggestion}")
        
        feedback_text = "\n\n".join(feedback_parts) if feedback_parts else "Interpretation evaluation complete."
        
        return {
            "insight_level": insight_level,
            "grade": grade,
            "feedback": feedback_text,
            "coach_message": coach_message,
            "suggestion": suggestion,
            "task_title": req.task_title
        }
    except Exception as e:
        print(f"[evaluate-interpretation] Error: {e}")
        return {"error": str(e)}


@app.post("/evaluate-plan")
def evaluate_plan_response(req: PlanningResponseRequest):
    """Evaluate a planning task response."""
    try:
        scenario_text = f"{req.scenario}\n\nConstraints: {req.constraints}" if req.constraints else req.scenario
        result = evaluate_plan(scenario_text, req.response, req.task_title)
        
        # Convert plan quality to grade (backend-controlled)
        plan_quality = result.get("plan_quality", "minimal").lower()
        grade_map = {
            "excellent": 5,
            "good": 4,
            "acceptable": 3,
            "weak": 2,
            "minimal": 1
        }
        grade = grade_map.get(plan_quality, 1)
        
        # Build feedback text
        feedback_parts = []
        coach_message = result.get("coach_message", "")
        strengths = result.get("strengths", "")
        gaps = result.get("gaps", "")
        suggested_refinement = result.get("suggested_refinement", "")
        
        if coach_message:
            feedback_parts.append(f"Coach: {coach_message}")
        if strengths:
            feedback_parts.append(f"Strengths: {strengths}")
        if gaps:
            feedback_parts.append(f"Areas for Improvement: {gaps}")
        if suggested_refinement:
            feedback_parts.append(f"Suggested Refinement: {suggested_refinement}")
        
        feedback_text = "\n\n".join(feedback_parts) if feedback_parts else "Plan evaluation complete."
        
        return {
            "feedback": feedback_text,
            "grade": grade,
            "plan_quality": plan_quality,
            "coach_message": coach_message,
            "strengths": strengths,
            "gaps": gaps,
            "suggested_refinement": suggested_refinement,
            "task_title": req.task_title
        }
    except Exception as e:
        print(f"[evaluate-plan] Error: {e}")
        return {"error": str(e)}


@app.post("/evaluate-technique")
def evaluate_technique_response(req: TechniqueResponseRequest):
    """Evaluate a technique practice response."""
    try:
        result = evaluate_technique(
            req.technique_name,
            req.instruction,
            req.response,
            req.other_person_statement,
            req.task_title
        )
        
        # Convert technique quality to grade (backend-controlled)
        technique_quality = result.get("technique_quality", "minimal").lower()
        grade_map = {
            "excellent": 5,
            "good": 4,
            "acceptable": 3,
            "weak": 2,
            "minimal": 1
        }
        grade = grade_map.get(technique_quality, 1)
        
        # Build feedback text
        feedback_parts = []
        coach_message = result.get("coach_message", "")
        analysis = result.get("analysis", "")
        example = result.get("example", "")
        
        if coach_message:
            feedback_parts.append(f"Coach: {coach_message}")
        if analysis:
            feedback_parts.append(f"Analysis: {analysis}")
        if example:
            feedback_parts.append(f"Example: {example}")
        
        feedback_text = "\n\n".join(feedback_parts) if feedback_parts else "Technique evaluation complete."
        
        return {
            "technique_quality": technique_quality,
            "grade": grade,
            "feedback": feedback_text,
            "coach_message": coach_message,
            "analysis": analysis,
            "example": example,
            "task_title": req.task_title
        }
    except Exception as e:
        print(f"[evaluate-technique] Error: {e}")
        return {"error": str(e)}


@app.post("/save-task-grade/{session_id}/{task_id}")
def save_task_grade(session_id: str, task_id: int, grade: int = 0, feedback: str = ""):
    """Save the grade and feedback for a completed task."""
    db = SessionLocal()
    try:
        task = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id, TimelineItem.id == task_id)
            .first()
        )
        if task:
            task.grade = max(0, min(5, grade))  # Clamp grade to 0-5
            if feedback:
                task.feedback = feedback
            db.commit()
            print(f"[save-task-grade] Saved grade {grade} and feedback for task {task_id}")
            return {"success": True, "grade": task.grade}
        else:
            return {"success": False, "error": "Task not found"}
    except Exception as e:
        db.rollback()
        print(f"[save-task-grade] Error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()


# Session 

@app.post("/session")
def create_session():
    db = SessionLocal()
    session_id = str(uuid.uuid4())

    session = UserSession(id=session_id)
    db.add(session)

    for i, task in enumerate(TASKS):
        status = "in_progress" if i == 0 else "planned"

        # Use task definitions directly 
        difficulty = task.get("difficulty", "●●")
        skill_focus = task.get("skill_focus", "Negotiation Skills")
        estimated_time = task.get("estimated_time", "~10 min")
        coach_summary = task.get("coach_summary", "")
        task_type = task.get("type", "simulation")

        db.add(
            TimelineItem(
                session_id=session_id,
                title=task["title"],
                coach_summary=coach_summary,
                status=status,
                difficulty=difficulty,
                skill_focus=skill_focus,
                estimated_time=estimated_time,
                task_type=task_type,
            )
        )

    db.commit()
    db.close()

    return {"session_id": session_id}


@app.post("/complete-task/{session_id}/{task_id}")
def complete_task(session_id: str, task_id: int):
    """Mark a task as completed and start the next one."""
    db = SessionLocal()
    
    try:
        # Log state BEFORE
        all_before = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id)
            .order_by(TimelineItem.id)
            .all()
        )
        print(f"\n[complete_task] STATE BEFORE completing task {task_id}:")
        for t in all_before:
            print(f"  Task {t.id}: {t.title[:30]:30} | Status: {t.status}")
        
        # Mark current task as completed only if it was started
        current_task = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id, TimelineItem.id == task_id)
            .first()
        )
        if current_task:
            # Only mark as completed if user actually started it
            if current_task.has_started == 1:
                current_task.status = "completed"
                print(f"[complete_task] Marked task {task_id} ('{current_task.title}') as completed (was started)")
            else:
                # If somehow we're completing a task that was never started, this is an error case
                # But mark it as completed anyway since they're finishing it now
                current_task.status = "completed"
                current_task.has_started = 1
                print(f"[complete_task] Task {task_id} was never marked as started, but completing it now")
        
        # Find the first PLANNED task (first unstarted task)
        # Query fresh to get updated status
        next_task = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id, TimelineItem.status == "planned")
            .order_by(TimelineItem.id)
            .first()
        )
        
        if next_task:
            next_task.status = "in_progress"
            print(f"[complete_task] Marked next task {next_task.id} ('{next_task.title}') as in_progress")
        
        db.commit()
        print(f"[complete_task] Database committed successfully")
        
        # Log state AFTER
        all_after = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id)
            .order_by(TimelineItem.id)
            .all()
        )
        print(f"[complete_task] STATE AFTER completing task {task_id}:")
        for t in all_after:
            print(f"  Task {t.id}: {t.title[:30]:30} | Status: {t.status}")
        
        return {
            "success": True,
            "completed_task": current_task.title if current_task else None,
            "next_task": next_task.title if next_task else None
        }
    except Exception as e:
        db.rollback()
        print(f"[complete_task] Error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()


@app.post("/start-task/{session_id}/{task_id}")
def start_task(session_id: str, task_id: int):
    """Mark a task as started (user clicked 'Start Practice')."""
    db = SessionLocal()
    
    try:
        # Get the task
        task = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id, TimelineItem.id == task_id)
            .first()
        )
        
        if not task:
            return {"success": False, "error": "Task not found"}
        
        # Mark that user has started/engaged with this task
        task.has_started = 1
        db.commit()
        print(f"[start_task] Marked task {task_id} ('{task.title}') as has_started=1")
        
        return {"success": True, "message": f"Task '{task.title}' started"}
    except Exception as e:
        db.rollback()
        print(f"[start_task] Error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()


# Timeline 

@app.get("/timeline/{session_id}")
def get_timeline(session_id: str):
    db = SessionLocal()
    items = (
        db.query(TimelineItem)
        .filter(TimelineItem.session_id == session_id)
        .all()
    )
    
    # Just return items as-is, no LLM calls needed
    db.close()
    return items


# Metadata regeneration
@app.post("/regenerate-metadata")
def regenerate_metadata(session_id: str = None):
    """Regenerate difficulty, estimated_time, skill_focus and coach_summary using the LLM.

    If session_id is provided, only that session is updated; otherwise all timeline items are processed.
    This is intended as a dev helper for local use.
    """
    db = SessionLocal()
    try:
        if session_id:
            items = db.query(TimelineItem).filter(TimelineItem.session_id == session_id).all()
        else:
            items = db.query(TimelineItem).all()

        updated = []
        for item in items:
            try:
                print(f"[regenerate] Processing item {item.id}: {item.title}")
                metadata = analyze_task(item.title, "")
                item.difficulty = metadata.get("difficulty", item.difficulty or "●●")
                item.estimated_time = metadata.get("estimated_time", item.estimated_time or "15 mins")
                item.skill_focus = metadata.get("skill_focus", item.skill_focus or "Negotiation Skills")

                # Regenerate a concise coach summary/description
                try:
                    desc = generate_task_description(item.title, item.difficulty)
                    if desc and desc.strip():
                        item.coach_summary = desc.strip()
                        print(f"[regenerate] New coach_summary for {item.id}: {item.coach_summary}")
                except Exception as e:
                    print(f"[regenerate] generate_task_description failed for '{item.title}': {e}")

                db.commit()
                updated.append(item.id)
            except Exception as e:
                print(f"[regenerate] Failed for {item.title}: {e}")
                db.rollback()

        return {"updated": len(updated), "ids": updated}
    finally:
        db.close()


# Updated MessageRequest to include task_title
class MessageRequest(BaseModel):
    session_id: str
    task_title: str
    text: str


@app.post("/message")
def message(req: MessageRequest):
    return handle_turn(req.session_id, req.task_title, req.text)



# Fetch all messages for a session and task
@app.get("/messages/{session_id}/{task_title}")
def get_messages(session_id: str, task_title: str):
    """Fetch all messages for a session and a specific task, excluding private coach tips."""
    db = SessionLocal()
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.task_title == task_title)
        .order_by(Message.timestamp.asc())
        .all()
    )
    db.close()
    return [
        {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat(),
        }
        for msg in messages
    ]


# Clear conversation messages for a task (when user clicks "Try Again")
@app.post("/reset-task-conversation/{session_id}/{task_title}")
def reset_task_conversation(session_id: str, task_title: str):
    """Clear conversation messages for a task to start fresh, but keep the scenario."""
    db = SessionLocal()
    
    # Delete only conversation messages (user and manager), NOT the scenario (system)
    db.query(Message).filter(
        Message.session_id == session_id,
        Message.task_title == task_title,
        Message.sender.in_(["user", "manager"])  # Keep system/scenario message
    ).delete()
    
    db.commit()
    db.close()
    
    return {"success": True, "message": "Conversation cleared, ready for new attempt"}


# Reflection 

class ReflectionRequest(BaseModel):
    session_id: str
    difficulty: int
    confidence: int
    comment: str


@app.post("/reflect")
def reflect(req: ReflectionRequest):
    db = SessionLocal()

    current_task = (
        db.query(TimelineItem)
        .filter(
            TimelineItem.session_id == req.session_id,
            TimelineItem.status == "in_progress",
        )
        .first()
    )

    if not current_task:
        db.close()
        return {"error": "No active task"}

    reflection = Reflection(
        session_id=req.session_id,
        task_title=current_task.title,
        difficulty=req.difficulty,
        confidence=req.confidence,
        comment=req.comment,
    )
    db.add(reflection)

    # Only mark as completed if user actually started it
    if current_task.has_started == 1:
        current_task.status = "completed"
        print(f"[reflect] Marking task '{current_task.title}' as completed")
    else:
        # Task was never started, don't mark as complete
        print(f"[reflect] Task '{current_task.title}' was never started, not marking as completed")

    next_task = (
        db.query(TimelineItem)
        .filter(
            TimelineItem.session_id == req.session_id,
            TimelineItem.status == "planned",
        )
        .first()
    )

    if next_task:
        next_task.status = "in_progress"

    db.commit()
    db.close()

    return {
        "completed_task": current_task.title,
        "next_task": next_task.title if next_task else None,
    }


# Task Generation 

@app.get("/task-description/{task_title}")
def get_task_description(task_title: str, difficulty: str = "●●"):
    """Generate an engaging description for a task."""
    try:
        description = generate_task_description(task_title, difficulty)
        return {"description": description}
    except Exception as e:
        return {"description": "Practice this negotiation skill to improve your abilities."}


@app.get("/task-insights/{task_title}")
def get_task_insights(task_title: str, task_description: str = ""):
    """Generate insights about why this task is important."""
    try:
        insights = generate_task_insights(task_title, task_description)
        if not insights or not insights.strip():
            raise ValueError("Empty insights from LLM")
        return {"insights": insights}
    except Exception as e:
        print(f"[task-insights] Error generating insights for '{task_title}': {e}")
        # Attempt to return the coach_summary from TASKS if available
        for t in TASKS:
            if t.get("title") == task_title:
                fallback = t.get("coach_summary", "Practice this negotiation skill to improve your abilities.")
                return {"insights": fallback}
        return {"insights": "Practice this negotiation skill to improve your abilities."}


@app.get("/program-length/{session_id}")
def get_program_length(session_id: str):
    """Estimate total days to reach the goal and return current day position."""
    db = SessionLocal()
    items = (
        db.query(TimelineItem)
        .filter(TimelineItem.session_id == session_id)
        .all()
    )

    titles = [t.title for t in items]
    try:
        res = estimate_program_length(titles)
        days = int(res.get("days", max(1, len(titles))))
        rationale = res.get("rationale", "")
    except Exception as e:
        print(f"[program-length] LLM failed: {e}")
        days = max(1, len(titles))
        rationale = ""

    completed = len([t for t in items if t.status == "completed"])
    total = len(items) or 1
    # Map completed ratio to current day (1..days)
    current_day = min(days, max(1, math.floor((completed / total) * days) + 1))

    db.close()
    return {"days": days, "rationale": rationale, "current_day": current_day}


@app.post("/available-tasks/{session_id}")
def get_available_tasks(session_id: str):
    """Get all available tasks (not in progress) for the session."""
    db = SessionLocal()
    try:
        tasks = (
            db.query(TimelineItem)
            .filter(
                TimelineItem.session_id == session_id,
                TimelineItem.status != "in_progress"
            )
            .all()
        )
        
        result = [
            {
                "id": t.id,
                "title": t.title,
                "difficulty": t.difficulty,
                "coach_summary": t.coach_summary,
                "status": t.status,
                "task_type": t.task_type,
            }
            for t in tasks
        ]
        
        db.close()
        return {"tasks": result}
    except Exception as e:
        db.close()
        return {"error": str(e)}

@app.post("/select-task/{session_id}/{task_id}")
def select_task(session_id: str, task_id: int):
    """Select a specific task to work on."""
    db = SessionLocal()
    try:
        print(f"\n[select-task] Session: {session_id}, Task ID: {task_id}")
        
        # Log state BEFORE
        all_before = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id)
            .order_by(TimelineItem.id)
            .all()
        )
        print(f"[select-task] STATE BEFORE:")
        for t in all_before:
            print(f"  Task {t.id}: {t.title[:30]:30} | Status: {t.status}")
        
        # Get current in_progress task
        current_task = (
            db.query(TimelineItem)
            .filter(
                TimelineItem.session_id == session_id,
                TimelineItem.status == "in_progress",
            )
            .first()
        )
        
        # Mark current as planned (if exists)
        if current_task:
            current_task.status = "planned"
            print(f"[select-task] Marked task '{current_task.title}' as planned")
        
        # Mark selected task as in_progress
        new_task = (
            db.query(TimelineItem)
            .filter(
                TimelineItem.session_id == session_id,
                TimelineItem.id == task_id
            )
            .first()
        )
        
        if not new_task:
            db.close()
            return {"error": "Task not found"}
        
        new_task.status = "in_progress"
        db.commit()
        print(f"[select-task] Set task '{new_task.title}' to in_progress")
        
        # Log state AFTER
        all_after = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == session_id)
            .order_by(TimelineItem.id)
            .all()
        )
        print(f"[select-task] STATE AFTER:")
        for t in all_after:
            print(f"  Task {t.id}: {t.title[:30]:30} | Status: {t.status}")
        
        return {
            "success": True,
            "old_task": current_task.title if current_task else None,
            "new_task": new_task.title,
        }
    except Exception as e:
        db.rollback()
        print(f"[select-task] ERROR: {e}")
        return {"error": str(e)}
    finally:
        db.close()

@app.post("/choose-another")
def choose_another_task(req: MessageRequest):
    """Choose another task with similar difficulty."""
    db = SessionLocal()
    try:
        print(f"[choose-another] Session ID: {req.session_id}")
        
        # Get current task
        current_task = (
            db.query(TimelineItem)
            .filter(
                TimelineItem.session_id == req.session_id,
                TimelineItem.status == "in_progress",
            )
            .first()
        )
        
        if not current_task:
            print("[choose-another] No current task found")
            return {"error": "No active task"}
        
        print(f"[choose-another] Current task: {current_task.title} (ID: {current_task.id}, difficulty: {current_task.difficulty})")
        
        current_difficulty = current_task.difficulty
        current_task_id = current_task.id
        
        # Get all tasks for this session
        all_tasks = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == req.session_id)
            .all()
        )
        
        print(f"[choose-another] Found {len(all_tasks)} total tasks")
        
        # Convert to dicts for the choose function
        tasks_list = [
            {
                "id": t.id,
                "title": t.title,
                "difficulty": t.difficulty,
                "coach_summary": t.coach_summary,
                "status": t.status,
            }
            for t in all_tasks
        ]
        
        # Choose a similar difficulty task (exclude current)
        print(f"[choose-another] Calling choose_similar_task with ID {current_task_id}, difficulty {current_difficulty}")
        chosen = choose_similar_task(current_task_id, current_difficulty, tasks_list)
        print(f"[choose-another] Chosen task: {chosen['title']} (ID: {chosen['id']})")
        
        # Update statuses
        # Only mark as completed if user actually started/engaged with it
        if current_task.has_started == 1:
            current_task.status = "completed"
            print(f"[choose-another] User started this task, marking as 'completed'")
        else:
            current_task.status = "planned"
            print(f"[choose-another] User never started this task, keeping as 'planned' (not counting as done)")
        
        new_task = (
            db.query(TimelineItem)
            .filter(TimelineItem.id == chosen["id"])
            .first()
        )
        
        if new_task:
            new_task.status = "in_progress"
            print(f"[choose-another] Set new task to 'in_progress'")
        
        db.commit()
        print(f"[choose-another] Database committed")
        
        # Log the state after update
        updated_tasks = (
            db.query(TimelineItem)
            .filter(TimelineItem.session_id == req.session_id)
            .all()
        )
        print(f"[choose-another] STATE AFTER UPDATE:")
        for t in sorted(updated_tasks, key=lambda x: x.id):
            print(f"  Task {t.id}: {t.title[:30]:30} | Status: {t.status}")
        
        return {
            "old_task": current_task.title,
            "new_task": new_task.title if new_task else None,
        }
    except Exception as e:
        import traceback
        print(f"[choose-another] ERROR: {e}")
        print(traceback.format_exc())
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()
