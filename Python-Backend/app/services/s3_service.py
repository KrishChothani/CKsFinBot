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

    # In Lambda, boto3 automatically uses IAM role credentials
    # Only provide explicit credentials if they exist
    s3_config = {'service_name': 's3'}
    
    if settings.AWS_ACCESS_KEY_ID:
        s3_config['aws_access_key_id'] = settings.AWS_ACCESS_KEY_ID
    if settings.AWS_SECRET_ACCESS_KEY:
        s3_config['aws_secret_access_key'] = settings.AWS_SECRET_ACCESS_KEY
    
    s3_config['region_name'] = settings.aws_region
    
    s3_client = boto3.client(**s3_config)
    
    s3_client.download_file(bucket_name, object_key, local_file_path)
    
    return local_file_path