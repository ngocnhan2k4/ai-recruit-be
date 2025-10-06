import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { MultipartFile } from "@fastify/multipart";

export interface UploadFileRequest extends FastifyRequest {
  fileData?: MultipartFile;
  bodyData?: Record<string, any>;
}

export const UploadFileAndBody = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<UploadFileRequest>();

    // Fastify multipart plugin must be registered
    if (typeof request.parts !== "function") {
      throw new BadRequestException("Multipart support not enabled");
    }

    const body: Record<string, any> = {};
    let file: MultipartFile | undefined;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        file = part;
      } else if (part.type === "field") {
        body[part.fieldname] = part.value;
      }
    }

    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    request.fileData = file;
    request.bodyData = body;

    return { file, body };
  },
);
