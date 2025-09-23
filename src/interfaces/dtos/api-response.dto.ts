export class ApiResponse<T> {
    code: string;
    message: string;
    data?: T;
    constructor(message: string, code: string, data?: T) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
}