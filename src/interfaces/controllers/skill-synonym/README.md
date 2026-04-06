## Endpoints

## 1) GET `/admin/skill-synonyms`

Get paginated list of skills and aliases.

### Request

- Query: `GetSkillsSynonymsQueryDto`

### Response

```json
{
  "message": "Request was successful.",
  "code": "SUCCESS",
  "data": {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "masterName": "javascript",
        "aliasNames": ["js", "ecmascript"]
      }
    ],
    "pagination": {
      "total": 1,
      "hasNextPage": false
    }
  }
}
```

## 2) PATCH `/admin/skill-synonyms/:skillId`

Update aliases for a skill group.

### Request

- Path param: `skillId`
- Body: `UpdateSkillSynonymDto`

Example body:

```json
{
  "masterName": "javascript",
  "aliasNames": ["js", "vanilla js", "ecmascript"],
  "source": "manual"
}
```

### Response

`ApiResponse<SkillSynonymResponseDto>`

```json
{
  "message": "Request was successful.",
  "code": "SUCCESS",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "masterName": "javascript",
    "aliasNames": ["ecmascript", "js", "vanilla js"]
  }
}
```

## 3) DELETE `/admin/skill-synonyms/:skillId`

Delete by `skillId`.

Backend behavior:

- deletes the skill in `skills` table
- deletes related foreign-key rows (e.g. `job_skills`, `user_skills`, `questions`)
- deletes related alias rows in `skills_synonyms`

### Request

- Path param: `skillId`

### Response

```json
{
  "message": "Request was successful.",
  "code": "SUCCESS"
}
```
