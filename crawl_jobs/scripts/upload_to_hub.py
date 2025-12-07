import argparse

from huggingface_hub import HfApi, login


def main():
    parser = argparse.ArgumentParser(
        description="Upload a local model to Hugging Face Hub"
    )
    parser.add_argument(
        "--local_path", type=str, required=True, help="Path to your local model folder"
    )
    parser.add_argument(
        "--username", type=str, required=True, help="Your Hugging Face username"
    )
    parser.add_argument(
        "--model_name", type=str, required=True, help="Name for the new repository"
    )
    parser.add_argument(
        "--token", type=str, required=True, help="Your Hugging Face WRITE token"
    )

    args = parser.parse_args()

    repo_id = f"{args.username}/{args.model_name}"

    print("Logging in...")
    login(token=args.token)

    print(f"Creating repository: {repo_id}...")
    api = HfApi()
    api.create_repo(repo_id=repo_id, exist_ok=True)

    print(f"Uploading from {args.local_path}...")
    api.upload_folder(folder_path=args.local_path, repo_id=repo_id, repo_type="model")

    print(f"\n✅ Upload Complete! Hosted at: https://huggingface.co/{repo_id}")


if __name__ == "__main__":
    main()
