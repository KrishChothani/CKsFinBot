import boto3
import os
from urllib.parse import urlparse
from app.core.config import settings

def download_file_from_s3(s3_url: str) -> str:
    """Downloads a file from S3 to a temporary local path."""
    parsed_url = urlparse(s3_url)
    
    # Handle both formats: s3://bucket/key and https://bucket.s3.region.amazonaws.com/key
    if parsed_url.scheme == 's3':
        bucket_name = parsed_url.netloc
        object_key = parsed_url.path.lstrip('/')
    else:
        bucket_name = parsed_url.netloc.split('.')[0]
        object_key = parsed_url.path.lstrip('/')
    
    temp_dir = "/tmp/rag_files"
    os.makedirs(temp_dir, exist_ok=True)
    local_file_path = os.path.join(temp_dir, os.path.basename(object_key))

    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        region_name=settings.AWS_REGION
    )
    
    s3_client.download_file(bucket_name, object_key, local_file_path)
    
    return local_file_path