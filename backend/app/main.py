import asyncio

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import (
    inspect,
    text,
)


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
    TaskAttachment,
)

from .models.notification import (
    Notification,
)

from .models.organization import (
    Department,
    DepartmentMember,
    SupportTeam,
    SupportTeamMember,
    SupportRoutingRule,
)

from .models.announcement import Announcement, AnnouncementRead
from .models.customer import CustomerCompany, CustomerCompanyGrant, CustomerContact
from .models.document_library import LibraryFolder, LibraryDocument, LibraryDocumentVersion

from .models.support import (
    SupportTicket,
    SupportTicketComment,
    SupportTicketActivity,
)


# =========================================================
# IMPORT ROUTERS
# =========================================================

from .routers.auth import (
    router as auth_router,
)

from .routers.tasks import (
    router as tasks_router,
)

from .routers.users import (
    router as users_router,
)

from .routers.roles import (
    router as roles_router,
)

from .routers.notifications import (
    router as notifications_router,
)

from .routers.support import (
    router as support_router,
)

from .routers.support_org import (
    router as support_org_router,
)

from .routers.announcements import router as announcements_router
from .routers.telegram import router as telegram_router
from .routers.customers import router as customers_router
from .routers.document_library import router as document_library_router
from .services.telegram_service import telegram_poller


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
    # CUSTOMER CONTACT ROLE PERMISSIONS
    # -----------------------------------------------------
    if "customer_contacts" in tables:
        contact_columns = {column["name"] for column in inspector.get_columns("customer_contacts")}
        with engine.begin() as connection:
            if "view_roles" not in contact_columns:
                connection.execute(text("ALTER TABLE customer_contacts ADD COLUMN view_roles VARCHAR(300) NOT NULL DEFAULT 'admin,supervisor,leader,user'"))
                print("[Database] Added customer_contacts.view_roles (legacy contacts remain visible)")
            if "edit_roles" not in contact_columns:
                connection.execute(text("ALTER TABLE customer_contacts ADD COLUMN edit_roles VARCHAR(300) NOT NULL DEFAULT 'admin'"))
                print("[Database] Added customer_contacts.edit_roles")

    # -----------------------------------------------------
    # USERS
    # -----------------------------------------------------

    if "users" in tables:

        columns = [
            column["name"]
            for column in inspector.get_columns(
                "users"
            )
        ]


        # -------------------------------------------------
        # ADD position (chức vụ hiển thị)
        # -------------------------------------------------

        if "position" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        """
                        ALTER TABLE users
                        ADD COLUMN position
                        VARCHAR(150)
                        """
                    )
                )
            columns.append("position")
            print("[Database] Added users.position")

        # -------------------------------------------------
        # ADD avatar_url
        # -------------------------------------------------

        if "avatar_url" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)")
                )
            columns.append("avatar_url")
            print("[Database] Added users.avatar_url")

        # -------------------------------------------------
        # PRESERVE LEGACY JOB TITLE BEFORE ROLE MIGRATION
        # -------------------------------------------------

        if "role" in columns and "position" in columns:
            try:
                with engine.begin() as connection:
                    connection.execute(
                        text(
                            """
                            UPDATE users
                            SET position = role
                            WHERE (position IS NULL OR TRIM(position) = '')
                              AND role IS NOT NULL
                            """
                        )
                    )
                print("[Database] Preserved legacy users.role into users.position")
            except Exception as error:
                print(f"[Database] Could not preserve legacy job titles: {error}")

        # -------------------------------------------------
        # ADD Telegram link fields if missing
        # -------------------------------------------------

        if "telegram_link_code" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE users ADD COLUMN telegram_link_code VARCHAR(100)"))
            columns.append("telegram_link_code")
            print("[Database] Added users.telegram_link_code")

        if "telegram_link_code_expires_at" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE users ADD COLUMN telegram_link_code_expires_at DATETIME"))
            columns.append("telegram_link_code_expires_at")
            print("[Database] Added users.telegram_link_code_expires_at")

        # -------------------------------------------------
        # ADD deleted_at
        # -------------------------------------------------

        if "deleted_at" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        """
                        ALTER TABLE users
                        ADD COLUMN deleted_at DATETIME
                        """
                    )
                )
            columns.append("deleted_at")
            print("[Database] Added users.deleted_at")


        # -------------------------------------------------
        # ADD must_change_password
        # -------------------------------------------------

        if (
            "must_change_password"
            not in columns
        ):

            with engine.begin() as connection:

                connection.execute(
                    text(
                        """
                        ALTER TABLE users
                        ADD COLUMN
                        must_change_password
                        BOOLEAN NOT NULL
                        DEFAULT 0
                        """
                    )
                )

            print(
                "[Database] Added "
                "users.must_change_password"
            )


        # -------------------------------------------------
        # REMOVE OLD role COLUMN
        # -------------------------------------------------

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
# ANNOUNCEMENT MIGRATION
# =========================================================

