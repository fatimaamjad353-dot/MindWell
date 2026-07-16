import os
import re
import sys
import csv
import pickle
from datetime import datetime

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

print("=" * 60)
print("  ROMAN URDU PSYCHIATRY DIAGNOSIS MODEL TRAINER (80/10/10 SPLIT)")
print("  Model: distilbert-base-uncased")
print("=" * 60)

def install(pkg):
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

for p in ["torch", "transformers", "datasets", "evaluate"]:
    try: __import__(p)
    except ImportError: print(f"Installing {p}..."); install(p)

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer, DataCollatorWithPadding
from datasets import Dataset
import evaluate

# ─────────────────────────────────────────
# LOAD CSV
# ─────────────────────────────────────────
CSV_FILE = "psychiatry_dataset_roman_urdu.csv"
if not os.path.exists(CSV_FILE):
    print(f"ERROR: {CSV_FILE} missing!"); sys.exit(1)

print(f"\n[1/5] Loading dataset from: {CSV_FILE}")
df = None
for skip in [0, 18, 19, 20, 21, 22]:
    try:
        tmp = pd.read_csv(CSV_FILE, skiprows=skip)
        if "patient_statement" in tmp.columns and "primary_diagnosis" in tmp.columns:
            df = tmp
            print(f"      Loaded with skiprows={skip}, rows={len(df)}")
            break
    except: continue

if df is None:
    print("ERROR: Could not load CSV properly."); sys.exit(1)

# ─────────────────────────────────────────
# CLEAN
# ─────────────────────────────────────────
print("\n[2/5] Cleaning text data...")
df["patient_statement"] = df["patient_statement"].astype(str).str.strip().str.lower()
df = df.dropna(subset=["patient_statement", "primary_diagnosis"])
df = df[df["patient_statement"].str.len() > 3]
print(f"      Rows: {len(df)}")
print(f"      Classes: {sorted(df['primary_diagnosis'].unique())}")

# ─────────────────────────────────────────
# ENCODE LABELS
# ─────────────────────────────────────────
print("\n[3/5] Encoding labels...")
diag_encoder = LabelEncoder()
df["diag_label"] = diag_encoder.fit_transform(df["primary_diagnosis"])
num_classes = len(diag_encoder.classes_)
print(f"      Total classes: {num_classes}")
with open("diag_encoder_roman.pkl", "wb") as f: pickle.dump(diag_encoder, f)

# ─────────────────────────────────────────
# TOKENIZE AND SPLIT
# ─────────────────────────────────────────
print("\n[4/5] Tokenizing and splitting 80/10/10...")
MODEL_NAME = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

train_df, temp_df = train_test_split(df[["patient_statement","diag_label"]], test_size=0.20, random_state=42, stratify=df["diag_label"])
val_df,   test_df = train_test_split(temp_df, test_size=0.50, random_state=42, stratify=temp_df["diag_label"])

def make_ds(data):
    ds = Dataset.from_dict({"text": data["patient_statement"].tolist(), "label": data["diag_label"].tolist()})
    ds = ds.map(lambda b: tokenizer(b["text"], truncation=True, max_length=128), batched=True)
    ds = ds.remove_columns(["text"]).with_format("torch")
    return ds

train_ds = make_ds(train_df)
val_ds   = make_ds(val_df)
test_ds  = make_ds(test_df)
print(f"      Train: {len(train_ds)} | Val: {len(val_ds)} | Test: {len(test_ds)}")

# ─────────────────────────────────────────
# TRAIN
# ─────────────────────────────────────────
print("\n[5/5] Training...")
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"      Device: {device.upper()}")

model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=num_classes).to(device)

# Auto-detect correct tokenizer argument name based on transformers version
import inspect
_trainer_params = inspect.signature(Trainer.__init__).parameters
_tok_kwarg = "processing_class" if "processing_class" in _trainer_params else "tokenizer"

