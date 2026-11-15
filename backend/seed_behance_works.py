import os
from dotenv import load_dotenv
load_dotenv("backend/.env")
from pymongo import MongoClient

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "pranvithdop")]

ALL_PROJECTS = [
    {
        "id": "ethosia-model",
        "title": "Ethosia — Model Film",
        "category": "Model Shoots",
        "badge": "Model Film",
        "thumbnail_url": "/assets/work-3-0.jpg",
        "thumbnail_image_url": "/assets/work-3-0.jpg",
        "video_url": "/assets/proof-3.mp4",
        "equipment": "Sony Cinema Line & Godox Studio Lighting",
        "client": "Ethosia",
        "description": "Dramatic studio lighting and motion portraits capturing high-fashion presence and elegance."
    },
    {
        "id": "anupama-bts",
        "title": "Anupama — Model Shoot BTS",
        "category": "Model Shoots",
        "badge": "Studio BTS",
        "thumbnail_url": "/assets/work-2-3.jpg",
        "thumbnail_image_url": "/assets/work-2-3.jpg",
        "video_url": "/assets/proof-2.mp4",
        "equipment": "Sony Cinema Line on DJI RS3 Pro, Red Backdrop",
        "client": "Anupama",
        "description": "Vibrant studio film on a crimson backdrop showcasing model posing, lighting, and movement."
    },
    {
        "id": "think-big-bts",
        "title": "Think Big with Hussain",
        "category": "Creator Content",
        "badge": "Creator BTS",
        "thumbnail_url": "/assets/work-1-2.jpg",
        "thumbnail_image_url": "/assets/work-1-2.jpg",
        "video_url": "/assets/proof-1.mp4",
        "equipment": "Dual Camera Multi-Angle Podcast Setup with Soft Key Lighting",
        "client": "Think Big with Hussain",
        "description": "Premium visual production for high-engagement creator storytelling and podcast interviews."
    },
    {
        "id": "husle-lifestyle-bts",
        "title": "Husle Lifestyle — Behind the Scenes",
        "category": "Commercial & Brand",
        "badge": "Commercial BTS",
        "thumbnail_url": "/assets/work-0-1.jpg",
        "thumbnail_image_url": "/assets/work-0-1.jpg",
        "video_url": "/assets/proof-0.mp4",
        "equipment": "Sony FX3 on DJI RS3 Pro with Wireless Monitoring",
        "client": "Husle Lifestyle",
        "description": "Fast-paced lifestyle commercial capturing modern fashion, energy, and brand storytelling."
    },
    {
        "id": "dasara-panoramic",
        "title": "Dasara — Cinematic Trailer Remake",
        "category": "Cinematic",
        "badge": "Cinematic Action Remake",
        "thumbnail_url": "/assets/dasara-running-thumbnail.png",
        "thumbnail_image_url": "/assets/dasara-running-thumbnail.png",
        "video_url": "https://assets.pranvithdop.com/cms/home/videos/7ad248c1-910d-4927-a341-6cbfec8328cc.mp4",
        "equipment": "Nikon Z6 II with 24-70mm F/4 & 50mm F/1.8 & DJI RS3 Pro",
        "client": "Pranvith Ranadheer",
        "description": "High-octane cinematic recreation of the Dasara teaser, featuring intense framing, golden color grade, and drone aerials."
    },
    {
        "id": "ihusle-product",
        "title": "iHusle version 2.0 — Product Shoot",
        "category": "Product",
        "badge": "Product Shoot",
        "thumbnail_url": "/assets/product-thumbnail.jpg",
        "thumbnail_image_url": "/assets/product-thumbnail.jpg",
        "video_url": "/assets/product-shoot.mp4",
        "equipment": "Macro Cinema Lenses with Controlled Studio Lighting",
        "client": "iHusle",
        "description": "Dynamic product commercial highlighting build quality, tactile feel, and premium aesthetics."
    },
    {
        "id": "shaking-seshu",
        "title": "Shaking Seshu with MC Maikil",
        "category": "Creator Content",
        "badge": "Tsharks Media",
        "thumbnail_url": "/assets/shaking-seshu-cover.png",
        "thumbnail_image_url": "/assets/shaking-seshu-cover.png",
        "video_url": "https://youtu.be/p-YhZ2GgCE8",
        "equipment": "Tsharks Media Multi-Cam Production Setup",
        "client": "Tsharks Media & Entertainment",
        "description": "Full-length entertainment interview featuring Jabardasth Shaking Seshu and MC Maikil."
    }
]

# Update works:projects
res1 = db.cms_sections.update_one(
    {"page_key": "works", "section_id": "projects"},
    {"$set": {"data.items": ALL_PROJECTS, "enabled": True}},
    upsert=True
)
print("Updated works:projects items:", len(ALL_PROJECTS))

# Update home:featured-assets
res2 = db.cms_sections.update_one(
    {"page_key": "home", "section_id": "featured-assets"},
    {"$set": {"data.items": ALL_PROJECTS, "enabled": True}},
    upsert=True
)
print("Updated home:featured-assets items:", len(ALL_PROJECTS))
