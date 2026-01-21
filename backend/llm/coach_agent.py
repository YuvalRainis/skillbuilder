from llm.client import call_llm

SYSTEM_PROMPT = """
You are a negotiation coach using deliberate practice and metacognitive principles.

Rules:
- Do NOT write the response for the user.
- Do NOT role-play as the other party.
- Provide exactly 3 tips, each STRICTLY 20-25 WORDS ONLY.
- Each tip must be concise, clear, and actionable—no explanations, no multi-sentence tips.
- Focus on interests, constraints, and emotional regulation.
- Be supportive and non-judgmental.
- Cite theory (deliberate practice, metacognition, self-regulated learning) only if it fits.
- Tips must be SPECIFIC to the actual scenario and conversation, NOT generic.
- Reference the actual other party by name (e.g., Maya, the manager, the colleague) not generic labels.
- Reference specific topics being negotiated (e.g., movie choice, salary, schedule) not generic "the issue".
- WORD COUNT LIMIT: Each tip must be exactly 20-25 words. Count carefully before outputting.
- Output ONLY a bullet list of 3 tips, each 20-25 words.
"""

FEEDBACK_PROMPT = """
You are a STRICT negotiation coach. Analyze the following chat history from a negotiation practice task.
Grade ONLY based on actual negotiation skill demonstrated in the conversation.

CRITICAL GRADING RULES:
- MINIMAL/NON-SUBSTANTIVE RESPONSES (single word like "hi", "ok", vague non-engagement) = ALWAYS 1/5
- NEVER give 2/5 to minimal effort - jump from 1/5 to 3/5 minimum
- Do NOT reward politeness, tone, or friendly statements
- Do NOT reward reaching an agreement if it was achieved through PASSIVITY, CAPITULATION, or ACCOMMODATION
- IMPORTANT: Agreement is NOT the same as skill. Grade SKILL, not outcome.

Grading based on SKILL DEMONSTRATION:
- Did they make substantive arguments for their position?
- Did they explore interests beyond just their stated preference?
- Did they propose compromises or creative solutions?
- Did they listen and respond to counterarguments?
- Did they use strategic questioning or active listening?

Rules for feedback:
- Summarize the outcome: was there an agreement, partial success, or no agreement?
- Give concise feedback (2-3 sentences) on the user's negotiation approach and result.
- If possible, suggest one actionable improvement for next time.
- Output: Outcome summary, feedback, improvement, and GRADE.

Grading scale:
- 1/5: No real negotiation attempt (single word, abandonment, pure passivity, instant capitulation)
- 2/5: Weak negotiation (minimal arguments, quick surrender, no exploration of interests)
- 3/5: Moderate negotiation (some arguments, effort to explain position, limited counterargument)
- 4/5: Good negotiation (clear arguments, explored interests, made strategic points)
- 5/5: Excellent negotiation (strong strategy, creative solutions, active problem-solving)
"""

def coach_feedback(
    user_message: str,
    manager_reply: str,
    task_context: dict = None,
    conversation_history: str = None,
) -> list[str]:
    """
    Generate coach suggestions with optional task context and conversation history.
    Extracts counterpart name from conversation history if available.
    """
    task_info = ""
    counterpart_name = "the other party"  # Default fallback
    
    if task_context:
        task_info = f"\n[TASK]: {task_context.get('title', '')}\n[OBJECTIVE]: {task_context.get('objective', '')}"
    
    history_info = ""
    if conversation_history:
        print(f"\n[coach_feedback] Full conversation history:\n{conversation_history}\n")
        
        # Try to extract counterpart name from conversation history
        # Look for patterns like "Your counterpart is [Name], [Role]" in the text
        
        # First, search the entire conversation history for the pattern
        import re
        counterpart_match = re.search(r"[Yy]our counterpart is\s+(\w+)", conversation_history)
        if counterpart_match:
            counterpart_name = counterpart_match.group(1)
            print(f"[coach_feedback] Found counterpart name via 'Your counterpart is' pattern: {counterpart_name}")
        
        # If not found, try to extract from lines starting with a name followed by colon
        if counterpart_name == "the other party":
            lines = conversation_history.split("\n")
            print(f"[coach_feedback] Looking for NAME: pattern in {len(lines)} lines...")
            for line in lines:
                # Look for "NAME:" pattern (but not MANAGER, USER, COACH, SYSTEM, etc.)
                match = re.match(r"^([A-Z][a-z]+):\s", line)
                if match:
                    name = match.group(1)
                    # Skip generic role names
                    if name not in ["Manager", "User", "Coach", "System"]:
                        counterpart_name = name
                        print(f"[coach_feedback] Found counterpart name via 'NAME:' pattern: {counterpart_name}")
                        break
        
        if counterpart_name == "the other party":
            print(f"[coach_feedback] No counterpart name found, using default: 'the other party'")
        
        history_info = f"\n[CONVERSATION SO FAR]\n{conversation_history}\n"
    
    print(f"[coach_feedback] Final counterpart name: {counterpart_name}")
    
    user_prompt = f"""
{task_info}
{history_info}
The other party ({counterpart_name}) replied:
"{manager_reply}"

The user plans to respond with:
"{user_message}"

Provide exactly 3 tips to help the user reflect on their next move. IMPORTANT: Each tip MUST be EXACTLY 20-25 WORDS. Count words carefully.
Make tips specific to this scenario—reference {counterpart_name} by their actual name, and reference the actual topic being negotiated.
Focus on practical actions the user can take in the next response.
"""

    raw_output = call_llm(SYSTEM_PROMPT, user_prompt)

    # Parse bullets safely
    tips = []
    for line in raw_output.split("\n"):
        line = line.strip()
        if line and (line.startswith("-") or line.startswith("•")):
            tips.append(line.lstrip("-• ").strip())
    # Enforce exactly 3 tips
    return tips[:3]

def generate_task_feedback(chat_history: list, task_title: str = "") -> dict:
    """
    Use the LLM to analyze the chat history and provide outcome-based feedback and a grade (1-5).
    """
    history_text = "\n".join([
        f"{msg['sender'].capitalize()}: {msg['text']}" for msg in chat_history
    ])
    user_prompt = f"""
Task Title: {task_title}

Chat History:
{history_text}

Provide outcome summary, feedback, one improvement, and a numeric grade (1-5) for negotiation performance. Format: Outcome Summary, Feedback, Actionable Improvement, Grade: <number>.
"""
    raw = call_llm(FEEDBACK_PROMPT, user_prompt)
    # Extract grade from LLM output
    import re
    match = re.search(r"Grade[:\s]+(\d)", raw)
    grade = int(match.group(1)) if match else None
    return {"feedback": raw, "grade": grade}
