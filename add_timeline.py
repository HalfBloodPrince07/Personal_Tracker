import asyncio
import sys
import os
from datetime import date

# Ensure backend can be imported
sys.path.append(os.path.dirname(__file__))

from backend.database import async_session
from backend.models import DailyLog, Decision, LifeArea

USER_ID = 3

INCIDENTS = [
    {
        "date": date(2000, 11, 1),
        "content": "My birthday, I was born.",
        "tags": ["milestone", "life"],
        "highlights": "Birth"
    },
    {
        "date": date(2019, 8, 1), # Approximate start of college
        "content": "Went to college at PSIT CoE in B.Tech IT.",
        "tags": ["education", "college", "milestone"],
        "highlights": "Started B.Tech IT at PSIT CoE"
    },
    {
        "date": date(2022, 6, 1), # Approximate first job
        "content": "Got my first job at NEC Corporation. Bought gifts for all my family members with my first salary. It was the happiest day of my life as I was finally able to give them something from my own money.",
        "mood_score": 10,
        "energy_level": 10,
        "emotions": ["happy", "proud", "fulfilled", "grateful"],
        "tags": ["career", "family", "milestone", "finances"],
        "highlights": "First job at NEC, bought family gifts with first salary."
    },
    {
        "date": date(2024, 5, 14),
        "content": "Switched jobs to Capgemini.",
        "tags": ["career", "milestone"],
        "highlights": "Joined Capgemini"
    },
    {
        "date": date(2024, 8, 15), # Approximate meeting
        "content": "Met Vranda through a common friend.",
        "tags": ["relationship", "meeting"],
        "people_mentioned": ["Vranda"]
    },
    {
        "date": date(2024, 9, 15), # Approximate start of relation
        "content": "Got into a relationship with Vranda.",
        "tags": ["relationship"],
        "people_mentioned": ["Vranda"]
    },
    {
        "date": date(2024, 11, 5), # Breakup date given as 5 or 6 
        "content": "Broke up with Vranda. The relationship was short and draining, characterized by frequent fights over small issues.",
        "mood_score": 3,
        "tags": ["relationship", "breakup"],
        "emotions": ["drained", "stressed"],
        "people_mentioned": ["Vranda"],
        "highlights": "Breakup with Vranda"
    },
    {
        "date": date(2024, 12, 1), # Approximate stop talking
        "content": "Talking with Vranda stopped entirely, though we still occasionally exchange snaps.",
        "tags": ["relationship"],
        "people_mentioned": ["Vranda"]
    },
    {
        "date": date(2025, 1, 15), # Approximate start of 14 day trip ending/around 28th
        "content": "Promoted to Professional 1 at Capgemini.",
        "mood_score": 9,
        "tags": ["career", "milestone", "promotion"],
        "highlights": "Promoted to Professional 1"
    },
    {
        "date": date(2025, 1, 28),
        "content": "Went to Dubai for a 14-day trip.",
        "mood_score": 9,
        "tags": ["travel", "vacation"],
        "highlights": "Dubai Trip"
    },
    {
        "date": date(2025, 2, 2),
        "content": "Bought S24 Ultra with my own money.",
        "mood_score": 8,
        "tags": ["finances", "purchase", "milestone"],
        "highlights": "Bought S24 Ultra"
    },
    {
        "date": date(2025, 3, 14), # Approximate holi
        "content": "Played Holi with colleagues at the office. Had a great time.",
        "mood_score": 8,
        "tags": ["social", "work", "colleagues", "festival"],
        "highlights": "Office Holi"
    },
    {
        "date": date(2025, 10, 15), # Approximate garba
        "content": "Went to a Garba night with Saumya. Something sparked between us today. We were both hesitant to be in a relationship, but I really enjoyed spending time with her.",
        "mood_score": 9,
        "tags": ["relationship", "Saumya", "event", "spark"],
        "people_mentioned": ["Saumya"],
        "highlights": "Garba night with Saumya, a spark."
    },
    {
        "date": date(2025, 11, 1),
        "content": "My birthday! Saumya came over to my flat to celebrate as I was alone. I kissed her. Our relationship isn't formally defined, no one proposed, it just happened with the flow.",
        "mood_score": 10,
        "tags": ["relationship", "birthday", "milestone", "Saumya"],
        "people_mentioned": ["Saumya"],
        "highlights": "Birthday with Saumya, first kiss, relationship started flowing naturally."
    },
    {
        "date": date(2025, 11, 22),
        "content": "Saumya's birthday. I sent her cute gifts including a bracelet and a necklace, along with many other things, just to see her smile.",
        "mood_score": 9,
        "tags": ["relationship", "Saumya", "gifts", "birthday"],
        "people_mentioned": ["Saumya"],
        "highlights": "Gifts for Saumya's birthday."
    },
    {
        "date": date(2025, 12, 10), # Approximate start of December trip
        "content": "Went on a trip with Manish, Dhruv, Shree, and Pratham to Coorg and then to Mangalore.",
        "mood_score": 9,
        "tags": ["travel", "vacation", "friends"],
        "people_mentioned": ["Manish", "Dhruv", "Shree", "Pratham"],
        "highlights": "Trip to Coorg & Mangalore with friends."
    }
]

# Adding the major career switches as Decisions as well for the DecisionAuditAgent
DECISIONS = [
    {
        "date": date(2022, 6, 1),
        "title": "Accepted first job at NEC Corporation",
        "domain": LifeArea.CAREER,
        "description": "Took my first professional role in IT.",
        "outcome_score": 9,
        "outcome_notes": "Enabled me to buy gifts for my family and become financially independent."
    },
    {
        "date": date(2024, 5, 14),
        "title": "Switched to Capgemini",
        "domain": LifeArea.CAREER,
        "description": "Left NEC to join Capgemini.",
        "outcome_score": 8,
        "outcome_notes": "Led to promotion to Professional 1 in Jan 2025."
    }
]

async def main():
    async with async_session() as session:
        for log_data in INCIDENTS:
            log = DailyLog(user_id=USER_ID, **log_data)
            session.add(log)
            
        for dec_data in DECISIONS:
            dec = Decision(user_id=USER_ID, **dec_data)
            session.add(dec)
            
        await session.commit()
        print(f"Successfully added {len(INCIDENTS)} Historical Logs and {len(DECISIONS)} Major Decisions to the database.")

if __name__ == "__main__":
    asyncio.run(main())
