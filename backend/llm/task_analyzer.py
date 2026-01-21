"""
LLM agent to analyze and generate task metadata.
Interprets difficulty level, skill focus, and time estimates from task descriptions.
"""

from groq import Groq
import json

def analyze_task(task_title: str, task_summary: str) -> dict:
    """
    Analyze a negotiation task and generate metadata.
    Returns: dict with difficulty, skill_focus, estimated_time
    """
    
    client = Groq()
    
    prompt = f"""Analyze this negotiation practice task and extract key metadata.

Task Title: {task_title}
Task Description: {task_summary}

Respond with ONLY a JSON object (no markdown, no code blocks) with these exact keys:
{{
  "difficulty": "one of: ●, ●●, ●●● (● for beginner, ●● for intermediate, ●●● for advanced)",
  "skill_focus": "The primary negotiation skill being practiced",
  "estimated_time": "Time estimate (e.g., 10 mins, 15 mins, 20 mins)"
}}

Return ONLY valid JSON."""

    message = client.messages.create(
        model="llama-3.1-8b-instant",
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    
    response_text = message.content[0].text.strip()
    
    # Remove markdown code blocks if present
    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
        response_text = response_text.strip()
    
    try:
        metadata = json.loads(response_text)
    except json.JSONDecodeError:
        metadata = {}
    
    return {
        "difficulty": metadata.get("difficulty", "●●"),
        "skill_focus": metadata.get("skill_focus", "Negotiation Skills"),
        "estimated_time": metadata.get("estimated_time", "15 mins")
    }


def generate_task_description(task_title: str, difficulty_level: str) -> str:
    """
    Generate a detailed, engaging description for a negotiation task.
    """
    
    client = Groq()
    
    prompt = f"""Generate a short, engaging description for this negotiation practice task.

Task Title: {task_title}
Difficulty Level: {difficulty_level}

The description should:
- Be 1-2 sentences max
- Explain what skill is being practiced
- Be motivating and clear
- No more than 50 words

Return ONLY the description text, nothing else."""

    message = client.messages.create(
        model="llama-3.1-8b-instant",
        max_tokens=100,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    
    return message.content[0].text.strip()


def generate_task_insights(task_title: str, task_description: str) -> str:
    """
    Generate insights about why this task is important and how it helps.
    """
    
    client = Groq()
    
    prompt = f"""Generate a brief, motivating insight about why this negotiation task is important and how practicing it will help.

Task Title: {task_title}
Task Description: {task_description}

The insight should:
- Explain the real-world value and importance (1-2 sentences)
- Be encouraging and practical
- Help the user understand the benefit
- No more than 60 words
- Use "you" to address the learner

Return ONLY the insight text, nothing else."""

    message = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        max_tokens=120,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    
    return message.choices[0].message.content.strip()


def choose_similar_task(current_task_id: int, current_difficulty: str, all_tasks: list) -> dict:
    """
    Choose another task with similar difficulty level.
    Excludes the current task.
    Returns a random task from the same difficulty band.
    """
    import random
    
    # Map difficulty to bands
    difficulty_map = {
        "●": "beginner",
        "●●": "intermediate",
        "●●●": "advanced"
    }
    
    current_band = difficulty_map.get(current_difficulty, "intermediate")
    
    # same difficulty AND not current task AND not completed
    similar_tasks = [
        t for t in all_tasks 
        if (t.get("id") != current_task_id and 
            difficulty_map.get(t.get("difficulty", "●●"), "intermediate") == current_band and
            t.get("status") != "completed")
    ]
    
    # If no similar tasks found, get any incomplete task that's not current
    if not similar_tasks:
        similar_tasks = [
            t for t in all_tasks 
            if t.get("id") != current_task_id and t.get("status") != "completed"
        ]
    
    # If still no tasks, return any task except current
    if not similar_tasks:
        similar_tasks = [t for t in all_tasks if t.get("id") != current_task_id]
    
    if similar_tasks:
        return random.choice(similar_tasks)
    
    # Fallback
    return all_tasks[0] if all_tasks else {"id": 1, "title": "Default Task"}


def estimate_program_length(task_titles: list) -> dict:
    """
    Ask the LLM to estimate how many days of deliberate practice it would take to accomplish the learning goal represented by the list of task titles.
    Returns a dict with keys: days (int) and rationale (str).
    """
    client = Groq()

    titles_text = "\n".join([f"- {t}" for t in task_titles]) if task_titles else ""

    prompt = f"""Estimate how many days of deliberate practice it would reasonably take for a learner to achieve meaningful progress toward mastering these negotiation skills based on the task list below. Assume 10–30 mins of practice per day. Return a JSON object with exact keys: {{"days": <integer>, "rationale": <string>}} and nothing else.

Tasks:\n{titles_text}

Return ONLY valid JSON."""

    message = client.messages.create(
        model="llama-3.1-8b-instant",
        max_tokens=150,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    response_text = message.content[0].text.strip()

    # Remove markdown if present
    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
        response_text = response_text.strip()

    try:
        data = json.loads(response_text)
        days = int(data.get("days", 0))
        rationale = data.get("rationale", "")
    except Exception:
        days = 0
        rationale = ""

    # Fallback: if parsing failed or days unrealistic, pick a safe default
    if not days or days <= 0:
        # default heuristic: one task per day
        days = max(1, len(task_titles))
        rationale = ""

    return {"days": days, "rationale": rationale}
