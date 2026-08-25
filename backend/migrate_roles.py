import sqlite3


DB_PATH = "database/taskmanager.db"


ROLES = [
    ("Admin", "admin"),
    ("Sale", "sale"),
    ("Pre-Sale", "pre_sale"),
    ("Project Manager", "project_manager"),
    ("Developer", "developer"),
    ("Support", "support"),
    ("Management", "management"),
]


def main():

    connection = sqlite3.connect(DB_PATH)

    cursor = connection.cursor()


    print("=== ROLE MIGRATION ===")


    # =====================================================
    # 1. CREATE ROLES TABLE
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            code VARCHAR(50) NOT NULL UNIQUE,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL
        )
        """
    )


    # =====================================================
    # 2. INSERT DEFAULT ROLES
    # =====================================================

    for name, code in ROLES:

        cursor.execute(
            """
            INSERT OR IGNORE INTO roles
            (name, code, is_active, created_at)
            VALUES (?, ?, 1, datetime('now'))
            """,
            (name, code),
        )


    # =====================================================
    # 3. CHECK USERS TABLE
    # =====================================================

    columns = cursor.execute(
        "PRAGMA table_info(users)"
    ).fetchall()


    column_names = [
        column[1]
        for column in columns
    ]


    # =====================================================
    # 4. ADD role_id IF NEEDED
    # =====================================================

    if "role_id" not in column_names:

        print("Adding users.role_id...")

        cursor.execute(
            """
            ALTER TABLE users
            ADD COLUMN role_id INTEGER
            """
        )

    else:

        print(
            "users.role_id already exists."
        )


    # =====================================================
    # 5. MIGRATE OLD ROLE VALUES
    # =====================================================

    if "role" in column_names:

        print(
            "Migrating existing user roles..."
        )


        old_role_mapping = {
            "admin": "admin",
            "Admin": "admin",

            "sale": "sale",
            "Sale": "sale",

            "pre_sale": "pre_sale",
            "Pre-Sale": "pre_sale",

            "project_manager": "project_manager",
            "Project Manager": "project_manager",

            "developer": "developer",
            "Developer": "developer",

            "support": "support",
            "Support": "support",

            "management": "management",
            "Management": "management",

            "member": "sale",
        }


        users = cursor.execute(
            """
            SELECT id, role
            FROM users
            WHERE role_id IS NULL
            """
        ).fetchall()


        for user_id, old_role in users:

            role_code = (
                old_role_mapping.get(
                    old_role,
                    "sale",
                )
            )


            role = cursor.execute(
                """
                SELECT id
                FROM roles
                WHERE code = ?
                """,
                (role_code,),
            ).fetchone()


            if role:

                cursor.execute(
                    """
                    UPDATE users
                    SET role_id = ?
                    WHERE id = ?
                    """,
                    (
                        role[0],
                        user_id,
                    ),
                )


                print(
                    f"User {user_id}: "
                    f"{old_role} -> "
                    f"{role_code}"
                )


    # =====================================================
    # 6. COMMIT
    # =====================================================

    connection.commit()


    # =====================================================
    # 7. VERIFY
    # =====================================================

    print()
    print("=== ROLES ===")

    roles = cursor.execute(
        """
        SELECT id, name, code
        FROM roles
        ORDER BY id
        """
    ).fetchall()


    for role in roles:
        print(role)


    print()
    print("=== USERS ===")

    users = cursor.execute(
        """
        SELECT
            users.id,
            users.username,
            users.full_name,
            roles.name
        FROM users
        LEFT JOIN roles
            ON users.role_id = roles.id
        ORDER BY users.id
        """
    ).fetchall()


    for user in users:
        print(user)


    connection.close()


if __name__ == "__main__":
    main()