# src/ai-service/main.py - MindWell AI Diagnosis Service
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import pickle
import re
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from textblob import TextBlob

app = FastAPI(title="MindWell AI Diagnosis Service")

# ─────────────────────────────────────────
# Model Paths
# ─────────────────────────────────────────
MODELS = {
    "english": {
        "model_path": "./psych_diag_model",
        "encoder_path": "./diag_encoder.pkl"
    },
    "arabic": {
        "model_path": "./psych_arabic_model",
        "encoder_path": "./diag_arabic_encoder.pkl"
    },
    "roman_urdu": {
        "model_path": "./psych_roman_diag_model",
        "encoder_path": "./diag_roman_encoder.pkl"
    }
}

SEV_MODEL = {
    "model_path": "./psych_sev_model",
    "encoder_path": "./sev_encoder.pkl"
}

CONFIDENCE_THRESHOLD = 50.0

# ─────────────────────────────────────────
# Load All Models
# ─────────────────────────────────────────
loaded_models = {}

def load_model(name, model_path, encoder_path):
    try:
        print(f"Loading {name} model from {model_path}...")
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        model.eval()
        with open(encoder_path, "rb") as f:
            encoder = pickle.load(f)
        print(f"✅ {name} model loaded — {len(encoder.classes_)} classes")
        return {"tokenizer": tokenizer, "model": model, "encoder": encoder}
    except Exception as e:
        print(f"⚠️  Could not load {name} model: {e}")
        return None

# Load diagnosis models
for lang, paths in MODELS.items():
    loaded_models[lang] = load_model(lang, paths["model_path"], paths["encoder_path"])

# Load severity model
loaded_models["severity"] = load_model(
    "severity", SEV_MODEL["model_path"], SEV_MODEL["encoder_path"]
)

# ─────────────────────────────────────────
# Figurative Language Map
# ─────────────────────────────────────────
FIGURATIVE_MAP = {
    r"above the sky": "extremely happy and full of energy",
    r"rock bottom": "feeling hopeless and at my lowest point",
    r"falling apart": "feeling overwhelmed and unable to cope",
    r"losing my mind": "feeling extremely anxious and confused",
    r"dead inside": "feeling emotionally numb and empty",
    r"bilkul theek nahi": "not feeling well at all",
    r"dil ghabra raha": "feeling anxious and restless",
    r"neend nahi aati": "unable to sleep suffering from insomnia",
}

def normalize_sentence(text: str) -> str:
    original = text.strip()
    try:
        corrected = str(TextBlob(original).correct())
    except:
        corrected = original
    normalized = corrected.lower()
    for pattern, replacement in FIGURATIVE_MAP.items():
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
    return normalized.strip().capitalize()

# ─────────────────────────────────────────
# Predict Function
# ─────────────────────────────────────────
def predict_with_model(text: str, model_data: dict, top_n: int = 3):
    tokenizer = model_data["tokenizer"]
    model = model_data["model"]
    encoder = model_data["encoder"]

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=128,
        padding=True
    )

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1)[0]
        top_idx = probs.argsort(descending=True)[:top_n].tolist()
        top_names = [encoder.inverse_transform([i])[0] for i in top_idx]
        top_confs = [round(probs[i].item() * 100, 1) for i in top_idx]

    return top_names, top_confs

# ─────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    text: str
    language: str = "english"   # "english", "arabic", "roman_urdu"
    user_id: str = None

class AnalyzeResponse(BaseModel):
    success: bool
    language: str
    diagnosis: str
    confidence: float
    severity: str
    severity_confidence: float
    top3: list
    normalized_text: str
    needs_help: bool

# ─────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models_loaded": {
            lang: (m is not None)
            for lang, m in loaded_models.items()
        }
    }

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    try:
        lang = request.language.lower()

        # Validate language
        if lang not in loaded_models or loaded_models[lang] is None:
            raise HTTPException(
                status_code=400,
                detail=f"Model for language '{lang}' is not available"
            )

        # Normalize (English only — skip for Arabic)
        if lang == "english":
            normalized = normalize_sentence(request.text)
        else:
            normalized = request.text.strip()

        # ── Diagnosis ──
        diag_names, diag_confs = predict_with_model(
            normalized, loaded_models[lang]
        )

        diagnosis = diag_names[0]
        confidence = diag_confs[0]
        low_confidence = confidence < CONFIDENCE_THRESHOLD
        needs_help = not low_confidence and diagnosis != "Normal"

        # ── Severity ──
        severity = "Unknown"
        severity_confidence = 0.0

        if loaded_models["severity"] is not None and needs_help:
            try:
                sev_names, sev_confs = predict_with_model(
                    normalized, loaded_models["severity"], top_n=1
                )
                severity = sev_names[0]
                severity_confidence = sev_confs[0]
            except Exception as e:
                print(f"Severity prediction failed: {e}")

        return AnalyzeResponse(
            success=True,
            language=lang,
            diagnosis=diagnosis if not low_confidence else "No issue detected",
            confidence=confidence,
            severity=severity,
            severity_confidence=severity_confidence,
            top3=[
                {"name": n, "confidence": c}
                for n, c in zip(diag_names, diag_confs)
            ],
            normalized_text=normalized,
            needs_help=needs_help
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/batch")
async def analyze_batch(texts: list[str], language: str = "english"):
    """Analyze multiple texts at once"""
    results = []
    for text in texts:
        req = AnalyzeRequest(text=text, language=language)
        result = await analyze(req)
        results.append(result)
    return {"success": True, "results": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5010)