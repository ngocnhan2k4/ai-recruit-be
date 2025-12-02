# Exam / Test Assessment System Documentation

## Overview

A complete exam/test assessment system that allows users to take skill-based assessments. Users select multiple skills (max 5), the system generates 20 randomized questions, calculates scores, and assigns proficiency levels.

## Table of Contents

1. [Database Structure](#database-structure)
2. [API Endpoints](#api-endpoints)
3. [Exam Flow](#exam-flow)
4. [Question Import](#question-import)
5. [Setup & Deployment](#setup--deployment)
6. [Testing](#testing)

---

## Database Structure

### Tables Created

#### `areas`
Represents assessment areas (e.g., Programming, Design, etc.)
- `id` (UUID, PK)
- `name` (VARCHAR 255)
- `description` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `questions`
Stores all exam questions
- `id` (UUID, PK)
- `skill_id` (UUID, FK → skills)
- `area_id` (UUID, FK → areas)
- `question_text` (TEXT)
- `options` (JSONB) - Array of answer choices
- `correct_answer` (VARCHAR 255)
- `point` (INTEGER) - Points awarded
- `difficulty` (VARCHAR 50) - 'easy', 'medium', or 'hard'
- `is_active` (BOOLEAN) - Enable/disable questions
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `levels`
Defines proficiency levels based on score ranges
- `id` (UUID, PK)
- `area_id` (UUID, FK → areas)
- `level_name` (VARCHAR 100) - e.g., 'Beginner', 'Expert'
- `min_score` (INTEGER)
- `max_score` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `user_tests`
Tracks user exam sessions
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `selected_skill_ids` (JSONB) - Array of selected skill IDs
- `area_id` (UUID, FK → areas)
- `total_score` (INTEGER) - Null until submitted
- `level_assessed` (VARCHAR 100) - Null until submitted
- `created_at` (TIMESTAMP)

#### `user_answers`
Stores individual question answers
- `id` (UUID, PK)
- `user_test_id` (UUID, FK → user_tests)
- `question_id` (UUID, FK → questions)
- `chosen_answer` (VARCHAR 255)
- `is_correct` (BOOLEAN)
- `point_gained` (INTEGER)
- `created_at` (TIMESTAMP)

#### `import_logs`
Tracks question import operations
- `id` (UUID, PK)
- `file_name` (VARCHAR 255)
- `total_rows` (INTEGER)
- `success_rows` (INTEGER)
- `failed_rows` (INTEGER)
- `created_at` (TIMESTAMP)

---

## API Endpoints

### Admin Endpoints

#### Area Management

**Create Area**
```http
POST /admin/exam/areas
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Programming",
  "description": "Software development assessment"
}
```

**Get Areas**
```http
GET /admin/exam/areas?page=1&limit=20&keyword=prog
Authorization: Bearer {token}
```

**Update Area**
```http
PUT /admin/exam/areas/{areaId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Delete Area**
```http
DELETE /admin/exam/areas/{areaId}
Authorization: Bearer {token}
```

#### Question Management

**Create Question**
```http
POST /admin/exam/questions
Authorization: Bearer {token}
Content-Type: application/json

{
  "skillId": "uuid",
  "areaId": "uuid",
  "questionText": "What is JavaScript?",
  "options": ["A programming language", "A framework", "A database", "A tool"],
  "correctAnswer": "A programming language",
  "point": 10,
  "difficulty": "easy"
}
```

**Get Questions (with filters)**
```http
GET /admin/exam/questions?areaId={uuid}&skillId={uuid}&difficulty=medium&isActive=true&page=1&limit=20
Authorization: Bearer {token}
```

**Update Question**
```http
PUT /admin/exam/questions/{questionId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "questionText": "Updated question",
  "point": 15
}
```

**Toggle Question Status**
```http
PUT /admin/exam/questions/{questionId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "isActive": false
}
```

**Delete Question**
```http
DELETE /admin/exam/questions/{questionId}
Authorization: Bearer {token}
```

#### Question Import

**Import from CSV**
```http
POST /admin/exam/questions/import/csv
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [CSV file]
```

**Import from JSON**
```http
POST /admin/exam/questions/import/json
Authorization: Bearer {token}
Content-Type: application/json

{
  "fileName": "questions-batch-1.json",
  "data": [
    {
      "area": "Programming",
      "skill": "JavaScript",
      "questionText": "What is a closure?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1",
      "point": 15,
      "difficulty": "hard"
    }
  ]
}
```

**Get Import Logs**
```http
GET /admin/exam/questions/import/logs?limit=10
Authorization: Bearer {token}
```

#### Level Management

**Create Level**
```http
POST /admin/exam/levels
Authorization: Bearer {token}
Content-Type: application/json

{
  "areaId": "uuid",
  "levelName": "Beginner",
  "minScore": 0,
  "maxScore": 50
}
```

**Get Levels by Area**
```http
GET /admin/exam/levels/area/{areaId}
Authorization: Bearer {token}
```

**Update Level**
```http
PUT /admin/exam/levels/{levelId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "levelName": "Advanced",
  "minScore": 100,
  "maxScore": 150
}
```

**Delete Level**
```http
DELETE /admin/exam/levels/{levelId}
Authorization: Bearer {token}
```

### User Endpoints

#### Start Exam

```http
POST /exam/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "areaId": "uuid",
  "skillIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Exam started successfully",
  "data": {
    "userTestId": "test-uuid",
    "questions": [
      {
        "id": "question-uuid",
        "questionText": "What is JavaScript?",
        "options": ["A programming language", "A framework", "A database", "A tool"],
        "point": 10,
        "difficulty": "easy"
      }
      // ... 19 more questions
    ]
  }
}
```

#### Submit Exam

```http
POST /exam/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "userTestId": "uuid",
  "answers": [
    {
      "questionId": "uuid",
      "chosenAnswer": "A programming language"
    }
    // ... all 20 answers
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Exam submitted successfully",
  "data": {
    "totalScore": 145,
    "correctAnswers": 17,
    "incorrectAnswers": 3,
    "levelAssessed": "Intermediate"
  }
}
```

#### Get User's Exam History

```http
GET /exam/my-tests
Authorization: Bearer {token}
```

#### Get Test Details

```http
GET /exam/my-tests/{testId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Test details fetched successfully",
  "data": {
    "test": {
      "id": "uuid",
      "userId": "uuid",
      "areaId": "uuid",
      "selectedSkillIds": ["uuid1", "uuid2"],
      "totalScore": 145,
      "levelAssessed": "Intermediate",
      "createdAt": "2024-12-02T..."
    },
    "answers": [
      {
        "id": "uuid",
        "questionId": "uuid",
        "chosenAnswer": "A programming language",
        "isCorrect": true,
        "pointGained": 10
      }
      // ... all answers
    ]
  }
}
```

#### Get Available Areas

```http
GET /exam/areas
Authorization: Bearer {token}
```

---

## Exam Flow

### 1. User Selects Skills

- User chooses an area (e.g., "Programming")
- User selects 1-5 skills from that area (e.g., JavaScript, React, Node.js)
- Frontend calls `POST /exam/start`

### 2. System Generates Questions

The system performs these steps:

1. **Fetch Questions**: Get all active questions for selected skills in the chosen area
2. **Validate Count**: Ensure at least 20 questions are available
3. **Randomize**: Use Fisher-Yates shuffle algorithm
4. **Balance**: Distribute questions across skills:
   - 5 skills → 4 questions per skill
   - 3 skills → ~7 questions per skill
   - Distribution is balanced but may vary if some skills have fewer questions
5. **Optional Difficulty**: Can apply difficulty distribution (40% easy, 40% medium, 20% hard)
6. **Shuffle Options**: Randomize the order of answer options
7. **Create Test Record**: Save `user_test` with selected skills
8. **Return Questions**: Send 20 questions WITHOUT correct answers

### 3. User Takes Exam

- Frontend displays questions one by one or all at once
- User selects answers
- Frontend collects all answers

### 4. User Submits

Frontend calls `POST /exam/submit` with all answers

### 5. System Scores Exam

1. **Validate**: Check test exists, belongs to user, not already submitted
2. **Calculate Score**:
   - For each answer, compare with correct answer (case-insensitive)
   - If correct, add question's point value to total
3. **Evaluate Level**: Find level where `minScore <= totalScore <= maxScore`
4. **Save Results**:
   - Insert all user answers with `isCorrect` and `pointGained`
   - Update user_test with `totalScore` and `levelAssessed`
5. **Return Results**: Send score, correct/incorrect count, and level

---

## Question Import

### Import Templates

Templates are located in `/templates/exam/`:

- **CSV**: `questions-import-template.csv`
- **JSON**: `questions-import-template.json`
- **Documentation**: `README.md`

### CSV Format

```csv
area,areaId,skill,skillId,questionText,options,correctAnswer,point,difficulty
Programming,,JavaScript,,"What is JavaScript?","[""A programming language"",""A framework"",""A database"",""A tool""]",A programming language,10,easy
```

**Notes:**
- Options must be JSON array format in string
- Either provide `area` name OR `areaId` (system looks up by name if ID not provided)
- Either provide `skill` name OR `skillId`

### JSON Format

```json
[
  {
    "area": "Programming",
    "areaId": "",
    "skill": "JavaScript",
    "skillId": "",
    "questionText": "What is JavaScript?",
    "options": ["A programming language", "A framework", "A database", "A tool"],
    "correctAnswer": "A programming language",
    "point": 10,
    "difficulty": "easy"
  }
]
```

### Validation Rules

1. **Required**: questionText, options (min 2), correctAnswer, point, difficulty
2. **correctAnswer**: Must exactly match one option
3. **point**: Must be positive integer (≥ 1)
4. **difficulty**: Must be "easy", "medium", or "hard"
5. **Area/Skill**: Must exist in database (by ID or name)

### Import Response

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
      "Row 34: Missing correct_answer"
    ]
  }
}
```

---

## Setup & Deployment

### 1. Run Database Migrations

```bash
npm run db:push
```

This will create all 6 new tables: `areas`, `questions`, `levels`, `user_tests`, `user_answers`, `import_logs`

### 2. Seed Initial Data

```bash
npx ts-node drizzle/seed/exam-seed.ts
```

This creates:
- 1 Area: "Programming"
- 5 Skills: JavaScript, TypeScript, React, Node.js, Python
- 4 Levels: Beginner (0-50), Intermediate (51-120), Advanced (121-180), Expert (181-300)
- 24 Sample Questions across all skills

### 3. Verify Installation

```bash
# Start server
npm run start:dev

# Test endpoints (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/exam/areas
```

---

## Testing

### Test Scenario 1: Complete Exam Flow

1. **Get Areas**
   ```bash
   GET /exam/areas
   # Note the area ID
   ```

2. **Start Exam**
   ```bash
   POST /exam/start
   {
     "areaId": "programming-area-id",
     "skillIds": ["js-id", "react-id", "node-id"]
   }
   # Save userTestId and questions
   ```

3. **Submit Exam**
   ```bash
   POST /exam/submit
   {
     "userTestId": "test-id",
     "answers": [
       {"questionId": "q1-id", "chosenAnswer": "answer1"},
       // ... 20 answers total
     ]
   }
   # Verify score and level
   ```

4. **View Results**
   ```bash
   GET /exam/my-tests/{testId}
   # Check all answers, score, level
   ```

### Test Scenario 2: Question Import

1. **Import CSV**
   ```bash
   POST /admin/exam/questions/import/csv
   # Upload templates/exam/questions-import-template.csv
   ```

2. **Check Import Logs**
   ```bash
   GET /admin/exam/questions/import/logs
   ```

3. **Verify Questions**
   ```bash
   GET /admin/exam/questions
   # Verify imported questions appear
   ```

### Test Scenario 3: Admin Management

1. **Create Area**
   ```bash
   POST /admin/exam/areas
   {"name": "Design", "description": "Design skills"}
   ```

2. **Create Levels**
   ```bash
   POST /admin/exam/levels
   {"areaId": "design-id", "levelName": "Beginner", "minScore": 0, "maxScore": 50}
   ```

3. **Create Questions**
   ```bash
   POST /admin/exam/questions
   # Add questions for the new area
   ```

4. **Toggle Question**
   ```bash
   PUT /admin/exam/questions/{id}/status
   {"isActive": false}
   ```

---

## Key Features Implemented

✅ **Database Models**: All 6 tables with proper relationships
✅ **Repositories**: Full CRUD operations for all entities
✅ **DTOs**: Complete validation with class-validator
✅ **Question Import**: CSV & JSON support with detailed error reporting
✅ **Multi-Skill Randomizer**: Fisher-Yates shuffle with skill balancing
✅ **Scoring Engine**: Accurate score calculation
✅ **Level Evaluation**: Automatic level assignment based on score ranges
✅ **Admin API**: Complete CRUD for areas, questions, and levels
✅ **User API**: Start exam, submit, view history
✅ **Import Templates**: CSV & JSON examples with documentation
✅ **Seed Data**: Ready-to-use sample data

---

## File Structure

```
src/
├── frameworks/data-services/postgres/
│   ├── models/
│   │   ├── area.model.ts
│   │   ├── question.model.ts
│   │   ├── level.model.ts
│   │   ├── user-test.model.ts
│   │   ├── user-answer.model.ts
│   │   └── import-log.model.ts
│   └── repositories/
│       ├── area.repository.ts
│       ├── question.repository.ts
│       ├── level.repository.ts
│       ├── user-test.repository.ts
│       ├── user-answer.repository.ts
│       └── import-log.repository.ts
├── use-cases/exam/
│   ├── dto/
│   │   ├── area.dto.ts
│   │   ├── question.dto.ts
│   │   ├── level.dto.ts
│   │   ├── exam.dto.ts
│   │   └── import.dto.ts
│   ├── services/
│   │   ├── question-import.service.ts
│   │   ├── question-randomizer.service.ts
│   │   └── exam-scoring.service.ts
│   ├── exam.use-case.ts
│   └── exam-use-cases.module.ts
└── interfaces/controllers/exam/
    ├── admin-exam.controller.ts
    ├── exam.controller.ts
    └── exam-controllers.module.ts

templates/exam/
├── questions-import-template.csv
├── questions-import-template.json
└── README.md

drizzle/seed/
└── exam-seed.ts
```

---

## API Response Format

All endpoints follow this consistent format:

```json
{
  "success": true | false,
  "message": "Descriptive message",
  "data": { ... } | null
}
```

---

## Support & Maintenance

For issues or questions:
1. Check import logs: `GET /admin/exam/questions/import/logs`
2. Review error messages in API responses
3. Verify database migrations ran successfully
4. Ensure seed data was created

---

## License

This exam system is part of the AI Recruit Backend project.
