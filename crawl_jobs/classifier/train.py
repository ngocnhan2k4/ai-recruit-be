import pandas as pd
import json
import matplotlib.pyplot as plt
import torch
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset

# --- CONFIGURATION ---
DATA_FILE = "./data/jobs.csv"
ARTIFACTS_DIR = "./data/ata/artifacts"
IMAGES_DIR = "./data/ata/artifacts/images"
MODEL_DIR = "./data/ata/artifacts/multi_class_model"
CHECKPOINT_DIR = "./data/ata/artifacts/checkpoints"

os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

# Check for GPU
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 Training on: {device.upper()}")

# --- DATA LOADING & CLEANING ---
def combine_text(row):
    """
    Combines Title + Skills + Description for maximum context.
    """
    title = str(row.get('title', ''))
    skills = str(row.get('associated_skills', ''))

    # Clean JSON description
    try:
        desc_data = json.loads(row['description'])
        desc_text = " ".join([item.get('body', '') for item in desc_data])
    except:
        desc_text = str(row['description'])

    return f"Title: {title} . Skills: {skills} . Description: {desc_text}"

print(f"Loading {DATA_FILE}...")
if not os.path.exists(DATA_FILE):
    exit()

df = pd.read_csv(DATA_FILE)

# 1. Apply Text Combination
df['text'] = df.apply(combine_text, axis=1)

# --- VISUALIZATION RAW DATA ---
print("Generating raw data chart...")
category_counts = df['category'].value_counts()
plt.figure(figsize=(12, 12))
category_counts.plot(kind='pie', autopct='%1.1f%%')
plt.title('Category Distribution')
plt.ylabel('')
plt.tight_layout()
plt.savefig(f"{IMAGES_DIR}/category_distribution.png")
print(f"Raw chart saved to '{IMAGES_DIR}/category_distribution.png'.")

# --- PREPARE DATA ---

# Filter out "Other"
df = df[df['category'] != 'Other']

# Filter categories less than 2 examples
category_counts = df['category'].value_counts()
rare_categories = category_counts[category_counts < 2].index
df = df[~df['category'].isin(rare_categories)]

print(f"Remaining rows after filtering: {len(df)}")

# --- MAPPINGS & SPLIT ---
unique_labels = df['category'].unique()
label2id = {label: i for i, label in enumerate(unique_labels)}
id2label = {i: label for i, label in enumerate(unique_labels)}
df['label'] = df['category'].map(label2id)

print(f"Active Categories: {len(unique_labels)}")

# Split Data
train_df, test_df = train_test_split(df, test_size=0.2, stratify=df['label'], random_state=42)
train_dataset = Dataset.from_pandas(train_df)
test_dataset = Dataset.from_pandas(test_df)

# --- TOKENIZATION ---
print("Tokenizing data...")
tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")

def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=512)

tokenized_train = train_dataset.map(tokenize_function, batched=True)
tokenized_test = test_dataset.map(tokenize_function, batched=True)

# --- MODEL SETUP & TRAINING ---
print("Initializing Model...")

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = predictions.argmax(axis=-1)
    return {"accuracy": accuracy_score(labels, predictions)}

model = DistilBertForSequenceClassification.from_pretrained(
    "distilbert-base-uncased",
    num_labels=len(unique_labels),
    id2label=id2label,
    label2id=label2id
)
model.to(device)

training_args = TrainingArguments(
    output_dir=CHECKPOINT_DIR,
    num_train_epochs=15,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    learning_rate=2e-5,
    weight_decay=0.01,
    logging_steps=50,
    report_to="none"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_test,
    tokenizer=tokenizer,
    compute_metrics=compute_metrics,
)

print("Starting Training...")
trainer.train()

# --- SAVE MODEL ---
print(f"Saving model to {MODEL_DIR}...")
model.save_pretrained(MODEL_DIR)
tokenizer.save_pretrained(MODEL_DIR)
print("✅ Done. Model saved.")