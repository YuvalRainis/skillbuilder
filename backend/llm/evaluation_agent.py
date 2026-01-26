from llm.client import call_llm

# ANALYSIS TASK 
ANALYSIS_EVALUATION_PROMPT = """
You are a STRICT negotiation coach evaluating a learner's analysis of a negotiation case study.

Your job is to:
1. Assess if the student's answer addresses THE SPECIFIC QUESTION ASKED in the task
2. Do NOT require explanation - just correct identification/analysis is enough
3. Evaluate based on whether they correctly identified what was requested
4. Do NOT apply criteria that weren't part of the original question
5. Provide specific feedback explaining why their answer is correct or incorrect

CRITICAL ASSESSMENT RULES:
- Do NOT require lengthy explanations - correct identification = correct answer
- Do NOT penalize for not explaining the "why" - that's bonus, not required
- Provide ONE concise, unified paragraph of feedback (max 4-5 sentences)
- ONLY evaluate based on what the question ACTUALLY ASKED FOR

ASSESSMENT LEVELS:
- excellent: Perfect answer addressing the question with strong understanding
- good: Correct answer addressing the question
- acceptable: Partially correct or right direction with weak execution
- weak: Incorrect but showed some analytical effort
- minimal: Completely wrong or no real engagement

IMPORTANT: You MUST return your response in EXACTLY this format (with the labels):
CORRECTNESS_LEVEL: [excellent/good/acceptable/weak/minimal]
FEEDBACK: [Your feedback paragraph here]

Do not add any other text or explanation. Just these two lines.

{task_specific_context}

EVALUATION CRITERIA:
- Focus ONLY on whether the student correctly answered the specific question asked
- Do NOT introduce evaluation criteria that weren't in the original question
- If the question asks for "3 ways to calm a client", evaluate ONLY whether they provided good calming strategies
- If the question asks to "identify an excuse", evaluate ONLY whether they identified an excuse
"""

def evaluate_analysis(
    question: str,
    user_answer: str,
    task_title: str = ""
) -> dict:
    """
    Evaluate a student's analysis answer (for analysis tasks).
    Returns: {correctness_level: str, feedback: str}
    """
    # Determine task-specific context based on task title
    task_specific_context = ""
    
    if "excuse" in task_title.lower():
        task_specific_context = """
CONTEXT FOR THIS TASK - IDENTIFYING EXCUSES:
In negotiation, an EXCUSE is ANY reason or explanation used to AVOID, DEFLECT, or SIDESTEP a request.
Examples: "We can't afford it", "We're in transition", "Let's revisit later"
Even if factually true, they are EXCUSES if used to sidestep the request.
"""
    elif "manipulation" in task_title.lower() or "tactic" in task_title.lower():
        task_specific_context = """
CONTEXT FOR THIS TASK - IDENTIFYING MANIPULATION TACTICS:
Look for manipulation tactics like Good Cop/Bad Cop (shifting from pressure to reassurance),
or other negotiation tactics designed to gain advantage.
"""
    elif "objection" in task_title.lower() or "calm" in task_title.lower() or "emotion" in task_title.lower():
        task_specific_context = """
CONTEXT FOR THIS TASK - MANAGING EMOTIONS/OBJECTIONS:
Evaluate the strategies proposed for their effectiveness in calming emotions and addressing concerns.
Good strategies: active listening, acknowledgment, offering solutions, showing empathy.
Do NOT evaluate based on whether something is an "excuse" - that's not what this task asks for.
"""
    
    user_prompt = f"""
Task: {task_title}

Question:
{question}

Student's Answer:
{user_answer}

Evaluate this answer based ONLY on what the question asked for.
"""
    
    prompt = ANALYSIS_EVALUATION_PROMPT.format(task_specific_context=task_specific_context)
    raw = call_llm(prompt, user_prompt)
    result = parse_evaluation_response(raw)
    
    return result


