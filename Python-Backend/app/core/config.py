from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # OPENAI_API_KEY: str
    GOOGLE_API_KEY: str = ""

    PINECONE_API_KEY: str
    MY_AWS_ACCESS_KEY_ID: str = ""  # Optional: boto3 can use default credentials
    MY_AWS_SECRET_ACCESS_KEY: str = ""  # Optional
    MY_AWS_REGION: str = ""  # Default region
    NODE_WEBHOOK_URL: str = ""

    class Config:
        env_file = ".env"

settings = Settings()