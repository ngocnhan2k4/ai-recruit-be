import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiExcludeEndpoint } from "@nestjs/swagger";
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheckResult,
  //HealthIndicatorResult,
} from "@nestjs/terminus";
@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) {}
  @Get()
  @ApiOperation({
    summary: "Health check endpoint",
    description: "Returns the current health status of the application",
  })
  async check(): Promise<HealthCheckResult> {
    const result = await this.health.check([
      () => this.http.pingCheck("nestjs-docs", "https://docs.nestjs.com"),
    ]);

    return result;
  }

  @Get("debug-sentry")
  @ApiExcludeEndpoint()
  debugSentry(): never {
    throw new Error("Sentry test error – this is intentional!");
  }
}
