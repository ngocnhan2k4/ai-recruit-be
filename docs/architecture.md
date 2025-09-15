# Tài Liệu Kiến Trúc

## Tổng Quan

Tài liệu này mô tả các tầng kiến trúc và thành phần của hệ thống AI Recruit Backend, tuân theo các nguyên tắc clean architecture.

## Các Tầng Kiến Trúc

### Core

#### Entities
- Chứa các entity nghiệp vụ (ví dụ: `User`) đại diện cho các khái niệm nghiệp vụ cốt lõi
- Các entity này đóng gói các quy tắc nghiệp vụ và logic domain
- Độc lập với các framework và database bên ngoài

#### Abstracts
- Chứa các contract và interface (truy cập dữ liệu, repository, service)
- Định nghĩa các abstraction mà tầng use-case có thể sử dụng mà không cần implement cụ thể
- Cho phép dependency inversion và khả năng test

### Framework

- Chứa các implementation cụ thể của các service bên ngoài
- Ví dụ:
  - `PostgresDataService` - Implementation truy cập database
  - Implementation email service
  - Tích hợp API bên thứ ba
  - Code cụ thể của infrastructure

### Interface

#### Controller
- Xử lý các request từ nguồn bên ngoài
- Điều phối luồng dữ liệu giữa tầng HTTP và use-case
- Chịu trách nhiệm chuyển đổi request/response

#### DTO (Data Transfer Objects)
- Định nghĩa cấu trúc dữ liệu truyền giữa controller và use-case
- Đảm bảo tách biệt rõ ràng giữa API contract bên ngoài và logic nghiệp vụ nội bộ
- Xử lý serialization/deserialization

### Service

- Chứa cấu hình dependency injection
- Các use-case không phụ thuộc trực tiếp vào framework, database hay UI cụ thể
- Dependencies được inject từ bên ngoài thông qua các module service
- Thúc đẩy loose coupling và khả năng test

### Usecase

- Chứa các use-case nghiệp vụ và application logic
- Tách biệt logic nghiệp vụ khỏi các tầng truy cập dữ liệu
- Implement các workflow và quy tắc nghiệp vụ cụ thể
- Chỉ phụ thuộc vào abstraction, không phụ thuộc vào implementation cụ thể

