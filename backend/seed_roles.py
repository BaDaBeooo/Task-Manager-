from app.database.connection import SessionLocal
from app.models.role import Role


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
    db = SessionLocal()

    try:
        for name, code in ROLES:
            existing = (
                db.query(Role)
                .filter(Role.code == code)
                .first()
            )

            if existing:
                print(f"[SKIP] {name} ({code})")
                continue

            role = Role(
                name=name,
                code=code,
            )

            db.add(role)
            print(f"[ADD] {name} ({code})")

        db.commit()

        print()
        print("Roles initialized successfully.")

    except Exception as error:
        db.rollback()
        print(f"ERROR: {error}")

    finally:
        db.close()


if __name__ == "__main__":
    main()