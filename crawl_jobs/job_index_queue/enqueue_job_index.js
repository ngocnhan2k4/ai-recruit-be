const { Queue } = require("bullmq");

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    throw new Error("Missing payload argument");
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid payload JSON: ${error.message}`);
  }

  const redis = payload.redis || {};
  const queueName = payload.queueName || "job_index_queue";
  const eventName = payload.eventName || "upsert.job";
  const jobIds = Array.isArray(payload.jobIds)
    ? payload.jobIds.filter(Boolean)
    : [];

  if (jobIds.length === 0) {
    process.stdout.write("No jobs to enqueue\n");
    return;
  }

  if (!redis.host) {
    throw new Error("Redis host is required");
  }

  const queue = new Queue(queueName, {
    connection: {
      host: redis.host,
      port: Number(redis.port || 6379),
      password: redis.password || undefined,
      db: Number(redis.db || 0),
    },
  });

  try {
    await queue.addBulk(
      jobIds.map((jobId) => ({
        name: eventName,
        data: { jobId },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        },
      })),
    );

    process.stdout.write(`Enqueued ${jobIds.length} job index events\n`);
  } finally {
    await queue.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
