import argparse
import pandas as pd
import json
from transformers import pipeline

def clean_text(row):
    try:
        desc_data = json.loads(row['description'])
        desc_text = " ".join([item.get('body', '') for item in desc_data])
    except:
        desc_text = str(row['description'])
    return f"{row['title']} . {desc_text}"[:512]

def main():
    parser = argparse.ArgumentParser(description="Predict job categories")
    parser.add_argument("--model", type=str, default="./data/predict_jobs.csv", required=True, help="Hugging Face Repo ID or Local Path")
    parser.add_argument("--input_file", type=str, required=True, help="Path to input CSV")
    parser.add_argument("--output_file", type=str, default="./data/results.csv", help="Path to save output CSV")
    parser.add_argument("--threshold", type=float, default=0.4, help="Confidence threshold for 'Other'")
    
    args = parser.parse_args()

    print(f"Loading model: {args.model}")
    classifier = pipeline("text-classification", model=args.model)

    print(f"Reading data: {args.input_file}")
    df = pd.read_csv(args.input_file)

    inputs = df.apply(clean_text, axis=1).tolist()

    print(f"Classifying {len(inputs)} records...")
    results = classifier(inputs)

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

    output_df = df.drop(columns=['description'], errors='ignore')

    output_df.to_csv(args.output_file, index=False)
    print(f"\n✅ Saved predictions to {args.output_file}")

if __name__ == "__main__":
    main()