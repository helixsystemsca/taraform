import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.routers import ai, summaries, units


def get_cors_origins():
    cors = os.getenv("CORS_ORIGINS")
    if cors:
        return [origin.strip() for origin in cors.split(",") if origin.strip()]
    return ["http://localhost:3000"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(os.getenv("UPLOAD_ROOT", "uploads"), exist_ok=True)
    os.makedirs("data", exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="Taraform Study API", version="0.1.0", lifespan=lifespan)

origins = get_cors_origins()
print("CORS ORIGINS:", origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(summaries.router, prefix="/api/summaries", tags=["summaries"])
app.include_router(units.router, prefix="/api/units", tags=["units"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
