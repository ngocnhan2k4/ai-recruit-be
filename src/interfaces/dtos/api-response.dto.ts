import { ApiProperty } from "@nestjs/swagger";

export class ApiResponse<T> {
  @ApiProperty()
  code: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;

  constructor({
    message,
    code,
    data,
  }: {
    message: string;
    code: string;
    data?: T;
  }) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}
