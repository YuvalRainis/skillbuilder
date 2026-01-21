from llm.client import call_llm
import re

# Comprehensive agreement signal patterns
AGREEMENT_PATTERNS = [
    # Casual/Natural agreement
    r"\byeah\b.*\bfine\b",  # "Yeah, that's fine"
    r"\bthat['']?s\s+fine\b",  # "That's fine"
    r"^ok[ay]*\b",  # "OK", "Okay" at start
    r"\bok[ay]*\b",  # "OK", "Okay" anywhere
    r"\bsure\b",
    r"\balright\b",
    r"\byep\b",
    r"\bcool\b",
    r"\bthat\s+works\b",
    r"\bworks\s+for\s+me\b",
    r"\bsounds\s+good\b",
    r"\bi['']?m\s+good\s+with\s+that\b",
    r"\bi['']?m\s+good\s+with\s+it\b",
    # Formal agreement
    r"\bi\s+agree\b",
    r"\bi\s+accept\b",
    r"\blet['']?s\s+do\s+that\b",
    r"\blet['']?s\s+go\s+with\s+that\b",
    r"\bi['']?m\s+okay\s+with\s+that\b",
    # Strong commitment/agreement
    r"\byou['']?ve\s+convinced\s+me\b",  # "You've convinced me"
    r"\blet['']?s\s+stick\s+with\b",  # "Let's stick with"
    r"\bperfect.*let['']?s\s+(get\s+it\s+started|put\s+it\s+on|watch)\b",  # "Perfect, let's..." 
    r"\bi['']?ll\s+go\s+with.*choice\b",
    # Action/Decision
    r"\bi['']?m\s+starting\b",
    r"\blet\s+me\s+start\b",
    r"\blet['']?s\s+watch\b",
    r"\byou['']?re\s+right\b",
    r"\blet['']?s\s+put\s+it\s+on\b",
    r"\blet['']?s\s+get\s+it\s+started\b",
    # Finality
    r"\bthat['']?s\s+final\b",
    r"\bdecision\s+made\b",
    r"\bno\s+more\s+debating\b",
    r"\bthis\s+is\s+settled\b",
    r"\blet['']?s\s+finalize\b",
    r"\blet['']?s\s+make\s+it\s+official\b",
]

def detect_agreement(user_message: str) -> bool:
    """
    Detect if the user has explicitly agreed to end the negotiation.
    Returns True if agreement is detected, False otherwise.
    """
    message_lower = user_message.lower().strip()
    
    for pattern in AGREEMENT_PATTERNS:
        if re.search(pattern, message_lower):
            print(f"[Agreement Detected] Pattern matched: {pattern}")
            print(f"[Agreement Detected] User message: {message_lower}")
            return True
    
    return False

def get_closing_response(task_context: dict = None) -> str:
    """
    Generate a natural closing response based on task context.
    """
    if task_context and "objective" in task_context:
        objective = task_context["objective"]
        if "movie" in objective.lower():
            # Movie negotiation closing responses
            responses = [
                "Great, I'm excited to watch it!",
                "Perfect, let's get it started!",
                "Awesome, sounds good to me!",
                "Nice, let's do it!",
                "Cool, I'm pumped for this!",
            ]
        elif "salary" in objective.lower():
            # Salary negotiation closing responses
            responses = [
                "Excellent, I'll get the paperwork started.",
                "Perfect, let's finalize the details.",
                "Great, I'm glad we found middle ground.",
                "Wonderful, let's make it official.",
            ]
        else:
            # Generic closing responses
            responses = [
                "Great, that sounds good!",
                "Perfect, let's move forward.",
                "Awesome, I'm happy with that.",
            ]
    else:
        responses = [
            "Great, that sounds good!",
            "Perfect, let's move forward.",
            "Awesome, I'm happy with that.",
        ]
    
    # Return a random response
    import random
    return random.choice(responses)


