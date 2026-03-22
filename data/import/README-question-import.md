# Import câu hỏi exam (JSON)

## API

`POST /admin/exam/questions/import/json`  
Body: `{ "data": [ ... ], "fileName": "optional.json" }`

## Format mỗi phần tử

| Field | Bắt buộc | Ghi chú |
|--------|----------|---------|
| `skill` | Một trong hai: `skill` **hoặc** `skillId` | `skill` = **tên kỹ năng trùng DB** (vd: `JavaScript`) |
| `skillId` | | UUID kỹ năng nếu không dùng tên |
| `questionText` | ✓ | Nội dung câu hỏi |
| `options` | ✓ | Mảng chuỗi, **ít nhất 2** lựa chọn |
| `correctAnswer` | ✓ | **Phải trùng chính xác** một phần tử trong `options` |
| `difficultyLevels` | ✓ | Mảng 1–3 giá trị: `easy`, `medium`, `hard`, `advanced`, `expert` |

Trước khi import: đảm bảo skill `JavaScript` (hoặc tên bạn dùng) đã tồn tại trong bảng `skills`, **hoặc** thay toàn bộ bằng `skillId` thật.

## File mẫu

- **`javascript-exam-bulk-questions.json`** — ~85 câu (JavaScript), phân bổ: `easy`, `medium`, `hard`, `advanced` (mỗi câu một mức trong `difficultyLevels`).

### Gọi API (ví dụ)

```bash
curl -X POST "$API_URL/admin/exam/questions/import/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"data\": $(cat data/import/javascript-exam-bulk-questions.json), \"fileName\": \"javascript-exam-bulk-questions.json\"}"
```

Hoặc trong admin UI nếu có màn import — paste nội dung file vào field `data`.
