# API: Save Blog Post as Draft

Endpoint: `POST /blogs/draft`

Mô tả
- Lưu bài viết dưới dạng bản nháp. Hỗ trợ tạo mới hoặc cập nhật draft nếu truyền `postId` trong query.

Authorization
- Yêu cầu JWT: `Authorization: Bearer <token>`

Query parameters
- `postId` (optional, string): ID bài viết cần cập nhật (nếu muốn cập nhật draft của bài có sẵn)

Request body (JSON)
- `title` (string, optional) — Tiêu đề bài viết.
- `content` (string, optional) — Nội dung bài viết (ví dụ: markdown hoặc HTML theo thỏa thuận FE/BE).
- `tags` (string[], optional) — Mảng tag/skill.
- `category` (string, optional) — ID hoặc tên category.
- `summary` (string, optional) — Mô tả ngắn.
- `coverImage` (string, optional) — URL ảnh bìa.
- `meta` (object, optional) — Trường mở rộng (ví dụ: `{ "readingTime": 5, "language": "vi" }`).

Ghi chú: Tất cả trường là optional để hỗ trợ tính năng autosave trên FE.

Behavior / Fallback
- Nếu không cung cấp `slug`, backend:
  - Thử sinh slug từ `title` nếu có.
  - Nếu `title` không có, sẽ cố gắng sinh slug từ phần đầu `content`.
  - Nếu không có dữ liệu để tạo slug, backend vẫn chấp nhận draft; slug có thể là chuỗi tạm hoặc rỗng. FE không nên hiển thị link public cho đến khi slug hợp lệ.
- Nếu truyền `postId`:
  - Nếu `postId` tồn tại: cập nhật draft tương ứng.
  - Nếu `postId` không tồn tại: trả `404 Not Found`.
- Draft có thể được lưu với dữ liệu không đầy đủ (phù hợp autosave incremental).

Responses

Success
- HTTP 200
```json
{
  "data": {
    "id": "string",
    "slug": "string"
  },
  "message": "string",
  "statusCode": 200
}
```

Errors
- `401 Unauthorized` — thiếu/không hợp lệ token.
- `400 Bad Request` — payload không hợp lệ (ví dụ: kiểu dữ liệu sai).
- `404 Not Found` — `postId` không tìm thấy khi cập nhật.
- `500 Internal Server Error` — lỗi server.

Ví dụ

Curl (tạo mới draft)
```bash
curl -X POST "https://api.example.com/blogs/draft" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bài nháp ví dụ",
    "content": "# Heading\nNội dung markdown...",
    "tags": ["typescript","nest"],
    "category": "tech",
    "summary": "Tóm tắt ngắn"
  }'
```

Curl (cập nhật draft với postId)
```bash
curl -X POST "https://api.example.com/blogs/draft?postId=123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Cập nhật nội dung..."}'
```

Axios (TypeScript)
```ts
import axios from 'axios';

const res = await axios.post('/blogs/draft?postId=123', {
  title: 'Bài nháp ví dụ',
  content: 'Nội dung...'
}, {
  headers: { Authorization: `Bearer ${token}` }
});

const { id, slug } = res.data.data;
```

OpenAPI fragment (YAML)
```yaml
  /blogs/draft:
    post:
      summary: Save blog post as draft
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: postId
          schema:
            type: string
          required: false
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                content:
                  type: string
                tags:
                  type: array
                  items:
                    type: string
                category:
                  type: string
                summary:
                  type: string
                coverImage:
                  type: string
                meta:
                  type: object
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    properties:
                      id:
                        type: string
                      slug:
                        type: string
                  message:
                    type: string
                  statusCode:
                    type: integer
```

FE best-practices
- Autosave định kỳ (ví dụ mỗi 10–30s) chỉ gửi trường thay đổi để giảm payload.
- Không cần chờ slug để lưu draft; tuy nhiên trước khi publish, gọi endpoint publish chính thức và đảm bảo slug hợp lệ.
- Hiển thị trạng thái lưu rõ ràng (`Saving...` / `Saved` / `Error`).
- Khi cập nhật với `postId` mà server trả `404`, FE có thể:
  - Tạo mới một draft mới, hoặc
  - Thông báo lỗi cho người dùng (tuỳ UX).
- Upload media (ảnh) nên thực hiện qua endpoint upload riêng; lưu URL vào `coverImage` hoặc chèn trực tiếp trong `content`.

Notes
- File controller tương ứng: [src/interfaces/controllers/blog/blog.controller.ts](src/interfaces/controllers/blog/blog.controller.ts)
- Nếu muốn, tôi có thể:
  - Thêm ví dụ cụ thể cho lỗi (body error schema),
  - Tạo một đoạn Swagger/OpenAPI đầy đủ trong `docs/` hoặc `src/swagger`.

---

Phiên bản tài liệu: 1.0
Created: 2026-04-14
