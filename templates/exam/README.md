# Exam System - Import Templates

This directory contains templates for importing questions into the exam system.

## Available Templates

### 1. CSV Template (`questions-import-template.csv`)

**Format**: CSV file with comma-separated values

**Columns**:
- `area`: Area name (e.g., "Programming", "Design") - either this or areaId is required
- `areaId`: UUID of the area - either this or area name is required
- `skill`: Skill name (e.g., "JavaScript", "React") - either this or skillId is required
- `skillId`: UUID of the skill - either this or skill name is required
- `questionText`: The question text (required)
- `options`: JSON array of answer options, must have at least 2 options (required)
- `correctAnswer`: The correct answer, must match one of the options exactly (required)
- `point`: Points awarded for correct answer, must be a positive number (required)
- `difficulty`: Question difficulty, must be one of: "easy", "medium", "hard" (required)

**Notes**:
- Options should be formatted as a JSON array string: `["Option 1","Option 2","Option 3","Option 4"]`
- Use double quotes for the entire options string if it contains commas
- Either provide area name OR areaId (not both)
- Either provide skill name OR skillId (not both)
- The system will look up area/skill by name if IDs are not provided

### 2. JSON Template (`questions-import-template.json`)

**Format**: JSON array of question objects

**Object Structure**:
```json
{
  "area": "Programming",
  "areaId": "",
  "skill": "JavaScript",
  "skillId": "",
  "questionText": "What is JavaScript?",
  "options": [
    "A programming language",
    "A framework",
    "A database",
    "An operating system"
  ],
  "correctAnswer": "A programming language",
  "point": 10,
  "difficulty": "easy"
}
```

**Notes**:
- Options is a native JSON array (not a string)
- Either provide area name OR areaId (leave the other as empty string)
- Either provide skill name OR skillId (leave the other as empty string)

## Import Methods

### Via API

#### CSV Import
```bash
POST /admin/exam/questions/import/csv
Content-Type: multipart/form-data

file: [CSV file]
```

#### JSON Import
```bash
POST /admin/exam/questions/import/json
Content-Type: application/json

{
  "data": [...questions array...],
  "fileName": "import-2024-01.json"
}
```

## Validation Rules

1. **Required Fields**: questionText, options (min 2), correctAnswer, point, difficulty
2. **correctAnswer**: Must exactly match one of the options
3. **point**: Must be a positive number (>= 1)
4. **difficulty**: Must be "easy", "medium", or "hard" (case-insensitive)
5. **Area/Skill**: Either name or ID must be provided and must exist in the database
6. **Options**: Must contain at least 2 choices

## Import Results

After import, you'll receive a result with:
- `totalRows`: Total number of rows processed
- `successRows`: Number of successfully imported questions
- `failedRows`: Number of failed rows
- `errors`: Array of error messages for failed rows

## Example Response

```json
{
  "success": true,
  "message": "Questions imported successfully",
  "data": {
    "totalRows": 100,
    "successRows": 95,
    "failedRows": 5,
    "errors": [
      "Row 12: Invalid skill_id",
      "Row 34: Missing correct_answer",
      "Row 56: correctAnswer not found in options",
      "Row 78: Invalid point value",
      "Row 90: Invalid difficulty (must be easy/medium/hard)"
    ]
  }
}
```

## Tips

1. **Test with small batches**: Start with 10-20 questions to ensure format is correct
2. **Use IDs when possible**: Using UUIDs is faster than name lookup
3. **Validate locally**: Check your file format before uploading
4. **Review errors**: The system provides detailed error messages for failed rows
5. **Check import logs**: Use `GET /admin/exam/questions/import/logs` to see import history
