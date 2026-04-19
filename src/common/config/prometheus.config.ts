import {
  makeCounterProvider,
  makeHistogramProvider,
} from "@willsoto/nestjs-prometheus";

export const HTTP_REQUESTS_TOTAL = makeCounterProvider({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

export const HTTP_REQUEST_DURATION_SECONDS = makeHistogramProvider({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds (p50/p95/p99 available)",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
