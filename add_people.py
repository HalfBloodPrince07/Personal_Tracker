import asyncio
import sys
import os
from datetime import date

# Ensure backend can be imported
sys.path.append(os.path.dirname(__file__))

from backend.database import async_session
from backend.models import Person

USER_ID = 3

PEOPLE_DATA = [
    {
        "name": "Shree",
        "relationship_type": "very good friend / teammate",
        "trust_level": 8,
        "energy_exchange": "energizing",
        "notes": "Met during Capgemini training. We are teammates as well and very good friends.",
        "known_since": date(2024, 5, 1), # Approx Capgemini training
        "birthday": None
    },
    {
        "name": "Pratham",
        "relationship_type": "good friend",
        "trust_level": 7,
        "energy_exchange": "energizing",
        "notes": "Met during Capgemini training. Good friend.",
        "known_since": date(2024, 5, 1),
        "birthday": None
    }
]

async def main():
    async with async_session() as session:
        for p_data in PEOPLE_DATA:
            person = Person(
                user_id=USER_ID,
                **p_data
            )
            session.add(person)
        
        await session.commit()
        print(f"Successfully added {len(PEOPLE_DATA)} more colleagues/friends to the database.")

if __name__ == "__main__":
    asyncio.run(main())