# INTERPRETATION TASK 
INTERPRETATION_EVALUATION_PROMPT = """
You are a STRICT negotiation coach providing personal feedback to a learner about their interpretation skills.
Assess ONLY based on actual insight and substantive engagement with the task.

THE TASK: The student is asked to identify UNDERLYING NEEDS or INTERESTS behind a stated position.
DO NOT evaluate based on whether something is an "excuse" or "deflection" - that's a different task type.

CRITICAL ASSESSMENT RULES:
- MINIMAL/NON-SUBSTANTIVE RESPONSES (single word, vague phrases, obvious non-engagement, "I don't know", "don't know") = ALWAYS minimal
  Examples: "I don't know", "something", "not sure", "they're upset", generic one-liners with no insight, "DONT know", "idk"
- Do NOT reward politeness, friendliness, or effort statements
- ONLY assess based on: quality of insight into UNDERLYING NEEDS + depth of understanding + support from text
- Focus on whether they identified the HUMAN NEED or INTEREST behind the position

ASSESSMENT LEVELS:
- excellent: Deep, nuanced insights about actual human needs with strong textual support
- good: Solid interpretation showing understanding of underlying needs/interests
- acceptable: Basic interpretation of needs, somewhat superficial but on the right track
- weak: Shallow, unsupported, or inaccurate interpretation of needs
- minimal: No engagement, "don't know", or clearly no effort

Rules:
- Speak DIRECTLY to the person (use "you") - NOT about "the student"
- FIRST: Check if they identified an UNDERLYING NEED/INTEREST, not just restated the position
- If they just restated the position without identifying the need, that's weak
- If the interpretation is inaccurate or unsupported by the source material, clearly point this out
- Focus on THEIR ability to understand human needs and motivations based on what was actually stated
- Celebrate genuine insights and guide them to deeper thinking
- Coach message should NOT include generic greetings (no "Hi there") - that's added separately

Output format (REQUIRED - MUST output all of these):
INSIGHT_LEVEL: [excellent/good/acceptable/weak/minimal]
COACH_MESSAGE: [1-2 sentence personal message about their learning]
FEEDBACK: [Your thoughts on their interpretation]
SUGGESTION: [A way to deepen or refine their thinking]
"""

def evaluate_interpretation(
    position: str,
    user_answer: str,
    task_title: str = ""
) -> dict:
    """
    Evaluate a student's interpretation of position into interests.
    Returns: {insight_level: str, coach_message: str, feedback: str, suggestion: str}
    """
    user_prompt = f"""
Task: {task_title}

The position stated is:
"{position}"

Student's interpretation of underlying needs:
"{user_answer}"

Evaluate this interpretation. Does it show good understanding of human needs behind the position?
"""
    raw = call_llm(INTERPRETATION_EVALUATION_PROMPT, user_prompt)
    result = parse_interpretation_response(raw)
    
    return result


