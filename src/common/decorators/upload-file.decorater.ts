import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { MultipartFile } from "@fastify/multipart";
import { RESPONSE_CODE } from "../constants/response";

export interface UploadFileRequest extends FastifyRequest {
  fileData?: MultipartFile;
  bodyData?: Record<string, any>;
}

export type UploadFileOptions = {
  // whether a file is required; default true
  required?: boolean;
};

export const UploadFileAndBody = createParamDecorator(
  async (data: UploadFileOptions | undefined, ctx: ExecutionContext) => {
    const options: UploadFileOptions =
      data && typeof data === "object" && "required" in data
        ? data
        : { required: true };

    const request = ctx.switchToHttp().getRequest<UploadFileRequest>();

    // Fastify multipart plugin must be registered
    if (typeof request.parts !== "function") {
      throw new BadRequestException({
        message: "Multipart support not enabled",
        code: RESPONSE_CODE.FILE_TYPE_NOT_SUPPORTED,
      });
    }

    const body: Record<string, any> = {};
    let file: MultipartFile | undefined;

    for await (const part of request.parts()) {
      if (part.type === "file") {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk as Buffer);
        }
        const buffer = Buffer.concat(chunks);

        file = {
          ...part,
          buffer,
          toBuffer: () => Promise.resolve(buffer),
        } as unknown as MultipartFile;
      } else if (part.type === "field") {
        body[part.fieldname] = part.value;
      }
    }

    if (!file && options.required) {
      throw new BadRequestException({
        message: "No file uploaded",
        code: RESPONSE_CODE.FILE_NOT_PROVIDE,
      });
    }

    // attach if present
    if (file) request.fileData = file;
    request.bodyData = body;

    return { file, body };
  },
);
