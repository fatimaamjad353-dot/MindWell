"""
MindWell Recommender System
==================================
Project   : MindWell – A Hybrid AI-Powered Mental Wellness Platform
"""

import pandas as pd
import numpy as np
import json
import os
import sys
import warnings
from datetime import datetime
warnings.filterwarnings("ignore")

# ══════════════════════════════════════════════════════════
# SECTION 1: PSYCHOLOGIST DATABASE
# ══════════════════════════════════════════════════════════

PSYCHOLOGISTS = [
    {
        "psychiatrist_id":  "PSY001",
        "name":             "Dr. Aisha Malik",
        "hospital":         "Islamabad Mental Health Clinic",
        "specializations":  ["Schizophrenia", "Bipolar", "Trauma", "Depression"],
        "experience_years": 12,
        "session_rate":     3000,
        "languages":        ["English", "Urdu"],
        "session_types":    ["video", "audio"],
        "avg_rating":       4.8,
        "total_patients":   340,
        "is_verified":      True,
        "is_available":     True,
        "contact":          "+92-51-1234567",
        "accepts_emergency": True,
    },
    {
        "psychiatrist_id":  "PSY002",
        "name":             "Dr. Hassan Raza",
        "hospital":         "Rawalpindi Wellness Center",
        "specializations":  ["Anxiety", "OCD", "Social Anxiety", "Insomnia"],
        "experience_years": 8,
        "session_rate":     2500,
        "languages":        ["English", "Urdu", "Punjabi"],
        "session_types":    ["video", "audio", "text"],
        "avg_rating":       4.6,
        "total_patients":   210,
        "is_verified":      True,
        "is_available":     True,
        "contact":          "+92-51-7654321",
        "accepts_emergency": True,
    },
    {
        "psychiatrist_id":  "PSY003",
        "name":             "Dr. Sana Qureshi",
        "hospital":         "Lahore Mind Care Hospital",
        "specializations":  ["Depression", "Grief", "Anxiety", "Eating Issues"],
        "experience_years": 6,
        "session_rate":     2000,
        "languages":        ["English", "Urdu"],
        "session_types":    ["video", "text"],
        "avg_rating":       4.5,
        "total_patients":   180,
        "is_verified":      True,
        "is_available":     True,
        "contact":          "+92-42-9876543",
        "accepts_emergency": False,
    },
    {
        "psychiatrist_id":  "PSY004",
        "name":             "Dr. Bilal Ahmed",
        "hospital":         "Karachi Psychiatric Institute",
        "specializations":  ["ADHD", "Addiction", "Trauma", "Bipolar"],
        "experience_years": 10,
        "session_rate":     2800,
        "languages":        ["English", "Urdu"],
        "session_types":    ["video", "audio"],
        "avg_rating":       4.7,
        "total_patients":   290,
        "is_verified":      True,
        "is_available":     True,
        "contact":          "+92-21-5551234",
        "accepts_emergency": True,
    },
    {
        "psychiatrist_id":  "PSY005",
        "name":             "Dr. Farah Noor",
        "hospital":         "IIUI Health Services",
        "specializations":  ["Eating Issues", "Social Anxiety", "Grief", "OCD"],
        "experience_years": 5,
        "session_rate":     1800,
        "languages":        ["English", "Urdu", "Sindhi"],
        "session_types":    ["video", "audio", "text"],
        "avg_rating":       4.3,
        "total_patients":   120,
        "is_verified":      True,
        "is_available":     True,
        "contact":          "+92-51-9990000",
        "accepts_emergency": False,
    },
    {
        "psychiatrist_id":  "PSY006",
        "name":             "Dr. Zara Khan",
        "hospital":         "Islamabad Therapy Hub",
        "specializations":  ["Depression", "Anxiety", "Grief", "Trauma"],
        "experience_years": 7,
        "session_rate":     2200,
        "languages":        ["English", "Urdu"],
        "session_types":    ["video", "audio", "text"],
        "avg_rating":       4.4,
        "total_patients":   155,
        "is_verified":      True,
        "is_available":     True,
        "contact":          "+92-51-3334444",
        "accepts_emergency": True,
    },
    {
        "psychiatrist_id":  "PSY007",
        "name":             "Dr. General Specialist",
        "hospital":         "MindWell Online Clinic",
        "specializations":  ["Anxiety", "Depression", "Trauma", "Bipolar", "Schizophrenia", "OCD", "ADHD", "Addiction", "Grief", "Insomnia", "Eating Issues", "Social Anxiety"],
        "experience_years": 10,
        "session_rate":     2500,
        "languages":        ["English", "Urdu", "Punjabi", "Sindhi"],
        "session_types":    ["video", "audio", "text"],
        "avg_rating":       4.5,
        "total_patients":   500,
        "is_verified":      True,
        "is_available":     True,
        "contact":          "+92-51-1234567",
        "accepts_emergency": True,
    },
]