def get_system_prompt(task_context: dict = None) -> str:
    """Generate dynamic system prompt based on task context."""
    if task_context and "objective" in task_context:
        objective = task_context["objective"]
        # Determine context from objective
        if "movie" in objective.lower():
            return """
You are a friend/peer in a casual movie selection negotiation.

YOUR ROLE:
- You have a STRONG preference for your movie choice (stated at the beginning).
- Defend your choice with reasons WHY you love it.
- Do NOT immediately switch to the user's movie preference.
- Do NOT just accept the user's suggestion without pushback.
- Be realistic: You might find middle ground ONLY after real negotiation.

ABSOLUTELY CRITICAL - AGREEMENT DETECTION AND CLOSING:
Look for explicit agreement signals in the user's message. If you detect ANY of these patterns, the conversation is OVER:
[AGREEMENT SIGNALS - CASUAL/NATURAL]
- "Yeah, that's fine", "That's fine", "OK", "Okay", "Sure", "Alright", "Cool", "Yep"
- "That works", "That works for me", "Works for me", "Sounds good", "I'm good with that"
- "I agree", "I accept", "Let's do that", "Let's go with that", "I'm okay with that"
[AGREEMENT SIGNALS - ACTION/DECISION]
- "I'm starting the movie", "Let me start this", "Let's watch this", "Playing it now", "You're right"
- "I'll go with your choice", "Let's go with yours", "Fine, let's go with that"
[AGREEMENT SIGNALS - FINALITY]
- "That's final", "No more debating", "Decision made", "I'm deciding now", "That's it"
- "Let's finalize this", "Let's make it official", "OK it's a deal"

WHEN YOU DETECT AGREEMENT (any of the above):
1. STOP ALL PERSUASION IMMEDIATELY
2. Respond with ONLY a short acceptance (1 sentence MAX)
3. Examples of proper closing responses:
   - "Great, I'm excited to watch it!" (movie negotiation)
   - "Perfect, let's make it official!" (any negotiation)
   - "Sounds good, thanks for understanding!" (any negotiation)
4. Do NOT:
   - Re-state your position or defend your choice again
   - Ask follow-up questions
   - Suggest alternatives or compromises
   - Repeat arguments
   - Try to convince them of anything
5. The response shows you accept the decision gracefully

NORMAL NEGOTIATION (no agreement detected):
- Continue discussing naturally
- Show personality and conviction
- Be willing to listen and explore compromise
- But keep pushing your position until explicit agreement

BEHAVIOR GUIDELINES:
- Act naturally and conversationally as the character
- Respond only as the other party—don't give advice or coaching
- Output ONLY your dialogue response, nothing else
"""
        elif "salary" in objective.lower():
            return """
You are a manager in a professional salary negotiation.

YOUR ROLE:
- You have budget constraints and cannot simply agree to large requests
- Defend your initial position with realistic reasons
- Listen to their case, but be firm unless they provide compelling evidence
- You may negotiate or find middle ground, but only after meaningful discussion

ABSOLUTELY CRITICAL - AGREEMENT DETECTION AND CLOSING:
Look for explicit agreement signals in the user's message. If you detect ANY of these patterns, the conversation is OVER:
[AGREEMENT SIGNALS - CASUAL/NATURAL]
- "Yeah, that's fine", "That's fine", "OK", "Okay", "Sure", "Alright", "Yep", "Cool"
- "That works", "That works for me", "Works for me", "Sounds fair", "That sounds fair"
- "I agree", "I accept", "I'm good with that", "Perfect", "That's reasonable"
[AGREEMENT SIGNALS - ACTION/IMPLEMENTATION]
- "When can this start?", "When do I get this raise?", "When does this take effect?"
- "Let's move forward with this", "Let's finalize the details", "Let's make this official"
[AGREEMENT SIGNALS - FINALITY]
- "I'm accepting this", "I'll take that", "That's our deal", "No more negotiation"
- "That's final", "Decision made", "This is good", "Let's settle on this", "OK it's a deal"

WHEN YOU DETECT AGREEMENT (any of the above):
1. STOP ALL PERSUASION IMMEDIATELY
2. Respond with ONLY a short acceptance (1 sentence MAX)
3. Examples of proper closing responses:
   - "Great, I'll get the paperwork started." (salary negotiation)
   - "Perfect, let's finalize this together." (any negotiation)
   - "Excellent, I'm glad we found middle ground." (any negotiation)
4. Do NOT:
   - Re-state your constraints or defend your position again
   - Ask follow-up questions or suggest alternatives
   - Repeat your arguments or concerns
   - Try to convince them of anything more
5. The response shows you accept the decision professionally

NORMAL NEGOTIATION (no agreement detected):
- Continue discussing naturally
- Show realistic constraints (budget, policy)
- Be willing to listen and explore compromise
- But maintain your position until explicit agreement

BEHAVIOR GUIDELINES:
- Act realistically and professionally as the manager
- Respond only as the character—don't give advice
- Output ONLY your dialogue response, nothing else
"""
    
    # Default fallback
    return """
You are a negotiation partner in a professional discussion.

YOUR ROLE:
- Maintain your initial position and defend it with reasons
- Do NOT immediately switch preferences or capitulate
- Be willing to negotiate and find compromise after meaningful discussion

ABSOLUTELY CRITICAL - AGREEMENT DETECTION AND CLOSING:
If the user explicitly agrees, the conversation ENDS immediately. Look for these signals:
- "I agree", "OK it's a deal", "That works for me", "I accept that", "Let's finalize this"
- "That's final", "No more debating", "Decision made", "This is settled"
- Any explicit acceptance language

WHEN YOU DETECT AGREEMENT:
1. STOP ALL PERSUASION
2. Respond with ONLY 1 short sentence accepting the agreement
3. Do NOT ask questions, suggest alternatives, or repeat arguments
4. The conversation is OVER

NORMAL NEGOTIATION (no agreement yet):
- Show personality and conviction in your position
- Listen and explore compromise
- Keep negotiating until explicit agreement

BEHAVIOR GUIDELINES:
- Stay in character throughout
- Respond only as the other party—no advice or coaching
- Output ONLY your dialogue response, nothing else
"""

