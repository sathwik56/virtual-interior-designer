"""
Reset Database - Delete All Users and Designs
"""
import os
from app import app, db

def reset_database():
    with app.app_context():
        # Drop all tables
        db.drop_all()
        
        # Recreate all tables
        db.create_all()
        
        print("✅ Database reset successfully!")
        print("✅ All users deleted")
        print("✅ All designs deleted")
        print("\nYou can now create a new account.")

if __name__ == '__main__':
    confirm = input("⚠️  WARNING: This will delete ALL users and designs. Continue? (yes/no): ")
    if confirm.lower() == 'yes':
        reset_database()
    else:
        print("❌ Operation cancelled.")
