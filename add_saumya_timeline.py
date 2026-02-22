import asyncio
import sys
import os
from datetime import date

# Ensure backend can be imported
sys.path.append(os.path.dirname(__file__))

from backend.database import async_session
from backend.models import DailyLog

USER_ID = 3

INCIDENTS = [
    {
        "date": date(2025, 2, 28),
        "content": "Went to Tirupathi with Saumya. She asked me to come without overthinking and I agreed. We had lots of conversations, she slept tilting her head on my shoulder, and we had a great time together.",
        "mood_score": 9,
        "tags": ["travel", "relationship", "Saumya"],
        "people_mentioned": ["Saumya"],
        "emotions": ["happy", "connected"],
        "highlights": "Tirupathi trip with Saumya, bonding."
    },
    {
        "date": date(2025, 4, 15), # Mid-April representation
        "content": "Saumya had a rough month with anxiety and overthinking. I stayed up late with her, listened to her thoughts, and helped her sleep peacefully.",
        "tags": ["relationship", "Saumya", "support"],
        "people_mentioned": ["Saumya"],
        "emotions": ["caring", "supportive"],
        "highlights": "Supported Saumya through rough April."
    },
    {
        "date": date(2025, 8, 15), # Mid-August representation of the rough patch
        "content": "A very rough time for both of us. Saumya had major breakdowns, and I went through a lot. She initially tried to cut me off to avoid falling for me, and she wasn't there for me when I tried reaching out. However, our care for each other eventually brought us closer.",
        "mood_score": 3,
        "tags": ["relationship", "Saumya", "conflict", "breakdown"],
        "people_mentioned": ["Saumya"],
        "emotions": ["hurt", "distant", "caring"],
        "highlights": "Rough patch with Saumya, distance, but realized care."
    },
    {
        "date": date(2025, 9, 27),
        "content": "Best day. Saumya asked me out to distract her mind. We clicked pictures, talked, danced. I cheered her up. She called me to sit next to her, we had our first hug. Holding each other tightly, didn't want to let go. Our favorite day.",
        "mood_score": 10,
        "tags": ["relationship", "Saumya", "milestone", "first_hug"],
        "people_mentioned": ["Saumya"],
        "emotions": ["love", "happy", "intimate"],
        "highlights": "Best day with Saumya, first hug, deep connection."
    },
    {
        "date": date(2025, 10, 15), # Combining with the previous garba night log essentially
        "content": "Met Saumya. I kissed her on the cheeks. We hugged. She went home and missed me a lot, waiting for night to talk. She realized she was falling in love with me.",
        "mood_score": 10,
        "tags": ["relationship", "Saumya", "kiss", "love"],
        "people_mentioned": ["Saumya"],
        "emotions": ["loved", "happy"],
        "highlights": "Cheek kiss, hugging, falling in love."
    },
    {
        "date": date(2025, 12, 31),
        "content": "New Year's Eve. Saumya wrote me a beautiful, long message summarizing our entire year. She expressed deep love, wants to keep me for a lifetime, and asked me to quit smoking entirely and to be honest with her if I ever drink.",
        "mood_score": 10,
        "tags": ["relationship", "Saumya", "milestone", "new_year", "promise"],
        "people_mentioned": ["Saumya"],
        "emotions": ["loved", "cherished", "committed"],
        "highlights": "Saumya's New Year letter, deep commitment, asked me to quit smoking."
    }
]

async def main():
    async with async_session() as session:
        for log_data in INCIDENTS:
            log = DailyLog(user_id=USER_ID, **log_data)
            session.add(log)
            
        await session.commit()
        print(f"Successfully added {len(INCIDENTS)} Historical Relationship Logs to the database.")

if __name__ == "__main__":
    asyncio.run(main())