SCENARIO_PROMPT = """
You are a negotiation scenario generator for a skill-building app.

Rules:
- The user is always one of the roles. Clearly state: 'You are [Name], [Role].'
- The other party is the counterpart. State their name and role.
- Keep the scenario very short and simple (2-3 sentences max).
- Set up the negotiation with clear, conflicting positions or interests (not easy agreement).
- The counterpart should clearly state what they want, so there's something to negotiate about.
- End with the counterpart's opening line or offer, so the user can reply as themselves.
- Output only the scenario, no instructions or extra text.
"""

def manager_reply(
    user_message: str,
    task_context: dict = None,
    conversation_history: str = None,
) -> str:
    """
    Generate manager response with optional task context and conversation history.
    IMPORTANT: Checks for agreement FIRST before calling LLM.
    """
    # Check if user has explicitly agreed
    if detect_agreement(user_message):
        print(f"[manager_reply] AGREEMENT DETECTED - returning closing response")
        return get_closing_response(task_context)
    
    # No agreement detected, proceed with normal negotiation response
    system_prompt = get_system_prompt(task_context)
    
    task_info = ""
    if task_context:
        task_info = f"\n\n[TASK CONTEXT]\nObjective: {task_context.get('objective', '')}"
    
    history_info = ""
    if conversation_history:
        history_info = f"\n\n[CONVERSATION SO FAR]\n{conversation_history}"
        
        # Try to extract the manager's own opening line
        # Look for the manager's first message which contains their preference
        lines = conversation_history.split("\n")
        manager_position = None
        for i, line in enumerate(lines):
            if line.startswith("MANAGER:"):
                manager_position = line.replace("MANAGER:", "").strip()
                break
            # Also check for the scenario line that mentions the manager's preference
            elif "counterpart" in line.lower() and ("want" in line.lower() or "prefer" in line.lower()):
                manager_position = line.strip()
                break
        
        if manager_position:
            history_info += f"\n\n[YOUR INITIAL POSITION/PREFERENCE]\nYou stated at the beginning: {manager_position}\nStay true to this preference and defend it."
    
    user_prompt = f"""
User said:
"{user_message}"{history_info}{task_info}

Respond naturally as the other party, showing personality and conviction in your position. Continue negotiating naturally.
"""
    return call_llm(system_prompt, user_prompt)

def generate_scenario_example(task_title: str, coach_summary: str = "") -> str:
    """
    Generate a scenario example for the given task using the LLM.
    """
    user_prompt = f"""
Task Title: {task_title}
Task Objective: {coach_summary}

Generate a realistic scenario example for this negotiation skill task. Format:
- You are [Name], [Role].
- Your counterpart is [Name], [Role].
- [Counterpart's opening line for the user to respond to.]
"""
    return call_llm(SCENARIO_PROMPT, user_prompt)
