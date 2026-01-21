"""
Performance analyzer for adaptive difficulty.
Tracks grades and feedback to adjust task difficulty for better learning.
"""

from sqlalchemy.orm import Session
from models import TimelineItem
from typing import Optional, Tuple


def get_performance_history(session_id: str, db: Session) -> dict:
    """
    Analyze performance history for a session.
    Returns: {
        avg_grade: float (0-5),
        recent_grades: list of last 5 grades,
        feedback_themes: str (summary of common issues),
        consistency: str ('high' | 'medium' | 'low')
    }
    """
    # Get all completed tasks with grades
    completed_tasks = (
        db.query(TimelineItem)
        .filter(
            TimelineItem.session_id == session_id,
            TimelineItem.status == "completed",
            TimelineItem.grade.isnot(None)
        )
        .order_by(TimelineItem.created_at.desc())
        .all()
    )

    if not completed_tasks:
        return {
            "avg_grade": None,
            "recent_grades": [],
            "feedback_themes": None,
            "consistency": None,
            "total_completed": 0
        }

    # Calculate average and recent grades
    grades = [t.grade for t in completed_tasks]
    recent_grades = grades[:5]  
    avg_grade = sum(grades) / len(grades)

    # Collect feedback text from last 5 tasks
    feedback_texts = [t.feedback for t in completed_tasks[:5] if t.feedback]
    feedback_summary = " ".join(feedback_texts) if feedback_texts else None

    # Calculate consistency 
    if len(recent_grades) > 1:
        variance = sum((g - avg_grade) ** 2 for g in recent_grades) / len(recent_grades)
        std_dev = variance ** 0.5
        if std_dev < 0.8:
            consistency = "high"
        elif std_dev < 1.5:
            consistency = "medium"
        else:
            consistency = "low"
    else:
        consistency = None

    return {
        "avg_grade": avg_grade,
        "recent_grades": recent_grades,
        "feedback_themes": feedback_summary,
        "consistency": consistency,
        "total_completed": len(grades)
    }


def calculate_difficulty_adjustment(performance: dict) -> Tuple[str, str]:
    """
    Calculate if tasks should become harder or easier based on performance.
    Returns: (adjustment: 'harder' | 'easier' | 'same', reason: str)
    
    Logic:
    - Grade 5 consistently: Make HARDER (user needs more challenge)
    - Grade 4+ average with high consistency: Make HARDER
    - Grade 1-2 consistently: Keep same or easier (need practice)
    - Grade 3-4 with medium consistency: Keep SAME (good learning zone)
    - Highly variable grades: Keep SAME (mixed performance)
    """
    avg_grade = performance.get("avg_grade")
    recent_grades = performance.get("recent_grades", [])
    consistency = performance.get("consistency")
    total_completed = performance.get("total_completed", 0)

    # Not enough data
    if total_completed < 2:
        return ("same", "Not enough performance data yet")

    # All 5s = Too easy
    if len(recent_grades) >= 3 and all(g == 5 for g in recent_grades[:3]):
        return ("harder", f"Consistent 5/5 grades ({avg_grade:.1f} avg) - tasks too easy")

    # High average with high consistency = Ready for harder
    if avg_grade >= 4.2 and consistency == "high":
        return ("harder", f"High average {avg_grade:.1f}/5 with consistent performance")

    # Low grades = Keep current difficulty
    if avg_grade < 2.5:
        return ("same", f"Low grades {avg_grade:.1f}/5 - needs practice at current level")

    # High variability = Keep same (learning is inconsistent)
    if consistency == "low":
        return ("same", f"Inconsistent performance (std dev shows mixed results) - maintain current difficulty")

    # Good zone 3-4 = Keep same
    if 3 <= avg_grade <= 4:
        return ("same", f"Average {avg_grade:.1f}/5 - in optimal learning zone")

    return ("same", "Performance stable - current difficulty appropriate")


def adjust_difficulty_string(original_difficulty: str, adjustment: str) -> str:
    """
    Adjust difficulty markers based on performance.
    ● = Beginner, ●● = Intermediate, ●●● = Advanced
    
    Args:
        original_difficulty: Current difficulty (e.g., "●●")
        adjustment: 'harder' | 'easier' | 'same'
    
    Returns: New difficulty string
    """
    if adjustment == "same":
        return original_difficulty
    
    dot_count = original_difficulty.count("●") if original_difficulty else 2

    if adjustment == "harder":
        # Max out at 3 dots
        new_count = min(dot_count + 1, 3)
        return "●" * new_count

    elif adjustment == "easier":
        # Min 1 dot
        new_count = max(dot_count - 1, 1)
        return "●" * new_count

    return original_difficulty


def create_difficulty_context(session_id: str, db: Session) -> str:
    """
    Create a prompt context string that informs task generation about
    the user's performance level and what kind of task to generate.
    
    Returns: A string to be added to the task generation prompt
    """
    performance = get_performance_history(session_id, db)

    if not performance.get("total_completed"):
        return ""  # Not enough data yet, return empty string

    adjustment, reason = calculate_difficulty_adjustment(performance)
    avg_grade = performance.get("avg_grade")

    if adjustment == "harder":
        return f"""
USER PERFORMANCE CONTEXT: High Achiever (Avg Grade: {avg_grade:.1f}/5)
- User is consistently performing very well
- Create a MORE COMPLEX and CHALLENGING scenario:
  * Include multiple competing interests or stakeholders
  * Add time pressure or resource constraints
  * Use difficult/aggressive counterpart behaviors
  * Require strategic thinking and creative problem-solving
  * Include ethical dilemmas or competing values
  * Make information asymmetry realistic
"""

    elif adjustment == "easier":
        return f"""
USER PERFORMANCE CONTEXT: Needs Practice (Avg Grade: {avg_grade:.1f}/5)
- User is still developing foundational skills
- Create a SIMPLER, more STRAIGHTFORWARD scenario:
  * Clear, simple negotiation objectives
  * Cooperative or neutral counterpart
  * Limited number of issues to negotiate
  * Transparent information
  * No time pressure
  * Focus on one specific skill at a time
"""

    else:
        # Keep same - they're in the learning zone
        return f"""
USER PERFORMANCE CONTEXT: In Learning Zone (Avg Grade: {avg_grade:.1f}/5)
- User is progressing well at current difficulty
- Create a BALANCED scenario:
  * Moderate complexity with room for growth
  * Mix of familiar and new challenges
  * Realistic but not overwhelming
  * Opportunity to practice multiple skills
"""
