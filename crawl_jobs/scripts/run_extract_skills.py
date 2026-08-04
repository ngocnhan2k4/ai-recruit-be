import json
import os
import subprocess
import urllib.request
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

def run_cmd(cmd):
    print(f"Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr)
        return False
    print(result.stdout)
    return True

def main():
    vault_token = os.environ.get("VAULT_TOKEN")
    if not vault_token:
        print("Error: VAULT_TOKEN environment variable is not set.")
        return

    envs = ["dev", "prod"]
    
    # Ensure export directory exists
    os.makedirs("extract_skills/data", exist_ok=True)

    for env in envs:
        print(f"\n==========================================")
        print(f"🧠 Processing Skill Extraction for: {env}")
        print(f"==========================================")

        secrets = fetch_vault_secrets(env, vault_token)
        db_url = secrets.get("DATABASE_URL")
        if not db_url:
            print(f"Skip {env}: DATABASE_URL not found in Vault.")
            continue

        csv_path = f"extract_skills/data/jobs_export_{env}.csv"
        
        # 1. Export jobs
        export_ok = run_cmd([
            "python", "scripts/export_recent_jobs_for_extraction.py",
            "--db-url", db_url,
            "--output-file", csv_path,
            "--hours", "12"
        ])
        
        if not export_ok:
            print(f"Export failed for {env}.")
            continue

        # 2. Check job count
        try:
            job_count = len(pd.read_csv(csv_path))
        except Exception:
            job_count = 0

        print(f"Jobs to process for {env}: {job_count}")
        
        # Export to GITHUB_ENV
        github_env = os.environ.get("GITHUB_ENV")
        if github_env:
            with open(github_env, "a") as f:
                f.write(f"{env.upper()}_JOB_COUNT={job_count}\n")

        if job_count > 0:
            # 3. Extract skills
            run_cmd([
                "python", "extract_skills/extract_skills.py",
                "--db-url", db_url,
                "--model-path", "tienminhktvn/extract-skills-model",
                "--input-file", csv_path
            ])
        else:
            print(f"No jobs to process for {env}.")

if __name__ == "__main__":
    main()
