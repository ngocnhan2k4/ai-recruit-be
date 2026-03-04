import argparse
import pandas as pd
import json
from transformers import pipeline

def combine_text(row):
    """
    Combines Title + Skills + Description just like the training script.
    """
    title = str(row.get('title', ''))
    skills = str(row.get('associated_skills', '')) 
    
    try:
        desc_data = json.loads(row['description'])
        desc_text = " ".join([item.get('body', '') for item in desc_data])
    except:
        desc_text = str(row['description'])
    
    return f"Title: {title} . Skills: {skills} . Description: {desc_text}"[:512]

def main():
    parser = argparse.ArgumentParser(description="Predict job categories")
    parser.add_argument("--model", type=str, default="./artifacts/multi_class_model")
    parser.add_argument("--input_file", type=str, default="./data/predict_jobs.csv")
    parser.add_argument("--output_file", type=str, default="./data/results.csv")
    parser.add_argument("--threshold", type=float, default=0.4)
    
    args = parser.parse_args()

    # --- LOAD MODEL ---
    print(f"🚀 Loading model from: {args.model} ...")
    classifier = pipeline("text-classification", model=args.model)

    # --- LOAD DATA ---
    print(f"📂 Reading data from: {args.input_file} ...")
    try:
        df = pd.read_csv(args.input_file)
    except FileNotFoundError:
        print(f"❌ Error: File '{args.input_file}' not found.")
        return

    # --- PREPARE INPUTS ---
    inputs = df.apply(combine_text, axis=1).tolist()

    # --- PREDICT ---
    print(f"🧠 Classifying {len(inputs)} records...")
    results = classifier(inputs)

    # --- PROCESS RESULTS ---
    final_categories = []
    final_scores = []

    for result in results:
        score = result['score']
        label = result['label']

        if score < args.threshold:
            label = "Other"

        final_categories.append(label)
        final_scores.append(score)

    df['predicted_category'] = final_categories
    df['confidence'] = final_scores

    # Clean up output
    output_df = df.drop(columns=['description', 'category'], errors='ignore')
    output_df.to_csv(args.output_file, index=False)
    print(f"✅ Success! Saved predictions to '{args.output_file}'")

if __name__ == "__main__":
    main()