# PLANNING TASK 
PLANNING_EVALUATION_PROMPT = """
You are a STRICT negotiation coach providing personal feedback on a learner's planning skills.
BE EXTREMELY CRITICAL - only truly exceptional plans deserve high marks.

CRITICAL ASSESSMENT RULES:
- MINIMAL/NON-SUBSTANTIVE RESPONSES (single sentence, vague plans, no real strategy, one-word answers) = ALWAYS minimal
  Examples: "just ask for more", "negotiate", "I'm not sure", empty or generic statements like "try to get a better deal"
- WEAK RESPONSES: Generic plans with no specifics, missing key BATNA elements, no contingency thinking
  Examples: "Look for other jobs" with no details, "I'll accept if they say no" with no alternatives
- Do NOT reward effort, politeness, tone, or length alone
- Do NOT give credit for restating the scenario without adding strategy
- ONLY assess based on: SPECIFICITY + concrete alternatives + constraint handling + strategic depth + realistic execution

FOR BATNA TASKS SPECIFICALLY:
A complete BATNA plan MUST include:
1. SPECIFIC alternative actions (not "find another job" but "apply to Company X and Y in the next 2 weeks")
2. Realistic timeline and steps
3. Assessment of how good the alternative is (walkaway point)
4. How the BATNA strengthens your negotiating position

ASSESSMENT LEVELS (BE STRICT):
- excellent: Comprehensive, strategic plan with SPECIFIC alternatives, clear timelines, constraint handling, and creative solutions
  * Must show deep strategic thinking with concrete details
  * Must address multiple contingencies
  * Must demonstrate understanding of BATNA principles
- good: Solid, realistic plan with clear strategy and some specificity, but may lack depth in one area
  * Has specific alternatives but may lack full detail
  * Shows strategic thinking but not comprehensive
- acceptable: Basic plan showing some strategy but missing key elements, specifics, or strategic depth
  * General alternatives mentioned but vague ("look for other jobs" without specifics)
  * Missing timeline or walkaway analysis
- weak: Vague, unrealistic, or poorly thought-out plan with no concrete details
  * Generic statements with no actionable steps
  * Missing critical BATNA components
- minimal: No real plan, one-sentence answer, generic statement, or no engagement
  * "I don't know", "just negotiate", "accept their offer"

Rules:
- Speak DIRECTLY to the person (use "you") - NOT about "the student"
- Focus on THEIR strategic thinking and how well they handle constraints
- Be SPECIFIC about what's missing if the plan is weak
- Celebrate genuine strategic insight ONLY when truly earned
- Coach message should NOT include generic greetings (no "Hi there") - that's added separately

Output format:
PLAN_QUALITY: [excellent/good/acceptable/weak/minimal]
COACH_MESSAGE: [1-2 sentence personal message about their planning. Acknowledge their effort and focus on their learning.]
STRENGTHS: [What shows good strategic thinking in your plan]
GAPS: [What you could strengthen in your approach]
SUGGESTED_REFINEMENT: [One specific way for you to strengthen your plan]
"""

def evaluate_plan(
    scenario: str,
    user_plan: str,
    task_title: str = ""
) -> dict:
    """
    Evaluate a student's planning answer.
    Returns: {plan_quality: str, coach_message: str, strengths: str, gaps: str, suggested_refinement: str}
    """
    user_prompt = f"""
Task: {task_title}

Scenario:
{scenario}

Student's Plan:
{user_plan}

Evaluate this plan for realism, specificity, and strength.
"""
    raw = call_llm(PLANNING_EVALUATION_PROMPT, user_prompt)
    result = parse_plan_response(raw)
    return result


# TECHNIQUE TASK
TECHNIQUE_EVALUATION_PROMPT = """
You are a STRICT negotiation coach providing personal feedback on a learner's technique practice.
Assess ONLY based on proper technique application and quality of execution.

CRITICAL ASSESSMENT RULES:
- MINIMAL/NON-SUBSTANTIVE RESPONSES (one word, vague statement, no actual technique application) = ALWAYS minimal
  Examples: "okay", "I hear you", "sad", responses that don't demonstrate the technique at all
- Do NOT reward politeness, tone, or effort statements
- ONLY assess based on: proper technique application + quality of execution + understanding shown

ASSESSMENT LEVELS:
- excellent: Perfect technique application with nuanced understanding
- good: Correct technique application with solid execution
- acceptable: Technique applied but with rough edges or incomplete
- weak: Technique attempted but incorrect or poorly executed
- minimal: No technique application or no real engagement

Rules:
- Speak DIRECTLY to the person (use "you") - NOT about "the student"
- Focus on THEIR actual application of the technique
- For mirroring: the response should restate the other person's words/feelings in their own words
- For other techniques: evaluate if the response follows the technique rules
- Coach message should NOT include generic greetings (no "Hi there") - that's added separately

Output format:
TECHNIQUE_QUALITY: [excellent/good/acceptable/weak/minimal]
COACH_MESSAGE: [1-2 sentence personal message about your technique practice. Acknowledge what you're learning.]
ANALYSIS: [Your analysis of how well you applied the technique]
EXAMPLE: [If incorrect, provide a better example for you to learn from. If correct, show how you could deepen it.]
"""

def evaluate_technique(
    technique_name: str,
    instruction: str,
    user_response: str,
    other_person_statement: str,
    task_title: str = ""
) -> dict:
    """
    Evaluate if a student correctly applied a negotiation technique.
    Returns: {technique_quality: str, coach_message: str, analysis: str, example: str}
    """
    user_prompt = f"""
Task: {task_title}
Technique: {technique_name}

Instruction:
{instruction}

The other person said:
"{other_person_statement}"

Student's response:
"{user_response}"

Evaluate if this response correctly applies the {technique_name} technique.
"""
    raw = call_llm(TECHNIQUE_EVALUATION_PROMPT, user_prompt)
    result = parse_technique_response(raw)
    return result