# ══════════════════════════════════════════════════════════
# SECTION 2: SELF-CARE RESOURCES
# ══════════════════════════════════════════════════════════

SELF_CARE_RESOURCES = {
    "Anxiety": ["4-7-8 Breathing", "Worry Journal", "Grounding exercises"],
    "Depression": ["Behavioral Activation", "Mood diary", "10-minute walk"],
    "Bipolar": ["Sleep hygiene", "Mood chart", "Avoid caffeine"],
    "Schizophrenia": ["Reality testing", "Medication reminder"],
    "OCD": ["ERP exercises", "Ritual log", "Mindfulness"],
    "Trauma": ["Safe place visualization", "Grounding exercises"],
    "ADHD": ["Pomodoro technique", "Task breakdown"],
    "Addiction": ["Urge surfing", "Trigger identification"],
    "Grief": ["Grief journal", "Self-compassion"],
    "Insomnia": ["Sleep restriction", "No screens before bed"],
}

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die",
    "self harm", "hurt myself", "no reason to live",
    "can't go on", "give up on life", "overdose"
]

DIAGNOSIS_RATINGS = {
    "Schizophrenia": 10, "Bipolar": 9, "Addiction": 8,
    "Trauma": 7, "Eating Issues": 6, "Depression": 6,
    "OCD": 5, "Anxiety": 4, "Social Anxiety": 3,
    "ADHD": 3, "Grief": 2, "Insomnia": 1,
}

# ══════════════════════════════════════════════════════════
# SECTION 3: FUNCTIONS
# ══════════════════════════════════════════════════════════

def load_dataset(csv_path=None):
    """Load dataset from CSV file or use minimal dataset"""
    try:
        if csv_path and os.path.exists(csv_path):
            df = pd.read_csv(csv_path, skiprows=18)
            df.columns = df.columns.str.strip()
            df = df.dropna(subset=["patient_statement", "primary_diagnosis"])
            df["patient_statement"] = df["patient_statement"].str.strip()
            df["primary_diagnosis"] = df["primary_diagnosis"].str.strip()
            df["severity"] = df["severity"].str.strip()
            severity_map = {"Mild": 1, "Moderate": 2, "Severe": 3}
            df["severity_num"] = df["severity"].map(severity_map).fillna(2)
            return df
    except Exception as e:
        print(f"⚠️ Could not load CSV: {e}", file=sys.stderr)
    
    # Fallback minimal dataset
    return pd.DataFrame({
        'primary_diagnosis': ['Anxiety', 'Depression', 'Bipolar', 'Trauma', 'OCD'],
        'severity': ['Moderate', 'Severe', 'Moderate', 'Mild', 'Severe'],
        'severity_score': [5, 8, 6, 3, 9]
    })

