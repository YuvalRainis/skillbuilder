from llm.client import call_llm

# ANALYSIS TASK PROMPTS 
GENERATE_ANALYSIS_PROMPT = """
You are creating an analysis exercise for a negotiation skills app. 

Based on the task title, objective, and user performance level, generate:
1. A short transcript or dialogue (2-4 exchanges)
2. A clear question asking the student to identify something specific

{performance_context}

Keep the transcript realistic and concise.

Output format:
TRANSCRIPT:
[The dialogue or text]

QUESTION:
[What should the student identify or mark?]
"""

def generate_analysis_task(task_title: str, task_objective: str, performance_context: str = "") -> dict:
    """
    Generate content for an analysis task.
    Args:
        task_title: Title of the task
        task_objective: Learning objective
        performance_context: Performance data to adjust complexity (optional)
    Returns: {transcript: str, question: str}
    """
    user_prompt = f"""
Task Title: {task_title}
Task Objective: {task_objective}

Generate a realistic analysis exercise for this task.
"""
    try:
        prompt = GENERATE_ANALYSIS_PROMPT.format(performance_context=performance_context or "")
        raw = call_llm(prompt, user_prompt)
        result = parse_task_response(raw)
        if result and "transcript" in result and "question" in result:
            return result
    except Exception as e:
        print(f"[generate_analysis_task] LLM error: {e}")
    
    # Fallback content
    return {
        "transcript": f"Conversation about {task_title}:\n\nPerson A: I have a proposal I'd like to discuss.\n\nPerson B: That sounds interesting, but I'm not sure we have time right now.\n\nPerson A: I understand, but this is quite important.",
        "question": "Identify one statement or reason that indicates a position rather than the underlying interest."
    }


# INTERPRETATION TASK PROMPTS 
GENERATE_INTERPRETATION_PROMPT = """
You are creating an interpretation exercise for a negotiation skills app.

Generate:
1. A statement or position (aggressive, defensive, or stubborn)
2. Clear instructions asking the student to identify hidden needs

The statement should be realistic and clearly express a position without showing the underlying need.

{performance_context}

Output format:
STATEMENT:
[The position/statement]

INSTRUCTION:
[What the student should do - identify hidden needs]
"""

def generate_interpretation_task(task_title: str, task_objective: str, performance_context: str = "") -> dict:
    """
    Generate content for an interpretation task.
    Args:
        task_title: Title of the task
        task_objective: Learning objective
        performance_context: Performance data to adjust complexity (optional)
    Returns: {statement: str, instruction: str}
    """
    user_prompt = f"""
Task Title: {task_title}
Task Objective: {task_objective}

Generate an interpretation exercise asking students to identify hidden needs behind a position.
"""
    try:
        prompt = GENERATE_INTERPRETATION_PROMPT.format(performance_context=performance_context or "")
        raw = call_llm(prompt, user_prompt)
        result = parse_task_response(raw)
        if result and "statement" in result and "instruction" in result:
            return result
    except Exception as e:
        print(f"[generate_interpretation_task] LLM error: {e}")
    
    # Fallback content
    return {
        "statement": f"I absolutely refuse to {task_title.lower() if 'refuse' in task_title.lower() else 'work on weekends'}. That's non-negotiable.",
        "instruction": "What do you think is the underlying need or concern behind this statement? What might the person actually care about?"
    }


# PLANNING TASK PROMPTS
GENERATE_BATNA_PROMPT = """
You are creating a BATNA planning exercise for a negotiation skills app.

Create a realistic scenario where someone needs to develop their Best Alternative To a Negotiated Agreement.

Generate:
1. A specific negotiation scenario (e.g., salary negotiation at current job, vendor contract renewal, etc.)
2. Realistic constraints they face
3. Clear instruction on what BATNA plan to create

Keep scenarios concrete and relatable - use real job titles, realistic numbers, actual company situations.

{performance_context}

CRITICAL: Output EXACTLY in this format with NO extra text:
SCENARIO:
[2-3 sentences describing the specific negotiation situation]

CONSTRAINTS:
[2-3 realistic constraints or challenges they face]

INSTRUCTION:
[Clear instruction on developing a BATNA - what they'll do if negotiation fails]
"""

GENERATE_LOGROLLING_PROMPT = """
You are creating a log-rolling (value creation) exercise for a negotiation skills app.

Log-rolling means trading issues: giving up something you care less about to get something more important to you.

Generate:
1. A negotiation scenario with MULTIPLE issues to negotiate (e.g., salary, vacation days, remote work, start date)
2. Different priorities for each party
3. Clear instruction on how to identify trade-offs

Keep scenarios realistic with 3-4 negotiable issues.

{performance_context}

CRITICAL: Output EXACTLY in this format with NO extra text:
SCENARIO:
[2-3 sentences describing negotiation with multiple issues at stake]

CONSTRAINTS:
[What each party cares about most/least - show conflicting priorities]

INSTRUCTION:
[Clear instruction to identify what you'll concede to gain what you want]
"""

