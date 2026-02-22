import asyncio
import sys
import os

# Ensure backend can be imported
sys.path.append(os.path.dirname(__file__))

from backend.database import async_session
from backend.models import User
from backend.auth import hash_password

async def main():
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.username == "Aditya"))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"User Aditya already exists with ID: {existing_user.id}")
            return
            
        new_user = User(
            username="Aditya",
            email="work.aditya2025@gmail.com",
            hashed_password=hash_password("Aditya@1"),
            display_name="Aditya"
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        print(f"Successfully created User 'Aditya' with ID: {new_user.id}")

if __name__ == "__main__":
    asyncio.run(main())
