import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .database.connection import (
    Base,
    SessionLocal,
    engine,
)

# =========================================================
# IMPORT MODELS
# =========================================================

from .models.user import User
from .models.role import Role
from .models.task import (
    Task,
    Subtask,
    TaskSupporter,
    TaskActivity,
)

# =========================================================
# IMPORT ROUTERS
# =========================================================

from .routers.auth import router as auth_router
from .routers.tasks import router as tasks_router
from .routers.users import router as users_router
from .routers.roles import router as roles_router
from .routers.notifications import (
    router as notifications_router,
)

# =========================================================
# SERVICES
# =========================================================

from .services.deadline_service import (
    check_task_deadlines,
)


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(
    bind=engine
)


# =========================================================
# DATABASE MIGRATION
# =========================================================

def migrate_database():

    inspector = inspect(
        engine
    )

    tables = inspector.get_table_names()

    # -----------------------------------------------------
    # USERS TABLE MUST EXIST
    # -----------------------------------------------------

    if "users" not in tables:
        return


    # =====================================================
    # GET CURRENT USERS COLUMNS
    # =====================================================

    columns = [
        column["name"]
        for column in inspector.get_columns(
            "users"
        )
    ]


    # =====================================================
    # ADD must_change_password
    #
    # Existing users:
    # DEFAULT 0
    #
    # => Existing users will NOT be forced to change
    #    password.
    #
    # New users created by the application:
    # must_change_password = True
    # =====================================================

    if "must_change_password" not in columns:

        with engine.begin() as connection:

            connection.execute(
                text(
                    """
                    ALTER TABLE users
                    ADD COLUMN must_change_password
                    BOOLEAN NOT NULL DEFAULT 0
                    """
                )
            )

        print(
            "[Database] Added "
            "users.must_change_password"
        )


    # =====================================================
    # REMOVE OLD users.role COLUMN
    #
    # Old database:
    #
    #     role       VARCHAR(...)
    #     role_id    INTEGER
    #
    # Current application:
    #
    #     role_id -> roles.id
    #
    # The old "role" column is no longer used.
    # =====================================================

    if (
        "role" in columns
        and "role_id" in columns
    ):

        try:

            with engine.begin() as connection:

                connection.execute(
                    text(
                        """
                        ALTER TABLE users
                        DROP COLUMN role
                        """
                    )
                )

            print(
                "[Database] Removed old "
                "users.role column"
            )

        except Exception as error:

            print(
                "[Database] Could not remove "
                f"old users.role column: {error}"
            )

            print(
                "[Database] Please report this "
                "migration error before creating users."
            )


# =========================================================
# RUN MIGRATION
# =========================================================

migrate_database()


# =========================================================
# DEADLINE CHECKER
# =========================================================

async def deadline_checker():

    while True:

        try:

            db = SessionLocal()

            try:

                check_task_deadlines(
                    db
                )

            finally:

                db.close()

        except Exception as error:

            print(
                f"[Deadline Checker] Error: {error}"
            )

        await asyncio.sleep(
            60
        )


# =========================================================
# APPLICATION LIFESPAN
# =========================================================

@asynccontextmanager
async def lifespan(
    app: FastAPI
):

    deadline_task = asyncio.create_task(
        deadline_checker()
    )

    print(
        "[Deadline Checker] Started"
    )

    yield

    deadline_task.cancel()

    try:

        await deadline_task

    except asyncio.CancelledError:

        pass

    print(
        "[Deadline Checker] Stopped"
    )


# =========================================================
# FASTAPI APPLICATION
# =========================================================

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

app.include_router(
    auth_router
)

app.include_router(
    tasks_router
)

app.include_router(
    users_router
)

app.include_router(
    roles_router
)

app.include_router(
    notifications_router
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "message": "Task Manager API is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "ok"
    }