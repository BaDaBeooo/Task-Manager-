from fastapi import FastAPI

from .database.connection import Base, engine
from .database import models


Base.metadata.create_all(bind=engine)


app = FastAPI(title="Task Manager API")


@app.get("/")
def root():
    return {
        "message": "Task Manager API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }