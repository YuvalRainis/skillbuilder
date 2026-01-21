from llm.client import call_llm

# ANALYSIS TASK 
ANALYSIS_EVALUATION_PROMPT = """
You are a STRICT negotiation coach evaluating a learner's analysis of a negotiation case study.

Your job is to:
1. Assess if the student's answer is FACTUALLY CORRECT and identifies the right sentence/tactic
2. Do NOT require explanation - just correct identification of the sentence/tactic is enough
3. Mark as CORRECT if the student identifies a sentence that actually functions as an excuse or manipulation tactic
4. Mark as INCORRECT if the identified sentence does NOT function as an excuse/tactic or is wrong
5. Provide specific feedback explaining why their answer is correct or incorrect

CRITICAL GRADING RULES:
- If the student identifies a sentence that IS ACTUALLY an excuse/tactic: CORRECT = yes, GRADE = 4-5
- If the student identifies a sentence that is NOT an excuse/tactic: CORRECT = no, GRADE = 0-2
- Do NOT require lengthy explanations - identifying the right sentence = correct answer
- Do NOT penalize for not explaining the "why" - that's bonus, not required
- INCORRECT ANSWERS = 0-2/5 ALWAYS
- CORRECT ANSWERS = 4-5/5 (not lower)
- Provide ONE concise, unified paragraph of feedback (max 4-5 sentences)

IMPORTANT: You MUST return your response in EXACTLY this format (with the labels):
CORRECT: yes or no
GRADE: [A score from 0-5. Use 4-5 for correct sentence identification, 0-2 for incorrect]
FEEDBACK: [Your feedback paragraph here]

Do not add any other text or explanation. Just these three lines.

CRITICAL CONTEXT FOR EXCUSES IN NEGOTIATION:
In negotiation, an EXCUSE is ANY reason or explanation used to AVOID, DEFLECT, or SIDESTEP a request - even if that reason is factually true.

EXAMPLES OF EXCUSES (what to look for):
- "We can't afford to give raises at this time" - using financial constraints as deflection [EXCUSE]
- "We're experiencing financial difficulties" - using financial reasons to avoid addressing the request [EXCUSE]
- "We're in a period of transition" - using situational reasons to deflect [EXCUSE]
- "Let's revisit this in six months" - postponing to avoid immediate response [EXCUSE]
- "I'm not sure if this is the right time" - expressing uncertainty to sidestep the request [EXCUSE]

Even if these reasons are FACTUALLY TRUE, they are EXCUSES because they are used to sidestep the actual request.

The KEY is: Is the speaker using this reason to AVOID or DEFLECT the request? If yes, it's an excuse.

CRITICAL CONTEXT FOR MANIPULATION TACTICS:
Good Cop / Bad Cop is a manipulation tactic where someone shifts tactics by:
1. Starting with pressure, confrontation, or taking a hard position (even if it includes validation/empathy)
2. Then pivoting to reassurance, cooperation, and agreement
3. The tactic works BECAUSE it mixes pressure with false agreement to manipulate the other person

IMPORTANT: Good cop/bad cop does NOT require pure aggression followed by pure kindness. It can include empathy in the "bad cop" moment - that's what makes it manipulative. The key is the SHIFT in tactics and the underlying intent to pressure then reassure.

EXAMPLES OF GOOD COP / BAD COP:
- "I think we're way off base" (pressure) + "Emily is right to be concerned" (validation) [BAD COP]
- Then: "But if Emily is willing to work with us, I'm sure we can find a solution" (reassurance) [GOOD COP]
This is manipulation because the speaker creates uncertainty (bad cop) then offers relief through cooperation (good cop).

EVALUATION CRITERIA:
- If student correctly identifies a sentence that IS an excuse/tactic: CORRECT = yes, GRADE = 4-5
- If student incorrectly identifies a sentence that is NOT an excuse/tactic: CORRECT = no, GRADE = 0-2
"""

def evaluate_analysis(
    question: str,
    user_answer: str,
    task_title: str = ""
) -> dict:
    """
    Evaluate a student's analysis answer (for analysis tasks).
    Returns: {correct: bool, feedback: str, grade: int}
    """
    user_prompt = f"""
Task: {task_title}

Question:
{question}

Student's Answer:
{user_answer}

IMPORTANT GRADING RULES:
- If the student's answer is INCORRECT, the GRADE must be 0-2 (NOT higher)
- If the student's answer is CORRECT, the GRADE must be 4-5 (NOT lower)
- Do NOT give high grades to wrong answers

Evaluate this answer and provide feedback.
"""
    raw = call_llm(ANALYSIS_EVALUATION_PROMPT, user_prompt)
    result = parse_evaluation_response(raw)
    
    # Safety check: if answer is marked as INCORRECT but grade is high, force grade down
    if result["correct"] == False and result["grade"] > 2:
        result["grade"] = 1 
    
    return result


