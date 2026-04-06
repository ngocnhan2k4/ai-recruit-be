import { ApiProperty } from "@nestjs/swagger";

import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";
import type { ID } from "@/common/types";

export class ApiResponse<T> {
  @ApiProperty({ example: "SUCCESS" })
  code: string;

  @ApiProperty({ example: "Request was successful." })
  message: string;

  @ApiProperty({ required: false })
  data?: T;
}

export const ApiResponseDto = <
  TModel extends Type<any> | "string" | "number" | "boolean",
>(
  model: TModel,
  options?: { isArray?: boolean },
) => {
  const isArray = options?.isArray ?? false;

  let dataSchema: any;

  if (typeof model === "string") {
    // primitive types
    dataSchema = isArray
      ? { type: "array", items: { type: model } }
      : { type: model };
  } else {
    // class dto
    dataSchema = isArray
      ? { type: "array", items: { $ref: getSchemaPath(model) } }
      : { $ref: getSchemaPath(model) };
  }

  return applyDecorators(
    ...(typeof model !== "string"
      ? [ApiExtraModels(ApiResponse, model)]
      : [ApiExtraModels(ApiResponse)]),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponse) },
          {
            properties: {
              data: dataSchema,
            },
          },
        ],
      },
    }),
  );
};

export class RelatedEntityDto {
  @ApiProperty({ type: "string" })
  id: ID;

  @ApiProperty({ type: "string" })
  name: string;
}
