import { ApiProperty } from "@nestjs/swagger";

export class ApiResponse<T> {
  @ApiProperty({ example: "SUCCESS" })
  code: string;

  @ApiProperty({ example: "Request was successful." })
  message: string;

  @ApiProperty({ required: false })
  data?: T;
  constructor(message: string, code: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}
