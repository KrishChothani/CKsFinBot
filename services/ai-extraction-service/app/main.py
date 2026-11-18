from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
app = FastAPI(
    title="CKsFinBot AI Service",
    description="RAG-based Financial Document Query System",
    version="1.0.0"
)

# Add CORS middleware if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1", tags=["RAG"])

@app.get("/")
def read_root():
    return {
        "message": "CKsFinBot Python AI Service is running.",
        "status": "healthy"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}


