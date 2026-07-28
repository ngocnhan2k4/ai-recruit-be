import { of } from "rxjs";
import {
  CONTEXT_KEYS,
  runContext,
  setContext,
} from "@/common/stores/context.store";
import { REQUEST_ID_HEADER } from "@/common/utils/request-log";
import { AIClientService } from "./ai-client.service";

describe("AIClientService request correlation", () => {
  it("forwards the current request ID to the AI service", async () => {
    const post = jest.fn().mockReturnValue(of({ data: { summary: "ok" } }));
    const httpService = { post };
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          AI_SERVICE_URL: "http://ai-service",
          AI_SERVICE_TIMEOUT: 1000,
          AI_SERVICE_MAX_RETRIES: 0,
          AI_API_KEY: "test-api-key",
        };
        return values[key];
      }),
    };
    const service = new AIClientService(
      httpService as never,
      configService as never,
    );

    await runContext(async () => {
      setContext(CONTEXT_KEYS.REQUEST_ID, "trace-backend-123");
      await service.runCandidateBrief({} as never);
    });

    expect(post).toHaveBeenCalledWith(
      "http://ai-service/api/v1/candidate-brief",
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          [REQUEST_ID_HEADER]: "trace-backend-123",
        }),
      }),
    );
  });
});
