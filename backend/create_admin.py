from getpass import getpass

from app.database.connection import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.services.user_service import hash_password


def main():
    db = SessionLocal()

    try:
        admin_role = (
            db.query(Role)
            .filter(Role.code == "admin")
            .first()
        )

        if not admin_role:
            print("ERROR: Admin role not found.")
            print("Please make sure the roles table has been initialized.")
            return

        username = input("Admin username [admin]: ").strip() or "admin"
        full_name = input("Admin full name [Administrator]: ").strip() or "Administrator"

        password = getpass("Admin password: ")
        password_confirm = getpass("Confirm password: ")

        if not password:
            print("ERROR: Password cannot be empty.")
            return

        if password != password_confirm:
            print("ERROR: Passwords do not match.")
            return

        existing = (
            db.query(User)
            .filter(User.username == username)
            .first()
        )

        if existing:
            print(f"ERROR: Username '{username}' already exists.")
            return

        admin = User(
            username=username,
            full_name=full_name,
            password_hash=hash_password(password),
            role_id=admin_role.id,
            is_active=True,
            must_change_password=False,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print()
        print("================================")
        print("Admin created successfully!")
        print(f"Username : {admin.username}")
        print(f"Full name: {admin.full_name}")
        print("Role     : Admin")
        print("================================")

    except Exception as error:
        db.rollback()
        print(f"ERROR: {error}")

    finally:
        db.close()


if __name__ == "__main__":
    main()