args = TrainingArguments(
    output_dir="./psych_diag_roman_model",
    num_train_epochs=6,
    learning_rate=2e-5,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=32,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    report_to="none",
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    **{_tok_kwarg: tokenizer},
    data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
    compute_metrics=lambda p: evaluate.load("accuracy").compute(
        predictions=np.argmax(p[0], axis=-1), references=p[1]
    )
)

trainer.train()

# ─────────────────────────────────────────
# EVALUATE
# ─────────────────────────────────────────
print("\nEvaluating on test set...")
preds = trainer.predict(test_ds)
pred_labels = np.argmax(preds.predictions, axis=-1)
print(classification_report(test_df["diag_label"].tolist(), pred_labels, target_names=diag_encoder.classes_))

model.save_pretrained("./psych_diag_roman_model")
tokenizer.save_pretrained("./psych_diag_roman_model")
print("Model saved to ./psych_diag_roman_model")

# ─────────────────────────────────────────
# PREDICT FUNCTION
# confidence threshold = 50%
# save ALL predictions including low_confidence
# ─────────────────────────────────────────
CONFIDENCE_THRESHOLD = 50.0
PREDICTIONS_FILE = "psychiatry_roman_predictions_log.csv"
cols = ["patient_statement","predicted_diagnosis","confidence_%","top2","top2_%","top3","top3_%","status","session_type","timestamp"]

if not os.path.exists(PREDICTIONS_FILE):
    with open(PREDICTIONS_FILE, "w", newline="", encoding="utf-8") as f:
        csv.DictWriter(f, fieldnames=cols).writeheader()

def make_bar(pct, blocks=20):
    return "█" * int(round((pct / 100) * blocks))

def predict(sentence, session_type="interactive"):
    inputs = tokenizer(sentence.lower(), return_tensors="pt", truncation=True, max_length=128).to(device)
    with torch.no_grad():
        probs = torch.softmax(model(**inputs).logits, dim=-1)[0].cpu().numpy()

    top3_idx  = probs.argsort()[::-1][:3]
    names     = diag_encoder.inverse_transform(top3_idx)
    confs     = probs[top3_idx] * 100

    no_issue = (confs[0] < CONFIDENCE_THRESHOLD)

    if session_type == "interactive":
        print(f'\n  Input:     "{sentence}"')
        if no_issue:
            print(f"  Diagnosis:  No mental health issue detected")
        else:
            print(f"  Diagnosis:  {names[0]} ({confs[0]:.1f}% confidence)")
            print(f"  Top 3 diagnoses:")
            print(f"    {names[0]:<25} {confs[0]:>5.1f}%  {make_bar(confs[0])}")
            print(f"    {names[1]:<25} {confs[1]:>5.1f}%  {make_bar(confs[1])}")
            print(f"    {names[2]:<25} {confs[2]:>5.1f}%  {make_bar(confs[2])}")

    with open(PREDICTIONS_FILE, "a", newline="", encoding="utf-8") as f:
        csv.DictWriter(f, fieldnames=cols).writerow({
            "patient_statement": sentence,
            "predicted_diagnosis": names[0],
            "confidence_%": f"{confs[0]:.1f}",
            "top2": names[1], "top2_%": f"{confs[1]:.1f}",
            "top3": names[2], "top3_%": f"{confs[2]:.1f}",
            "status": "diagnosed" if not no_issue else "low_confidence",
            "session_type": session_type,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

# Log test set predictions
print("\nLogging test set predictions...")
for text in test_df["patient_statement"]:
    predict(text, session_type="test_set")
print(f"Saved to {PREDICTIONS_FILE}")

# ─────────────────────────────────────────
# INTERACTIVE MODE
# ─────────────────────────────────────────
print("\n" + "=" * 60)
print("  INTERACTIVE MODE")
print("  Apna sentence likhein | 'quit' likhein bahar jaanay k liye")
print("=" * 60)

while True:
    try:
        user_input = input("\nApna sentence likhein: ").strip()
        if user_input.lower() in ("quit", "exit", "q", ""):
            print(f"\n  Predictions saved in: {PREDICTIONS_FILE}")
            print("  Khuda Hafiz!")
            break
        predict(user_input)
    except KeyboardInterrupt:
        break