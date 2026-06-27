# src/ai-models/recommender_wrapper.py
"""
MindWell Recommender - Python Wrapper for Node.js Integration
"""

import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
import warnings
from datetime import datetime
warnings.filterwarnings("ignore")

SCRIPT_DIR = Path(__file__).parent.absolute()

# ─── Check for sklearn ──────────────────────────────
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("⚠️ sklearn not available. Using fallback matching.", file=sys.stderr)

# ─── Import Sara's Recommender Functions ────────────
sys.path.append(str(SCRIPT_DIR))

try:
    from mindwell_recommender import (
        load_dataset,
        build_triage_summary,
        recommend_from_triage,
        PSYCHOLOGISTS,
        SELF_CARE_RESOURCES,
        CRISIS_KEYWORDS,
        DIAGNOSIS_RATINGS
    )
    print("✅ Recommender module loaded successfully", file=sys.stderr)
except ImportError as e:
    print(f"⚠️ Could not import recommender: {e}", file=sys.stderr)
    print("⚠️ Using fallback recommendations", file=sys.stderr)

# ─── Load Dataset ────────────────────────────────────
DATASET_PATHS = [
    SCRIPT_DIR / "psychiatry_dataset_final.csv",
    SCRIPT_DIR / "dataset" / "psychiatry_dataset_final.csv",
    Path("C:/mindwell/dataset/psychiatry_dataset_final.csv"),
    Path("./dataset/psychiatry_dataset_final.csv"),
]

DATASET = None
for path in DATASET_PATHS:
    if path.exists():
        try:
            DATASET = load_dataset(str(path))
            print(f"✅ Dataset loaded from: {path}", file=sys.stderr)
            break
        except Exception as e:
            print(f"⚠️ Failed to load from {path}: {e}", file=sys.stderr)

if DATASET is None:
    print("⚠️ Using minimal test dataset", file=sys.stderr)
    DATASET = pd.DataFrame({
        'patient_statement': ['I feel anxious all the time', 'I can\'t sleep at night', 'I feel hopeless'],
        'primary_diagnosis': ['Anxiety', 'Insomnia', 'Depression'],
        'severity': ['Moderate', 'Severe', 'Moderate'],
        'severity_score': [5, 8, 6]
    })

# ─── Fallback Psychologists ──────────────────────────
FALLBACK_PSYCHOLOGISTS = [
    {
        "psychiatrist_id": "PSY001",
        "name": "Dr. Aisha Malik",
        "hospital": "Islamabad Mental Health Clinic",
        "specializations": ["Schizophrenia", "Bipolar", "Trauma", "Depression"],
        "experience_years": 12,
        "session_rate": 3000,
        "languages": ["English", "Urdu"],
        "session_types": ["video", "audio"],
        "avg_rating": 4.8,
        "total_patients": 340,
        "is_verified": True,
        "is_available": True,
        "contact": "+92-51-1234567",
        "accepts_emergency": True,
    },
    {
        "psychiatrist_id": "PSY002",
        "name": "Dr. Hassan Raza",
        "hospital": "Rawalpindi Wellness Center",
        "specializations": ["Anxiety", "OCD", "Social Anxiety", "Insomnia"],
        "experience_years": 8,
        "session_rate": 2500,
        "languages": ["English", "Urdu", "Punjabi"],
        "session_types": ["video", "audio", "text"],
        "avg_rating": 4.6,
        "total_patients": 210,
        "is_verified": True,
        "is_available": True,
        "contact": "+92-51-7654321",
        "accepts_emergency": True,
    },
    {
        "psychiatrist_id": "PSY003",
        "name": "Dr. Sana Qureshi",
        "hospital": "Lahore Mind Care Hospital",
        "specializations": ["Depression", "Grief", "Anxiety", "Eating Issues"],
        "experience_years": 6,
        "session_rate": 2000,
        "languages": ["English", "Urdu"],
        "session_types": ["video", "text"],
        "avg_rating": 4.5,
        "total_patients": 180,
        "is_verified": True,
        "is_available": True,
        "contact": "+92-42-9876543",
        "accepts_emergency": False,
    }
]

