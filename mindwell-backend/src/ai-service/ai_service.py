"""
MindWell AI Service
====================
Single service for ALL AI models:
- Diagnosis Classification (DistilBERT) - English, Arabic, Roman Urdu
- Sentiment/Emotion Analysis
- Severity Scoring
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import pickle
import re
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from textblob import TextBlob
import os
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="MindWell AI Service")

# ══════════════════════════════════════════════════════════
# CONFIGURATION — Absolute paths so it works from anywhere
# ══════════════════════════════════════════════════════════

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── English Model ──────────────────────────────────────
DIAG_MODEL_PATH      = os.path.join(BASE_DIR, "psych_diag_model")
DIAG_ENCODER_PATH    = os.path.join(BASE_DIR, "diag_encoder.pkl")

# ── Arabic Model ──────────────────────────────────────
ARABIC_MODEL_PATH    = os.path.join(BASE_DIR, "psych_arabic_model")
ARABIC_ENCODER_PATH  = os.path.join(BASE_DIR, "diag_arabic_encoder.pkl")

# ── Roman Urdu Model ──────────────────────────────────
ROMAN_MODEL_PATH     = os.path.join(BASE_DIR, "psych_roman_diag_model")
ROMAN_ENCODER_PATH   = os.path.join(BASE_DIR, "diag_roman_encoder.pkl")

# ── Sentiment Model ──────────────────────────────────
SENTIMENT_MODEL_PATH    = os.path.join(BASE_DIR, "psych_sev_model")
SENTIMENT_ENCODER_PATH  = os.path.join(BASE_DIR, "sev_encoder.pkl")

MAX_LENGTH = 128

# ══════════════════════════════════════════════════════════
# LOAD ENGLISH MODEL
# ══════════════════════════════════════════════════════════

print("=" * 60)
print("  MINDWELL AI SERVICE - LOADING MODELS")
print("=" * 60)

print("\n[1/4] Loading English diagnosis model...")
diag_tokenizer = AutoTokenizer.from_pretrained(DIAG_MODEL_PATH)
diag_model = AutoModelForSequenceClassification.from_pretrained(DIAG_MODEL_PATH)
diag_model.eval()

with open(DIAG_ENCODER_PATH, "rb") as f:
    diag_encoder = pickle.load(f)
print(f"      ✓ English model ready ({len(diag_encoder.classes_)} classes)")

# ══════════════════════════════════════════════════════════
# LOAD ARABIC MODEL
# ══════════════════════════════════════════════════════════

print("\n[2/4] Loading Arabic diagnosis model...")
try:
    arabic_tokenizer = AutoTokenizer.from_pretrained(ARABIC_MODEL_PATH)
    arabic_model = AutoModelForSequenceClassification.from_pretrained(ARABIC_MODEL_PATH)
    arabic_model.eval()
    with open(ARABIC_ENCODER_PATH, "rb") as f:
        arabic_encoder = pickle.load(f)
    print(f"      ✓ Arabic model ready ({len(arabic_encoder.classes_)} classes)")
except Exception as e:
    print(f"      ⚠️ Could not load Arabic model: {e}")
    arabic_model = None
    arabic_tokenizer = None
    arabic_encoder = None

# ══════════════════════════════════════════════════════════
# LOAD ROMAN URDU MODEL
# ══════════════════════════════════════════════════════════

print("\n[3/4] Loading Roman Urdu diagnosis model...")
try:
    roman_tokenizer = AutoTokenizer.from_pretrained(ROMAN_MODEL_PATH)
    roman_model = AutoModelForSequenceClassification.from_pretrained(ROMAN_MODEL_PATH)
    roman_model.eval()
    with open(ROMAN_ENCODER_PATH, "rb") as f:
        roman_encoder = pickle.load(f)
    print(f"      ✓ Roman Urdu model ready ({len(roman_encoder.classes_)} classes)")
except Exception as e:
    print(f"      ⚠️ Could not load Roman Urdu model: {e}")
    roman_model = None
    roman_tokenizer = None
    roman_encoder = None

# ══════════════════════════════════════════════════════════
# LOAD SENTIMENT MODEL
# ══════════════════════════════════════════════════════════

print("\n[4/4] Loading sentiment model...")
sentiment_tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL_PATH)
sentiment_model = AutoModelForSequenceClassification.from_pretrained(SENTIMENT_MODEL_PATH)
sentiment_model.eval()

with open(SENTIMENT_ENCODER_PATH, "rb") as f:
    sentiment_encoder = pickle.load(f)
print(f"      ✓ Sentiment model ready ({len(sentiment_encoder.classes_)} classes)")

print("\n" + "=" * 60)
print("  ALL MODELS LOADED SUCCESSFULLY!")
print("=" * 60)

# ══════════════════════════════════════════════════════════
# LANGUAGE DETECTION
# ══════════════════════════════════════════════════════════

def detect_language(text: str) -> str:
    """Detect language of input text"""
    arabic_pattern = re.compile(r'[\u0600-\u06FF]')
    roman_urdu_pattern = re.compile(r'(?:hai|hoon|hain|tha|thi|the|ko|se|mein|ka|ki|kya|kaise)', re.IGNORECASE)
    
    if arabic_pattern.search(text):
        return 'arabic'
    elif roman_urdu_pattern.search(text) and not re.search(r'[a-zA-Z]{5,}', text):
        return 'roman_urdu'
    else:
        return 'english'

# ══════════════════════════════════════════════════════════
# NORMALIZE FUNCTION
# ══════════════════════════════════════════════════════════

FIGURATIVE_MAP = {
    r"above the sky":     "extremely happy and full of energy",
    r"rock bottom":       "feeling hopeless and at my lowest point",
    r"falling apart":     "feeling overwhelmed and unable to cope",
    r"losing my mind":    "feeling extremely anxious and confused",
    r"dead inside":       "feeling emotionally numb and empty",
    r"bilkul theek nahi": "not feeling well at all",
    r"dil ghabra raha":   "feeling anxious and restless",
    r"neend nahi aati":   "unable to sleep suffering from insomnia",
}

def normalize_sentence(text: str) -> str:
    original = text.strip()
    corrected = str(TextBlob(original).correct())
    normalized = corrected.lower()
    for pattern, replacement in FIGURATIVE_MAP.items():
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
    return normalized.strip().capitalize()

# ══════════════════════════════════════════════════════════
# SEVERITY MAPPING
# ══════════════════════════════════════════════════════════

SEVERITY_MAP = {
    "happy":    2,
    "calm":     3,
    "neutral":  5,
    "anxious":  6,
    "sad":      7,
    "angry":    7,
    "hopeless": 8,
    "depressed":8,
    "severe":   9,
    "crisis":   10
}

# ══════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ══════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    text: str
    user_id: str = None

class AnalyzeResponse(BaseModel):
    success: bool
    diagnosis: str
    confidence: float
    top3: list
    normalized_text: str
    severity: int
    severity_label: str
    needs_help: bool
    language: str  # Added language detection

class SentimentRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    success: bool
    emotion: str
    confidence: float
    severity_score: int
    normalized_text: str

# ══════════════════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models": {
            "english": "loaded" if diag_model else "failed",
            "arabic": "loaded" if arabic_model else "not loaded",
            "roman_urdu": "loaded" if roman_model else "not loaded",
            "sentiment": "loaded"
        }
    }

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Full analysis: Diagnosis + Sentiment + Severity with language detection"""
    try:
        normalized = normalize_sentence(request.text)
        
        # ── Detect Language ──────────────────────────────
        language = detect_language(request.text)
        print(f"🌐 Detected language: {language}")

        # ── Select Model Based on Language ──────────────
        if language == 'arabic' and arabic_model is not None:
            tokenizer = arabic_tokenizer
            model = arabic_model
            encoder = arabic_encoder
        elif language == 'roman_urdu' and roman_model is not None:
            tokenizer = roman_tokenizer
            model = roman_model
            encoder = roman_encoder
        else:
            tokenizer = diag_tokenizer
            model = diag_model
            encoder = diag_encoder

        # ── Diagnosis ──────────────────────────────────────
        inputs = tokenizer(
            normalized,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LENGTH
        )
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)[0]
            top_idx = probs.argsort(descending=True)[:3].tolist()
            top_names = [encoder.inverse_transform([i])[0] for i in top_idx]
            top_confs = [round(probs[i].item() * 100, 2) for i in top_idx]

        # ── Sentiment ──────────────────────────────────────
        sent_inputs = sentiment_tokenizer(
            normalized,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LENGTH
        )
        with torch.no_grad():
            sent_outputs = sentiment_model(**sent_inputs)
            sent_probs = torch.softmax(sent_outputs.logits, dim=-1)[0]
            sent_idx = sent_probs.argmax().item()
            emotion = sentiment_encoder.inverse_transform([sent_idx])[0]

        # ── Severity + needs_help ──────────────────────────
        severity = SEVERITY_MAP.get(emotion.lower(), 5)
        needs_help = severity >= 6

        return AnalyzeResponse(
            success=True,
            diagnosis=top_names[0],
            confidence=top_confs[0],
            top3=[{"name": n, "confidence": c} for n, c in zip(top_names, top_confs)],
            normalized_text=normalized,
            severity=severity,
            severity_label=emotion,
            needs_help=needs_help,
            language=language
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/diagnosis")
async def diagnosis_only(request: AnalyzeRequest):
    """Diagnosis only (faster, no sentiment)"""
    try:
        normalized = normalize_sentence(request.text)
        
        # ── Detect Language ──────────────────────────────
        language = detect_language(request.text)
        
        # ── Select Model Based on Language ──────────────
        if language == 'arabic' and arabic_model is not None:
            tokenizer = arabic_tokenizer
            model = arabic_model
            encoder = arabic_encoder
        elif language == 'roman_urdu' and roman_model is not None:
            tokenizer = roman_tokenizer
            model = roman_model
            encoder = roman_encoder
        else:
            tokenizer = diag_tokenizer
            model = diag_model
            encoder = diag_encoder

        inputs = tokenizer(
            normalized,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LENGTH
        )
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)[0]
            top_idx = probs.argmax().item()
            confidence = round(probs[top_idx].item() * 100, 2)
            diagnosis = encoder.inverse_transform([top_idx])[0]

        return {
            "success": True,
            "diagnosis": diagnosis,
            "confidence": confidence,
            "normalized_text": normalized,
            "language": language
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sentiment", response_model=SentimentResponse)
async def sentiment_only(request: SentimentRequest):
    """Sentiment / Emotion analysis only"""
    try:
        normalized = normalize_sentence(request.text)
        inputs = sentiment_tokenizer(
            normalized,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LENGTH
        )
        with torch.no_grad():
            outputs = sentiment_model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)[0]
            top_idx = probs.argmax().item()
            confidence = round(probs[top_idx].item() * 100, 2)
            emotion = sentiment_encoder.inverse_transform([top_idx])[0]

        severity = SEVERITY_MAP.get(emotion.lower(), 5)

        return SentimentResponse(
            success=True,
            emotion=emotion,
            confidence=confidence,
            severity_score=severity,
            normalized_text=normalized
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5010)