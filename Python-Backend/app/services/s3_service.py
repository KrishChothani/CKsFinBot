import os
import tempfile
import requests
from urllib.parse import urlparse
from app.core.config import settings

def download_file_from_s3(file_url: str) -> str:
    """
    Universal Document Downloader:
    Supports Cloudinary URLs, AWS S3 URLs, general HTTPS/HTTP links, and local files.
    Works seamlessly on both Linux (Render/Production) and Windows (Local Dev).
    """
    # 1. Handle local file paths
    if os.path.exists(file_url):
        print(f"📄 File is already local: {file_url}")
        return file_url

    # Cross-platform temp directory
    temp_dir = os.path.join(tempfile.gettempdir(), "rag_files")
    os.makedirs(temp_dir, exist_ok=True)

    parsed_url = urlparse(file_url)

    # 2. Handle HTTP/HTTPS URLs (Cloudinary, Cloudflare R2, Public S3, Supabase)
    if parsed_url.scheme in ("http", "https"):
        filename = os.path.basename(parsed_url.path) or f"doc_{int(os.times()[4] * 1000)}.pdf"
        local_file_path = os.path.join(temp_dir, filename)

        # If already cached, reuse
        if os.path.exists(local_file_path) and os.path.getsize(local_file_path) > 0:
            print(f"⚡ Using cached file: {local_file_path}")
            return local_file_path

        # Stream download via standard HTTP
        print(f"⬇️  Downloading document via HTTPS from: {file_url[:80]}...")
        try:
            with requests.get(file_url, stream=True, timeout=120) as response:
                response.raise_for_status()
                with open(local_file_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
            print(f"✅ Successfully downloaded to: {local_file_path} ({os.path.getsize(local_file_path)} bytes)")
            return local_file_path
        except Exception as http_err:
            print(f"⚠️  HTTPS stream download failed: {http_err}. Checking S3 fallback...")

    # 3. Handle S3 URI (s3://bucket/key) or fallback to boto3 if AWS credentials exist
    if parsed_url.scheme == "s3" or (settings.MY_AWS_ACCESS_KEY_ID and settings.MY_AWS_ACCESS_KEY_ID.strip()):
        try:
            import boto3

            if parsed_url.scheme == "s3":
                bucket_name = parsed_url.netloc
                object_key = parsed_url.path.lstrip("/")
            else:
                bucket_name = parsed_url.netloc.split(".")[0]
                object_key = parsed_url.path.lstrip("/")

            filename = os.path.basename(object_key) or "downloaded_doc.pdf"
            local_file_path = os.path.join(temp_dir, filename)

            print(f"⬇️  Downloading from S3 bucket '{bucket_name}', key '{object_key}'...")
            s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.MY_AWS_ACCESS_KEY_ID or None,
                aws_secret_access_key=settings.MY_AWS_SECRET_ACCESS_KEY or None,
                region_name=settings.MY_AWS_REGION or "ap-south-1",
            )
            s3_client.download_file(bucket_name, object_key, local_file_path)
            print(f"✅ Downloaded from S3 to: {local_file_path}")
            return local_file_path
        except Exception as s3_err:
            raise RuntimeError(f"Failed to download document from S3/Storage: {s3_err}")

    raise ValueError(f"Unable to download document from unsupported or inaccessible URL: {file_url}")

# Alias for semantic clarity
download_document = download_file_from_s3