# ─── Fallback Triage Builder ────────────────────────
def fallback_triage(patient_name, mood_logs, chatbot_messages, diagnosis, severity_score):
    """Simple triage builder when the main one isn't available"""
    scores = [m["score"] for m in mood_logs]
    avg_mood = round(sum(scores) / len(scores), 1) if scores else 5
    
    # Simple risk calculation
    risk_score = severity_score
    crisis_keywords = ["suicide", "kill", "die", "self harm", "hurt myself"]
    text = " ".join(chatbot_messages).lower()
    has_crisis = any(kw in text for kw in crisis_keywords)
    
    if has_crisis:
        risk_level = "HIGH"
        action = "ESCALATE_TO_HUMAN"
        risk_score = 10
    elif severity_score >= 7:
        risk_level = "HIGH"
        action = "ESCALATE_TO_HUMAN"
    elif severity_score >= 4:
        risk_level = "MODERATE"
        action = "RECOMMEND_THERAPY"
    else:
        risk_level = "LOW"
        action = "SELF_CARE"
    
    return {
        "patient_name": patient_name,
        "diagnosis": diagnosis,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "mood_analysis": {
            "average_mood": avg_mood,
            "total_logs": len(mood_logs),
        },
        "chatbot_analysis": {
            "total_messages": len(chatbot_messages),
            "crisis_flag": has_crisis,
        },
        "risk_assessment": {
            "severity_score": severity_score,
            "combined_risk": risk_score,
            "risk_level": risk_level,
            "action": action,
            "crisis_detected": has_crisis,
        }
    }

# ─── Main Function ────────────────────────────────────
def main():
    try:
        # Read input from Node.js
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)
        
        # Parse JSON input
        data = json.loads(input_data)
        
        # Extract parameters
        patient_name = data.get('patient_name', 'Patient')
        mood_logs = data.get('mood_logs', [])
        chatbot_messages = data.get('chatbot_messages', [])
        diagnosis = data.get('diagnosis', 'Anxiety')
        severity_score = data.get('severity_score', 5)
        session_preference = data.get('session_preference', 'video')
        language = data.get('language', 'English')
        top_n = data.get('top_n', 3)
        
        # ── Build Triage Summary ────────────────────
        try:
            triage_summary = build_triage_summary(
                patient_name,
                mood_logs,
                chatbot_messages,
                diagnosis,
                severity_score
            )
        except Exception as e:
            print(f"⚠️ Error in build_triage_summary: {e}", file=sys.stderr)
            triage_summary = fallback_triage(
                patient_name,
                mood_logs,
                chatbot_messages,
                diagnosis,
                severity_score
            )
        
        # ── Get Recommendations ─────────────────────
        try:
            result = recommend_from_triage(
                triage_summary,
                session_preference,
                language,
                DATASET,
                top_n=top_n
            )
            psychologists = result.get("psychologists", [])
            resources = result.get("resources", [])
            action = result.get("action", "RECOMMEND_THERAPY")
            risk_level = result.get("risk_level", "MODERATE")
        except Exception as e:
            print(f"⚠️ Error in recommend_from_triage: {e}", file=sys.stderr)
            psychologists = FALLBACK_PSYCHOLOGISTS[:top_n]
            resources = [
                "Practice deep breathing exercises",
                "Reach out to a trusted friend",
                "Write down your thoughts",
                "Take a break and do something you enjoy"
            ]
            action = "RECOMMEND_THERAPY" if severity_score >= 4 else "SELF_CARE"
            risk_level = "HIGH" if severity_score >= 7 else ("MODERATE" if severity_score >= 4 else "LOW")
        
        # ── Format Response ─────────────────────────
        response = {
            "success": True,
            "triage_summary": triage_summary,
            "action": action,
            "risk_level": risk_level,
            "psychologists": [],
            "resources": resources,
            "session_preference": session_preference,
            "language": language
        }
        
        # Format psychologists for JSON
        for psy in psychologists:
            response["psychologists"].append({
                "psychiatrist_id": psy.get("psychiatrist_id", ""),
                "name": psy.get("name", ""),
                "hospital": psy.get("hospital", ""),
                "specializations": psy.get("specializations", []),
                "experience_years": psy.get("experience_years", 0),
                "session_rate": psy.get("session_rate", 0),
                "languages": psy.get("languages", []),
                "session_types": psy.get("session_types", []),
                "avg_rating": psy.get("avg_rating", 0),
                "total_patients": psy.get("total_patients", 0),
                "is_verified": psy.get("is_verified", False),
                "is_available": psy.get("is_available", False),
                "contact": psy.get("contact", ""),
                "accepts_emergency": psy.get("accepts_emergency", False),
                "final_score": psy.get("final_score", 0.5),
                "match_reason": psy.get("match_reason", "Good match based on your needs")
            })
        
        # Print JSON response
        print(json.dumps(response, default=str))
        
    except Exception as e:
        error_response = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    main()