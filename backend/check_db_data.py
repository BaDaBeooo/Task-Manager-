import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent / "database" / "taskmanager.db"
connection = sqlite3.connect(str(db_path))

tables = [
    "users",
    "tasks",
    "subtasks",
    "task_comments",
    "task_activities",
    "notifications",
    "announcements",
    "announcement_reads",
    "departments",
    "support_teams",
    "support_tickets",
]

try:
    print(f"Database: {db_path}")
    print("\n=== ROW COUNTS ===")

    existing = {
        row[0]
        for row in connection.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
        """)
    }

    for table in tables:
        if table not in existing:
            print(f"{table}: TABLE MISSING")
            continue

        count = connection.execute(
            f'SELECT COUNT(*) FROM "{table}"'
        ).fetchone()[0]

        print(f"{table}: {count}")

finally:
    connection.close()
