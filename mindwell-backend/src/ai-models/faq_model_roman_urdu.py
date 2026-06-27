"""
FAQ Model — Roman Urdu
TF-IDF Cosine Similarity
Splits data: 80% train / 10% validate / 10% test
Prints OVERALL accuracy on full dataset, then enters interactive mode.
Saves every Q&A session to 'faq_results_roman_urdu.csv'.
"""

import os
import csv
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
DATA_PATH  = "FAQS_Roman_Urdu_Cleaned.csv"
OUTPUT_CSV = "faq_results_roman_urdu.csv"
THRESHOLD  = 0.20   # minimum similarity score to return an answer

# ── Load data ─────────────────────────────────────────────────────────────────
print("=" * 60)
print("  FAQ MODEL  —  Roman Urdu  (TF-IDF Cosine Similarity)")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
df.columns = df.columns.str.strip()
df = df.dropna(subset=["Questions", "Answers"]).reset_index(drop=True)

print(f"\n[INFO] Loaded {len(df)} Q&A pairs.")

# ── Split: 80 / 10 / 10 ───────────────────────────────────────────────────────
train_df, temp_df = train_test_split(df, test_size=0.20, random_state=42)
val_df,   test_df = train_test_split(temp_df, test_size=0.50, random_state=42)

print(f"[INFO] Split → Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")

# ── Train TF-IDF on training questions ────────────────────────────────────────
# Roman Urdu is Latin-script; standard char/word n-grams work well
vectorizer = TfidfVectorizer(
    analyzer="char_wb",   # character n-grams handle transliteration variance
    ngram_range=(3, 5),
    max_df=0.95,
    min_df=1,
)

train_vectors = vectorizer.fit_transform(train_df["Questions"].tolist())

def predict(query: str):
    """Return (best_question, answer, similarity_score) from training set."""
    q_vec = vectorizer.transform([query])
    sims  = cosine_similarity(q_vec, train_vectors).flatten()
    idx   = int(np.argmax(sims))
    score = float(sims[idx])
    if score < THRESHOLD:
        return None, None, score
    row = train_df.iloc[idx]
    return row["Questions"], row["Answers"], score

# ── Overall Accuracy on full dataset ─────────────────────────────────────────
print("\n── Accuracy Report ──────────────────────────────────────────")

all_vectorizer = TfidfVectorizer(
    analyzer="char_wb",
    ngram_range=(3, 5),
    max_df=0.95,
    min_df=1,
)
all_vectors = all_vectorizer.fit_transform(df["Questions"].tolist())

matched   = 0
total_sim = 0.0
for _, row in df.iterrows():
    q_vec = all_vectorizer.transform([row["Questions"]])
    sims  = cosine_similarity(q_vec, all_vectors).flatten()
    sims[df.index.get_loc(row.name)] = 0   # exclude self-match
    score = float(np.max(sims))
    total_sim += score
    if score >= THRESHOLD:
        matched += 1

overall_acc = matched / len(df)
avg_sim     = total_sim / len(df)

print(f"  Total Rows       : {len(df)}")
print(f"  Answered         : {matched}")
print(f"  Overall Accuracy : {overall_acc * 100:.2f}%")
print(f"  Avg Similarity   : {avg_sim:.4f}")
print("─" * 60)

# ── Prepare output CSV ────────────────────────────────────────────────────────
write_header = not os.path.exists(OUTPUT_CSV)
out_file = open(OUTPUT_CSV, "a", newline="", encoding="utf-8")
writer   = csv.writer(out_file)
if write_header:
    writer.writerow(["Timestamp", "User Question", "Matched Question",
                     "Answer", "Similarity Score"])

# ── Interactive loop ───────────────────────────────────────────────────────────
print("\n── Interactive Mode (Roman Urdu) ────────────────────────────")
print("Apna sawal likhein aur Enter dabaein.  Baahar jaane ke liye 'quit' likhein.\n")

while True:
    try:
        user_input = input("Aap: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n[INFO] Khatam ho raha hai...")
        break

    if not user_input:
        continue

    if user_input.lower() in {"quit", "exit", "q"}:
        print("[INFO] Khuda hafiz! Jawabaat yahan save hain:", OUTPUT_CSV)
        break

    matched_q, answer, score = predict(user_input)

    if answer is None:
        reply     = "(Koi munaasib jawab nahi mila — apna sawal dobara likhne ki koshish karein.)"
        matched_q = ""
    else:
        reply = answer

    print(f"\nBot: {reply}")
    print(f"     [similarity: {score:.4f}]\n")

    writer.writerow([
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        user_input,
        matched_q,
        reply,
        f"{score:.4f}",
    ])
    out_file.flush()

out_file.close()
