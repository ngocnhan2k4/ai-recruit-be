Phase 1 — Quick wins (1–2 sprint, ít migration)
1. Job insight cards trên blog AI / market

Mở rộng source JSON: { jobIds[], categoryId, periodDays, statsSnapshot } (cron weekly đã gọi AI từ job data).
FE: block “Việc nổi bật tuần này” → deep link /jobs/:id.
API: GET /blogs/:slug/related-jobs — query job ES theo skillIds từ blog_post_tags + category job (map 1 bảng blog_category_job_category).
2. Skill hub — dùng blog_post_tags.skillId

GET /skills/:id/content → blogs published + jobs active + exam areas (đã có skill ở exam).
Biến blog thành tài liệu ôn thi / đọc thêm sau khi làm exam.
3. Gắn blog vào trang Job detail

Không cần FK ngay: filter blog theo skill overlap với job.
Sau đó thêm blog_post_jobs (postId, jobId) khi org/AI tạo bài “phân tích JD”.
4. Org employer branding

authorId + thêm organizationId (nullable).
Org member role ORGANIZATION_CONTENT_* (Casbin đã có policy mẫu) → đăng bài employer blog, hiển thị trên org profile.
Notify followers/org members khi publish (NotificationType mới hoặc tái dùng JOB_UPDATED pattern).
5. Unified “saved content”

Tab “Đã lưu”: job + blog (cùng user_actions, khác objectType) — API GET /users/me/saved aggregate.
Giảm cảm giác blog là app con.
Phase 2 — Product loop (2–4 sprint)
6. Learning path ↔ blog

Roadmap skill phase có resources[] — thêm type blog_post (slug/url).
Admin/AI gợi ý 2–3 bài blog khi generate roadmap (gọi getBlogs filter skillId).
Weekly progress: “Đọc 1 bài liên quan skill tuần này”.
7. Exam ↔ blog

Sau submit exam: recommend blogs theo skill vừa thi + điểm yếu (difficulty).
Bài blog tag skillId = skill exam → CTA “Luyện lại” → start exam.
8. Job matching digest

Email JOB_RECOMMENDATIONS (đã có) thêm 1–2 link blog market weekly (cùng slug cron).
In-app: section “Đọc trước khi apply” trên matched-jobs.
9. AI content cho Organization

Nút org: “Tạo bài giới thiệu văn hóa / JD summary” từ jobId (mở rộng generate-job-blog-post với organizationId).
Status PENDING → moderator duyệt (giống job approval).
10. Crawl → blog pipeline

sourceType: CRAWLED + source: { platform, url } từ RSS/summary site tuyển dụng (không trùng job crawl raw).
Hoặc: sau crawl job, AI sinh micro-post 200 chữ + tag skill → blog feed “Tin nhanh”.
Phase 3 — Nền tảng nội dung (dài hạn)
11. Polymorphic content model

Bảng content_links: (contentType: blog|job|exam|roadmap, contentId, relationType, targetId).
Comment/like có thể mở rộng ObjectType.JOB dùng chung service (hiện comment chỉ blog).
12. Blog index Elasticsearch

Index title, summary, skillNames, category — search chung “Tìm việc & kiến thức”.
Related: ES more_like_this thay rule +5/+2 trong BlogService.calculateRelatedPosts.
13. Subscription / feature

FeatureCodeEnum: giới hạn số bài AI/org/tháng, premium “bài phân tích sâu”.
Đồng bộ với job apply limits.
14. Moderation thống nhất