def build_triage_summary(patient_name, mood_logs, chatbot_messages, diagnosis, severity_score):
    """Build triage summary from patient data"""
    # ── FIX: Convert all values to correct types ──
    diagnosis = str(diagnosis)
    
    # Ensure severity_score is a NUMBER (int or float)
    if isinstance(severity_score, (list, tuple)):
        severity_score = severity_score[0] if severity_score else 5
    try:
        severity_score = float(severity_score)
    except (TypeError, ValueError):
        severity_score = 5
    
    # Ensure severity_score is not a string
    if isinstance(severity_score, str):
        try:
            severity_score = float(severity_score)
        except ValueError:
            severity_score = 5
    
    # Ensure mood_logs is a list
    if not isinstance(mood_logs, list):
        mood_logs = []
    
    # Ensure chatbot_messages is a list
    if not isinstance(chatbot_messages, list):
        chatbot_messages = []
    
    # ── Continue with the rest ──
    scores = [m["score"] for m in mood_logs] if mood_logs else [5]
    avg_mood = round(sum(scores) / len(scores), 1) if scores else 5
    
    all_text = " ".join(chatbot_messages).lower() if chatbot_messages else ""
    has_crisis = any(kw in all_text for kw in CRISIS_KEYWORDS)
    
    # Calculate risk
    diagnosis_rating = DIAGNOSIS_RATINGS.get(diagnosis, 5)
    mood_risk = 10 - avg_mood
    combined_risk = round(
        (severity_score * 0.40) + (mood_risk * 0.30) + (diagnosis_rating * 0.30), 1
    )
    combined_risk = min(combined_risk, 10.0)
    
    if has_crisis:
        combined_risk = 10.0
    
    if combined_risk >= 7.0 or has_crisis:
        risk_level = "HIGH"
        action = "ESCALATE_TO_HUMAN"
    elif combined_risk >= 4.0:
        risk_level = "MODERATE"
        action = "RECOMMEND_THERAPY"
    else:
        risk_level = "LOW"
        action = "SELF_CARE"
    
    return {
        "patient_name": patient_name,
        "diagnosis": diagnosis,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "mood_analysis": {"average_mood": avg_mood, "total_logs": len(mood_logs)},
        "chatbot_analysis": {"total_messages": len(chatbot_messages), "crisis_flag": has_crisis},
        "risk_assessment": {
            "severity_score": severity_score,
            "combined_risk": combined_risk,
            "risk_level": risk_level,
            "action": action,
            "crisis_detected": has_crisis,
            "diagnosis_rating": diagnosis_rating
        }
    }

def recommend_from_triage(triage_summary, session_preference, language, df, top_n=3):
    """Recommend psychologists based on triage summary"""
    diagnosis = str(triage_summary["diagnosis"])
    severity_score = triage_summary["risk_assessment"]["severity_score"]
    risk_level = triage_summary["risk_assessment"]["risk_level"]
    action = triage_summary["risk_assessment"]["action"]
    
    scored = []
    
    for psy in PSYCHOLOGISTS:
        if not psy["is_available"] or not psy["is_verified"]:
            continue
        if session_preference not in psy["session_types"]:
            continue
        if language not in psy["languages"]:
            continue
        if risk_level == "HIGH" and not psy["accepts_emergency"]:
            continue
        
        # Content-based score
        score = 0.0
        if diagnosis in psy["specializations"]:
            score += 0.6
        score += (psy["experience_years"] / 20) * 0.2
        score += (psy["avg_rating"] / 5) * 0.2
        score = min(score, 1.0)
        
        if score > 0:
            scored.append({**psy, "final_score": round(score, 3)})
    
    scored.sort(key=lambda x: x["final_score"], reverse=True)
    
    # ── If no matches, return fallback ──
    if not scored:
        fallback = [
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
                "final_score": 0.85,
                "match_reason": f"Specializes in {diagnosis}"
            },
            {
                "psychiatrist_id": "PSY006",
                "name": "Dr. Zara Khan",
                "hospital": "Islamabad Therapy Hub",
                "specializations": ["Depression", "Anxiety", "Grief", "Trauma"],
                "experience_years": 7,
                "session_rate": 2200,
                "languages": ["English", "Urdu"],
                "session_types": ["video", "audio", "text"],
                "avg_rating": 4.4,
                "total_patients": 155,
                "is_verified": True,
                "is_available": True,
                "contact": "+92-51-3334444",
                "accepts_emergency": True,
                "final_score": 0.75,
                "match_reason": f"Expert in {diagnosis}"
            }
        ]
        scored = fallback
    
    return {
        "triage_summary": triage_summary,
        "action": action,
        "risk_level": risk_level,
        "psychologists": scored[:top_n],
        "resources": SELF_CARE_RESOURCES.get(diagnosis, ["Deep breathing", "Reach out to a friend"]),
        "session_preference": session_preference,
        "language": language
    }