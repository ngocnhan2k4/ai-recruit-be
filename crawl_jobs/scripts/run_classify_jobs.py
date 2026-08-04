import json
import os
import subprocess
import urllib.request
import urllib.parse
import tempfile
import pandas as pd

def fetch_vault_secrets(env, vault_token):
    url = f"https://vault.airecruit.software/v1/airecruit-backend/data/{env}"
    req = urllib.request.Request(url, headers={"X-Vault-Token": vault_token})
    try:
        with urllib.request.urlopen(req) as response:
            resp = json.loads(response.read().decode())
            data = resp.get("data", {}).get("data", {}) or resp.get("data", {})
            return data
    except Exception as e:
        print(f"Error fetching Vault secrets for {env}: {e}")
        return {}

def run_cmd(cmd, env_update=None):
    env = os.environ.copy()
    if env_update:
        env.update(env_update)
    print(f"Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        print(result.stderr)
        return False, result.stdout
    print(result.stdout)
    return True, result.stdout

def validate_redis(redis_url):
    node_code = """
const path = require("path");
const Redis = require(path.resolve(process.cwd(), "job_index_queue", "node_modules", "ioredis"));
const url = process.env.QUEUE_REDIS_URL;
const client = new Redis(url, {
  enableReadyCheck: true,
  connectTimeout: 5000,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});
const timer = setTimeout(() => {
  console.error("Redis connection timeout");
  process.exit(1);
}, 6000);
client.once("ready", async () => {
  clearTimeout(timer);
  await client.quit();
  process.exit(0);
});
client.once("error", (err) => {
  console.error(err?.message || err);
  process.exit(1);
});
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
        f.write(node_code)
        temp_name = f.name

    try:
        ok, _ = run_cmd(["node", temp_name], env_update={"QUEUE_REDIS_URL": redis_url})
        return ok
    finally:
        if os.path.exists(temp_name):
            os.remove(temp_name)

def main():
    vault_token = os.environ.get("VAULT_TOKEN")
    if not vault_token:
        print("Error: VAULT_TOKEN environment variable is not set.")
        return

    envs = ["dev", "prod"]
    
    # 1. Fetch secrets first to see if any environment requires Redis npm install
    any_redis = False
    secrets_by_env = {}
    for env in envs:
        secrets = fetch_vault_secrets(env, vault_token)
        secrets_by_env[env] = secrets
        if secrets.get("REDIS_HOST"):
            any_redis = True

    # Install queue bridge dependencies if Redis exists
    if any_redis:
        print("Installing npm dependencies for queue bridge...")
        run_cmd(["npm", "ci", "--omit=dev", "--prefix", "job_index_queue"])
    else:
        print("Skip npm install: No Redis host configured.")

    for env in envs:
        print(f"\n==========================================")
        print(f"🚀 Processing Job Classification for: {env}")
        print(f"==========================================")

        secrets = secrets_by_env[env]
        db_url = secrets.get("DATABASE_URL")
        if not db_url:
            print(f"Skip {env}: DATABASE_URL not found in Vault.")
            continue

        redis_host = secrets.get("REDIS_HOST")
        redis_port = secrets.get("REDIS_PORT", "6379")
        redis_password = secrets.get("REDIS_PASSWORD", "")
        redis_db = secrets.get("REDIS_DB", "0")

        # Construct and validate Redis URL
        redis_url_effective = ""
        if redis_host:
            encoded_password = urllib.parse.quote(redis_password) if redis_password else ""
            if encoded_password:
                redis_url = f"redis://:{encoded_password}@{redis_host}:{redis_port}/{redis_db}"
            else:
                redis_url = f"redis://{redis_host}:{redis_port}/{redis_db}"
            
            print(f"Validating Redis connection for {env}...")
            if validate_redis(redis_url):
                redis_url_effective = redis_url
            else:
                print(f"⚠️ Redis connection validation failed for {env}. Queue indexing disabled.")
        
        # 2. Export uncategorized jobs
        csv_path = f"classifier/data/predict_jobs_{env}.csv"
        export_ok = run_cmd([
            "python", "scripts/export_uncategorized_jobs.py",
            "--db_url", db_url,
            "--output_file", csv_path
        ])

        if not export_ok:
            print(f"Export failed for {env}.")
            continue

        # 3. Check job count
        try:
            job_count = len(pd.read_csv(csv_path))
        except Exception:
            job_count = 0

        print(f"Jobs to classify for {env}: {job_count}")
        
        # Export count to GITHUB_ENV
        github_env = os.environ.get("GITHUB_ENV")
        if github_env:
            with open(github_env, "a") as f:
                f.write(f"{env.upper()}_JOB_COUNT={job_count}\n")

        if job_count > 0:
            # 4. Run job classifier
            results_csv = f"classifier/data/results_{env}.csv"
            run_cmd([
                "python", "classifier/predict.py",
                "--model", "tienminhktvn/job-category-classifier",
                "--input_file", csv_path,
                "--output_file", results_csv
            ])

            # 5. Update database categories
            run_cmd([
                "python", "scripts/update_category.py",
                "--db_url", db_url,
                "--csv_file", results_csv,
                "--redis_url", redis_url_effective
            ])

            # 6. Delete 'Other' category jobs
            run_cmd([
                "python", "scripts/delete_other_category_jobs.py",
                "--db_url", db_url,
                "--redis_url", redis_url_effective
            ])
        else:
            print(f"No uncategorized jobs to classify for {env}.")

        # 7. Cleanup unused categories
        run_cmd([
            "python", "scripts/cleanup_unused_categories.py",
            "--db_url", db_url
        ])

if __name__ == "__main__":
    main()
