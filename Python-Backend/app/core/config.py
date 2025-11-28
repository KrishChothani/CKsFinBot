from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # OPENAI_API_KEY: str
    GOOGLE_API_KEY: str

    PINECONE_API_KEY: str
    AWS_ACCESS_KEY_ID: str = ""  # Optional: boto3 can use default credentials
    AWS_SECRET_ACCESS_KEY: str = ""  # Optional
    AWS_REGION: str = "ap-south-1"  # Default region
    
    @property
    def aws_region(self) -> str:
        """Get AWS region from environment, fallback to AWS_DEFAULT_REGION in Lambda"""
        import os
        return os.getenv("AWS_DEFAULT_REGION", self.AWS_REGION)
    NODE_WEBHOOK_URL: str = ""

    class Config:
        env_file = ".env"

settings = Settings()