import { ApiProperty } from "@nestjs/swagger";

export class MessageDto {
  @ApiProperty({ example: "Logged out successfully" })
  message!: string;
  constructor(message: string) {
    this.message = message;
  }
}