def migrate_announcements():
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if "announcements" not in tables:
        return

    columns = {column["name"] for column in inspector.get_columns("announcements")}

    if "updated_at" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE announcements ADD COLUMN updated_at DATETIME")
            )
            connection.execute(
                text("UPDATE announcements SET updated_at = created_at WHERE updated_at IS NULL")
            )
        print("[Database] Added announcements.updated_at")

    if "announcement_teams" in tables and "team_id" in columns:
        try:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        """
                        INSERT OR IGNORE INTO announcement_teams (announcement_id, team_id)
                        SELECT id, team_id
                        FROM announcements
                        WHERE target_type = 'team' AND team_id IS NOT NULL
                        """
                    )
                )
            print("[Database] Migrated legacy announcement.team_id into announcement_teams")
        except Exception as error:
            print(f"[Database] Could not migrate announcement team targets: {error}")


migrate_announcements()


# =========================================================
# CANONICAL 4 ROLES
# =========================================================

def ensure_canonical_roles():
    canonical = {"admin": "Admin", "supervisor": "Supervisor", "leader": "Leader", "user": "User"}
    legacy_map = {"management": "supervisor", "project_manager": "supervisor", "support": "user", "sale": "user", "pre_sale": "user", "developer": "user"}
    db = SessionLocal()
    try:
        roles = {r.code: r for r in db.query(Role).all()}
        for code, name in canonical.items():
            if code not in roles:
                role = Role(name=name, code=code, is_active=True)
                db.add(role); db.flush(); roles[code] = role
            else:
                roles[code].name = name; roles[code].is_active = True
        # Existing role_id is the permission role. Keep it separate from
        # User.position, which stores the company's job title.
        for user in db.query(User).all():
            current = getattr(user.role, "code", None)
            target = legacy_map.get(current)
            if target:
                user.role_id = roles[target].id
            elif current in canonical:
                user.role_id = roles[current].id
        for code, role in roles.items():
            if code not in canonical: role.is_active = False
        db.commit()
        print("[Database] Canonical roles ready: Admin / Supervisor / Leader / User")
    finally:
        db.close()


# =========================================================
# RUN MIGRATION
# =========================================================

migrate_database()
ensure_canonical_roles()


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
    app: FastAPI,
):

    deadline_task = asyncio.create_task(
        deadline_checker()
    )
    telegram_task = asyncio.create_task(
        telegram_poller()
    )

    print(
        "[Deadline Checker] Started"
    )
    print(
        "[Telegram Poller] Started"
    )

    yield

    deadline_task.cancel()
    telegram_task.cancel()

    try:
        await deadline_task
    except asyncio.CancelledError:
        pass

    try:
        await telegram_task
    except asyncio.CancelledError:
        pass

    print(
        "[Deadline Checker] Stopped"
    )
    print(
        "[Telegram Poller] Stopped"
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

app.include_router(
    support_router
)

app.include_router(
    support_org_router
)

app.include_router(announcements_router)

app.include_router(telegram_router)
app.include_router(customers_router)
app.include_router(document_library_router)


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