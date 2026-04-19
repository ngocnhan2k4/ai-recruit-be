Có 2 phase:

Phase 1: Khi org đăng job cần kiếm N ứng viên → hệ thống suggest ra N CV nổi bật của hệ thống đang trạng thái kiếm việc  ( trang profile cần thêm flag để biết user có đang kiếm việc không, thêm số lượng cần tuyển khi tạo )

Phase: 2: Đối với các cv đã apply → ranking các cv từ trên xuống 

Yêu cầu: 

Cần list ra được các tiêu chi phù hợp giữ CV và job (các skill có, phù hợp, tương đồng, kinh nghiệm, vị trí, lương…)

Flow: 

Phase 1:

Khi user upload CV → extract thông tin + sync ES

Khi admin duyệt job thành active → push message lên BullMQ

Worker: Lọc ra danh sách N CV với score giảm dần để gợi ý cho org(sau này dùng embeding để cải thiện lọc)

Phase 2: 
-  Khi có CV ứng tuyển → worker tính score và lưu 

# Task
    ## Task 1: Create full model còn thiếu để làm chức năng (define model ở postgres trước)

    ### Mục tiêu của task 1
    - Chốt toàn bộ model postgres cần thêm/sửa trước khi làm worker, API và FE
    - Tận dụng model hiện có, chỉ thêm phần còn thiếu để phục vụ phase 1 + phase 2
    - Sau task này phải trả lời được: score phase 2 lưu ở đâu, criteria lưu ở đâu, trạng thái worker/index lưu ở đâu

    ### Model hiện có có thể reuse
    - `user_onboardings`: đã có `provinceIds`, `categoryIds`, `expectedSalary`, `experienceYears`
    - `jobs`: đã có các field phục vụ matching cơ bản như `salaryMin`, `salaryMax`, `experienceMin`, `experienceMax`, `categoryId`
    - `apply_jobs`: đã có record application nhưng chưa có score/rank/criteria
    - `cvs`: đã có file CV nhưng chưa có trạng thái extract/index

    ### Cần bổ sung/sửa model nào
    - `user_onboardings`
      - thêm `isSeekingJob boolean default false`
      - mục đích: filter candidate pool cho phase 1
      - note: các API update/read profile hiện có cũng phải trả và nhận field này

    - `jobs`
      - thêm `recruitCount integer`
      - mục đích: lưu số lượng N ứng viên mà org muốn hệ thống suggest
      - note: create/update job và các API get job phải trả field này

    - `cvs`
      - thêm các field trạng thái xử lý async:
        - `extractionStatus` (`pending`, `processing`, `completed`, `failed`)
        - `extractedAt timestamp null`
        - `extractedData jsonb null`
        - `lastIndexedAt timestamp null`
        - `indexingError text null`
      - mục đích:
        - biết CV nào đã extract xong và đã sync ES chưa
        - lưu parsed CV data để không phải extract lại file mỗi lần re-index
      - note: dùng để retry worker, debug khi pipeline lỗi, và làm nguồn dữ liệu để sync ES lại

    - `apply_jobs`
      - thêm các field phục vụ phase 2:
        - `matchingScore numeric`
        - `matchingRank integer`
        - `matchingCriteria jsonb`
        - `scoredAt timestamp null`
      - mục đích: lưu kết quả ranking cho các CV đã apply
      - note: API get applications phải trả thêm các field này và sort theo score giảm dần

    - không tạo bảng `job_cv_recommendations`
      - phase 1 sẽ không lưu recommendation ở postgres
      - mỗi lần org call API recommendation sẽ query trực tiếp ES để lấy top N CV mới nhất
      - lý do:
        - dữ liệu CV/profile/job có thể thay đổi liên tục
        - không phải xử lý invalidation recommendation đã lưu
        - giảm độ phức tạp ở phase đầu

    ### Định nghĩa `matchingCriteria`
    - Dùng `jsonb`
    - Mục đích: FE có thể render “vì sao CV phù hợp với job”
    - Cấu trúc gợi ý:
      - `matchedSkills`
      - `missingSkills`
      - `experience`
      - `salary`
      - `jobTitle`
      - `summary`
    - chưa cần chốt weight ở task 1, nhưng cần chốt schema lưu trữ

    ### Cách lưu dữ liệu theo từng phase
    - phase 1:
      - không lưu recommendation result ở postgres
      - API query trực tiếp ES mỗi lần call để lấy dữ liệu mới nhất
    - phase 2:
      - lưu score/rank/criteria vào `apply_jobs`
      - vì đây là dữ liệu nghiệp vụ gắn với application đã phát sinh

    ### Acceptance criteria của task 1
    - migration postgres tạo/sửa đủ các field ở trên
    - entity/model/drizzle schema được update tương ứng
    - các DTO/type bị ảnh hưởng bởi field mới được update luôn
    - không làm hỏng các API cũ đang đọc `user_onboardings`, `jobs`, `cvs`, `apply_jobs`

    ## Task 2: Bổ sung fe + be tính năng user kiếm việc 
    ## Task 3: Bổ sung tính năng org yêu cần cần tìm N ứng viên (fe + be)
    ## Task 4: Khi user upload Cv -> bắn một messsage cho worker để handle, nó sẽ extract data và sync ES
    ## Task 5: Tạo một API gợi ý CV, mỗi lần call sẽ query ES trực tiếp, tính score và trả ra top N CV (only be)
    ## Task 6: Khi có CV ứng tuyển -> bắn một message cho worker để handle, worker tính toán score cho mỗi CV và lưu, sửa API get CV đã apply và trả vtheem trường score(only be)
# Note
    ## Với mỗi task, nếu chúng gây ra side effect thì phải sửa luôn, ví dụ nếu thêm field thì các API khác cũng ảnh hưởng thì cũng phải sửa luôn