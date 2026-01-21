from llm.manager_agent import manager_reply, generate_scenario_example
from llm.coach_agent import coach_feedback
from database import SessionLocal
from models import Message, TimelineItem
import json

def handle_turn(session_id: str, task_title: str, user_message: str) -> dict:
    """
    Orchestrates a single user turn:
    1. Fetches active task context
    2. Calls manager and coach agents
    3. Persists all messages
    4. Returns structured response
    """
    db = SessionLocal()
    

    # Fetch the task by session and title
    current_task = (
        db.query(TimelineItem)
        .filter(
            TimelineItem.session_id == session_id,
            TimelineItem.title == task_title,
        )
        .first()
    )
    task_context = {
        "title": current_task.title if current_task else task_title,
        "objective": current_task.coach_summary if current_task else "",
    }
    
    # Check if this is the first message for this task
    # If so, generate and store the scenario as a system message
    all_messages_check = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.task_title == task_title)
        .count()
    )
    
    if all_messages_check == 0 and current_task:
        # Generate scenario and store it as the first message
        try:
            scenario = generate_scenario_example(current_task.title, current_task.coach_summary)
            print(f"\n[orchestrator] Generated scenario for task '{current_task.title}':\n{scenario}\n")
            scenario_msg = Message(
                session_id=session_id,
                task_title=task_title,
                sender="system",  # Mark it as system message so it's not a real chat message
                text=scenario,
            )
            db.add(scenario_msg)
            db.flush()
            print(f"[orchestrator] Scenario stored in database")
        except Exception as e:
            print(f"[orchestrator] Error generating scenario: {e}")
    
    # Fetch recent conversation (last 10 messages for context)
    recent_messages = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.task_title == task_title)
        .order_by(Message.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_messages.reverse()  # chronological order
    
    # Also fetch the first message (scenario) if it's not in recent_messages
    # This ensures we have the "Your counterpart is [Name]" line for coach extraction
    all_messages = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.task_title == task_title)
        .order_by(Message.timestamp.asc())
        .all()
    )
    
    # Combine first message + recent messages (avoiding duplicates)
    messages_to_use = []
    if all_messages:
        messages_to_use.append(all_messages[0])  # Always include first message (scenario)
        message_ids = {all_messages[0].id}
        # Add recent messages that aren't already included
        for msg in recent_messages:
            if msg.id not in message_ids:
                messages_to_use.append(msg)
                message_ids.add(msg.id)
    
    # Build TWO conversation histories:
    # 1. For manager agent: exclude coach tips AND system message (manager shouldn't see the scenario instructions meant for the user)
    # 2. For coach agent: include everything (coach needs full context including scenario)
    
    manager_conversation_history = "\n".join(
        [f"{msg.sender.upper()}: {msg.text}" for msg in messages_to_use if msg.sender not in ["coach", "system"]]
    )
    
    coach_conversation_history = "\n".join(
        [f"{msg.sender.upper()}: {msg.text}" for msg in messages_to_use]
    )
    
    print(f"\n[orchestrator] Messages for this task (total {len(messages_to_use)}):")
    for i, msg in enumerate(messages_to_use):
        print(f"  [{i}] {msg.sender}: {msg.text[:80]}...")
    print(f"\n[orchestrator] Coach conversation history:\n{coach_conversation_history}\n")
    
    # Store user message
    user_msg_record = Message(
        session_id=session_id,
        task_title=task_title,
        sender="user",
        text=user_message,
    )
    db.add(user_msg_record)
    db.flush()  # Get the ID
    
    # Call manager agent with task context (without coach tips!)
    manager_response = manager_reply(
        user_message=user_message,
        task_context=task_context,
        conversation_history=manager_conversation_history,
    )
    
    # Store manager message
    manager_msg_record = Message(
        session_id=session_id,
        task_title=task_title,
        sender="manager",
        text=manager_response,
    )
    db.add(manager_msg_record)
    db.flush()
    
    # Call coach agent (with full conversation history including scenario for counterpart extraction)
    coach_tips = coach_feedback(
        user_message=user_message,
        manager_reply=manager_response,
        task_context=task_context,
        conversation_history=coach_conversation_history,
    )
    
    # Store coach suggestions as a single "coach" message (private)
    coach_tips_text = "\n".join(coach_tips) if isinstance(coach_tips, list) else str(coach_tips)
    coach_msg_record = Message(
        session_id=session_id,
        task_title=task_title,
        sender="coach",
        text=coach_tips_text,
        meta_info=json.dumps({"tips": coach_tips if isinstance(coach_tips, list) else [coach_tips]}),
    )
    db.add(coach_msg_record)
    
    db.commit()
    # Fetch all messages for the session, ordered chronologically
    all_messages = (
        db.query(Message)
        .filter(Message.session_id == session_id, Message.task_title == task_title)
        .order_by(Message.timestamp.asc())
        .all()
    )
    db.close()

    # Format messages for frontend
    formatted_messages = [
        {
            "id": msg.id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat() if hasattr(msg.timestamp, 'isoformat') else str(msg.timestamp),
        }
        for msg in all_messages
    ]

    return {
        "manager_reply": manager_response,
        "coach_tips": coach_tips,
        "messages": formatted_messages,
    }