# PARSING HELPERS 
def parse_evaluation_response(raw: str) -> dict:
    """Parse analysis evaluation response."""
    result = {
        "correctness_level": "minimal",
        "feedback": ""
    }
    
    # Find the CORRECTNESS_LEVEL line
    for line in raw.split("\n"):
        if line.startswith("CORRECTNESS_LEVEL:"):
            level = line.replace("CORRECTNESS_LEVEL:", "").strip().lower()
            if level in ["excellent", "good", "acceptable", "weak", "minimal"]:
                result["correctness_level"] = level
            break
    
    feedback_start = raw.find("FEEDBACK:")
    
    if feedback_start != -1:
        feedback_text = raw[feedback_start + len("FEEDBACK:"):].strip()
        result["feedback"] = feedback_text.strip()
    
    return result


def parse_interpretation_response(raw: str) -> dict:
    """Parse interpretation evaluation response."""
    result = {
        "insight_level": "minimal",
        "coach_message": "",
        "feedback": "",
        "suggestion": ""
    }
    
    lines = raw.split("\n")
    for line in lines:
        if line.startswith("INSIGHT_LEVEL:"):
            level = line.replace("INSIGHT_LEVEL:", "").strip().lower()
            if level in ["excellent", "good", "acceptable", "weak", "minimal"]:
                result["insight_level"] = level
        elif line.startswith("COACH_MESSAGE:"):
            result["coach_message"] = line.replace("COACH_MESSAGE:", "").strip()
        elif line.startswith("FEEDBACK:"):
            result["feedback"] = line.replace("FEEDBACK:", "").strip()
        elif line.startswith("SUGGESTION:"):
            result["suggestion"] = line.replace("SUGGESTION:", "").strip()
    
    return result


def parse_plan_response(raw: str) -> dict:
    """Parse planning evaluation response."""
    result = {
        "plan_quality": "minimal",
        "coach_message": "",
        "strengths": "",
        "gaps": "",
        "suggested_refinement": ""
    }
    
    lines = raw.split("\n")
    for line in lines:
        if line.startswith("PLAN_QUALITY:"):
            quality = line.replace("PLAN_QUALITY:", "").strip().lower()
            if quality in ["excellent", "good", "acceptable", "weak", "minimal"]:
                result["plan_quality"] = quality
        elif line.startswith("COACH_MESSAGE:"):
            result["coach_message"] = line.replace("COACH_MESSAGE:", "").strip()
        elif line.startswith("STRENGTHS:"):
            result["strengths"] = line.replace("STRENGTHS:", "").strip()
        elif line.startswith("GAPS:"):
            result["gaps"] = line.replace("GAPS:", "").strip()
        elif line.startswith("SUGGESTED_REFINEMENT:"):
            result["suggested_refinement"] = line.replace("SUGGESTED_REFINEMENT:", "").strip()
    
    return result


def parse_technique_response(raw: str) -> dict:
    """Parse technique evaluation response."""
    result = {
        "technique_quality": "minimal",
        "coach_message": "",
        "analysis": "",
        "example": ""
    }
    
    lines = raw.split("\n")
    for line in lines:
        if line.startswith("TECHNIQUE_QUALITY:"):
            quality = line.replace("TECHNIQUE_QUALITY:", "").strip().lower()
            if quality in ["excellent", "good", "acceptable", "weak", "minimal"]:
                result["technique_quality"] = quality
        elif line.startswith("COACH_MESSAGE:"):
            result["coach_message"] = line.replace("COACH_MESSAGE:", "").strip()
        elif line.startswith("ANALYSIS:"):
            result["analysis"] = line.replace("ANALYSIS:", "").strip()
        elif line.startswith("EXAMPLE:"):
            result["example"] = line.replace("EXAMPLE:", "").strip()
    
    return result
