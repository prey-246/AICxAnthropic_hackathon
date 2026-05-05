PROFILE_EXTRACTION_PROMPT = """
You are extracting structured profile data from a student's resume and form inputs.

Resume text:
{resume_text}

Form data:
Name: {name}
College: {college}
CGPA: {cgpa}
Field of Study: {field}
Financial Background: {financial_background}

Extract and return ONLY a valid JSON object with this exact structure:
{{
    "name": "",
    "college": "",
    "cgpa": 0.0,
    "field": "",
    "financial_background": "",
    "skills": [],
    "achievements": [],
    "experience": [],
    "certifications": [],
    "projects": [],
    "gaps": []
}}

For "gaps", identify obvious weaknesses in the profile — missing internships, low CGPA, no leadership roles, no research etc.
Return ONLY the JSON. No explanation, no markdown.
"""

OPPORTUNITY_MATCHING_PROMPT = """
You are matching a student profile to a list of opportunities.

Student profile:
{profile}

Available opportunities:
{opportunities}

For each opportunity, assess fit based on eligibility criteria, CGPA, field, financial background, and profile strengths.

Return ONLY a valid JSON array, ranked from best to worst fit:
[
    {{
        "id": "",
        "name": "",
        "fit_score": 0,
        "fit_reason": "",
        "deadline": "",
        "award": "",
        "type": ""
    }}
]

fit_score is out of 100. fit_reason is one plain English sentence explaining why they match or don't.
Return ONLY the JSON array. No explanation, no markdown.
"""

GAP_ANALYSIS_PROMPT = """
You are analysing the gap between a student's profile and a specific opportunity's requirements.

Student profile:
{profile}

Opportunity:
{opportunity}

Compare the student's profile against the opportunity's eligibility criteria, requirements, and benchmarks.

Return ONLY a valid JSON object:
{{
    "overall_competitiveness": "strong | borderline | significant work needed",
    "gaps": [
        {{
            "area": "",
            "description": "",
            "severity": "blocker | weak | strong",
            "benchmark": "",
            "user_status": ""
        }}
    ],
    "strengths": []
}}

For each gap:
- area: what aspect (e.g. "CGPA", "Leadership", "Research Experience")
- description: plain English explanation of the gap
- severity: blocker = will likely disqualify, weak = hurts chances, strong = this is actually a strength
- benchmark: what successful applicants typically have
- user_status: what the student currently has

Return ONLY the JSON. No explanation, no markdown.
"""

ACTION_PLAN_PROMPT = """
You are creating a concrete action plan to help a student close their gaps before an opportunity deadline.

Student profile:
{profile}

Opportunity (includes deadline):
{opportunity}

Generate a realistic week by week action plan. Be specific — name actual organisations, actual resources, actual steps.

Return ONLY a valid JSON object:
{{
    "weeks_available": 0,
    "tasks": [
        {{
            "week": 1,
            "task": "",
            "description": "",
            "resources": [],
            "time_required": "",
            "gap_addressed": ""
        }}
    ]
}}

Return ONLY the JSON. No explanation, no markdown.
"""

APPLICATION_DRAFT_PROMPT = """
You are drafting a scholarship/internship application essay for a student.

Student profile:
{profile}

Opportunity:
{opportunity}

Essay prompt (if any):
{essay_prompt}

Write a strong first draft personal statement using ONLY facts from the student's profile.
Where you need information the profile doesn't have, insert [NEEDS YOUR INPUT: description of what to add] inline.

Return the essay as plain text. No JSON. No markdown formatting.
Write in first person. Be specific, not generic. 400-600 words.
"""

RECOMMENDATION_REQUEST_PROMPT = """
You are writing an email from a student to their {recommender_type} requesting a recommendation letter.

Student profile:
{profile}

Opportunity they are applying for:
{opportunity}

Relationship context:
{relationship_context}

Write a concise, respectful, professional email. Include:
- Why they are asking this specific person
- What the opportunity is and why it matters to the student
- The deadline
- An offer to share a draft letter to make it easier

Return the email as plain text. No JSON. No markdown.
"""

RECOMMENDATION_LETTER_PROMPT = """
You are drafting a recommendation letter for a student, written from the perspective of their {recommender_type}.

Student profile:
{profile}

Opportunity:
{opportunity}

Write a strong, specific recommendation letter using only facts from the student's profile.
Where the recommender should add personal observations, insert [PROFESSOR TO ADD: description] inline.

Return the letter as plain text. No JSON. No markdown. 300-400 words.
"""