# INTERPRETATION TASK 
INTERPRETATION_EVALUATION_PROMPT = """
You are a STRICT negotiation coach providing personal feedback to a learner about their interpretation skills.
Grade ONLY based on actual insight and substantive engagement with the task.

CRITICAL GRADING RULES:
- MINIMAL/NON-SUBSTANTIVE RESPONSES (single word, vague phrases, obvious non-engagement, "I don't know", "don't know") = ALWAYS 1/5
  Examples: "I don't know", "something", "not sure", "they're upset", generic one-liners with no insight, "DONT know", "idk"
- NEVER give 2/5 to minimal effort - jump from 1/5 to 3/5 minimum for ANY partial credit
- Do NOT reward politeness, friendliness, or effort statements
- ONLY score based on: quality of insight + depth of understanding + support from text
- Excellent insights about actual human needs = 5
- Reasonable but shallow interpretation = 3
- No engagement or clearly minimal effort = 1 ALWAYS (never 2)

Rules:
- Speak DIRECTLY to the person (use "you") - NOT about "the student"
- FIRST: Check if the answer is grounded in the source material. If the person didn't say something, don't assume they did.
- If the interpretation is inaccurate or unsupported by the source material, clearly point this out
- Focus on THEIR ability to understand human needs and motivations based on what was actually stated
- Celebrate genuine insights and guide them to deeper thinking
- Coach message should NOT include generic greetings (no "Hi there") - that's added separately

Output format (REQUIRED - MUST output all of these):
INSIGHT_DEPTH: [minimal/shallow/good/excellent]
GRADE: [1/5 for minimal, 3/5 minimum for any effort, 4-5 for good insights]
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
    Returns: {reasonable: bool, insight_depth: str, feedback: str, suggestion: str}
    """
    # Check if answer is obviously minimal
    minimal_phrases = ["don't know", "dont know", "idk", "i don't know", "i dont know", "not sure", "unclear", "unsure", "?", "..."]
    answer_lower = user_answer.strip().lower()
    is_minimal = len(user_answer.strip()) < 20 or answer_lower in minimal_phrases or any(answer_lower == phrase for phrase in minimal_phrases)
    
    user_prompt = f"""
Task: {task_title}

The position stated is:
"{position}"

Student's interpretation of underlying needs:
"{user_answer}"

IMPORTANT: If the student's answer is minimal, non-substantive, or obviously shows no engagement (like "don't know", "not sure", etc.), you MUST give them a GRADE of 1/5. Do NOT give any higher grade to non-engagement.

Evaluate this interpretation. Does it show good understanding of human needs behind the position?
"""
    raw = call_llm(INTERPRETATION_EVALUATION_PROMPT, user_prompt)
    result = parse_interpretation_response(raw, user_answer=user_answer)
    
    # FORCE grade to 1 if answer is obviously minimal (safety check)
    if is_minimal and result["grade"] > 1:
        result["grade"] = 1
        result["insight_depth"] = "minimal"
    
    return result


