"""
Utility script to reset user passwords
Usage: python reset_password.py
"""

import sys
from database.models import User
from database import SessionLocal
from api.auth import hash_password

def reset_user_password(email: str, new_password: str):
    """Reset password for a user"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f" User with email '{email}' not found")
            return False
        
        user.password_hash = hash_password(new_password)
        db.commit()
        print(f"\n Password reset successfully!")
        print(f"   Email: {email}")
        print(f"   New Password: {new_password}")
        return True
    except Exception as e:
        print(f" Error: {e}")
        return False
    finally:
        db.close()


def delete_user_account(email: str):
    """Delete a user account"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f" User with email '{email}' not found")
            return False
        
        db.delete(user)
        db.commit()
        print(f"\n Account deleted successfully!")
        print(f"   Email: {email}")
        return True
    except Exception as e:
        print(f" Error: {e}")
        return False
    finally:
        db.close()


def list_all_users():
    """List all registered users"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"\n Registered Users ({len(users)} total):")
        print("=" * 70)
        for i, user in enumerate(users, 1):
            print(f"\n{i}. {user.name}")
            print(f"   Email: {user.email}")
            print(f"   ID: {user.id}")
            print(f"   Created: {user.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
    except Exception as e:
        print(f" Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print(" User Account Management Utility")
    print("=" * 70)
    
    while True:
        print("\nOptions:")
        print("1. List all users")
        print("2. Reset password")
        print("3. Delete account")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            list_all_users()
        
        elif choice == "2":
            email = input("\nEnter email address: ").strip()
            new_password = input("Enter new password: ").strip()
            if email and new_password:
                reset_user_password(email, new_password)
            else:
                print(" Email and password are required")
        
        elif choice == "3":
            email = input("\nEnter email address to delete: ").strip()
            confirm = input(f"  Are you sure you want to delete '{email}'? (yes/no): ").strip().lower()
            if confirm == "yes" and email:
                delete_user_account(email)
            else:
                print(" Deletion cancelled")
        
        elif choice == "4":
            print("\n Goodbye!\n")
            break
        
        else:
            print(" Invalid choice. Please enter 1-4.")
