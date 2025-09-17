# AI Recruit Backend - Development Notes

## API Guidelines

### 1. Pagination
- **Sử dụng cursor pagination** cho tất cả các API get list
- Cursor based pagination giúp tối ưu performance và tránh duplicated data khi có insert/delete
- Respone: 
{
    data: [],
    next_token: ...
}

### 2. Error Handling
- **Error Response Format:**
  ```json
  {
    "error_code": "USER_NOT_FOUND",
    "message": "user not found"
  }
  ```

- **Error Code Mapping Strategy:**
  - Với lỗi chủ động: Backend trả về `error_code` cụ thể
  - Frontend tự tạo mapping: `error_code` → `message`
  - Logic xử lý ở Frontend:
    - Nếu có message trong mapping → hiển thị message từ mapping
    - Nếu không có → fallback sử dụng message từ server

### 3. Naming Convention
- **Response format:** Sử dụng `snake_case` cho tất cả response data
- Ví dụ:
  ```json
  {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
  ```

### 4. Example Error Codes
```
USER_NOT_FOUND
INVALID_CREDENTIALS
INSUFFICIENT_PERMISSION
VALIDATION_ERROR
INTERNAL_SERVER_ERROR
RATE_LIMIT_EXCEEDED
```

---
*Last updated: September 17, 2025*