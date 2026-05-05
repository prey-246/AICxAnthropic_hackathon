from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from models import *
from database import supabase
from dotenv import load_dotenv
import anthropic
import PyPDF2
import json
import os
import io

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

try:
    with open("../data/opportunities.json", "r", encoding="utf-8") as f:
        content = f.read().strip()
        OPPORTUNITIES = json.loads(content) if content else []
except Exception:
    OPPORTUNITIES = []

# ─── UTILS ────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text

def get_opportunity_by_id(opportunity_id: str):
    for opp in OPPORTUNITIES:
        if opp["id"] == opportunity_id:
            return opp
    return None

def call_claude(prompt: str, system: str = "") -> str:
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=system if system else "You are a helpful assistant. Always respond in valid JSON unless told otherwise.",
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

# ─── ROUTES ───────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "OpportunityOS backend running"}


@app.post("/extract-profile")
async def extract_profile(
    file: UploadFile = File(...),
    name: str = Form(...),
    college: str = Form(...),
    cgpa: float = Form(...),
    field: str = Form(...),
    financial_background: str = Form(...)
):
    file_bytes = await file.read()
    resume_text = extract_text_from_pdf(file_bytes)

    from prompts import PROFILE_EXTRACTION_PROMPT
    prompt = PROFILE_EXTRACTION_PROMPT.format(
        resume_text=resume_text,
        name=name,
        college=college,
        cgpa=cgpa,
        field=field,
        financial_background=financial_background
    )

    result = call_claude(prompt)
    profile = json.loads(result)
    profile["resume_text"] = resume_text
    return profile


@app.post("/match-opportunities")
def match_opportunities(profile: UserProfile):
    from prompts import OPPORTUNITY_MATCHING_PROMPT
    prompt = OPPORTUNITY_MATCHING_PROMPT.format(
        profile=json.dumps(profile.dict()),
        opportunities=json.dumps(OPPORTUNITIES)
    )
    result = call_claude(prompt)
    return json.loads(result)


@app.post("/analyse-gaps")
def analyse_gaps(request: GapAnalysisRequest):
    opportunity = get_opportunity_by_id(request.opportunity_id)
    if not opportunity:
        return {"error": "Opportunity not found"}

    from prompts import GAP_ANALYSIS_PROMPT
    prompt = GAP_ANALYSIS_PROMPT.format(
        profile=json.dumps(request.profile.dict()),
        opportunity=json.dumps(opportunity)
    )
    result = call_claude(prompt)
    return json.loads(result)


@app.post("/action-plan")
def action_plan(request: GapAnalysisRequest):
    opportunity = get_opportunity_by_id(request.opportunity_id)
    if not opportunity:
        return {"error": "Opportunity not found"}

    from prompts import ACTION_PLAN_PROMPT
    prompt = ACTION_PLAN_PROMPT.format(
        profile=json.dumps(request.profile.dict()),
        opportunity=json.dumps(opportunity)
    )
    result = call_claude(prompt)
    return json.loads(result)


@app.post("/draft-application")
def draft_application(request: DraftRequest):
    opportunity = get_opportunity_by_id(request.opportunity_id)
    if not opportunity:
        return {"error": "Opportunity not found"}

    from prompts import APPLICATION_DRAFT_PROMPT
    prompt = APPLICATION_DRAFT_PROMPT.format(
        profile=json.dumps(request.profile.dict()),
        opportunity=json.dumps(opportunity),
        essay_prompt=request.essay_prompt
    )
    result = call_claude(prompt)
    return {"draft": result}


@app.post("/draft-recommendation")
def draft_recommendation(request: RecommendationRequest):
    opportunity = get_opportunity_by_id(request.opportunity_id)
    if not opportunity:
        return {"error": "Opportunity not found"}

    from prompts import RECOMMENDATION_REQUEST_PROMPT, RECOMMENDATION_LETTER_PROMPT

    request_prompt = RECOMMENDATION_REQUEST_PROMPT.format(
        profile=json.dumps(request.profile.dict()),
        opportunity=json.dumps(opportunity),
        recommender_type=request.recommender_type,
        relationship_context=request.relationship_context
    )

    letter_prompt = RECOMMENDATION_LETTER_PROMPT.format(
        profile=json.dumps(request.profile.dict()),
        opportunity=json.dumps(opportunity),
        recommender_type=request.recommender_type
    )

    request_email = call_claude(request_prompt)
    rec_letter = call_claude(letter_prompt)

    return {
        "request_email": request_email,
        "recommendation_letter": rec_letter
    }


@app.get("/opportunities")
def get_opportunities():
    return OPPORTUNITIES


@app.post("/tracker/update")
def update_tracker(update: TrackerUpdate):
    result = supabase.table("applications").upsert({
        "user_id": update.user_id,
        "opportunity_id": update.opportunity_id,
        "status": update.status,
        "completion_pct": update.completion_pct
    }).execute()
    return result.data


@app.get("/tracker/{user_id}")
def get_tracker(user_id: str):
    result = supabase.table("applications").select("*").eq("user_id", user_id).execute()
    return result.data