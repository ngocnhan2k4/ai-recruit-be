import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from typing import List


@dataclass
class QueueConfig:
    redis_host: str
    redis_port: int = 6379
    redis_password: str | None = None
    redis_db: int = 0
    queue_name: str = "job_index_queue"
    event_name: str = "upsert.job"
    node_script_path: str = "job_index_queue/enqueue_job_index.js"


class JobIndexQueueProducer:
    def __init__(self, config: QueueConfig):
        self.config = config

    def enqueue_upsert_jobs(self, job_ids: List[str]) -> int:
        unique_job_ids = list(dict.fromkeys([job_id for job_id in job_ids if job_id]))
        if not unique_job_ids:
            return 0

        node_bin = shutil.which("node")
        if not node_bin:
            raise RuntimeError(
                "Node.js is required to enqueue BullMQ jobs from crawler"
            )

        script_path = self._resolve_script_path(self.config.node_script_path)
        if not os.path.isfile(script_path):
            raise RuntimeError(f"Queue producer script not found: {script_path}")

        payload = {
            "redis": {
                "host": self.config.redis_host,
                "port": self.config.redis_port,
                "password": self.config.redis_password,
                "db": self.config.redis_db,
            },
            "queueName": self.config.queue_name,
            "eventName": self.config.event_name,
            "jobIds": unique_job_ids,
        }

        completed = subprocess.run(
            [node_bin, script_path, json.dumps(payload)],
            capture_output=True,
            text=True,
            check=False,
        )

        if completed.returncode != 0:
            stderr = completed.stderr.strip()
            stdout = completed.stdout.strip()
            detail = stderr or stdout or "Unknown queue error"
            raise RuntimeError(f"Failed to enqueue index jobs: {detail}")

        return len(unique_job_ids)

    def _resolve_script_path(self, path: str) -> str:
        if os.path.isabs(path):
            return path
        cwd = os.getcwd()
        return os.path.normpath(os.path.join(cwd, path))
