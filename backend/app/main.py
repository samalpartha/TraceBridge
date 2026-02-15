from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.api import cases, matches, search, geo, outreach, dashboard, auth, live_feed, ai_analysis, tinyfish_actions, legacy_intel, namus_adapter, identity_graph
from app.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    general_exception_handler,
)

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError

app = FastAPI(
    title="TraceBridge",
    description="AI-powered crisis identity resolution infrastructure",
    version="1.0.0",
)

# Exception Handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# CORS
origins = [o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(geo.router, prefix="/api/geo", tags=["geo"])
app.include_router(outreach.router, prefix="/api/outreach", tags=["outreach"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(live_feed.router, prefix="/api/live", tags=["live-feed"])
app.include_router(ai_analysis.router, prefix="/api/ai", tags=["ai-analysis"])
app.include_router(tinyfish_actions.router, prefix="/api/tinyfish", tags=["tinyfish-actions"])
app.include_router(legacy_intel.router, prefix="/api/legacy", tags=["legacy-intelligence"])
app.include_router(namus_adapter.router, prefix="/api/namus", tags=["namus-adapter"])
app.include_router(identity_graph.router, prefix="/api/graph", tags=["identity-graph"])


@app.get("/")
async def root():
    return {
        "app": "TraceBridge",
        "version": "1.0.0",
        "status": "running",
        "description": "AI-powered crisis identity resolution infrastructure",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
