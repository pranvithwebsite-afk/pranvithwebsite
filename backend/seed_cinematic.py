import asyncio
import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv('backend/.env')
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'pranvithdop')

cinematic_sections = [
  {
    'page_key': 'home',
    'section_id': 'hero',
    'type': 'hero',
    'title': 'Filmmaker\nPortfolio',
    'subtitle': 'Hyderabad · Films & Content',
    'description': 'Cinematography, filmmaking and video editing by Pranvith DOP. Brand stories, creator content and people, captured with intent.',
    'button_text': 'Explore Works',
    'button_link': '#works',
    'media_type': 'video_file',
    'media_url': '/assets/priority-background.mp4',
    'poster_url': '/assets/priority-poster.jpg',
    'sort_order': 1,
    'enabled': True,
    'data': {
      'location': 'Hyderabad, India · Available worldwide',
      'tag': '01 — SELECTED FRAMES',
      'eyebrow': 'Hyderabad · Films & Content',
      'client_credits': 'TSHARKS MEDIA · HUSLE LIFESTYLE · THINK BIG WITH HUSSAIN · FIXEEFY'
    }
  },
  {
    'page_key': 'home',
    'section_id': 'about',
    'type': 'about',
    'title': 'Pranvith. A filmmaker at heart.',
    'subtitle': 'BEHIND THE CAMERA',
    'description': 'I’m a cinematographer, filmmaker, video editor, content creator and drone pilot based in India, working across Hyderabad and Telangana. I bring camera craft and storytelling together, from lighting and movement on set to pacing, colour and the final edit. I work on brand content, model shoots, creator videos and milestone films.',
    'image_url': '/assets/pranvith.jpg',
    'media_url': '/assets/dasara-running-thumbnail.png',
    'sort_order': 2,
    'enabled': True,
    'data': {
      'panel1_title': 'About\nMe',
      'panel2_title': 'The\nVision',
      'person_name': 'KANDARAPU PRANVITH / PRANVITH DOP'
    }
  },
  {
    'page_key': 'home',
    'section_id': 'vision_mission',
    'type': 'vision_mission',
    'title': 'Vision & Mission',
    'subtitle': 'Editorial Split',
    'description': '',
    'sort_order': 3,
    'enabled': True,
    'data': {
      'vision_kicker': 'A little about the filmmaker',
      'vision_title': 'Vision',
      'vision_text': 'I believe every frame has a feeling. My approach brings together light, composition and movement to tell stories with intention.',
      'mission_kicker': 'What drives the work',
      'mission_title': 'Mission',
      'mission_text': 'To create thoughtful visual stories, collaborate with passionate people and make every project feel distinct and memorable.'
    }
  },
  {
    'page_key': 'home',
    'section_id': 'experience',
    'type': 'experience',
    'title': 'Work\nExperience',
    'subtitle': 'Behind every frame is a journey',
    'description': 'From planning and camera movement to lighting and the final image, every stage is shaped by curiosity, craft and collaboration.',
    'image_url': '',
    'sort_order': 4,
    'enabled': True,
    'data': {
      'items': [
        {'title': 'Cinematography & Directing', 'description': 'Lighting, camera movement and visual direction for brand films, commercial ads and product shoots.', 'enabled': True, 'sort_order': 0},
        {'title': 'Video Editing', 'description': 'Story cuts, reels, ads and long-form projects across Premiere Pro, After Effects, DaVinci Resolve and Final Cut Pro.', 'enabled': True, 'sort_order': 1},
        {'title': 'Model & Creator Shoots', 'description': 'Studio films and visual content for models, creators and personal brands.', 'enabled': True, 'sort_order': 2},
        {'title': 'Drone & Milestone Films', 'description': 'Certified aerial perspectives, pre-wedding shoots and half-saree ceremony films.', 'enabled': True, 'sort_order': 3}
      ],
      'brands': [
        {'name': 'Tsharks Media', 'logo': '/assets/tsharks.jpg', 'url': 'https://www.youtube.com/@TsharksMediaEntertainment', 'role': 'Media & Entertainment', 'enabled': True},
        {'name': 'Husle Lifestyle', 'logo': '/assets/husle-lifestyle-profile.jpg', 'url': 'https://www.instagram.com/husle__lifestyle/', 'role': 'Fashion & Lifestyle', 'enabled': True},
        {'name': 'Think Big with Hussain', 'logo': '/assets/think-logo.jpg', 'url': 'https://www.youtube.com/@ThinkBigwithHussain', 'role': 'Creator Content', 'enabled': True},
        {'name': 'Fixeefy', 'logo': '/assets/fixeefy-logo.jpg', 'url': 'https://www.instagram.com/fixeefy/', 'role': 'Tech & Brand Content', 'enabled': True}
      ]
    }
  },
  {
    'page_key': 'home',
    'section_id': 'featured-assets',
    'type': 'portfolio_grid',
    'title': 'Portfolio\nHighlights',
    'subtitle': 'A SELECTION OF VISUAL STORIES',
    'description': 'Selected films, commercial visuals, drone sequences, and edits from the PranvithDOP portfolio.',
    'button_text': 'VIEW ALL WORKS',
    'button_link': '/works',
    'sort_order': 5,
    'enabled': True,
    'data': {
      'tag': '02 / SELECTED WORKS'
    }
  },
  {
    'page_key': 'home',
    'section_id': 'services',
    'type': 'services_cards',
    'title': 'From an idea\nto the final cut.',
    'subtitle': 'HOW WE CAN WORK TOGETHER',
    'description': 'End-to-end cinematography, direction, editing, and creative production.',
    'image_url': '/assets/work-3-0.jpg',
    'sort_order': 6,
    'enabled': True,
    'data': {
      'items': [
        {'num': '01', 'title': 'Cinematography & Directing', 'description': 'Lighting, camera movement and visual direction for brand films, commercial ads and product shoots.', 'enabled': True},
        {'num': '02', 'title': 'Video Editing', 'description': 'Story cuts, reels, ads and long-form projects across Premiere Pro, After Effects, DaVinci Resolve and Final Cut Pro.', 'enabled': True},
        {'num': '03', 'title': 'Model & Creator Shoots', 'description': 'Studio films and high-impact visual content for models, creators and personal brands.', 'enabled': True},
        {'num': '04', 'title': 'Drone & Milestone Films', 'description': 'Certified aerial perspectives, pre-wedding films, anniversaries and half-saree ceremony films.', 'enabled': True}
      ]
    }
  },
  {
    'page_key': 'home',
    'section_id': 'contact',
    'type': 'contact',
    'title': 'Let’s make something\nworth watching.',
    'subtitle': 'YOUR NEXT PROJECT',
    'description': 'Have a brand, a story or a shoot in mind? Let’s talk about it.',
    'image_url': '/assets/pranvith.jpg',
    'button_text': 'Start a Project ↗',
    'button_link': 'https://wa.me/919059867883',
    'sort_order': 7,
    'enabled': True,
    'data': {
      'email': 'info@pranvithdop.com',
      'phone': '+91 90598 67883',
      'statement': 'Have a brand, a story or a shoot in mind? Let’s talk about it.'
    }
  },
  {
    'page_key': 'home',
    'section_id': 'footer',
    'type': 'footer',
    'title': 'Footer',
    'subtitle': '',
    'description': '',
    'sort_order': 8,
    'enabled': True,
    'data': {
      'brand_name': 'PRANVITH DOP',
      'tagline': 'Cinematography, filmmaking and video editing. Hyderabad, India.',
      'instagram_url': 'https://www.instagram.com/pranvith_dop',
      'youtube_url': 'https://www.youtube.com/@pranvithdop',
      'whatsapp_url': 'https://wa.me/919059867883',
      'email': 'info@pranvithdop.com',
      'copyright': f'© {datetime.now().year} PRANVITH DOP · ALL RIGHTS RESERVED'
    }
  }
]

async def seed():
    if not mongo_url:
        print('MONGO_URL not configured')
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f'Connected to {db_name}, updating cinematic home sections...')

    for s in cinematic_sections:
        # Update or insert by page_key + section_id
        res = await db.cms_sections.update_one(
            {'page_key': s['page_key'], 'section_id': s['section_id']},
            {
                '$set': {
                    **s,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                },
                '$setOnInsert': {
                    'id': str(uuid.uuid4()),
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        print(f"Upserted section {s['section_id']}: matched={res.matched_count}, modified={res.modified_count}, upserted_id={res.upserted_id}")

    client.close()
    print('Seeding completed successfully!')

if __name__ == '__main__':
    asyncio.run(seed())
