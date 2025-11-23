from transformers import pipeline
import pandas as pd
import json

MODEL_PATH = "./multi_class_model"
CONF_THRESHOLD = 0.4

print(f"Loading model from {MODEL_PATH}...")
classifier = pipeline("text-classification", model=MODEL_PATH)

print("Loading predict.csv...")
df = pd.read_csv("../data/predict_jobs.csv")

def clean_text(row):
    try:
        desc_data = json.loads(row['description'])
        desc_text = " ".join([item.get('body', '') for item in desc_data])
    except:
        desc_text = str(row['description'])
    return f"{row['title']} . {desc_text}"[:512]

inputs = df.apply(clean_text, axis=1).tolist()

print(f"Classifying {len(inputs)} jobs...")
results = classifier(inputs)

# --- PRINT THE REAL SCORES ---
final_categories = []
final_scores = []

for i, result in enumerate(results):
    score = result['score']
    label = result['label']

    if score < CONF_THRESHOLD:
        label = "Other"

    final_categories.append(label)
    final_scores.append(score)

df['predicted_category'] = final_categories
df['confidence'] = final_scores

output_df = df.drop(columns=['description'], errors='ignore')

output_df.to_csv("../data/results.csv", index=False)
print("\nSaved all raw predictions to 'results.csv'")