from pydantic import BaseModel
from typing import Optional, List

class UserProfile(BaseModel):
    name: str
    college: str
    cgpa: float
    field: str
    financial_background: str
    skills: Optional[List[str]] = []
    achievements: Optional[List[str]] = []
    experience: Optional[List[str]] = []
    resume_text: Optional[str] = ""

class OpportunityMatch(BaseModel):
    user_id: str
    opportunity_id: str

class GapAnalysisRequest(BaseModel):
    profile: UserProfile
    opportunity_id: str

class DraftRequest(BaseModel):
    profile: UserProfile
    opportunity_id: str
    essay_prompt: Optional[str] = ""

class RecommendationRequest(BaseModel):
    profile: UserProfile
    opportunity_id: str
    recommender_type: str
    relationship_context: str

class TrackerUpdate(BaseModel):
    user_id: str
    opportunity_id: str
    status: str
    completion_pct: Optional[int] = 0