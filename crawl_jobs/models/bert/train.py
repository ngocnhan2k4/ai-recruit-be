import pandas as pd
import json
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset

# --- DATA LOADING & CLEANING ---
def clean_text(row):
    try:
        desc_data = json.loads(row['description'])
        desc_text = " ".join([item.get('body', '') for item in desc_data])
    except:
        desc_text = str(row['description'])
    return f"{row['title']} . {desc_text}"

print("Loading jobs.csv...")
try:
    df = pd.read_csv("../data/jobs.csv") 
except FileNotFoundError:
    print("Error: 'jobs.csv' not found.")
    exit()

df['text'] = df.apply(clean_text, axis=1)

# --- VISUALIZATION ---
print("Generating chart...")
category_counts = df['category'].value_counts()
plt.figure(figsize=(10, 10))
category_counts.plot(kind='pie', autopct='%1.1f%%')
plt.savefig("category_distribution.png")
print("Chart saved.")

# --- PREPARE DATA ---
# Filter rare categories (less than 2 examples) to prevent split errors
category_counts = df['category'].value_counts()
rare_categories = category_counts[category_counts < 2].index
df = df[~df['category'].isin(rare_categories)]
print(f"Remaining rows after filtering: {len(df)}")

# Create ID mappings
unique_labels = df['category'].unique()
label2id = {label: i for i, label in enumerate(unique_labels)}
id2label = {i: label for i, label in enumerate(unique_labels)}
df['label'] = df['category'].map(label2id)

# Split Data
train_df, test_df = train_test_split(df, test_size=0.2, stratify=df['label'], random_state=42)
train_dataset = Dataset.from_pandas(train_df)
test_dataset = Dataset.from_pandas(test_df)

# --- TOKENIZATION ---
print("Tokenizing data...")
tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")

def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=256)

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

training_args = TrainingArguments(
    output_dir="./checkpoints",
    num_train_epochs=15,
    per_device_train_batch_size=8,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    learning_rate=2e-5,
    weight_decay=0.01,
    logging_steps=10,
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
final_path = "./multi_class_model"
print(f"Saving model to {final_path}...")
model.save_pretrained(final_path)
tokenizer.save_pretrained(final_path)
print("Done.")