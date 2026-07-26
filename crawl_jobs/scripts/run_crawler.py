import argparse
import os
import random
import subprocess
import sys

def load_vars(path):
    d = {}
    if os.path.exists(path):
        for line in open(path):
            if '=' in line:
                k, v = line.strip().split('=', 1)
                try:
                    d[k] = int(v)
                except ValueError:
                    try:
                        d[k] = float(v)
                    except ValueError:
                        d[k] = v
    return d

def run_cmd(cmd):
    print(f"Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"Command failed with exit code: {result.returncode}")
        sys.exit(result.returncode)

def main():
    parser = argparse.ArgumentParser(description="Crawler Runner Script")
    parser.add_argument("--platform", choices=["ubuntu", "selfhosted"], required=True)
    parser.add_argument("--db-urls", nargs="+", required=True)
    parser.add_argument("--queue-redis-urls", nargs="*", default=[])
    parser.add_argument("--mode", default="update")
    parser.add_argument("--itviec-pages", default="0")
    parser.add_argument("--vietnamworks-pages", default="0")
    parser.add_argument("--topcv-pages", default="0")
    parser.add_argument("--jobsgo-pages", default="0")
    args = parser.parse_args()

    # 1. Select LinkedIn keywords
    categories_file = "classifier/data/categories.txt"
    kws = ["Web Development", "Software Engineer"]
    if os.path.exists(categories_file):
        try:
            with open(categories_file, encoding="utf-8") as f:
                lines = [line.strip() for line in f if line.strip()]
            if lines:
                kws = random.sample(lines, 2) if len(lines) >= 2 else (lines * 2)[:2]
        except Exception as e:
            print(f"Warning: Failed to read categories file: {e}")
    
    print(f"Selected Keywords: {kws}")

    # Prepare Queue arguments
    queue_args = []
    valid_redis_urls = [url for url in args.queue_redis_urls if url]
    if valid_redis_urls:
        queue_args.append("--queue-index-enabled")
        queue_args.append("--queue-redis-urls")
        queue_args.extend(valid_redis_urls)

    # 2. Run Crawler - Part 1
    part1_cmd = [
        "python", "main.py",
        "--db-urls"
    ] + args.db_urls + [
        "--gha-output", "gha_out_1.txt",
        "--mode", args.mode,
        "--linkedin-pages", "1",
        "--linkedin-keywords", kws[0],
        "--linkedin-limit", "10"  # Increased to 10
    ] + queue_args

    if args.platform == "ubuntu":
        part1_cmd.extend([
            "--itviec-pages", args.itviec_pages,
            "--vietnamworks-pages", args.vietnamworks_pages,
            "--topcv-pages", "0",
            "--jobsgo-pages", "0"
        ])
    else:  # selfhosted
        part1_cmd.extend([
            "--itviec-pages", "0",
            "--vietnamworks-pages", "0",
            "--topcv-pages", args.topcv_pages,
            "--jobsgo-pages", args.jobsgo_pages
        ])

    print("\n--- Running Crawler Part 1 ---")
    run_cmd(part1_cmd)

    # 3. Run Crawler - Part 2 (LinkedIn KW2 only)
    part2_cmd = [
        "python", "main.py",
        "--db-urls"
    ] + args.db_urls + [
        "--gha-output", "gha_out_2.txt",
        "--mode", args.mode,
        "--itviec-pages", "0",
        "--vietnamworks-pages", "0",
        "--topcv-pages", "0",
        "--jobsgo-pages", "0",
        "--linkedin-pages", "1",
        "--linkedin-keywords", kws[1],
        "--linkedin-limit", "10"  # Increased to 10
    ] + queue_args

    print("\n--- Running Crawler Part 2 ---")
    run_cmd(part2_cmd)

    # 4. Aggregate Outputs
    print("\n--- Aggregating Outputs ---")
    v1 = load_vars("gha_out_1.txt")
    v2 = load_vars("gha_out_2.txt")
    keys = set(v1.keys()) | set(v2.keys())
    
    outputs = {}
    for k in keys:
        val1 = v1.get(k, 0)
        val2 = v2.get(k, 0)
        if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
            total = val1 + val2
            res = f"{total:.2f}" if isinstance(total, float) else total
            outputs[k] = res
        else:
            outputs[k] = val1 or val2

    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a") as f:
            for k, v in outputs.items():
                f.write(f"{k}={v}\n")
        print("Successfully wrote aggregated values to GITHUB_OUTPUT:")
        for k, v in outputs.items():
            print(f"  {k}={v}")
    else:
        print("GITHUB_OUTPUT not set. Aggregated outputs:")
        for k, v in outputs.items():
            print(f"  {k}={v}")

if __name__ == "__main__":
    main()
