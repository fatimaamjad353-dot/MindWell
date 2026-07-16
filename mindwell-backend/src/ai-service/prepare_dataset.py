# prepare_dataset.py

import pandas as pd
from sklearn.model_selection import train_test_split

# =====================================================
# CONFIGURATION
# =====================================================

INPUT_FILE = "mental_health_dataset.csv"   # rename your file if needed

TRAIN_FILE = "train.csv"
VALID_FILE = "validation.csv"
TEST_FILE = "test.csv"

INTERACTIONS_FILE = "interactions.csv"

RANDOM_SEED = 42

# =====================================================
# LOAD DATA
# =====================================================

# Your uploaded file is actually CSV formatted
df = pd.read_csv(INPUT_FILE)

print(f"Total records: {len(df)}")

# =====================================================
# CREATE INTERACTIONS FILE
# =====================================================

interactions = pd.DataFrame({
    "input": df["Patient_Input"],
    "response": df["Solution"]
})

interactions.to_csv(INTERACTIONS_FILE, index=False)

print(f"Saved: {INTERACTIONS_FILE}")

# =====================================================
# SPLIT DATASET
# 80% TRAIN
# 10% VALIDATION
# 10% TEST
# =====================================================

train_df, temp_df = train_test_split(
    df,
    test_size=0.20,
    random_state=RANDOM_SEED,
    shuffle=True
)

val_df, test_df = train_test_split(
    temp_df,
    test_size=0.50,
    random_state=RANDOM_SEED,
    shuffle=True
)

# =====================================================
# SAVE SPLITS
# =====================================================

train_df.to_csv(TRAIN_FILE, index=False)
val_df.to_csv(VALID_FILE, index=False)
test_df.to_csv(TEST_FILE, index=False)

# =====================================================
# SAVE INTERACTION SPLITS
# =====================================================

train_interactions = pd.DataFrame({
    "input": train_df["Patient_Input"],
    "response": train_df["Solution"]
})

val_interactions = pd.DataFrame({
    "input": val_df["Patient_Input"],
    "response": val_df["Solution"]
})

test_interactions = pd.DataFrame({
    "input": test_df["Patient_Input"],
    "response": test_df["Solution"]
})

train_interactions.to_csv("train_interactions.csv", index=False)
val_interactions.to_csv("validation_interactions.csv", index=False)
test_interactions.to_csv("test_interactions.csv", index=False)

# =====================================================
# SUMMARY
# =====================================================

print("\nDataset Split Summary")
print("-" * 40)
print(f"Train      : {len(train_df)}")
print(f"Validation : {len(val_df)}")
print(f"Test       : {len(test_df)}")

print("\nGenerated Files:")
print("train.csv")
print("validation.csv")
print("test.csv")
print("interactions.csv")
print("train_interactions.csv")
print("validation_interactions.csv")
print("test_interactions.csv")