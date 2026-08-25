from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.connection import Base, engine
from .models import Subtask, Task, User
from .routers.auth import router as auth_router
from .routers.tasks import router as tasks_router
from .routers.users import router as users_router

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Task Manager API",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(users_router)

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