# PLANNING TASK 
PLANNING_EVALUATION_PROMPT = """
You are a STRICT negotiation coach providing personal feedback on a learner's planning skills.
Grade ONLY based on realistic plans with genuine strategic thinking and engagement.

CRITICAL GRADING RULES:
- MINIMAL/NON-SUBSTANTIVE RESPONSES (single sentence, vague plans, no real strategy, one-word answers) = ALWAYS 1/5
  Examples: "just ask for more", "negotiate", "I'm not sure", empty or generic statements
- NEVER give 2/5 to minimal effort - jump from 1/5 to 3/5 minimum for ANY partial engagement
- Do NOT reward effort, politeness, or tone
- ONLY score based on: realism + constraint handling + strategic depth + specificity
- Strong plan addressing constraints = 4-5
- Moderate plan with some gaps = 3
- Weak plan with minimal engagement = 1/5 (NEVER 2/5)

Rules:
- Speak DIRECTLY to the person (use "you") - NOT about "the student"
- Focus on THEIR strategic thinking and how well they handle constraints
- Celebrate genuine strategic insight and guide them toward stronger approaches
- Coach message should NOT include generic greetings (no "Hi there") - that's added separately

Output format:
PLAN_QUALITY: [weak/moderate/strong]
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
    Returns: {plan_quality: str, strengths: str, gaps: str, suggested_refinement: str}
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
Grade ONLY based on proper technique application and quality of execution.

CRITICAL GRADING RULES:
- MINIMAL/NON-SUBSTANTIVE RESPONSES (one word, vague statement, no actual technique application) = ALWAYS 1/5
  Examples: "okay", "I hear you", "sad", responses that don't demonstrate the technique at all
- NEVER give 2/5 to minimal effort - jump from 1/5 to 3/5 minimum for ANY partial engagement
- Do NOT reward politeness, tone, or effort statements
- ONLY score based on: proper technique application + quality of execution + understanding shown
- Correct technique, well-applied = 4-5 (excellent)
- Technique applied but rough edges = 3 (acceptable)
- Minimal effort or technique not applied = 1/5 (NEVER 2/5)

Rules:
- Speak DIRECTLY to the person (use "you") - NOT about "the student"
- Focus on THEIR actual application of the technique
- For mirroring: the response should restate the other person's words/feelings in their own words
- For other techniques: evaluate if the response follows the technique rules
- Coach message should NOT include generic greetings (no "Hi there") - that's added separately

Output format:
TECHNIQUE_APPLIED: [yes/no]
QUALITY: [poor/acceptable/excellent]
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
    Returns: {technique_applied: bool, quality: str, analysis: str, example: str}
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
        "correct": False,
        "grade": 0,
        "feedback": ""
    }
    
    # Find the CORRECT line
    for line in raw.split("\n"):
        if line.startswith("CORRECT:"):
            result["correct"] = "yes" in line.lower()
            break
    
    # Find GRADE
    for line in raw.split("\n"):
        if line.startswith("GRADE:"):
            try:
                grade_text = line.replace("GRADE:", "").strip()
                if grade_text:  
                    parts = grade_text.split()[0] if grade_text.split() else ""
                    if parts:
                        grade_num = float(''.join(c for c in parts if c.isdigit() or c == '.'))
                        result["grade"] = min(5, max(0, grade_num))  # Clamp to 0-5
            except (ValueError, IndexError, AttributeError):
                result["grade"] = 0
            break
    
    feedback_start = raw.find("FEEDBACK:")
    
    if feedback_start != -1:
        feedback_text = raw[feedback_start + len("FEEDBACK:"):].strip()
        result["feedback"] = feedback_text.strip()
    
    # If grade is still 0, infer from correctness
    if result["grade"] == 0:
        result["grade"] = 5 if result["correct"] else 2
    
    return result


def parse_interpretation_response(raw: str, user_answer: str = "") -> dict:
    """Parse interpretation evaluation response."""
    result = {
        "reasonable": False,
        "insight_depth": "shallow",
        "grade": 0,
        "coach_message": "",
        "feedback": "",
        "suggestion": ""
    }
    
    minimal_phrases = ["don't know", "dont know", "idk", "i don't know", "i dont know", "not sure", "unclear", "unsure", "?", "..."]
    if user_answer:
        answer_lower = user_answer.strip().lower()
        is_minimal = len(user_answer.strip()) < 20 or any(answer_lower == phrase for phrase in minimal_phrases)
        if is_minimal:
            result["insight_depth"] = "minimal"
    
    lines = raw.split("\n")
    for line in lines:
        if line.startswith("REASONABLE:"):
            result["reasonable"] = "yes" in line.lower()
        elif line.startswith("INSIGHT_DEPTH:"):
            depth = line.replace("INSIGHT_DEPTH:", "").strip().lower()
            if depth in ["minimal", "shallow", "good", "excellent"]:
                result["insight_depth"] = depth
        elif line.startswith("GRADE:"):
            try:
                grade_text = line.replace("GRADE:", "").strip()
                if grade_text:  
                    parts = grade_text.split()[0] if grade_text.split() else ""
                    if parts:
                        grade_num = float(''.join(c for c in parts if c.isdigit() or c == '.'))
                        result["grade"] = min(5, max(0, grade_num))  
            except (ValueError, IndexError, AttributeError):
                result["grade"] = 0
        elif line.startswith("COACH_MESSAGE:"):
            result["coach_message"] = line.replace("COACH_MESSAGE:", "").strip()
        elif line.startswith("FEEDBACK:"):
            result["feedback"] = line.replace("FEEDBACK:", "").strip()
        elif line.startswith("SUGGESTION:"):
            result["suggestion"] = line.replace("SUGGESTION:", "").strip()
    
    # If grade is still 0, infer from insight_depth
    if result["grade"] == 0:
        if result["insight_depth"] == "minimal":
            result["grade"] = 1
        elif result["insight_depth"] == "shallow":
            result["grade"] = 1
        elif result["insight_depth"] == "good":
            result["grade"] = 3
        elif result["insight_depth"] == "excellent":
            result["grade"] = 5
    
    return result


def parse_plan_response(raw: str) -> dict:
    """Parse planning evaluation response."""
    result = {
        "plan_quality": "moderate",
        "coach_message": "",
        "strengths": "",
        "gaps": "",
        "suggested_refinement": ""
    }
    
    lines = raw.split("\n")
    for line in lines:
        if line.startswith("PLAN_QUALITY:"):
            quality = line.replace("PLAN_QUALITY:", "").strip().lower()
            if quality in ["weak", "moderate", "strong"]:
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
        "technique_applied": False,
        "quality": "poor",
        "coach_message": "",
        "analysis": "",
        "example": ""
    }
    
    lines = raw.split("\n")
    for line in lines:
        if line.startswith("TECHNIQUE_APPLIED:"):
            result["technique_applied"] = "yes" in line.lower()
        elif line.startswith("QUALITY:"):
            quality = line.replace("QUALITY:", "").strip().lower()
            if quality in ["poor", "acceptable", "excellent"]:
                result["quality"] = quality
        elif line.startswith("COACH_MESSAGE:"):
            result["coach_message"] = line.replace("COACH_MESSAGE:", "").strip()
        elif line.startswith("ANALYSIS:"):
            result["analysis"] = line.replace("ANALYSIS:", "").strip()
        elif line.startswith("EXAMPLE:"):
            result["example"] = line.replace("EXAMPLE:", "").strip()
    
    return result
