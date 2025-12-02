# Exam System - Quick Start Guide

## 🚀 Setup (5 minutes)

### Step 1: Push Database Schema

```bash
npm run db:push
```

This creates 6 new tables:
- `areas` - Assessment areas
- `questions` - Exam questions
- `levels` - Proficiency levels
- `user_tests` - User exam sessions
- `user_answers` - Individual answers
- `import_logs` - Import history

### Step 2: Seed Sample Data

```bash
npx ts-node drizzle/seed/exam-seed.ts
```

This creates:
- ✅ 1 Programming area
- ✅ 5 Skills (JavaScript, TypeScript, React, Node.js, Python)
- ✅ 4 Levels (Beginner, Intermediate, Advanced, Expert)
- ✅ 24 Sample questions

### Step 3: Start Server

```bash
npm run start:dev
```

## 📝 Example API Requests

### For Users

#### 1. Start an Exam

```bash
POST http://localhost:3000/exam/start
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "areaId": "PROGRAMMING_AREA_ID",
  "skillIds": ["JAVASCRIPT_ID", "REACT_ID", "NODEJS_ID"]
}
```

**Response**: 20 randomized questions (without correct answers)

#### 2. Submit Answers

```bash
POST http://localhost:3000/exam/submit
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "userTestId": "YOUR_TEST_ID",
  "answers": [
    {
      "questionId": "QUESTION_1_ID",
      "chosenAnswer": "A programming language"
    },
    {
      "questionId": "QUESTION_2_ID",
      "chosenAnswer": "Declares a constant variable"
    }
    // ... 18 more answers (total 20)
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalScore": 145,
    "correctAnswers": 17,
    "incorrectAnswers": 3,
    "levelAssessed": "Intermediate"
  }
}
```

#### 3. View Exam History

```bash
GET http://localhost:3000/exam/my-tests
Authorization: Bearer YOUR_TOKEN
```

### For Admins

#### 1. Import Questions from CSV

```bash
POST http://localhost:3000/admin/exam/questions/import/csv
Authorization: Bearer ADMIN_TOKEN
Content-Type: multipart/form-data

file: @templates/exam/questions-import-template.csv
```

#### 2. Create a New Area

```bash
POST http://localhost:3000/admin/exam/areas
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Design",
  "description": "UI/UX and graphic design skills"
}
```

#### 3. Create a Question

```bash
POST http://localhost:3000/admin/exam/questions
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "skillId": "SKILL_UUID",
  "areaId": "AREA_UUID",
  "questionText": "What is React?",
  "options": [
    "A JavaScript library",
    "A database",
    "A programming language",
    "An operating system"
  ],
  "correctAnswer": "A JavaScript library",
  "point": 10,
  "difficulty": "easy"
}
```

## 🔑 Key Endpoints

### User Endpoints
- `POST /exam/start` - Start an exam
- `POST /exam/submit` - Submit exam answers
- `GET /exam/my-tests` - Get exam history
- `GET /exam/my-tests/:id` - Get test details
- `GET /exam/areas` - List available areas

### Admin Endpoints
- **Areas**: `/admin/exam/areas` (GET, POST, PUT, DELETE)
- **Questions**: `/admin/exam/questions` (GET, POST, PUT, DELETE)
- **Levels**: `/admin/exam/levels` (GET, POST, PUT, DELETE)
- **Import**: `/admin/exam/questions/import/csv` or `/json`
- **Logs**: `/admin/exam/questions/import/logs`

## 🎯 Exam Flow

1. **User** selects area + up to 5 skills → `POST /exam/start`
2. **System** generates 20 random questions → Returns questions
3. **User** answers questions
4. **User** submits all answers → `POST /exam/submit`
5. **System** calculates score & assigns level → Returns results

## 📊 Scoring & Levels

### Default Level Ranges (Programming Area)

| Level | Score Range | Description |
|-------|-------------|-------------|
| Beginner | 0 - 50 | Basic understanding |
| Intermediate | 51 - 120 | Solid knowledge |
| Advanced | 121 - 180 | Strong expertise |
| Expert | 181 - 300 | Mastery level |

Each question has a `point` value (typically 5-15 points).
Total possible score = sum of all question points in the exam.

## 📁 Import Templates

Templates are in `/templates/exam/`:

### CSV Format
```csv
area,skill,questionText,options,correctAnswer,point,difficulty
Programming,JavaScript,"What is JavaScript?","[""A language"",""A framework"",""A database""]",A language,10,easy
```

### JSON Format
```json
[
  {
    "area": "Programming",
    "skill": "JavaScript",
    "questionText": "What is JavaScript?",
    "options": ["A language", "A framework", "A database"],
    "correctAnswer": "A language",
    "point": 10,
    "difficulty": "easy"
  }
]
```

See `templates/exam/README.md` for detailed import documentation.

## ⚙️ Configuration

### Randomization Options

The system supports:
- **Fisher-Yates shuffle** for true randomization
- **Skill balancing** (default: enabled)
- **Difficulty distribution** (optional):
  - 40% easy
  - 40% medium
  - 20% hard
- **Option shuffling** (enabled by default)

### Customization

To adjust question count or distribution, modify:
- [src/use-cases/exam/exam.use-case.ts](src/use-cases/exam/exam.use-case.ts:405)
- Look for `totalQuestions: 20` in the `startExam` method

## 🧪 Testing Your Setup

### Test 1: Verify Database

```bash
# Check tables exist
npm run db:studio
# Opens Drizzle Studio - look for 6 new tables
```

### Test 2: Quick API Test

```bash
# Get areas (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/exam/areas
```

Expected response:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "...",
        "name": "Programming",
        "description": "..."
      }
    ],
    "pagination": {...}
  }
}
```

### Test 3: Full Exam Flow

1. Get area ID from `/exam/areas`
2. Get skill IDs from existing skills
3. Start exam with those IDs
4. Submit with all 20 answers
5. Check score and level

## 🐛 Troubleshooting

### Issue: "No active questions found"

**Solution**: Run seed data or import questions:
```bash
npx ts-node drizzle/seed/exam-seed.ts
```

### Issue: "Not enough questions"

**Solution**: Need at least 20 active questions across selected skills. Either:
- Add more questions via API or import
- Select fewer/different skills

### Issue: Import fails

**Solution**: Check import logs:
```bash
GET /admin/exam/questions/import/logs
```

Review error messages and fix data format.

### Issue: Authentication errors

**Solution**: Ensure you're using a valid JWT token. Admin endpoints require admin privileges.

## 📚 Full Documentation

For complete documentation, see [EXAM_SYSTEM_DOCUMENTATION.md](EXAM_SYSTEM_DOCUMENTATION.md)

## 🎉 Success!

You now have a fully functional exam system with:
- ✅ Multi-skill assessments
- ✅ Randomized questions
- ✅ Automatic scoring
- ✅ Level assessment
- ✅ Import capabilities
- ✅ Admin management
- ✅ User history tracking

Start creating exams and assessing skills! 🚀
