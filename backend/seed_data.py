"""Seed data for BBEdits. Mirrors the frontend mock data so the site looks identical."""
import uuid

COURSES = [
    {
        "id": str(uuid.uuid4()),
        "title": "PREMIERE Pro BEGINNER TO EXPORT",
        "description": "Premiere Pro Mastery \u2014 From Beginner to Export! The Ultimate Premiere Pro Course \u2014 Learn. Edit. Create. Export. Do you want to master Adobe Premiere Pro from scratch and turn your ideas into professional-level videos?",
        "lectures": 42,
        "discount": "70% OFF",
        "price": 2999,
        "original": 9999,
        "image": "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80",
        "tag": "Premiere Pro",
        "color": "from-purple-600 to-indigo-700",
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Family Forever with AI",
        "description": "Create stunning wedding and family memories using AI-powered editing techniques. Master the art of cinematic storytelling with modern AI tools and workflows.",
        "lectures": 7,
        "discount": "85% OFF",
        "price": 1500,
        "original": 9999,
        "image": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
        "tag": "AI Editing",
        "color": "from-amber-500 to-orange-600",
    },
    {
        "id": str(uuid.uuid4()),
        "title": "After Effects",
        "description": "Master After Effects from scratch and turn your ideas into professional-level videos. This course is perfect for beginners who want to learn motion graphics, VFX, and editing.",
        "lectures": 35,
        "discount": "COMPLETE COURSE",
        "price": 2999,
        "original": None,
        "image": "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80",
        "tag": "After Effects",
        "color": "from-violet-600 to-purple-700",
    },
]

TESTIMONIALS = [
    {"id": str(uuid.uuid4()), "name": "Priya Sharma", "role": "YouTuber", "text": "Best investment I made for my channel. The techniques are industry-standard.", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Arun Patel", "role": "Freelancer", "text": "From zero to landing my first client. Pranavith explains everything so cleanly.", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Sneha Reddy", "role": "Student", "text": "Booked my first wedding edit project within weeks of completing it.", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Vikram Singh", "role": "Wedding Editor", "text": "The AI editing module alone was worth the price. My clients love the results!", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Meera Krishnan", "role": "Instagram Creator", "text": "My reels quality improved drastically. Gained 50K followers in 2 months!", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Karthik Nair", "role": "Brand Manager", "text": "We do all our brand videos in-house. No more outsourcing needed.", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Rohit Verma", "role": "Vlogger", "text": "The color grading section was mind-blowing. My videos look cinematic now.", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Lakshmi Pillai", "role": "Entrepreneur", "text": "Started my own editing service after this course. Already have 10+ clients!", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Siddharth Rao", "role": "Music Producer", "text": "Perfect for creating music videos. The effects tutorials are incredible.", "rating": 5},
    {"id": str(uuid.uuid4()), "name": "Pooja Desai", "role": "Travel Blogger", "text": "My travel videos went viral after applying these techniques. Thank you!", "rating": 5},
]

FAQS = [
    {
        "id": str(uuid.uuid4()),
        "q": "I can find free tutorials on YouTube. Why should I pay to join PranavithDOP?",
        "a": "YouTube tutorials are scattered and lack structure. PranavithDOP provides a step-by-step roadmap, real projects, lifetime access, downloadable assets, community support, and direct mentorship from a professional editor \u2014 saving you months of trial and error.",
    },
    {
        "id": str(uuid.uuid4()),
        "q": "Is this course for absolute beginners, or do I need prior experience?",
        "a": "No prior experience required! We start from the absolute basics \u2014 installing software, understanding the interface \u2014 and gradually take you to advanced professional techniques.",
    },
    {
        "id": str(uuid.uuid4()),
        "q": "Who is this course NOT for?",
        "a": "This course is not for people looking for quick shortcuts without practice. If you are not willing to spend time editing and applying what you learn, this is not for you.",
    },
    {
        "id": str(uuid.uuid4()),
        "q": "I have a full-time job/college. How much time do I need to dedicate daily?",
        "a": "Just 30\u201360 minutes a day is enough. The course is self-paced, so you can learn whenever you have free time \u2014 early mornings, lunch breaks, or weekends.",
    },
    {
        "id": str(uuid.uuid4()),
        "q": "Will I just be watching videos, or will I actually edit?",
        "a": "You will be editing real projects! Every module comes with practice files, assignments, and challenges that mirror real-world client work.",
    },
]