def generate_planning_task(task_title: str, task_objective: str, performance_context: str = "") -> dict:
    """
    Generate content for a planning task.
    Args:
        task_title: Title of the task
        task_objective: Learning objective
        performance_context: Performance data to adjust complexity (optional)
    Returns: {scenario: str, constraints: str, instruction: str}
    """
    # Determine task type from title
    title_lower = task_title.lower()
    if "batna" in title_lower:
        prompt_template = GENERATE_BATNA_PROMPT
        task_type = "BATNA"
        user_prompt = f"""
Task Title: {task_title}
Task Objective: {task_objective}

Generate a realistic BATNA planning exercise. Make it specific and relatable.
"""
    elif "log-rolling" in title_lower or "value creation" in title_lower:
        prompt_template = GENERATE_LOGROLLING_PROMPT
        task_type = "Log-Rolling"
        user_prompt = f"""
Task Title: {task_title}
Task Objective: {task_objective}

Generate a realistic log-rolling exercise with multiple negotiable issues. Make it specific and relatable.
"""
    else:
        # Generic planning task
        prompt_template = GENERATE_BATNA_PROMPT  # Default to BATNA structure
        task_type = "Planning"
        user_prompt = f"""
Task Title: {task_title}
Task Objective: {task_objective}

Generate a realistic planning exercise for negotiation preparation.
"""
    
    try:
        prompt = prompt_template.format(performance_context=performance_context or "")
        raw = call_llm(prompt, user_prompt)
        print(f"[generate_planning_task] Task type: {task_type}")
        print(f"[generate_planning_task] LLM raw response:\n{raw}")
        result = parse_task_response(raw)
        print(f"[generate_planning_task] Parsed result: {result}")
        if result and "scenario" in result and "constraints" in result and "instruction" in result:
            return result
        else:
            print(f"[generate_planning_task] Missing keys in result. Got keys: {list(result.keys())}")
    except Exception as e:
        print(f"[generate_planning_task] LLM error: {e}")
        import traceback
        traceback.print_exc()
    
    # Fallback content - task-specific
    print("[generate_planning_task] Using fallback content")
    if "log-rolling" in task_title.lower() or "value creation" in task_title.lower():
        return {
            "scenario": "You're negotiating a new job offer. There are 4 issues on the table: base salary, signing bonus, vacation days, and remote work days per week.",
            "constraints": "The company values in-office presence. You value work-life balance and flexibility. Budget allows some negotiation on total compensation.",
            "instruction": "Identify which issues matter most to you and which you'd be willing to concede. Create a trade-off strategy: what will you give up to get what you really want?"
        }
    else:
        return {
            "scenario": f"You are negotiating about {task_title.lower()}. The other party has made an initial offer that you find partially acceptable but not ideal.",
            "constraints": "Budget: Limited\\nTimeline: 1 week\\nStakeholders: 2 decision-makers",
            "instruction": "Create a step-by-step plan for your negotiation. Consider your BATNA, priorities, and potential trade-offs."
        }


# TECHNIQUE TASK PROMPTS 
GENERATE_TECHNIQUE_PROMPT = """
You are creating a technique practice exercise for a negotiation skills app.

Generate:
1. Context/setup for the practice
2. What the other person says (they are upset, demanding, or difficult)
3. Clear instruction on what technique to use and how

The other person's statement should be realistic and challenging.

{performance_context}

Output format:
CONTEXT:
[Brief context]

OTHER_PERSON_SAYS:
[What they say - usually angry or frustrated]

TECHNIQUE_INSTRUCTION:
[Which technique and how to apply it]
"""

def generate_technique_task(task_title: str, task_objective: str, technique_name: str = "", performance_context: str = "") -> dict:
    """
    Generate content for a technique practice task.
    Args:
        task_title: Title of the task
        task_objective: Learning objective
        technique_name: Name of the technique to practice
        performance_context: Performance data to adjust complexity (optional)
    Returns: {context: str, other_person_says: str, technique_instruction: str}
    """
    technique_info = f" Technique to practice: {technique_name}." if technique_name else ""
    user_prompt = f"""
Task Title: {task_title}
Task Objective: {task_objective}{technique_info}

Generate a technique practice exercise.
"""
    try:
        prompt = GENERATE_TECHNIQUE_PROMPT.format(performance_context=performance_context or "")
        raw = call_llm(prompt, user_prompt)
        result = parse_task_response(raw)
        if result and "context" in result and "other_person_says" in result and "technique_instruction" in result:
            result["technique_name"] = technique_name
            return result
    except Exception as e:
        print(f"[generate_technique_task] LLM error: {e}")
    
    # Fallback content
    return {
        "context": f"You are in a negotiation about {task_title}. The other person seems frustrated.",
        "other_person_says": "I'm really frustrated with how this is going. You don't seem to understand my concerns at all!",
        "technique_instruction": f"Respond using the {technique_name} technique: repeat back what you heard in your own words to show understanding and validate their feelings.",
        "technique_name": technique_name
    }


# PARSING HELPER 
def parse_task_response(raw: str) -> dict:
    """Generic parser for task generation responses."""
    result = {}
    lines = raw.split("\n")
    current_key = None
    current_value = ""
    
    for line in lines:
        if ":" in line and line.split(":")[0].strip().replace("*", "").isupper():
            if current_key and current_value:
                result[current_key.lower()] = current_value.strip()
            # Strip markdown formatting and get clean key
            key_part = line.split(":")[0].strip().replace("*", "")
            current_key = key_part
            current_value = ":".join(line.split(":")[1:]).strip()
        elif current_key:
            current_value += "\n" + line
    
    if current_key and current_value:
        result[current_key.lower()] = current_value.strip()
    
    return result
