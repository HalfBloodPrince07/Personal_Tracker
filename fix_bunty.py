import asyncio
import sys
import os
from datetime import date

sys.path.append(os.path.dirname(__file__))

from backend.database import async_session
from backend.models import Person
from sqlalchemy import select, and_

USER_ID = 3

async def main():
    async with async_session() as session:
        # Fix Bunty's known_since to 2003 (his birth year)
        result = await session.execute(
            select(Person).where(
                and_(Person.user_id == USER_ID, Person.name == "Bunty")
            )
        )
        bunty = result.scalar_one_or_none()
        if bunty:
            bunty.known_since = date(2003, 1, 1)
            print(f"Updated Bunty's known_since from {bunty.known_since} to 2003-01-01")
        else:
            print("Bunty not found!")

        await session.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
