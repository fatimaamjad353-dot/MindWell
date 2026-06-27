# src/ai-models/faq_wrapper.py
import sys
import json
import pandas as pd
import os
from pathlib import Path

# Get the directory of this script
SCRIPT_DIR = Path(__file__).parent.absolute()

# ─── Load CSV Files ──────────────────────────────────
def load_faq_data(language='english'):
    """Load the appropriate FAQ CSV file based on language"""
    csv_files = {
        'english': 'FAQs.csv',
        'arabic': 'FAQs_Arabic_excel.csv',
        'roman_urdu': 'FAQs_Roman_Urdu_Cleaned.csv'
    }
    
    filename = csv_files.get(language, 'FAQs.csv')
    filepath = SCRIPT_DIR / filename
    
    try:
        if not filepath.exists():
            # Try alternate paths
            alternate_paths = [
                SCRIPT_DIR / 'dataset' / filename,
                Path(f'C:/mindwell/dataset/{filename}'),
                Path(f'./dataset/{filename}')
            ]
            for alt_path in alternate_paths:
                if alt_path.exists():
                    filepath = alt_path
                    break
            
        if not filepath.exists():
            return None, f"CSV file not found: {filename}"
            
        # Read CSV - handle different encodings
        try:
            df = pd.read_csv(filepath, encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(filepath, encoding='latin-1')
            except:
                df = pd.read_csv(filepath, encoding='cp1252')
        
        # Clean column names
        df.columns = df.columns.str.strip()
        
        return df, None
    except Exception as e:
        return None, f"Failed to load CSV: {str(e)}"

# ─── Find Best Answer ──────────────────────────────
def find_best_answer(question, language='english'):
    """Find the most relevant answer for a question"""
    df, error = load_faq_data(language)
    
    if df is None:
        return error
    
    # Convert question to lowercase for matching
    question_lower = question.lower().strip()
    
    # ─── Find the right columns ────────────────────
    question_col = None
    answer_col = None
    
    # Try to find question column
    for col in df.columns:
        col_lower = col.lower().strip()
        if any(word in col_lower for word in ['question', 'statement', 'query', 'text']):
            question_col = col
            break
    
    # Try to find answer column
    if question_col is None:
        # Check for diagnosis column (used in Sara's dataset)
        for col in df.columns:
            col_lower = col.lower().strip()
            if any(word in col_lower for word in ['diagnosis', 'answer', 'response', 'primary']):
                answer_col = col
                break
    
    # If still not found, use first column as question, second as answer
    if question_col is None:
        question_col = df.columns[0]
        answer_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]
    elif answer_col is None:
        # Find another column for answer
        for col in df.columns:
            if col != question_col:
                answer_col = col
                break
        if answer_col is None:
            answer_col = question_col
    
    # ─── Try exact match ────────────────────────────
    try:
        # Convert to string and compare
        for idx in range(len(df)):
            q_text = str(df.iloc[idx][question_col]).lower().strip()
            if q_text == question_lower:
                return str(df.iloc[idx][answer_col])
    except Exception as e:
        print(f"⚠️ Exact match error: {e}", file=sys.stderr)
    
    # ─── Try keyword matching ───────────────────────
    keywords = question_lower.split()
    best_match_idx = -1
    best_score = 0
    
    try:
        for idx in range(len(df)):
            q_text = str(df.iloc[idx][question_col]).lower()
            score = sum(1 for kw in keywords if kw in q_text)
            
            if score > best_score:
                best_score = score
                best_match_idx = idx
        
        if best_match_idx >= 0 and best_score > 0:
            return str(df.iloc[best_match_idx][answer_col])
    except Exception as e:
        print(f"⚠️ Keyword match error: {e}", file=sys.stderr)
    
    # ─── If no match found, return a fallback ──────
    fallbacks = {
        'english': "I'm not sure about that. Could you rephrase your question? I'm here to help!",
        'arabic': "أنا لست متأكدًا من ذلك. هل يمكنك إعادة صياغة سؤالك؟ أنا هنا للمساعدة!",
        'roman_urdu': "Mujhe is baat ka yaqeen nahi. Kya aap apna sawal dobara pooch sakte hain? Main aapki madad ke liye hoon!"
    }
    
    return fallbacks.get(language, "I'm not sure about that. Could you rephrase your question?")

# ─── Main Function ──────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Question not provided"
        }))
        sys.exit(1)
    
    question = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else 'english'
    
    try:
        answer = find_best_answer(question, language)
        
        result = {
            "success": True,
            "answer": answer,
            "language": language,
            "question": question
        }
        print(json.dumps(result))
        
    except Exception as e:
        import traceback
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()