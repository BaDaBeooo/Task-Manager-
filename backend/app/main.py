import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.connection import Base, engine, SessionLocal
from .models import Subtask, Task, TaskSupporter, User
from .routers.auth import router as auth_router
from .routers.tasks import router as tasks_router
from .routers.users import router as users_router
from .routers.roles import router as roles_router
from .routers.notifications import router as notifications_router
from .services.deadline_service import check_task_deadlines


Base.metadata.create_all(bind=engine)


# =========================================================
# DEADLINE CHECKER
# =========================================================

async def deadline_checker():
    while True:

        try:
            db = SessionLocal()

            try:
                check_task_deadlines(db)

            finally:
                db.close()

        except Exception as error:
            print(
                f"[Deadline Checker] Error: {error}"
            )

        await asyncio.sleep(60)


# =========================================================
# APPLICATION LIFESPAN
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    task = asyncio.create_task(
        deadline_checker()
    )

    print(
        "[Deadline Checker] Started"
    )

    yield

    task.cancel()

    try:
        await task
    except asyncio.CancelledError:
        pass

    print(
        "[Deadline Checker] Stopped"
    )


app = FastAPI(
    title="Task Manager API",
    lifespan=lifespan,
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(users_router)
app.include_router(roles_router)
app.include_router(notifications_router)


# =========================================================
# ROOT
# =========================================================

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