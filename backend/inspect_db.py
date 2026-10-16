import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent / "database" / "taskmanager.db"

print(f"DATABASE: {db_path}")
print(f"EXISTS: {db_path.exists()}")
print(f"SIZE: {db_path.stat().st_size if db_path.exists() else 0} bytes")

if not db_path.exists():
    raise SystemExit("Khong tim thay database!")

connection = sqlite3.connect(str(db_path))

try:
    print("\n=== TABLES ===")
    tables = connection.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
    """).fetchall()

    for table in tables:
        print(table[0])

    print("\n=== USERS COLUMNS ===")
    columns = connection.execute(
        "PRAGMA table_info(users)"
    ).fetchall()

    for column in columns:
        print(column)

    print("\n=== TASK COMMENTS TABLE ===")
    result = connection.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'task_comments'
    """).fetchall()

    print(result if result else "Chua co bang task_comments")

finally:
    connection.close()