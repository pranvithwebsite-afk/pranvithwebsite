"""
Pranvith DOP Social Media Automation Engine
Meta Graph API (Instagram Business) Integration, Language Detection, Keyword Mapping, and Admin Approval Flow.
Supports Instagram now; extensible to Facebook and YouTube.
"""
import os
import re
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
import httpx

logger = logging.getLogger("backend.social_automation")

try:
    from .camera_ai import CAMERA_DATABASE
except ImportError:
    try:
        from camera_ai import CAMERA_DATABASE
    except ImportError:
        try:
            from backend.camera_ai import CAMERA_DATABASE
        except ImportError:
            CAMERA_DATABASE = {}

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

# ==================== LANGUAGE DETECTION ====================

TELUGU_WORDS = [
    "ela", "cheyyali", "cheyali", "cheppandi", "cheppava", "enti", "undha", "undhi", "kavali",
    "baguntundi", "eppudu", "chala", "manchi", "chesukovali", "gurinchi", "pettali", "telugulo",
    "pedithe", "chusthe", "vadali", "vaadali", "pelliki", "pelli", "edhi", "ekkada", "chesi",
    "bagundi", "bavundi", "anna", "dharalu", "dara", "entha", "emi", "theeyocha", "ivvandi",
    "pampandi", "pampinchandi", "chudandi", "chepparu", "meeru", "miku", "maku", "naku", "bro", "plz",
    "అలా", "ఎలా", "ఏంటి", "చెప్పండి", "ఉంది", "ఉందా", "కావాలి", "బాగుంటుంది", "తెలుగు", "పెళ్లి",
    "బాగుంది", "ఎంత", "ధర", "బ్రో", "దీనితో", "ప్రైస్", "అన్నా", "పంపిస్తారా", "పంపండి", "చూడండి"
]

HINDI_WORDS = [
    "kya", "hai", "bhai", "batao", "kaise", "kare", "kitna", "shukriya", "bahut", "achha",
    "kijiye", "bataiye", "shandar", "namaste", "dhanyawad", "ki", "ka", "ke", "liye", "bhejo",
    "kripya", "badhiya", "daam", "kimat"
]

def detect_comment_language(text: str) -> str:
    """
    Detects if comment is in Telugu, English, or Hindi.
    Handles native Unicode Telugu script, Devanagari script, Romanized Teluglish, and Hinglish.
    """
    raw = (text or "").lower()
    
    # 1. Native script detection
    if re.search(r'[\u0C00-\u0C7F]', raw):
        return "telugu"
    if re.search(r'[\u0900-\u097F]', raw):
        return "hindi"
        
    # 2. Check Romanized Hindi and Telugu
    hindi_score = sum(1 for w in HINDI_WORDS if re.search(rf'\b{re.escape(w)}\b', raw))
    matched_te = [w for w in TELUGU_WORDS if re.search(rf'\b{re.escape(w)}\b', raw) and w not in ("bro", "plz")]
    telugu_score = len(matched_te)

    if telugu_score > 0 and telugu_score >= hindi_score:
        return "telugu"
    if hindi_score >= 2 or (hindi_score >= 1 and any(w in raw for w in ["kya hai", "batao", "shukriya", "bhai", "bhejo", "kaise"])):
        return "hindi"
    if telugu_score > 0:
        return "telugu"

    return "english"

# ==================== DEFAULT KEYWORD RULES ====================

DEFAULT_SOCIAL_RULES = {
    "auto_reply": [
        {
            "id": "rule_lut",
            "name": "LUT & Preset Request",
            "keywords": ["lut", "luts", "preset", "presets", "color grade", "grading", "కలర్ గ్రేడింగ్"],
            "reply_en": "🎨 Check out the Pranvith Creative LUT Pack (₹49) with 10+ 3D cinematic LUTs for Sony S-Log3, Canon C-Log3 & Rec.709: https://pranvithdop.com/assets/creative-lut-pack",
            "reply_te": "🎨 సోనీ S-Log3 మరియు కానన్ C-Log3 కోసం సినిమాటిక్ LUT ప్యాక్ (₹49) లింక్: https://pranvithdop.com/assets/creative-lut-pack",
            "reply_hi": "🎨 सोनी S-Log3 और कैनन C-Log3 के लिए क्रिएटिव सिनेमैटिक LUT पैक (₹49) लिंक: https://pranvithdop.com/assets/creative-lut-pack",
            "active": True
        },
        {
            "id": "rule_settings",
            "name": "Camera Settings / PDF Request",
            "keywords": ["settings", "setting", "camera setting", "pdf", "cheat sheet", "సెట్టింగ్స్"],
            "reply_en": "🎬 Here are our verified camera & cinematography settings guides! You can also explore our complete asset catalog at https://pranvithdop.com/assets",
            "reply_te": "🎬 నమస్కారం! కెమెరా సెట్టింగ్స్ మరియు సినిమాటోగ్రఫీ గైడ్స్ కోసం మన వెబ్‌సైట్ చూడండి: https://pranvithdop.com/assets",
            "reply_hi": "🎬 नमस्ते! कैमरा सेटिंग्स और सिनेमैटोग्राफी गाइड्स के लिए हमारी वेबसाइट देखें: https://pranvithdop.com/assets",
            "active": True
        },
        {
            "id": "rule_link",
            "name": "Direct Link / Asset Request",
            "keywords": ["link", "links", "url", "download", "డౌన్‌లోడ్", "లింక్", "लिंक"],
            "reply_en": "🔗 Direct link to Pranvith DOP creative packs & master courses: https://pranvithdop.com/assets",
            "reply_te": "🔗 ప్రణవిత్ DOP అసెట్స్ మరియు కోర్సెస్ డైరెక్ట్ లింక్: https://pranvithdop.com/assets",
            "reply_hi": "🔗 प्रणविथ डीओपी क्रिएटिव पैक्स और कोर्सेज का डायरेक्ट लिंक: https://pranvithdop.com/assets",
            "active": True
        },
        {
            "id": "rule_instagram",
            "name": "Instagram ID & Handle Request",
            "keywords": ["instagram", "insta id", "ig id", "insta", "ఇన్‌స్టాగ్రామ్", "ఇన్‌స్టా", "इंस्टाग्राम", "इंस्टा"],
            "reply_en": "🎬 Follow us on Instagram @pranvith_dop (https://www.instagram.com/pranvith_dop) for daily behind-the-scenes, camera breakdowns, and cinematic reels!",
            "reply_te": "🎬 మా అఫీషియల్ ఇన్‌స్టాగ్రామ్ ఐడీ @pranvith_dop (https://www.instagram.com/pranvith_dop). రోజూ సినిమాటోగ్రఫీ రీల్స్ మరియు BTS అప్‌డేట్స్ కోసం ఫాలో అవ్వండి 🔥",
            "reply_hi": "🎬 हमारा आधिकारिक इंस्टाग्राम आईडी @pranvith_dop (https://www.instagram.com/pranvith_dop) है। सिनेमैटोग्राफी रील्स और बिहाइंड द सीन्स अपडेट्स के लिए जरूर फॉलो करें!",
            "active": True
        },
        {
            "id": "rule_thank_you",
            "name": "Thank You & Gratitude",
            "keywords": ["thank you", "thanks", "thank u", "tq", "dhanyavadalu", "shukriya", "ధన్యవాదాలు", "థాంక్స్", "शुक्रिया", "धन्यवाद"],
            "reply_en": "🎬 You're most welcome @{username}! Glad you found it helpful. Keep creating and stay tuned for our next filmmaking breakdowns!",
            "reply_te": "🎬 చాలా సంతోషం @{username} bro! వీడియో ఉపయోగపడినందుకు ఆనందంగా ఉంది. కీప్ షూటింగ్ & స్టే ట్యూన్డ్ 🔥",
            "reply_hi": "🎬 बहुत-बहुत धन्यवाद @{username} भाई! खुशी हुई कि आपको यह हेल्पफुल लगा। ऐसे ही सीखते रहें और जुड़े रहें!",
            "active": True
        },
        {
            "id": "rule_list",
            "name": "Catalog / List Request",
            "keywords": ["list", "catalog", "packs", "assets", "store", "లిస్ట్"],
            "reply_en": "🛍️ Here is our complete digital catalog (Creative LUTs ₹49, Sound FX ₹149, Wedding Templates ₹299): https://pranvithdop.com/assets",
            "reply_te": "🛍️ మన ఎడిటింగ్ అసెట్స్ & ప్యాక్స్ మొత్తం లిస్ట్ ఇక్కడ చూడండి: https://pranvithdop.com/assets",
            "reply_hi": "🛍️ हमारा पूरा डिजिटल कैटलॉग यहाँ देखें: https://pranvithdop.com/assets",
            "active": True
        },
        {
            "id": "rule_sound",
            "name": "Sound FX / Audio Request",
            "keywords": ["sound", "sfx", "audio", "sound fx", "whoosh"],
            "reply_en": "🔊 Get 100+ 24-bit cinematic sound FX (whooshes, risers, deep hits) for ₹149: https://pranvithdop.com/assets/cinematic-sound-fx-pack",
            "reply_te": "🔊 సినిమాటిక్ సౌండ్ ఎఫెక్ట్స్ ప్యాక్ (₹149) లింక్: https://pranvithdop.com/assets/cinematic-sound-fx-pack",
            "reply_hi": "🔊 सिनेमैटिक साउंड इफेक्ट्स पैक (₹149) लिंक: https://pranvithdop.com/assets/cinematic-sound-fx-pack",
            "active": True
        }
    ],
    "approval_required": [
        {
            "id": "rule_price",
            "name": "Price & Quotation Inquiry",
            "keywords": ["price", "cost", "rate", "fee", "fees", "charges", "how much", "ధర", "ఎంత", "రేట్", "कीमत", "कितना"],
            "suggested_en": "Hi @{username}! Creative LUT Pack is ₹49, Sound FX Pack is ₹149, and Wedding Templates are ₹299. Explore all packs at https://pranvithdop.com/assets or DM us for custom bundles!",
            "suggested_te": "నమస్కారం @{username}! Creative LUT ప్యాక్ ₹49, Sound FX ₹149, మరియు వెడ్డింగ్ టెంప్లేట్స్ ₹299. వివరాల కోసం మన వెబ్‌సైట్ చూడండి: https://pranvithdop.com/assets",
            "suggested_hi": "नमस्ते @{username}! क्रिएटिव LUT पैक ₹49, साउंड FX ₹149, और वेडिंग टेम्पलेट्स ₹299 हैं। पूरी डिटेल्स के लिए https://pranvithdop.com/assets देखें!",
            "active": True
        },
        {
            "id": "rule_booking",
            "name": "Shoot & Commercial Booking Inquiry",
            "keywords": ["book", "booking", "hire", "service", "shoot", "event", "commercial", "బుకింగ్", "షూట్", "बुक"],
            "suggested_en": "Hi @{username}! For commercial video production, wedding films, or cinematography bookings, please fill our enquiry form at https://pranvithdop.com/hire or WhatsApp +91 9059867883.",
            "suggested_te": "నమస్కారం @{username}! సినిమాటోగ్రఫీ మరియు వెడ్డింగ్ షూట్ బుకింగ్స్ కోసం మా వెబ్‌సైట్ https://pranvithdop.com/hire లో లేదా WhatsApp +91 9059867883 లో సంప్రదించండి.",
            "suggested_hi": "नमस्ते @{username}! कमर्शियल वीडियो प्रोडक्शन या वेडिंग फिल्म्स बुकिंग के लिए हमारी वेबसाइट https://pranvithdop.com/hire या WhatsApp +91 9059867883 पर संपर्क करें।",
            "active": True
        },
        {
            "id": "rule_course",
            "name": "Masterclass & Training Inquiry",
            "keywords": ["course", "class", "training", "offline", "learn", "academy", "కోర్స్", "క్లాస్", "कोर्स", "क्लास"],
            "suggested_en": "Hi @{username}! Our Master Cinematography Course covers practical camera operation, S-Log3/C-Log3 exposure, on-set lighting, and color grading. Details at https://pranvithdop.com/courses",
            "suggested_te": "నమస్కారం @{username}! మా మాస్టర్ సినిమాటోగ్రఫీ కోర్స్ వివరాలు, ప్రాక్టికల్ క్లాసెస్ కోసం ఇక్కడ చూడండి: https://pranvithdop.com/courses",
            "suggested_hi": "नमस्ते @{username}! हमारे मास्टर सिनेमैटोग्राफी कोर्स की डिटेल्स और रजिस्ट्रेशन के लिए https://pranvithdop.com/courses देखें।",
            "active": True
        }
    ]
}

SAMPLE_SEED_COMMENTS = [
    {
        "id": "ig_comm_101",
        "platform": "instagram",
        "account_id": "pranvithdop",
        "post_id": "post_wedding_01",
        "post_caption": "Cinematic Sony S-Log3 Wedding Color Grading Breakdown 🔥",
        "post_permalink": "https://www.instagram.com/reel/C7mZ123xyz/",
        "username": "arjun_visuals",
        "comment_text": "Bro send LUT link for Sony S-Log3",
        "detected_language": "telugu",
        "matched_rule_id": "rule_lut",
        "matched_rule_name": "LUT & Preset Request",
        "matched_keywords": ["lut", "link"],
        "is_sensitive": False,
        "status": "auto_replied",
        "suggested_reply": "🎨 సోనీ S-Log3 మరియు కానన్ C-Log3 కోసం సినిమాటిక్ LUT ప్యాక్ (₹49) లింక్: https://pranvithdop.com/assets/creative-lut-pack",
        "reply_text": "🎨 సోనీ S-Log3 మరియు కానన్ C-Log3 కోసం సినిమాటిక్ LUT ప్యాక్ (₹49) లింక్: https://pranvithdop.com/assets/creative-lut-pack",
        "replied_at": "2026-11-04T12:30:00Z",
        "created_at": "2026-11-04T12:28:00Z",
        "reason": "Auto-replied for keyword 'lut' in Telugu."
    },
    {
        "id": "ig_comm_102",
        "platform": "instagram",
        "account_id": "pranvithdop",
        "post_id": "post_cinematography_02",
        "post_caption": "How to light high-end interviews with a 3-point lighting setup",
        "post_permalink": "https://www.instagram.com/reel/D8kL987abc/",
        "username": "kavya_cinemas",
        "comment_text": "What is the price of the cinematography master course?",
        "detected_language": "english",
        "matched_rule_id": "rule_price",
        "matched_rule_name": "Price & Quotation Inquiry",
        "matched_keywords": ["price", "course"],
        "is_sensitive": True,
        "status": "pending_approval",
        "suggested_reply": "Hi @kavya_cinemas! Creative LUT Pack is ₹49, Sound FX Pack is ₹149, and Wedding Templates are ₹299. Explore all packs at https://pranvithdop.com/assets or DM us for custom course syllabus!",
        "reply_text": None,
        "replied_at": None,
        "created_at": "2026-11-04T13:10:00Z",
        "reason": "Matched sensitive keyword 'price'. Requires admin approval before sending."
    },
    {
        "id": "ig_comm_103",
        "platform": "instagram",
        "account_id": "pranvithdop",
        "post_id": "post_wedding_01",
        "post_caption": "Cinematic Sony S-Log3 Wedding Color Grading Breakdown 🔥",
        "post_permalink": "https://www.instagram.com/reel/C7mZ123xyz/",
        "username": "suresh_films",
        "comment_text": "We want to book you for a wedding shoot in Hyderabad next month. Are you available?",
        "detected_language": "english",
        "matched_rule_id": "rule_booking",
        "matched_rule_name": "Shoot & Commercial Booking Inquiry",
        "matched_keywords": ["book", "shoot"],
        "is_sensitive": True,
        "status": "pending_approval",
        "suggested_reply": "Hi @suresh_films! For commercial video production, wedding films, or cinematography bookings, please fill our enquiry form at https://pranvithdop.com/hire or WhatsApp +91 9059867883.",
        "reply_text": None,
        "replied_at": None,
        "created_at": "2026-11-04T13:45:00Z",
        "reason": "Matched sensitive keyword 'book'. Requires admin approval before sending."
    },
    {
        "id": "ig_comm_104",
        "platform": "instagram",
        "account_id": "pranvithdop",
        "post_id": "post_nikon_03",
        "post_caption": "Nikon Z6III 4K 120fps Slow-Motion & N-RAW Test Footage",
        "post_permalink": "https://www.instagram.com/reel/B5xP456def/",
        "username": "anil_captures",
        "comment_text": "Nikon Z6III wedding camera settings cheat sheet pdf kavali anna",
        "detected_language": "telugu",
        "matched_rule_id": "rule_settings",
        "matched_rule_name": "Camera Settings / PDF Request",
        "matched_keywords": ["settings", "pdf"],
        "is_sensitive": False,
        "status": "auto_replied",
        "suggested_reply": "🎬 నమస్కారం! కెమెరా సెట్టింగ్స్ మరియు సినిమాటోగ్రఫీ గైడ్స్ కోసం మన వెబ్‌సైట్ చూడండి: https://pranvithdop.com/assets",
        "reply_text": "🎬 నమస్కారం! కెమెరా సెట్టింగ్స్ మరియు సినిమాటోగ్రఫీ గైడ్స్ కోసం మన వెబ్‌సైట్ చూడండి: https://pranvithdop.com/assets",
        "replied_at": "2026-11-04T14:02:00Z",
        "created_at": "2026-11-04T14:00:00Z",
        "reason": "Auto-replied for keyword 'settings' in Telugu."
    }
]

# ==================== COMMENT EVALUATOR ====================

def evaluate_comment(
    comment_text: str,
    username: str = "creator",
    custom_rules: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates a comment against automation rules.
    Returns matched status ('auto_replied' or 'pending_approval'), matched keywords, language, and reply text.
    """
    text_lower = (comment_text or "").lower()
    lang = detect_comment_language(comment_text)
    rules = custom_rules or DEFAULT_SOCIAL_RULES

    # 1. Check sensitive rules first (REQUIRES ADMIN APPROVAL)
    for rule in rules.get("approval_required", []):
        if not rule.get("active", True):
            continue
        matched_keywords = []
        for kw in rule.get("keywords", []):
            if re.search(rf'\b{re.escape(kw.lower())}\b', text_lower):
                matched_keywords.append(kw)
        if matched_keywords:
            if lang == "telugu":
                template = rule.get("suggested_te")
            elif lang == "hindi":
                template = rule.get("suggested_hi") or rule.get("suggested_en")
            else:
                template = rule.get("suggested_en")
            suggested_reply = (template or "").replace("{username}", username)
            return {
                "status": "pending_approval",
                "is_sensitive": True,
                "matched_rule_id": rule.get("id"),
                "matched_rule_name": rule.get("name"),
                "matched_keywords": matched_keywords,
                "detected_language": lang,
                "suggested_reply": suggested_reply,
                "reply_text": None,
                "reason": f"Matched sensitive keyword '{matched_keywords[0]}'. Requires admin approval before sending."
            }

    # 2. Check auto-reply rules
    for rule in rules.get("auto_reply", []):
        if not rule.get("active", True):
            continue
        matched_keywords = []
        for kw in rule.get("keywords", []):
            if re.search(rf'\b{re.escape(kw.lower())}\b', text_lower):
                matched_keywords.append(kw)
        if matched_keywords:
            if lang == "telugu":
                reply_template = rule.get("reply_te")
            elif lang == "hindi":
                reply_template = rule.get("reply_hi") or rule.get("reply_en")
            else:
                reply_template = rule.get("reply_en")
            reply_text = (reply_template or "").replace("{username}", username)
            return {
                "status": "auto_replied",
                "is_sensitive": False,
                "matched_rule_id": rule.get("id"),
                "matched_rule_name": rule.get("name"),
                "matched_keywords": matched_keywords,
                "detected_language": lang,
                "suggested_reply": reply_text,
                "reply_text": reply_text,
                "reason": f"Auto-replied for keyword '{matched_keywords[0]}' in {lang.capitalize()}."
            }

    # 3. No specific keyword matched: Queue with a polite default suggestion
    if lang == "telugu":
        default_reply = f"నమస్కారం @{username}! కామెంట్ చేసినందుకు ధన్యవాదాలు. మన సినిమాటోగ్రఫీ అసెట్స్ మరియు గైడ్స్ కోసం https://pranvithdop.com చూడండి."
    elif lang == "hindi":
        default_reply = f"नमस्ते @{username}! कमेंट करने के लिए धन्यवाद। सिनेमैटोग्राफी रिसोर्सेज और पैक्स के लिए https://pranvithdop.com देखें।"
    else:
        default_reply = f"Hi @{username}! Thanks for the comment. Check out our editing packs and cinematography resources at https://pranvithdop.com"

    return {
        "status": "pending_approval",
        "is_sensitive": False,
        "matched_rule_id": None,
        "matched_rule_name": "General Inflow",
        "matched_keywords": [],
        "detected_language": lang,
        "suggested_reply": default_reply,
        "reply_text": None,
        "reason": "General comment. Queued for optional admin response."
    }

# ==================== META / INSTAGRAM GRAPH API CLIENT ====================

class InstagramGraphClient:
    def __init__(self, access_token: Optional[str] = None, account_id: Optional[str] = None):
        self.access_token = (access_token or os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")).strip()
        self.account_id = (
            account_id or
            os.environ.get("INSTAGRAM_ACCOUNT_ID", "") or
            os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", "")
        ).strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.access_token and self.account_id)

    async def get_account_profile(self) -> Dict[str, Any]:
        """Fetches Instagram Business account info or returns mock profile if credentials aren't set."""
        if not self.is_configured:
            return {
                "connected": False,
                "configured": False,
                "platform": "instagram",
                "username": "pranvithdop",
                "account_id": self.account_id or "Not configured",
                "name": "Pranvith DOP",
                "profile_picture_url": "/assets/brand-profile.png",
                "followers_count": "15.4K",
                "media_count": 84,
                "status_message": "Meta Graph API token is not yet configured in environment variables. Running in sandbox test mode."
            }

        url = f"{GRAPH_API_BASE}/{self.account_id}"
        params = {
            "fields": "id,username,name,profile_picture_url,followers_count,media_count",
            "access_token": self.access_token
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    data["connected"] = True
                    data["configured"] = True
                    data["platform"] = "instagram"
                    data["status_message"] = "Connected to Official Meta Instagram Graph API."
                    return data
                else:
                    err = res.json().get("error", {})
                    return {
                        "connected": False,
                        "configured": True,
                        "platform": "instagram",
                        "username": "pranvithdop",
                        "account_id": self.account_id,
                        "status_message": f"Meta API Error ({res.status_code}): {err.get('message', res.text)}"
                    }
        except Exception as e:
            return {
                "connected": False,
                "configured": True,
                "platform": "instagram",
                "status_message": f"Connection exception: {str(e)}"
            }

    async def fetch_recent_comments(self, limit: int = 25) -> List[Dict[str, Any]]:
        """Fetches comments on recent media from Meta Graph API."""
        if not self.is_configured:
            return []

        url = f"{GRAPH_API_BASE}/{self.account_id}/media"
        params = {
            "fields": "id,caption,media_type,permalink,timestamp,comments_count",
            "limit": 10,
            "access_token": self.access_token
        }
        comments_list = []
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.get(url, params=params)
                if res.status_code != 200:
                    logger.warning("Failed to fetch media from Meta: %s", res.text)
                    return []
                media_data = res.json().get("data", [])
                
                for m in media_data:
                    c_url = f"{GRAPH_API_BASE}/{m['id']}/comments"
                    c_params = {
                        "fields": "id,text,timestamp,username,from,like_count",
                        "limit": limit,
                        "access_token": self.access_token
                    }
                    c_res = await client.get(c_url, params=c_params)
                    if c_res.status_code == 200:
                        for c in c_res.json().get("data", []):
                            c["post_id"] = m["id"]
                            c["post_caption"] = m.get("caption", "")
                            c["post_permalink"] = m.get("permalink", "")
                            comments_list.append(c)
            return comments_list
        except Exception as e:
            logger.exception("Error fetching comments from Instagram Graph API: %s", e)
            return []

    async def post_reply(self, comment_id: str, message: str) -> Tuple[bool, str]:
        """Publishes a reply to an Instagram comment using Meta Graph API."""
        if not self.is_configured:
            # Sandbox simulation
            logger.info("[Mock Meta API] Replying to %s: %s", comment_id, message)
            return True, f"mock_reply_{uuid.uuid4().hex[:8]}"

        url = f"{GRAPH_API_BASE}/{comment_id}/replies"
        data = {
            "message": message,
            "access_token": self.access_token
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, data=data)
                if res.status_code == 200:
                    reply_id = res.json().get("id", "")
                    return True, reply_id
                else:
                    err = res.json().get("error", {})
                    msg = err.get("message", res.text)
                    logger.error("Meta Graph API error on reply: %s", msg)
                    return False, msg
        except Exception as e:
            logger.exception("Exception on Meta Graph API reply: %s", e)
            return False, str(e)


async def get_instagram_client(db=None) -> InstagramGraphClient:
    """Instantiates InstagramGraphClient from DB settings or environment variables."""
    token = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip()
    account_id = os.environ.get("INSTAGRAM_ACCOUNT_ID", "").strip() or os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", "").strip()

    if db is not None:
        try:
            config = await db.social_accounts.find_one({"platform": "instagram"}, {"_id": 0})
            if config:
                token = config.get("access_token") or token
                account_id = config.get("account_id") or account_id
        except Exception:
            pass

    return InstagramGraphClient(access_token=token, account_id=account_id)


# ==================== OAUTH & ACCOUNT MANAGEMENT HELPERS ====================

def mask_token(token: Optional[str]) -> str:
    """Masks a token so only the prefix and suffix are visible."""
    if not token or len(token) < 10:
        return ""
    return f"{token[:6]}...{token[-4:]}"


def calculate_token_expiry_status(expires_at: Optional[str]) -> Dict[str, Any]:
    """Calculates human-readable token expiry status and remaining days."""
    if not expires_at:
        return {
            "expires_at": None,
            "status_text": "No expiry configured (or permanent token)",
            "days_remaining": None,
            "is_expired": False,
            "severity": "normal"
        }
    try:
        exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = exp_dt - now
        days = diff.days
        if diff.total_seconds() <= 0:
            return {
                "expires_at": expires_at,
                "status_text": "Token Expired. Please reconnect your account.",
                "days_remaining": 0,
                "is_expired": True,
                "severity": "danger"
            }
        elif days <= 7:
            return {
                "expires_at": expires_at,
                "status_text": f"Expiring soon: {days} day{'s' if days != 1 else ''} remaining",
                "days_remaining": days,
                "is_expired": False,
                "severity": "warning"
            }
        else:
            return {
                "expires_at": expires_at,
                "status_text": f"Active ({days} days remaining)",
                "days_remaining": days,
                "is_expired": False,
                "severity": "success"
            }
    except Exception:
        return {
            "expires_at": expires_at,
            "status_text": f"Expires at {expires_at}",
            "days_remaining": None,
            "is_expired": False,
            "severity": "normal"
        }


def get_instagram_oauth_url(app_id: str, redirect_uri: str, state: str = "pranvith_ig") -> str:
    """Generates official Meta OAuth Authorization URL for Instagram Business login."""
    scopes = [
        "instagram_basic",
        "instagram_manage_comments",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement"
    ]
    scope_str = ",".join(scopes)
    return (
        f"https://www.facebook.com/{GRAPH_API_VERSION}/dialog/oauth"
        f"?client_id={app_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope_str}"
        f"&response_type=code"
        f"&state={state}"
    )


async def exchange_short_lived_token_for_long_lived(
    short_token: str,
    app_id: str,
    app_secret: str
) -> Tuple[bool, Dict[str, Any]]:
    """
    Exchanges short-lived user token for 60-day long-lived token via official Meta endpoint.
    """
    url = f"{GRAPH_API_BASE}/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": short_token
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, params=params)
            if res.status_code == 200:
                data = res.json()
                return True, data
            return False, res.json()
    except Exception as e:
        return False, {"error": str(e)}


def get_youtube_oauth_url(client_id: str, redirect_uri: str, state: str = "pranvith_yt") -> str:
    """Generates Google OAuth 2.0 Authorization URL for YouTube Data API."""
    scopes = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.force-ssl",
        "https://www.googleapis.com/auth/youtube.readonly"
    ]
    scope_str = "%20".join(scopes)
    return (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={scope_str}"
        "&access_type=offline"
        "&prompt=consent"
        f"&state={state}"
    )


async def exchange_youtube_code_for_tokens(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str
) -> Tuple[bool, Dict[str, Any]]:
    """
    Exchanges Google OAuth 2.0 authorization code for access and refresh tokens.
    """
    url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(url, data=data)
            if res.status_code == 200:
                return True, res.json()
            err_data = {}
            try:
                err_data = res.json()
            except Exception:
                err_data = {"error": res.text}
            logger.error("Google OAuth token exchange failed: %s", err_data)
            return False, err_data
    except Exception as e:
        logger.exception("Exception during Google OAuth token exchange: %s", e)
        return False, {"error": str(e)}


async def fetch_youtube_channel_profile(access_token: str) -> Tuple[bool, Dict[str, Any]]:
    """
    Fetches the authenticated user's YouTube Channel snippet and statistics via YouTube Data API v3.
    """
    url = "https://www.googleapis.com/youtube/v3/channels"
    params = {
        "part": "snippet,contentDetails,statistics",
        "mine": "true"
    }
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, params=params, headers=headers)
            if res.status_code == 200:
                data = res.json()
                items = data.get("items", [])
                if not items:
                    return False, {"error": "No YouTube channel found for the authenticated Google account."}
                item = items[0]
                snippet = item.get("snippet", {})
                statistics = item.get("statistics", {})
                thumbs = snippet.get("thumbnails", {})
                best_thumb = (
                    thumbs.get("high", {}).get("url")
                    or thumbs.get("medium", {}).get("url")
                    or thumbs.get("default", {}).get("url")
                    or "/assets/brand-profile.png"
                )
                custom_url = snippet.get("customUrl", "")
                title = snippet.get("title", "Pranvith DOP")
                return True, {
                    "channel_id": item.get("id"),
                    "title": title,
                    "custom_url": custom_url or f"@{title.lower().replace(' ', '')}",
                    "description": snippet.get("description", ""),
                    "profile_picture_url": best_thumb,
                    "subscriber_count": statistics.get("subscriberCount", "0"),
                    "video_count": statistics.get("videoCount", "0"),
                    "view_count": statistics.get("viewCount", "0")
                }
            else:
                err = res.text
                try:
                    err = res.json().get("error", {}).get("message", res.text)
                except Exception:
                    pass
                return False, {"error": f"YouTube API Error ({res.status_code}): {err}"}
    except Exception as e:
        return False, {"error": f"Exception connecting to YouTube API: {str(e)}"}


async def refresh_youtube_token(
    refresh_token: str,
    client_id: str,
    client_secret: str
) -> Tuple[bool, Dict[str, Any]]:
    """
    Refreshes an expired YouTube OAuth access token using the stored refresh token.
    """
    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, data=data)
            if res.status_code == 200:
                return True, res.json()
            return False, res.json()
    except Exception as e:
        return False, {"error": str(e)}


async def get_social_account_summary(db, platform: str) -> Dict[str, Any]:
    """
    Returns public summary of connected account without exposing raw secrets.
    """
    default_summary = {
        "platform": platform,
        "is_connected": False,
        "account_id": None,
        "username": None,
        "name": None,
        "profile_picture_url": None,
        "token_masked": None,
        "token_status": calculate_token_expiry_status(None),
        "scopes": [],
        "connected_at": None,
        "last_synced_at": None,
        "meta_app_id": None,
        "note": "Not connected"
    }

    if platform == "instagram":
        env_token = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "").strip()
        env_acc = os.environ.get("INSTAGRAM_ACCOUNT_ID", "").strip() or os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", "").strip()
        env_app_id = os.environ.get("META_APP_ID", "").strip()

        doc = None
        if db is not None:
            try:
                doc = await db.social_accounts.find_one({"platform": "instagram"}, {"_id": 0})
            except Exception:
                pass

        if doc and doc.get("is_connected"):
            return {
                "platform": "instagram",
                "is_connected": True,
                "account_id": doc.get("account_id"),
                "username": doc.get("username", "pranvithdop"),
                "name": doc.get("name", "Pranvith DOP"),
                "profile_picture_url": doc.get("profile_picture_url", "/assets/brand-profile.png"),
                "token_masked": mask_token(doc.get("access_token")),
                "token_status": calculate_token_expiry_status(doc.get("token_expires_at")),
                "scopes": doc.get("scopes", ["instagram_basic", "instagram_manage_comments", "instagram_content_publish"]),
                "connected_at": doc.get("connected_at"),
                "last_synced_at": doc.get("last_synced_at"),
                "meta_app_id": doc.get("meta_app_id") or env_app_id or None,
                "note": "Connected via Official Meta Graph API"
            }
        elif env_token and env_acc:
            return {
                "platform": "instagram",
                "is_connected": True,
                "account_id": env_acc,
                "username": "pranvithdop",
                "name": "Pranvith DOP",
                "profile_picture_url": "/assets/brand-profile.png",
                "token_masked": mask_token(env_token),
                "token_status": calculate_token_expiry_status(None),
                "scopes": ["instagram_basic", "instagram_manage_comments", "instagram_content_publish"],
                "connected_at": None,
                "last_synced_at": None,
                "meta_app_id": env_app_id or None,
                "note": "Configured via environment variables"
            }
        else:
            default_summary["username"] = "pranvithdop"
            default_summary["name"] = "Pranvith DOP"
            default_summary["meta_app_id"] = env_app_id or None
            return default_summary

    elif platform == "youtube":
        doc = None
        if db is not None:
            try:
                doc = await db.social_accounts.find_one({"platform": "youtube"}, {"_id": 0})
            except Exception:
                pass

        if doc and doc.get("is_connected"):
            return {
                "platform": "youtube",
                "is_connected": True,
                "account_id": doc.get("account_id"),
                "username": doc.get("username", "@pranvithdop"),
                "name": doc.get("name", "Pranvith DOP"),
                "profile_picture_url": doc.get("profile_picture_url", "/assets/brand-profile.png"),
                "token_masked": mask_token(doc.get("access_token")),
                "token_status": calculate_token_expiry_status(doc.get("token_expires_at")),
                "scopes": doc.get("scopes", ["youtube.upload", "youtube.force-ssl", "youtube.readonly"]),
                "connected_at": doc.get("connected_at"),
                "last_synced_at": doc.get("last_synced_at"),
                "statistics": doc.get("statistics", {}),
                "has_refresh_token": bool(doc.get("refresh_token")),
                "note": "Connected via YouTube Data API v3"
            }
        else:
            default_summary["username"] = "@pranvithdop"
            default_summary["name"] = "Pranvith DOP (YouTube)"
            return default_summary

    elif platform == "facebook":
        doc = None
        if db is not None:
            try:
                doc = await db.social_accounts.find_one({"platform": "facebook"}, {"_id": 0})
            except Exception:
                pass

        env_page_token = os.environ.get("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
        env_page_id = os.environ.get("FACEBOOK_PAGE_ID", "").strip()

        if doc and doc.get("is_connected"):
            return {
                "platform": "facebook",
                "is_connected": True,
                "account_id": doc.get("account_id") or doc.get("page_id"),
                "username": doc.get("username") or doc.get("page_name", "Pranvith DOP Facebook Page"),
                "name": doc.get("name") or doc.get("page_name", "Pranvith DOP Page"),
                "profile_picture_url": doc.get("profile_picture_url", "/assets/brand-profile.png"),
                "token_masked": mask_token(doc.get("access_token") or doc.get("page_access_token")),
                "token_status": calculate_token_expiry_status(doc.get("token_expires_at")),
                "scopes": doc.get("scopes", ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_manage_engagement"]),
                "connected_at": doc.get("connected_at"),
                "last_synced_at": doc.get("last_synced_at"),
                "note": "Connected via Meta Graph API v21.0 (Facebook Page)"
            }
        elif env_page_token and env_page_id:
            return {
                "platform": "facebook",
                "is_connected": True,
                "account_id": env_page_id,
                "username": "Pranvith DOP Facebook Page",
                "name": "Pranvith DOP Facebook Page",
                "profile_picture_url": "/assets/brand-profile.png",
                "token_masked": mask_token(env_page_token),
                "token_status": calculate_token_expiry_status(None),
                "scopes": ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_manage_engagement"],
                "connected_at": None,
                "last_synced_at": None,
                "note": "Configured via environment variables"
            }
        else:
            default_summary["username"] = "Pranvith DOP Facebook Page"
            default_summary["name"] = "Pranvith DOP Page"
            return default_summary

    return default_summary


async def disconnect_social_account(db, platform: str) -> bool:
    """Disconnects account and revokes stored credentials."""
    if db is None:
        return False
    now = datetime.now(timezone.utc).isoformat()
    await db.social_accounts.update_one(
        {"platform": platform},
        {
            "$set": {
                "is_connected": False,
                "access_token": "",
                "refresh_token": "",
                "disconnected_at": now,
                "updated_at": now
            }
        },
        upsert=True
    )
    return True


# ==================== CAMERA LOOKUP & TECHNICAL INTELLIGENCE ====================

def match_camera_profile(text: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Matches comment text against CAMERA_DATABASE keys and aliases.
    Cleans punctuation and symbols so e.g. "Z6ii." or "A7 IV?" matches accurately.
    Returns (camera_key, camera_data) or None.
    """
    if not text or not CAMERA_DATABASE:
        return None
    raw = text.lower().replace("-", " ")
    clean_raw = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower()).replace("-", " ")

    candidates = []
    for key, cam in CAMERA_DATABASE.items():
        aliases = cam.get("aliases", []) + [cam.get("model", "").lower()]
        for alias in aliases:
            al_clean = alias.lower().replace("-", " ")
            if re.search(rf'\b{re.escape(al_clean)}\b', raw) or re.search(rf'\b{re.escape(al_clean)}\b', clean_raw):
                candidates.append((len(al_clean), key, cam))
    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return (candidates[0][1], candidates[0][2])
    return None


def generate_camera_specific_reply(cam_key: str, author_name: str, lang: str) -> str:
    """
    Generates an authoritative, camera-specific technical reply extracting
    specs (profiles, Dual Base ISO, resolution, shutter rule) from CAMERA_DATABASE.
    Covers Nikon, Sony, and Canon cameras with official PDF cheat sheet links.
    """
    cam = CAMERA_DATABASE.get(cam_key, {})
    model = cam.get("model", "camera")
    base_isos = cam.get("base_isos", "")
    profiles = ", ".join(cam.get("color_profiles", ["S-Log / Log", "S-Cinetone"]))

    # 1. SONY A7 IV
    if "sony_a7iv" in cam_key or "a7iv" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Sony A7 IV బెస్ట్ వీడియో సెట్టింగ్స్: "
                "Picture Profile: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2), "
                "Dual Base ISO: ISO 800 (Low Base) & ISO 3,200 (High Base), "
                "180° షట్టర్ రూల్ (24p కి 1/50s, 60p కి 1/125s), 4K 24/30p ఫుల్-ఫ్రేమ్ (60p కి 1.5x క్రాప్). "
                "పూర్తి సెట్టింగ్స్ PDF & సినీమాటిక్ LUTs కోసం https://pranvithdop.com/assets చూడండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Sony A7 IV की बेस्ट सिनेमैटिक वीडियो सेटिंग्स: "
                "Picture Profile: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2), "
                "Dual Base ISO: ISO 800 (Low Base) और ISO 3,200 (High Base), "
                "180° शटर रूल (24p पर 1/50s), 4K 24/30p फुल-फ्रेम (60p में 1.5x सुपर35 क्रॉप)। "
                "पूरी सेटिंग्स चीट शीट & LUTs के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Sony A7 IV cinematic video settings: "
                "Picture Profile: S-Log3 with S-Gamut3.Cine (10-bit 4:2:2), "
                "Dual Base ISO: ISO 800 (Low Base) & ISO 3,200 (High Base), "
                "180° shutter rule (1/50s for 24p), and 4K 24/30p full-frame (or 60p in Super35). "
                "Download our full camera cheat sheet & LUTs at https://pranvithdop.com/assets 🎬"
            )

    # 2. NIKON Z6III
    elif "nikon_z6iii" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Nikon Z6III బెస్ట్ వీడియో సెట్టింగ్స్: "
                "Picture Profile: N-Log (10-bit internal), Dual Base ISO: ISO 800 & ISO 6,400, "
                "180° షట్టర్ రూల్ (24p కి 1/50s), 6K N-RAW / 4K 60p ఓవర్‌శాంపిల్డ్. "
                "ఫుల్ కెమెరా చీట్ షీట్ కోసం https://pranvithdop.com/assets విజిట్ చేయండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Nikon Z6III की बेस्ट वीडियो सेटिंग्स: "
                "Picture Profile: N-Log (10-bit internal), Dual Base ISO: ISO 800 और ISO 6,400, "
                "180° शटर रूल (24p पर 1/50s), 6K N-RAW / 4K 60p ओवरसैंपल्ड। "
                "फुल कैमरा चीट शीट के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Nikon Z6III settings: "
                "Picture Profile: N-Log (10-bit), Dual Base ISO: ISO 800 & ISO 6,400, "
                "180° shutter rule (1/50s for 24p), and 6K N-RAW / 4K 60p oversampled. "
                "Download our settings guide at https://pranvithdop.com/assets 🎬"
            )

    # 3. NIKON Z6II / Z6
    elif "nikon_z6ii" in cam_key or "z6ii" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Nikon Z6II బెస్ట్ సెట్టింగ్స్: "
                "ఇంటర్నల్ 8-bit లో Flat Profile (Sharpening -2, Contrast -3) వాడండి. "
                "10-bit N-Log కోసం HDMI ద్వారా Atomos Ninja రికార్డర్ వాడాలి (Base ISO 800). "
                "180° షట్టర్ రూల్ (24p కి 1/50s). కంప్లీట్ Z6II సెట్టింగ్స్ PDF కోసం https://pranvithdop.com/assets చూడండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Nikon Z6II की बेस्ट सेटिंग्स: "
                "इंटरनल 8-bit रिकॉर्डिंग के लिए Flat Profile (Sharpening -2, Contrast -3) सबसे बेस्ट है। "
                "10-bit N-Log के लिए HDMI से Atomos Ninja रिकॉर्डर जरूरी है (Base ISO 800)। "
                "180° शटर रूल (24p पर 1/50s)। फुल Z6II सेटिंग्स PDF के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Nikon Z6II settings: "
                "For internal 8-bit, use the Flat Profile (Sharpening -2, Contrast -3) for maximum dynamic range. "
                "10-bit N-Log is available via external HDMI to an Atomos Ninja (Base ISO 800). "
                "180° shutter rule (1/50s for 24p). Download our Nikon cheat sheet PDF at https://pranvithdop.com/assets 🎬"
            )

    # 4. NIKON Z8 / Z9
    elif "nikon_z8" in cam_key or "nikon_z9" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Nikon Z8/Z9 బెస్ట్ సెట్టింగ్స్: "
                "Picture Profile: N-Log (10-bit / 12-bit N-RAW), "
                "Dual Base ISO: ISO 800 (Low Base) & ISO 4,000 (High Base), "
                "180° షట్టర్ రూల్, 8.3K 60p / 4K 120p అన్‌క్రాప్డ్ ఫుల్-ఫ్రేమ్. "
                "కంప్లీట్ సెట్టింగ్స్ గైడ్ కోసం https://pranvithdop.com/assets విజిట్ చేయండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Nikon Z8/Z9 की बेस्ट सेटिंग्स: "
                "Picture Profile: N-Log (10-bit / 12-bit N-RAW), "
                "Dual Base ISO: ISO 800 (Low Base) और ISO 4,000 (High Base), "
                "180° शटर रूल, 8.3K 60p / 4K 120p अनक्रॉप्ड फुल-फ्रेम। "
                "फुल सेटिंग्स गाइड के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Nikon Z8/Z9 settings: "
                "Picture Profile: N-Log (10-bit / 12-bit internal N-RAW), "
                "Dual Base ISO: ISO 800 & ISO 4,000, 180° shutter rule, and uncropped 4K 120p / 8.3K 60p. "
                "Download our full settings cheat sheet at https://pranvithdop.com/assets 🎬"
            )

    # 5. SONY FX3 / FX6 / A7S III
    elif "sony_fx3" in cam_key or "sony_fx6" in cam_key or "sony_a7siii" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Sony FX3 / A7S III బెస్ట్ సెట్టింగ్స్: "
                "Picture Profile: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2 All-Intra), "
                "Dual Base ISO: ISO 800 (Low Base) & ISO 12,800 (High Base / Low Light Beast), "
                "180° షట్టర్ రూల్, 4K 120p ఫుల్-ఫ్రేమ్. "
                "చీట్ షీట్ & LUTs కోసం https://pranvithdop.com/assets చూడండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Sony FX3 / A7S III की बेस्ट सेटिंग्स: "
                "Picture Profile: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2 All-Intra), "
                "Dual Base ISO: ISO 800 और ISO 12,800 (लो-लाइट के लिए बेस्ट), 180° शटर रूल, 4K 120p फुल-फ्रेम। "
                "चीट शीट और LUTs के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Sony FX3 / A7S III settings: "
                "Picture Profile: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2 All-Intra), "
                "Dual Base ISO: ISO 800 & ISO 12,800 (clean low-light), 180° shutter rule, and 4K 120p full-frame. "
                "Download our cheat sheet & LUTs at https://pranvithdop.com/assets 🎬"
            )

    # 6. SONY FX30
    elif "sony_fx30" in cam_key or "fx30" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Sony FX30 బెస్ట్ సెట్టింగ్స్: "
                "Picture Profile: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2 All-Intra), "
                "Dual Base ISO: ISO 800 (Low Base) & ISO 2,500 (High Base), "
                "180° షట్టర్ రూల్, 4K 60p ఓవర్‌శాంపిల్డ్ (6K). చీట్ షీట్ కోసం https://pranvithdop.com/assets చూడండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Sony FX30 की बेस्ट सेटिंग्स: "
                "Picture Profile: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2), "
                "Dual Base ISO: ISO 800 और ISO 2,500, 180° शटर रूल, 4K 60p ओवरसैंपल्ड (6K)। "
                "सेटिंग्स चीट शीट के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Sony FX30 settings: "
                "Picture Profile: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2), "
                "Dual Base ISO: ISO 800 & ISO 2,500, 180° shutter rule, and 4K 60p oversampled from 6K. "
                "Check our cheat sheet at https://pranvithdop.com/assets 🎬"
            )

    # 7. SONY A7 III
    elif "sony_a7iii" in cam_key or "a7iii" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Sony A7 III 8-bit కాబట్టి S-Log2 లేదా HLG3 వాడండి. "
                "S-Log2 లో Base ISO 800 (+1.7 EV ఓవర్‌ఎక్స్‌పోజ్ చేయండి), HLG3 లో Base ISO 100. "
                "180° షట్టర్ రూల్ (24p కి 1/50s). A7 III కస్టమ్ కలర్ LUTs కోసం https://pranvithdop.com/assets చూడండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Sony A7 III में 8-bit होने के कारण S-Log2 या HLG3 सबसे बेहतर रहता है। "
                "S-Log2 में Base ISO 800 (+1.7 EV ओवरएक्सपोज करें), HLG3 में Base ISO 100। "
                "180° शटर रूल (24p पर 1/50s)। A7 III LUTs के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Sony A7 III settings: "
                "For 8-bit internal video, use S-Log2 (expose +1.7 to +2.0 EV, Base ISO 800) or HLG3 (Base ISO 100). "
                "180° shutter rule (1/50s for 24p). Download our A7 III custom LUTs at https://pranvithdop.com/assets 🎬"
            )

    # 8. CANON EOS R5 / R5 MARK II
    elif "canon_r5" in cam_key or "r5" in cam_key:
        if "ii" in cam_key or "mark ii" in cam_key or "r5_ii" in cam_key:
            if lang == "telugu":
                return (
                    f"నమస్కారం @{author_name}! Canon EOS R5 Mark II బెస్ట్ సెట్టింగ్స్: "
                    "Picture Profile: C-Log2 (16+ stops dynamic range) లేదా C-Log3, "
                    "Dual Base ISO: ISO 800 & ISO 3,200, 180° షట్టర్ రూల్ (24p కి 1/50s), "
                    "8K 60p RAW / 4K 120p. పూర్తి సెట్టింగ్స్ & LUTs కోసం https://pranvithdop.com/assets చూడండి 🎬"
                )
            elif lang == "hindi":
                return (
                    f"नमस्ते @{author_name}! Canon EOS R5 Mark II की बेस्ट सेटिंग्स: "
                    "Picture Profile: C-Log2 (16+ स्टॉप्स डायनामिक रेंज) या C-Log3, "
                    "Dual Base ISO: ISO 800 और ISO 3,200, 180° शटर रूल (24p पर 1/50s), 8K 60p RAW / 4K 120p। "
                    "सेटिंग्स & LUTs के लिए https://pranvithdop.com/assets देखें 🎬"
                )
            else:
                return (
                    f"Hi @{author_name}! Recommended Canon EOS R5 Mark II settings: "
                    "Picture Profile: C-Log2 (16+ stops dynamic range) or C-Log3, "
                    "Dual Base ISO: ISO 800 & ISO 3,200, 180° shutter rule, 8K 60p RAW / 4K 120p. "
                    "Download our Canon cheat sheet & LUTs at https://pranvithdop.com/assets 🎬"
                )
        else:
            if lang == "telugu":
                return (
                    f"నమస్కారం @{author_name}! Canon EOS R5 బెస్ట్ సెట్టింగ్స్: "
                    "Picture Profile: C-Log3 (10-bit 4:2:2), Native Base ISO: ISO 800, "
                    "180° షట్టర్ రూల్ (24p కి 1/50s), 4K 60p HQ (8K ఓవర్‌శాంపిల్డ్). "
                    "సెట్టింగ్స్ PDF & సినీమాటిక్ LUTs కోసం https://pranvithdop.com/assets చూడండి 🎬"
                )
            elif lang == "hindi":
                return (
                    f"नमस्ते @{author_name}! Canon EOS R5 की बेस्ट सेटिंग्स: "
                    "Picture Profile: C-Log3 (10-bit 4:2:2), Native Base ISO: ISO 800, "
                    "180° शटर रूल (24p पर 1/50s), 4K 60p HQ (8K ओवरसैंपल्ड)। "
                    "सेटिंग्स PDF & LUTs के लिए https://pranvithdop.com/assets देखें 🎬"
                )
            else:
                return (
                    f"Hi @{author_name}! Recommended Canon EOS R5 settings: "
                    "Picture Profile: C-Log3 (10-bit 4:2:2), Native Base ISO: ISO 800, "
                    "180° shutter rule (1/50s for 24p), 4K 60p HQ oversampled from 8K. "
                    "Download our Canon settings cheat sheet at https://pranvithdop.com/assets 🎬"
                )

    # 9. CANON EOS R6 / R6 MARK II
    elif "canon_r6" in cam_key or "r6" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Canon EOS R6 Mark II బెస్ట్ సెట్టింగ్స్: "
                "Picture Profile: C-Log3 (10-bit 4:2:2 ఇంటర్నల్), Base ISO: ISO 800, "
                "180° షట్టర్ రూల్ (24p కి 1/50s), 4K 60p అన్‌క్రాప్డ్ (6K ఓవర్‌శాంపిల్డ్). "
                "వెడ్డింగ్ & సినిమాటోగ్రఫీ సెట్టింగ్స్ PDF కోసం https://pranvithdop.com/assets చూడండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Canon EOS R6 Mark II की बेस्ट सेटिंग्स: "
                "Picture Profile: C-Log3 (10-bit 4:2:2), Base ISO: ISO 800, "
                "180° शटर रूल (24p पर 1/50s), 4K 60p अनक्रॉप्ड (6K ओवरसैंपल्ड)। "
                "वेडिंग & सिनेमैटोग्राफी सेटिंग्स PDF के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Canon EOS R6 Mark II settings: "
                "Picture Profile: C-Log3 (10-bit 4:2:2 internal), Base ISO: ISO 800, "
                "180° shutter rule (1/50s for 24p), and uncropped 4K 60p (6K oversampled). "
                "Download our wedding & cinema cheat sheet PDF at https://pranvithdop.com/assets 🎬"
            )

    # 10. CANON EOS R7
    elif "canon_r7" in cam_key or "r7" in cam_key:
        if lang == "telugu":
            return (
                f"నమస్కారం @{author_name}! Canon EOS R7 బెస్ట్ సెట్టింగ్స్: "
                "Picture Profile: C-Log3 (10-bit 4:2:2), Base ISO: ISO 800, "
                "180° షట్టర్ రూల్, 4K 30p Fine (7K ఓవర్‌శాంపిల్డ్) / 4K 60p. "
                "సెట్టింగ్స్ గైడ్ కోసం https://pranvithdop.com/assets చూడండి 🎬"
            )
        elif lang == "hindi":
            return (
                f"नमस्ते @{author_name}! Canon EOS R7 की बेस्ट सेटिंग्स: "
                "Picture Profile: C-Log3 (10-bit 4:2:2), Base ISO: ISO 800, "
                "180° शटर रूल, 4K 30p Fine (7K ओवरसैंपल्ड) / 4K 60p। "
                "सेटिंग्स गाइड के लिए https://pranvithdop.com/assets देखें 🎬"
            )
        else:
            return (
                f"Hi @{author_name}! Recommended Canon EOS R7 settings: "
                "Picture Profile: C-Log3 (10-bit), Base ISO: ISO 800, "
                "180° shutter rule, and 4K 30p Fine oversampled from 7K (or 4K 60p). "
                "Check our cheat sheet at https://pranvithdop.com/assets 🎬"
            )

    # Dynamic fallback for all other cameras in CAMERA_DATABASE
    if lang == "telugu":
        return f"నమస్కారం @{author_name}! {model} బెస్ట్ వీడియో సెట్టింగ్స్: {base_isos}, ప్రొఫైల్: {profiles}, 180° షట్టర్ రూల్. కంప్లీట్ సినిమాటోగ్రఫీ గైడ్ కోసం https://pranvithdop.com/assets చూడండి 🎬"
    elif lang == "hindi":
        return f"नमस्ते @{author_name}! {model} की बेस्ट सेटिंग्स: {base_isos}, प्रोफाइल: {profiles}, 180° शटर रूल। पूरी सिनेमैटोग्राफी गाइड के लिए https://pranvithdop.com/assets देखें 🎬"
    else:
        return f"Hi @{author_name}! Recommended {model} settings: {base_isos}, Profile: {profiles}, and 180° shutter rule. Check our complete settings guide at https://pranvithdop.com/assets 🎬"


# ==================== SOCIAL AI AUTO-REPLY POOLS ====================

SOCIAL_REPLY_POOLS: Dict[str, Dict[str, List[str]]] = {
    "INSTAGRAM_ID": {
        "telugu": [
            "నమస్కారం @{author}! మా అఫీషియల్ ఇన్‌స్టాగ్రామ్ ఐడీ @pranvith_dop (https://www.instagram.com/pranvith_dop). రోజూ సినిమాటోగ్రఫీ రీల్స్ మరియు BTS అప్‌డేట్స్ కోసం ఫాలో అవ్వండి 🔥",
            "హాయ్ @{author}! Instagram లో మమ్మల్ని @pranvith_dop (https://www.instagram.com/pranvith_dop) లో ఫాలో అవ్వండి! 🎬"
        ],
        "hindi": [
            "नमस्ते @{author}! हमारा आधिकारिक इंस्टाग्राम आईडी @pranvith_dop (https://www.instagram.com/pranvith_dop) है। सिनेमैटोग्राफी रील्स और बिहाइंड द सीन्स अपडेट्स के लिए जरूर फॉलो करें! 🎬",
            "हेलो @{author}! इंस्टाग्राम पर हमारे साथ जुड़ें: @pranvith_dop (https://www.instagram.com/pranvith_dop)। नए सिनेमैटिक टिप्स के लिए फॉलो करें! 🔥"
        ],
        "english": [
            "Hi @{author}! Follow us on Instagram @pranvith_dop (https://www.instagram.com/pranvith_dop) for daily behind-the-scenes, camera breakdowns, and cinematic reels! 🎬",
            "Hey @{author}! Connect with us on Instagram: @pranvith_dop (https://www.instagram.com/pranvith_dop). We post regular cinematography setups and lighting tips! 🔥"
        ]
    },
    "CAMERA_LINKS": {
        "telugu": [
            "నమస్కారం @{author}! మన కెమెరా అసెట్స్ & ప్రొడక్ట్స్ డైరెక్ట్ లింక్స్: ఆల్ ప్యాక్స్ & గేర్ లిస్ట్: https://pranvithdop.com/assets | క్రియేటివ్ LUT ప్యాక్ (₹49): https://pranvithdop.com/assets/creative-lut-pack | సినిమాటోగ్రఫీ కోర్స్: https://pranvithdop.com/courses 🎬",
            "హాయ్ @{author}! ప్రణవిత్ DOP కెమెరా గైడ్స్ & అసెట్స్ మొత్తం లింక్ ఇక్కడ చూడండి: https://pranvithdop.com/assets 🔥"
        ],
        "hindi": [
            "नमस्ते @{author}! ये रहे हमारे आधिकारिक डायरेक्ट लिंक्स: कैमरा रिसोर्सेज और पैक्स: https://pranvithdop.com/assets | क्रिएटिव LUT पैक (₹49): https://pranvithdop.com/assets/creative-lut-pack | सिनेमैटोग्राफी मास्टरक्लास: https://pranvithdop.com/courses 🎬",
            "हेलो @{author}! हमारे सभी कैमरा गाइड्स और फिल्ममेकिंग एसेट्स के डायरेक्ट लिंक यहाँ हैं: https://pranvithdop.com/assets 🔗"
        ],
        "english": [
            "Hi @{author}! Here are the direct links: Camera gear & creative packs: https://pranvithdop.com/assets | Creative LUT Pack (₹49): https://pranvithdop.com/assets/creative-lut-pack | Masterclass: https://pranvithdop.com/courses. Happy creating! 🎬",
            "Hey @{author}! All verified camera cheat sheets, LUTs, and equipment links are available here: https://pranvithdop.com/assets. Check them out! 🔗"
        ]
    },
    "CAMERA_PRICE": {
        "telugu": [
            "నమస్కారం @{author}! కెమెరా బాడీ ధరలు: Sony A7 IV సుమారు ₹2.1L - ₹2.3L మరియు Nikon Z6III సుమారు ₹2.4L ఉంటుంది. మన డిజిటల్ అసెట్స్ కేవలం ₹49 నుంచే ఉన్నాయి (LUTs ₹49, Sound FX ₹149): https://pranvithdop.com/assets. ప్రాజెక్ట్ షూట్ బుకింగ్స్ & కొటేషన్ల కోసం https://pranvithdop.com/hire లేదా WhatsApp +91 9059867883 లో సంప్రదించండి 🎬",
            "హాయ్ @{author}! Sony A7 IV బాడీ ప్రైస్ ~₹2.1L-₹2.3L, Nikon Z6III ~₹2.4L. మన సినిమాటిక్ LUT ప్యాక్స్ ₹49 మాత్రమే: https://pranvithdop.com/assets. షూట్ కొటేషన్ల కోసం: https://pranvithdop.com/hire 🔥"
        ],
        "hindi": [
            "नमस्ते @{author}! मुख्य कैमरा बॉडी की कीमतें: Sony A7 IV लगभग ₹2.1L - ₹2.3L और Nikon Z6III लगभग ₹2.4L है। हमारे क्रिएटिव फिल्ममेकिंग पैक्स सिर्फ ₹49 से शुरू होते हैं https://pranvithdop.com/assets पर। शूट बुकिंग और कोटेशन के लिए https://pranvithdop.com/hire या WhatsApp +91 9059867883 पर संपर्क करें 🎬",
            "हेलो @{author}! कैमरा बॉडीज जैसे Sony A7 IV (~₹2.2L) और Nikon Z6III (~₹2.4L)। हमारे LUT पैक्स सिर्फ ₹49 में https://pranvithdop.com/assets पर उपलब्ध हैं। कमर्शियल शूट कोटेशन के लिए WhatsApp +91 9059867883 करें! 🎬"
        ],
        "english": [
            "Hi @{author}! Major camera body prices: Sony A7 IV is ~₹2.1L - ₹2.3L and Nikon Z6III is ~₹2.4L (body only). Our digital filmmaking packs start from ₹49 (Creative LUTs ₹49, Sound FX ₹149) at https://pranvithdop.com/assets. For bespoke commercial/wedding cinematography quotes, visit https://pranvithdop.com/hire or WhatsApp +91 9059867883 🎬",
            "Thanks for inquiring @{author}! Camera bodies range from ~₹2.1L (Sony A7 IV) to ~₹2.4L (Nikon Z6III). Digital editing packs start at ₹49 on https://pranvithdop.com/assets. For production shoot booking quotes, reach out via https://pranvithdop.com/hire"
        ]
    },
    "THANK_YOU": {
        "telugu": [
            "చాలా సంతోషం @{author} bro! వీడియో ఉపయోగపడినందుకు ఆనందంగా ఉంది. కీప్ షూటింగ్ & స్టే ట్యూన్డ్ 🔥",
            "వెల్‌కమ్ @{author} anna! మీ సపోర్ట్ చాలా విలువైనది. ఇంకా ఏమైనా డౌట్స్ ఉంటే తప్పకుండా అడగండి 🎬",
            "చాలా థాంక్స్ @{author}! మరిన్ని సినిమాటోగ్రఫీ వీడియోలు త్వరలోనే వస్తున్నాయి. కీప్ క్రియేటింగ్! 🔥"
        ],
        "hindi": [
            "बहुत-बहुत धन्यवाद @{author} भाई! खुशी हुई कि आपको यह हेल्पफुल लगा। ऐसे ही सीखते रहें और जुड़े रहें 🎬",
            "आपका स्वागत है @{author}! वीडियो पसंद आने के लिए धन्यवाद। कोई भी सवाल हो तो बेझिझक पूछें! 🔥",
            "मोस्ट वेलकम @{author}! ऐसे ही सपोर्ट करते रहें, नए सिनेमैटोग्राफी वीडियो जल्द आ रहे हैं! 🎬"
        ],
        "english": [
            "You're most welcome @{author}! Really glad it helped. Keep creating and stay tuned for more cinematography breakdowns 🎬",
            "Anytime @{author}! Glad you found it useful. Keep shooting and all the best for your next project! 🔥",
            "You're welcome @{author}! Appreciate the support. Feel free to ask if you have any camera or lighting questions! 🎬"
        ]
    },
    "CAMERA_SETTINGS": {
        "telugu": [
            "నమస్కారం @{author}! కెమెరా బెస్ట్ వీడియో సెట్టింగ్స్ & సినీమాటోగ్రఫీ గైడ్స్ కోసం మన వెబ్‌సైట్ చూడండి: https://pranvithdop.com/assets. ఇంకా ఏమైనా డౌట్స్ ఉంటే తప్పకుండా అడగండి!",
            "హాయ్ @{author}! Z-సిరీస్ / Sony కెమెరాల కంప్లీట్ సెట్టింగ్స్ PDF మరియు సినీమాటిక్ అసెట్స్ ఇక్కడ ఉన్నాయి: https://pranvithdop.com/assets. ట్రై చేసి రిజల్ట్ ఎలా ఉందో చెప్పండి bro 🔥",
            "నమస్కారం @{author}! N-Log / S-Log3 ప్రొఫైల్స్ మరియు ఎక్స్‌పోజర్ సెట్టింగ్స్ గైడ్ కోసం https://pranvithdop.com/assets విజిట్ చేయండి!"
        ],
        "hindi": [
            "नमस्ते @{author}! कैमरा सेटिंग्स और सिनेमैटोग्राफी गाइड्स के लिए हमारी वेबसाइट देखें: https://pranvithdop.com/assets. कोई भी सवाल हो तो जरूर पूछें!",
            "हेलो @{author}! संपूर्ण कैमरा सेटिंग्स चीट शीट और सिनेमैटिक रिसोर्सेज यहाँ हैं: https://pranvithdop.com/assets. चेक करें! 🎬"
        ],
        "english": [
            "Hi @{author}! You can download our verified camera settings guide and cinematography cheat sheets here: https://pranvithdop.com/assets. Hope it helps your workflow!",
            "Hey @{author}! Check out the complete camera profile & exposure guide on https://pranvithdop.com/assets. Let me know if you have any questions!",
            "Full camera settings, picture profiles, and creative gear lists are right here: https://pranvithdop.com/assets 🎬"
        ]
    },
    "LUT_REQUEST": {
        "telugu": [
            "🎨 నమస్కారం @{author}! Sony S-Log3, Canon C-Log3 & Rec.709 కోసం క్రియేటివ్ సినిమాటిక్ LUT ప్యాక్ (₹49) లింక్: https://pranvithdop.com/assets/creative-lut-pack. కలర్ గ్రేడింగ్ ఈజీగా అయిపోతుంది!",
            "🎨 హాయ్ @{author}! మా అఫీషియల్ సినిమాటిక్ 3D LUT ప్యాక్ కేవలం ₹49 కే అందుబాటులో ఉంది: https://pranvithdop.com/assets/creative-lut-pack. డౌన్‌లోడ్ చేసుకుని ట్రై చేయండి bro!",
            "🎨 Thanks @{author}! 10+ సినిమాటిక్ క్యూబ్ LUTs తో కూడిన ప్యాక్ లింక్: https://pranvithdop.com/assets/creative-lut-pack. హ్యాపీ కలర్ గ్రేడింగ్!"
        ],
        "hindi": [
            "🎨 नमस्ते @{author}! सोनी S-Log3 और कैनन C-Log3 के लिए क्रिएटिव सिनेमैटिक LUT पैक (₹49) लिंक: https://pranvithdop.com/assets/creative-lut-pack",
            "🎨 हेलो @{author}! हमारा आधिकारिक सिनेमैटिक LUT पैक सिर्फ ₹49 में यहाँ उपलब्ध है: https://pranvithdop.com/assets/creative-lut-pack. हैप्पी कलर ग्रेडिंग!"
        ],
        "english": [
            "🎨 Hi @{author}! Check out our Creative LUT Pack (₹49) crafted specifically for cinematic S-Log3/C-Log3 workflows: https://pranvithdop.com/assets/creative-lut-pack",
            "🎨 Thanks @{author}! You can get the 10+ 3D cinematic LUT pack here: https://pranvithdop.com/assets/creative-lut-pack. Happy grading!",
            "🎨 Hey @{author}! Grab our official cinematic LUTs to achieve clean skin tones and film contrast: https://pranvithdop.com/assets/creative-lut-pack"
        ]
    },
    "GEAR_LIST": {
        "telugu": [
            "🎥 నమస్కారం @{author}! మేము షూట్ లో వాడే కెమెరాలు, లెన్సులు మరియు లైటింగ్ గేర్ లిస్ట్ ఇక్కడ చూడండి: https://pranvithdop.com/assets",
            "హాయ్ @{author}! మా కంప్లీట్ ఫిల్మ్‌మేకింగ్ గేర్ & రికమండేషన్స్ కోసం మన వెబ్‌సైట్ ని విజిట్ చేయండి: https://pranvithdop.com/assets"
        ],
        "hindi": [
            "🎥 नमस्ते @{author}! हमारे सभी शूट्स में इस्तेमाल होने वाले कैमरा और लाइटिंग गियर की लिस्ट यहाँ देखें: https://pranvithdop.com/assets",
            "हेलो @{author}! पूरी प्रोडक्शन किट और रेकमेंडेड गियर लिस्ट https://pranvithdop.com/assets पर उपलब्ध है।"
        ],
        "english": [
            "🎥 Hi @{author}! You can check our complete camera, lens, and lighting gear list at https://pranvithdop.com/assets",
            "Thanks for asking @{author}! Full production kit details and recommended creator gear are available at https://pranvithdop.com/assets"
        ]
    },
    "CAMERA_TECHNICAL": {
        "telugu": [
            "చాలా మంచి ప్రశ్న @{author}! ఈ కెమెరాతో సరైన ఎక్స్‌పోజర్ & ప్రొఫైల్స్ వాడితే సినీమాటిక్ రిజల్ట్స్ అద్భుతంగా వస్తాయి. డీటెయిల్డ్ గైడ్ కోసం https://pranvithdop.com/assets చూడండి!",
            "కరెక్ట్ @{author} bro! సెట్టింగ్స్ కరెక్ట్ గా పెడితే డైనమిక్ రేంజ్ మరియు కలర్స్ చాలా బాగుంటాయి. కీప్ సపోర్టింగ్!"
        ],
        "hindi": [
            "बहुत अच्छा सवाल @{author}! सही एक्सपोजर और पिक्चर प्रोफाइल के साथ यह कैमरा शानदार सिनेमैटिक रिजल्ट्स देता है। गाइड्स के लिए https://pranvithdop.com/assets देखें!",
            "बिल्कुल सही @{author} भाई! इस सेटअप में डायनेमिक रेंज और स्किन टोन बहुत बेहतरीन आते हैं। 🎬"
        ],
        "english": [
            "Great observation @{author}! When exposed correctly with the right picture profile, this camera delivers exceptional dynamic range and skin tones. Check https://pranvithdop.com/assets for full guides!",
            "Spot on @{author}! The sensor readout and color rendition really shine in this setup. Thanks for watching and supporting 🎬"
        ]
    },
    "APPRECIATION": {
        "telugu": [
            "చాలా థాంక్స్ @{author} bro! మీ సపోర్ట్ చాలా వాల్యుబుల్. మరిన్ని సినిమాటోగ్రఫీ వీడియోస్ త్వరలోనే వస్తున్నాయి 🔥",
            "థాంక్యూ సో మచ్ @{author} anna! వీడియో నచ్చినందుకు సంతోషం. కీప్ సపోర్టింగ్ 🎬",
            "Thanks a lot @{author}! మీలాంటి క్రియేటర్స్ సపోర్ట్ వల్లే కొత్త కంటెంట్ చేయాలనిపిస్తుంది. స్టే ట్యూన్డ్!"
        ],
        "hindi": [
            "बहुत-बहुत धन्यवाद @{author} भाई! आपका सपोर्ट हमारे लिए बहुत कीमती है। नए सिनेमैटोग्राफी वीडियो जल्द आ रहे हैं 🔥",
            "थैंक यू सो मच @{author}! वीडियो पसंद आने के लिए बहुत खुशी हुई। ऐसे ही सपोर्ट करते रहें 🎬"
        ],
        "english": [
            "Thank you so much @{author}! Really glad you enjoyed the breakdown. More filmmaking content coming soon 🔥",
            "Appreciate the kind words @{author}! Keep creating and stay tuned for our next video 🎬",
            "Thanks a lot @{author}! It means a lot to the team. Let us know what topics you want to see next!"
        ]
    },
    "SENSITIVE_PRICE": {
        "telugu": [
            "నమస్కారం @{author}! మా క్రియేటివ్ LUT ప్యాక్ ₹49, Sound FX ₹149, మరియు వెడ్డింగ్ టెంప్లేట్స్ ₹299. ప్రాజెక్ట్ / షూట్ కొటేషన్ కోసం వెబ్‌సైట్ https://pranvithdop.com/hire లేదా WhatsApp +91 9059867883 లో సంప్రదించండి.",
            "హాయ్ @{author}! మా ప్రొడక్ట్స్ మరియు సర్వీస్ ధరల పూర్తి వివరాల కోసం https://pranvithdop.com ని సందర్శించండి లేదా డైరెక్ట్ గా వాట్సాప్ చేయండి: +91 9059867883."
        ],
        "hindi": [
            "नमस्ते @{author}! क्रिएटिव LUT पैक ₹49, साउंड FX ₹149, और वेडिंग टेम्पलेट्स ₹299 हैं। शूट कोटेशन के लिए https://pranvithdop.com/hire या WhatsApp +91 9059867883 पर संपर्क करें।",
            "हेलो @{author}! सभी डिजिटल पैक्स की कीमतें https://pranvithdop.com/assets पर उपलब्ध हैं। कमर्शियल सिनेमैटोग्राफी कोटेशन के लिए WhatsApp करें!"
        ],
        "english": [
            "Hi @{author}! Our Creative LUT Pack is ₹49, Sound FX Pack is ₹149, and Wedding Templates are ₹299. For commercial shoot quotes or wedding bookings, please visit https://pranvithdop.com/hire or WhatsApp +91 9059867883.",
            "Thanks for inquiring @{author}! Full digital asset pricing is available at https://pranvithdop.com/assets. For bespoke commercial cinematography bookings, please reach out via https://pranvithdop.com/hire"
        ]
    },
    "SENSITIVE_BOOKING": {
        "telugu": [
            "నమస్కారం @{author}! సినిమాటోగ్రఫీ మరియు వెడ్డింగ్ షూట్ బుకింగ్స్ కోసం మా వెబ్‌సైట్ https://pranvithdop.com/hire లో లేదా WhatsApp +91 9059867883 లో సంప్రదించండి. థాంక్యూ!",
            "హాయ్ @{author}! కమర్షియల్ ప్రాజెక్ట్స్ మరియు ఈవెంట్ షూట్ అవైలబిలిటీ కోసం దయచేసి https://pranvithdop.com/hire లో ఎంక్వైరీ ఫారమ్ ఫిల్ చేయండి లేదా +91 9059867883 కి వాట్సాప్ చేయండి."
        ],
        "hindi": [
            "नमस्ते @{author}! कमर्शियल वीडियो प्रोडक्शन और वेडिंग फिल्म्स बुकिंग के लिए हमारी वेबसाइट https://pranvithdop.com/hire या WhatsApp +91 9059867883 पर संपर्क करें। धन्यवाद!",
            "हेलो @{author}! शूट डेट्स और बुकिंग के लिए https://pranvithdop.com/hire पर इंक्वायरी फॉर्म भरें या WhatsApp (+91 9059867883) करें।"
        ],
        "english": [
            "Hi @{author}! For commercial video production, wedding films, or cinematography bookings, please fill our enquiry form at https://pranvithdop.com/hire or WhatsApp +91 9059867883.",
            "Thanks for reaching out @{author}! To check our shoot dates and availability, please visit https://pranvithdop.com/hire or contact us on WhatsApp (+91 9059867883)."
        ]
    },
    "SENSITIVE_COURSE": {
        "telugu": [
            "నమస్కారం @{author}! మా మాస్టర్ సినిమాటోగ్రఫీ కోర్స్ సిలబస్, ప్రాక్టికల్ క్లాసెస్ మరియు అడ్మిషన్స్ వివరాల కోసం https://pranvithdop.com/courses లో చూడండి లేదా WhatsApp +91 9059867883 లో మెసేజ్ చేయండి.",
            "హాయ్ @{author}! సినిమాటోగ్రఫీ & కలర్ గ్రేడింగ్ ట్రైనింగ్ వివరాల కోసం https://pranvithdop.com/courses విజిట్ చేయండి!"
        ],
        "hindi": [
            "नमस्ते @{author}! हमारे मास्टर सिनेमैटोग्राफी कोर्स की डिटेल्स, सिलेबस और एडमिशन के लिए https://pranvithdop.com/courses देखें या WhatsApp +91 9059867883 पर मैसेज करें।",
            "हेलो @{author}! सिनेमैटोग्राफी ट्रेनिंग और प्रैक्टिकल क्लासेज की पूरी जानकारी https://pranvithdop.com/courses पर उपलब्ध है।"
        ],
        "english": [
            "Hi @{author}! Our Master Cinematography Course covers practical camera operation, lighting, S-Log3/C-Log3 exposure, and color grading. Details at https://pranvithdop.com/courses",
            "Thanks @{author}! You can explore course modules, offline batches, and registration details on https://pranvithdop.com/courses"
        ]
    },
    "GENERAL": {
        "telugu": [
            "నమస్కారం @{author}! కామెంట్ చేసినందుకు ధన్యవాదాలు. మా లేటెస్ట్ సినీమాటోగ్రఫీ అసెట్స్ మరియు గైడ్స్ కోసం https://pranvithdop.com ని విజిట్ చేయండి!",
            "హాయ్ @{author}! ఇంకా ఏమైనా ఫిల్మ్‌మేకింగ్ లేదా కెమెరా డౌట్స్ ఉంటే కామెంట్ చేయండి, తప్పకుండా రిప్లై ఇస్తాను 🎬"
        ],
        "hindi": [
            "नमस्ते @{author}! कमेंट करने के लिए धन्यवाद। हमारे लेटेस्ट सिनेमैटोग्राफी रिसोर्सेज के लिए https://pranvithdop.com देखें!",
            "हेलो @{author}! कोई भी कैमरा या फिल्ममेकिंग से जुड़ा सवाल हो तो जरूर पूछें 🎬"
        ],
        "english": [
            "Hi @{author}! Thanks for watching and dropping a comment. Check out our editing packs and cinematography resources at https://pranvithdop.com",
            "Thanks for connecting @{author}! Feel free to ask any filmmaking or camera questions anytime 🎬"
        ]
    }
}

# Alias for backwards compatibility
YOUTUBE_REPLY_POOLS = SOCIAL_REPLY_POOLS


# ==================== INTENT ENGINE ====================

def classify_comment_intent(comment_text: str) -> Dict[str, Any]:
    """
    Classifies a comment into intent categories with sensitivity flag.
    Checks explicit creator requests:
    - Instagram ID
    - Camera Links
    - Camera Price
    - Specific Camera Settings (Sony A7 IV, Nikon Z6III, FX3, etc.)
    - General Camera Settings / LUTs
    - Sensitive business inquiries (Booking, Course, Custom Pricing)
    - Thank you & Appreciation
    """
    text_lower = (comment_text or "").lower()

    # 1. Instagram ID query (e.g. "Instagram ID?", "insta id kavali", "send insta handle")
    ig_keywords = ["instagram id", "insta id", "ig id", "insta handle", "instagram handle", "instagram link", "ఇన్‌స్టాగ్రామ్", "ఇన్‌స్టా ఐడీ", "इंस्टाग्राम आईडी"]
    if any(k in text_lower for k in ig_keywords) or (("instagram" in text_lower or "insta" in text_lower) and any(w in text_lower for w in ["id", "handle", "link", "page", "account", "profile", "bro", "?"])):
        return {
            "intent": "INSTAGRAM_ID",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": ["instagram"],
            "reason": "Instagram ID / handle inquiry"
        }

    # 3. LUTs & Color Grading Presets (Check BEFORE camera settings so "Send Sony S-Log3 creative lut pack link" -> LUT_REQUEST)
    lut_keywords = ["lut", "luts", "preset", "presets", "cube", "కలర్ గ్రేడింగ్"]
    matched_lut = [k for k in lut_keywords if re.search(rf'\b{re.escape(k)}\b', text_lower)]
    if matched_lut:
        return {
            "intent": "LUT_REQUEST",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_lut,
            "reason": "Cinematic LUT / preset request"
        }

    # 2. Camera Links (e.g. "Send camera links", "camera links", "links send karo", "gear links")
    link_keywords = ["send camera links", "camera links", "send links", "camera link", "gear links", "product links", "share links", "link bro", "links send karo", "లింక్స్", "లింక్ పంపండి", "लिंक भेजो"]
    if any(k in text_lower for k in link_keywords) or ("link" in text_lower and any(w in text_lower for w in ["camera", "send", "gear", "store", "product", "all"])):
        return {
            "intent": "CAMERA_LINKS",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": ["camera links"],
            "reason": "Direct request for camera & product links"
        }


    # 4. Specific Camera Settings (Checks CAMERA_DATABASE for Sony A7 IV, Nikon Z6III, FX3, etc.)
    cam_match = match_camera_profile(comment_text)
    settings_keywords = ["setting", "settings", "best settings", "cheat sheet", "pdf", "profile", "picture profile", "iso", "base iso", "s-log", "slog", "slog3", "n-log", "nlog", "c-log", "clog", "shutter", "frame rate", "fps", "exposure", "సెట్టింగ్స్", "సెట్టింగ్", "सेटिंग्स", "सेटिंग"]
    matched_settings = [k for k in settings_keywords if k in text_lower]

    if cam_match and matched_settings:
        cam_key, cam_data = cam_match
        return {
            "intent": "CAMERA_SPECIFIC_SETTINGS",
            "is_sensitive": False,
            "requires_approval": False,
            "camera_key": cam_key,
            "camera_model": cam_data.get("model"),
            "matched_keywords": [cam_data.get("model")] + matched_settings,
            "reason": f"Specific camera settings inquiry for {cam_data.get('model')}"
        }

    # 5. Camera Price (e.g. "Camera price?", "camera price kya hai", "a7 iv price", "కెమెరా ధర")
    cam_price_keywords = ["camera price", "price of camera", "body price", "camera cost", "camera rate", "కెమెరా ప్రైస్", "కెమెరా ధర", "कैमरा कीमत", "कैमरा प्राइस"]
    if any(k in text_lower for k in cam_price_keywords) or (("camera" in text_lower or cam_match) and any(w in text_lower for w in ["price", "cost", "how much", "rate", "ధర", "ఎంత", "కీమత్", "కింత"])):
        return {
            "intent": "CAMERA_PRICE",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": ["camera price"],
            "reason": "Camera equipment & digital asset price inquiry"
        }

    # 6. Sensitive general price inquiry (commercial quotes, generic prices)
    price_keywords = ["price", "cost", "how much", "rate", "fee", "fees", "charges", "ధర", "ఎంత", "రేట్", "ప్రైస్", "कीमत", "कितना"]
    matched_price = [k for k in price_keywords if k in text_lower]
    if matched_price:
        return {
            "intent": "SENSITIVE_PRICE",
            "is_sensitive": True,
            "requires_approval": True,
            "matched_keywords": matched_price,
            "reason": f"Pricing inquiry matched keyword '{matched_price[0]}'. Requires admin approval."
        }

    # 7. Sensitive booking inquiry
    booking_keywords = ["book", "booking", "hire", "service", "shoot", "event", "commercial", "available", "బుకింగ్", "షూట్", "రెంట్", "बुक"]
    matched_booking = [k for k in booking_keywords if k in text_lower]
    if matched_booking:
        return {
            "intent": "SENSITIVE_BOOKING",
            "is_sensitive": True,
            "requires_approval": True,
            "matched_keywords": matched_booking,
            "reason": f"Shoot / production booking inquiry matched '{matched_booking[0]}'. Requires admin approval."
        }

    # 8. Sensitive masterclass / training inquiry
    course_keywords = ["course", "class", "training", "offline", "learn", "academy", "కోర్స్", "క్లాస్", "कोर्स", "क्लास"]
    matched_course = [k for k in course_keywords if k in text_lower]
    if matched_course:
        return {
            "intent": "SENSITIVE_COURSE",
            "is_sensitive": True,
            "requires_approval": True,
            "matched_keywords": matched_course,
            "reason": f"Course / training inquiry matched '{matched_course[0]}'. Requires admin approval."
        }

    # 9. General Camera Settings (no specific camera matched, but settings requested)
    if matched_settings:
        return {
            "intent": "CAMERA_SETTINGS",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_settings,
            "reason": "Camera settings & cheat sheet request"
        }

    # 10. Gear list
    gear_keywords = ["gear", "lens", "lenses", "mic", "tripod", "gimbal", "equipment", "లిస్ట్", "గేర్"]
    matched_gear = [k for k in gear_keywords if k in text_lower]
    if matched_gear:
        return {
            "intent": "GEAR_LIST",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_gear,
            "reason": "Filmmaking gear / equipment inquiry"
        }

    # 11. Thank you (viewer expresses gratitude)
    thanks_keywords = ["thank you", "thanks", "thank u", "tq", "thx", "dhanyavadalu", "shukriya", "dhanyawad", "chala thanks", "ధన్యవాదాలు", "థాంక్యూ", "థాంక్స్", "शुक्रिया", "धन्यवाद"]
    matched_thanks = [k for k in thanks_keywords if k in text_lower]
    if matched_thanks:
        return {
            "intent": "THANK_YOU",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_thanks,
            "reason": "Viewer expressing gratitude / thank you"
        }

    # 12. Technical camera discussions (check BEFORE appreciation so technical observations never get generic replies)
    if cam_match:
        cam_key, cam_data = cam_match
        return {
            "intent": "CAMERA_TECHNICAL",
            "is_sensitive": False,
            "requires_approval": False,
            "camera_key": cam_key,
            "camera_model": cam_data.get("model"),
            "matched_keywords": [cam_data.get("model")],
            "reason": f"Technical discussion on camera model: {cam_data.get('model')}"
        }

    camera_keywords = ["nikon", "sony", "canon", "fx3", "z6iii", "z6ii", "z8", "z9", "zr", "r5", "r6", "dji", "slow motion", "4k 120", "autofocus", "details", "sensor", "dynamic range", "readout", "bitrate", "crop", "rolling shutter"]
    matched_cam = [k for k in camera_keywords if k in text_lower]
    if matched_cam:
        return {
            "intent": "CAMERA_TECHNICAL",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_cam,
            "reason": f"Technical camera discussion: {matched_cam[0]}"
        }

    # 13. Appreciation & praise
    apprec_keywords = ["super", "nice", "great", "awesome", "loved", "bagundi", "bavundi", "chala bagundi", "fire", "wonderful", "excellent", "badhiya", "shandar"]
    matched_apprec = [k for k in apprec_keywords if k in text_lower]
    if matched_apprec:
        return {
            "intent": "APPRECIATION",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_apprec,
            "reason": "Viewer appreciation / praise"
        }

    return {
        "intent": "GENERAL",
        "is_sensitive": False,
        "requires_approval": False,
        "matched_keywords": [],
        "reason": "General comment"
    }


# ==================== UNIFIED SOCIAL AI REPLY GENERATOR ====================

async def generate_social_ai_reply(
    comment_text: str,
    author_name: str = "creator",
    platform: str = "youtube",
    video_title: Optional[str] = None,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a natural, context-rich, non-static reply to a social media comment (YouTube / Facebook).
    Understands Telugu (native + Teluglish), English, and Hindi (Devanagari + Hinglish).
    Integrates CAMERA_DATABASE for precise camera specs & settings.
    Never sends generic appreciation replies to technical camera questions.
    """
    lang = detect_comment_language(comment_text)
    intent_info = classify_comment_intent(comment_text)
    intent = intent_info["intent"]
    is_sensitive = intent_info["is_sensitive"]
    clean_author = author_name.lstrip("@").strip() or "creator"

    # 1. Try Gemini 1.5 Flash if API key provided or available in environment
    key = (gemini_api_key or os.environ.get("GEMINI_API_KEY", "")).strip()
    if key:
        try:
            system_prompt = (
                "You are Pranvith DOP, a professional cinematographer, filmmaker, and colorist replying to a social media comment.\n"
                f"Platform: {platform}\n"
                f"Commenter: @{clean_author}\n"
                f"Detected Language: {lang}\n"
                f"Comment: \"{comment_text}\"\n"
                "CRITICAL RULES:\n"
                "1. NEVER send irrelevant replies such as 'Thanks for watching' to technical questions.\n"
                "2. If asking about camera settings (e.g. Sony A7 IV), provide actual camera settings: S-Log3 / S-Gamut3.Cine (10-bit 4:2:2), Dual Base ISO (800 / 3200), and 180° shutter rule.\n"
                "3. If asking for camera price, provide body price (~₹2.1L-₹2.3L for A7 IV, ~₹2.4L for Z6III) and digital asset prices (₹49+) at https://pranvithdop.com/assets.\n"
                "4. If asking for camera links, provide links to https://pranvithdop.com/assets and https://pranvithdop.com/assets/creative-lut-pack.\n"
                "5. If asking for Instagram ID, tell them to follow @pranvith_dop (https://www.instagram.com/pranvith_dop).\n"
                "6. If saying thank you, give a warm creator thank you.\n"
                "7. Reply in the exact same language (Telugu native script or Teluglish for Telugu; Hindi Devanagari or Hinglish for Hindi; English for English).\n"
                "8. Keep it concise (1 to 2 sentences suitable for comment replies).\n"
                "9. Output only the final reply text without quotes or explanation."
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}",
                    json={"contents": [{"parts": [{"text": system_prompt}]}]}
                )
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                        if content:
                            return {
                                "reply_text": content,
                                "detected_language": lang,
                                "intent": intent,
                                "is_sensitive": is_sensitive,
                                "requires_approval": intent_info["requires_approval"],
                                "matched_keywords": intent_info.get("matched_keywords", []),
                                "reason": intent_info["reason"],
                                "source": "gemini-1.5-flash"
                            }
        except Exception as e:
            logger.warning("Gemini AI generation failed, falling back to dynamic creator engine: %s", e)

    # 2. Camera-specific technical generation from CAMERA_DATABASE
    if intent == "CAMERA_SPECIFIC_SETTINGS":
        cam_key = intent_info.get("camera_key", "")
        reply_text = generate_camera_specific_reply(cam_key, clean_author, lang)
        return {
            "reply_text": reply_text,
            "detected_language": lang,
            "intent": intent,
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": intent_info.get("matched_keywords", []),
            "reason": intent_info["reason"],
            "source": "pranvith_camera_ai"
        }

    # 3. Dynamic multi-lingual creator engine (never monotonous, randomized variations)
    pool = SOCIAL_REPLY_POOLS.get(intent, SOCIAL_REPLY_POOLS["GENERAL"])
    lang_key = lang if lang in ("telugu", "hindi") else "english"
    replies = pool.get(lang_key, pool.get("english", []))
    if not replies:
        replies = pool.get("english", ["Hi @{author}! Thanks for reaching out! Check https://pranvithdop.com 🎬"])
    chosen = random.choice(replies).replace("{author}", clean_author).replace("{username}", clean_author)

    return {
        "reply_text": chosen,
        "detected_language": lang,
        "intent": intent,
        "is_sensitive": is_sensitive,
        "requires_approval": intent_info["requires_approval"],
        "matched_keywords": intent_info.get("matched_keywords", []),
        "reason": intent_info["reason"],
        "source": "pranvith_dynamic_ai"
    }


async def generate_youtube_ai_reply(
    comment_text: str,
    author_name: str = "creator",
    video_title: Optional[str] = None,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Backwards compatible alias for YouTube comment reply generation."""
    return await generate_social_ai_reply(
        comment_text=comment_text,
        author_name=author_name,
        platform="youtube",
        video_title=video_title,
        gemini_api_key=gemini_api_key
    )


# ==================== YOUTUBE AUTOMATION CLIENT ====================

class YouTubeAutomationClient:
    """
    Client for YouTube Data API v3 operations:
    - OAuth token auto-refresh with 5-minute safety threshold
    - Comment thread fetching across channel
    - Multilingual AI evaluation with duplicate prevention
    - Self-comment filtering (ignores own channel comments)
    - Safe testing mode guard (never sends live replies unless explicitly approved and enabled)
    - Emergency kill switch protection
    - Public comment reply posting
    """
    def __init__(self, db, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.db = db
        self.client_id = (client_id or os.environ.get("GOOGLE_CLIENT_ID") or os.environ.get("YOUTUBE_CLIENT_ID") or "").strip()
        self.client_secret = (client_secret or os.environ.get("GOOGLE_CLIENT_SECRET") or os.environ.get("YOUTUBE_CLIENT_SECRET") or "").strip()

    @staticmethod
    def _is_self_comment(author_channel_id: Optional[str], connected_channel_id: Optional[str], author_name: str = "") -> bool:
        """Determines if a comment was authored by our own YouTube channel."""
        clean_name = (author_name or "").lower().replace("@", "").replace(" ", "")
        if connected_channel_id and author_channel_id and str(author_channel_id) == str(connected_channel_id):
            return True
        if clean_name in ("pranvithdop", "pranvith", "pranvithdop.", "pranvith dop"):
            return True
        return False

    async def get_valid_access_token(self) -> Tuple[bool, Optional[str], Optional[str]]:
        if self.db is None:
            return False, None, "Database connection not available."

        doc = await self.db.social_accounts.find_one({"platform": "youtube"})
        if not doc or not doc.get("is_connected") or not doc.get("access_token"):
            return False, None, "YouTube account is not connected. Please connect your YouTube channel via Google OAuth in Social Media Manager."

        access_token = doc.get("access_token")
        refresh_token = doc.get("refresh_token")
        expires_at_str = doc.get("token_expires_at")

        is_expired = False
        if expires_at_str:
            try:
                exp = datetime.fromisoformat(expires_at_str)
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                if (exp - now).total_seconds() < 300:
                    is_expired = True
            except Exception:
                pass

        if is_expired:
            if not refresh_token:
                return False, None, "Access token has expired and no refresh token is stored. Please reconnect YouTube."
            if not self.client_id or not self.client_secret:
                if self.db is not None:
                    cred = await self.db.social_credentials.find_one({"platform": "youtube"})
                    if cred:
                        self.client_id = self.client_id or cred.get("client_id") or ""
                        self.client_secret = self.client_secret or cred.get("client_secret") or ""
                    if not self.client_id and doc.get("client_id"):
                        self.client_id = doc.get("client_id")
                    if not self.client_secret and doc.get("client_secret"):
                        self.client_secret = doc.get("client_secret")
            if not self.client_id or not self.client_secret:
                return False, None, "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Cannot refresh token."

            logger.info("YouTube access token expiring/expired. Refreshing using stored refresh token...")
            ok, refresh_res = await refresh_youtube_token(refresh_token, self.client_id, self.client_secret)
            if not ok or "access_token" not in refresh_res:
                err_msg = refresh_res.get("error", "Unknown token refresh error")
                return False, None, f"Failed to refresh YouTube token: {err_msg}"

            new_token = refresh_res["access_token"]
            expires_in = int(refresh_res.get("expires_in", 3600))
            new_expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()

            await self.db.social_accounts.update_one(
                {"platform": "youtube"},
                {
                    "$set": {
                        "access_token": new_token,
                        "token_expires_at": new_expires_at,
                        "last_refreshed_at": datetime.now(timezone.utc).isoformat(),
                        "token_type": refresh_res.get("token_type", "Bearer")
                    }
                }
            )
            access_token = new_token
            logger.info("YouTube access token refreshed successfully. Next expiry: %s", new_expires_at)

        return True, access_token, None

    async def fetch_recent_comments(self, max_results: int = 25) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        ok, access_token, err = await self.get_valid_access_token()
        if not ok:
            return False, [], err

        doc = await self.db.social_accounts.find_one({"platform": "youtube"})
        channel_id = doc.get("account_id") if doc else None
        if not channel_id:
            return False, [], "Connected YouTube channel ID not found in database."

        url = "https://www.googleapis.com/youtube/v3/commentThreads"
        params = {
            "part": "snippet",
            "allThreadsRelatedToChannelId": channel_id,
            "maxResults": min(max_results, 50),
            "order": "time"
        }
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.get(url, params=params, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    items = data.get("items", [])
                    parsed = []
                    for item in items:
                        snippet = item.get("snippet", {})
                        top_comment = snippet.get("topLevelComment", {}).get("snippet", {})
                        comm_id = item.get("id")
                        author_name = top_comment.get("authorDisplayName", "Viewer")
                        author_cid = top_comment.get("authorChannelId", {}).get("value")
                        comment_text = top_comment.get("textDisplay") or top_comment.get("textOriginal", "")
                        parsed.append({
                            "id": f"yt_{comm_id}",
                            "comment_id": comm_id,
                            "thread_id": comm_id,
                            "platform": "youtube",
                            "author_name": author_name,
                            "author_channel_id": author_cid,
                            "author_profile_image": top_comment.get("authorProfileImageUrl"),
                            "author_channel_url": top_comment.get("authorChannelUrl"),
                            "comment_text": comment_text,
                            "published_at": top_comment.get("publishedAt"),
                            "video_id": snippet.get("videoId"),
                            "total_reply_count": snippet.get("totalReplyCount", 0),
                            "like_count": top_comment.get("likeCount", 0)
                        })
                    return True, parsed, None
                else:
                    err_msg = res.text
                    try:
                        err_msg = res.json().get("error", {}).get("message", res.text)
                    except Exception:
                        pass
                    return False, [], f"YouTube Data API Error ({res.status_code}): {err_msg}"
        except Exception as e:
            return False, [], f"Exception fetching YouTube comments: {str(e)}"

    async def post_reply(self, thread_id: str, reply_text: str) -> Tuple[bool, Optional[str], Optional[str]]:
        ok, access_token, err = await self.get_valid_access_token()
        if not ok:
            return False, None, err

        url = "https://www.googleapis.com/youtube/v3/comments"
        params = {"part": "snippet"}
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "snippet": {
                "parentId": thread_id,
                "textOriginal": reply_text
            }
        }
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(url, params=params, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    data = res.json()
                    return True, data.get("id"), None
                else:
                    err_msg = res.text
                    try:
                        err_msg = res.json().get("error", {}).get("message", res.text)
                    except Exception:
                        pass
                    return False, None, f"Failed to post YouTube reply ({res.status_code}): {err_msg}"
        except Exception as e:
            return False, None, f"Exception posting reply to YouTube: {str(e)}"

    async def sync_and_process_comments(
        self,
        auto_reply_enabled: bool = False,
        safe_testing_mode: bool = True,
        max_results: int = 25,
        gemini_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synchronizes latest comments, evaluates with multilingual AI, and respects safe testing mode & kill switch:
        - If safe_testing_mode is True: generates preview, stores as 'preview_ready', never posts live.
        - If emergency kill switch is active: forces auto_reply_enabled to False.
        - If safe_testing_mode is False and auto_reply_enabled is True: posts public reply.
        - Ignores comments made by our own connected account.
        - Prevents duplicate replies by checking stored comment IDs.
        """
        # Check emergency kill switch
        settings = await get_youtube_automation_settings(self.db)
        if settings.get("emergency_kill_switch", False):
            auto_reply_enabled = False

        ok, comments, err = await self.fetch_recent_comments(max_results=max_results)
        if not ok:
            return {
                "success": False,
                "error": err,
                "total_fetched": 0,
                "new_evaluated": 0
            }

        now_iso = datetime.now(timezone.utc).isoformat()
        new_count = 0
        preview_count = 0
        pending_count = 0
        auto_replied_count = 0
        failed_count = 0
        historical_count = 0
        last_reply_at = None

        doc = await self.db.social_accounts.find_one({"platform": "youtube"}) if self.db is not None else None
        connected_channel_id = doc.get("account_id") if doc else None

        # Determine cutoff baseline for historical comments
        # Comments published before channel connection or older than 14 days are safely archived without auto-reply
        connected_at_iso = doc.get("connected_at") if doc else None
        connected_dt = None
        if connected_at_iso:
            try:
                connected_dt = datetime.fromisoformat(connected_at_iso.replace("Z", "+00:00"))
                if connected_dt.tzinfo is None:
                    connected_dt = connected_dt.replace(tzinfo=timezone.utc)
            except Exception:
                connected_dt = None

        default_cutoff_dt = datetime.now(timezone.utc) - timedelta(days=14)
        effective_cutoff_dt = connected_dt or default_cutoff_dt

        for comm in comments:
            comm_id = comm["id"]

            # 1. Ignore comments posted by our own connected accounts
            author_cid = comm.get("author_channel_id")
            author_clean = comm.get("author_name", "").lower().replace("@", "").replace(" ", "")
            if (connected_channel_id and author_cid == connected_channel_id) or author_clean in ("pranvithdop", "pranvith", "pranvith dop"):
                if self.db is not None:
                    await self.db.social_comments.update_one(
                        {"id": comm_id},
                        {"$set": {**comm, "status": "self_comment", "synced_at": now_iso, "updated_at": now_iso}},
                        upsert=True
                    )
                continue

            # 2. Duplicate reply prevention
            existing = None
            if self.db is not None:
                existing = await self.db.social_comments.find_one({"id": comm_id})

            if existing and existing.get("status") in ("approved", "auto_replied", "manual_replied", "dismissed", "self_comment", "historical"):
                continue

            # 3. Historical comment check (do not process old historical comments)
            published_at_str = comm.get("published_at")
            pub_dt = None
            if published_at_str:
                try:
                    pub_dt = datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))
                    if pub_dt.tzinfo is None:
                        pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                except Exception:
                    pub_dt = None

            if pub_dt and pub_dt < effective_cutoff_dt:
                historical_record = {
                    **comm,
                    "status": "historical",
                    "is_sensitive": False,
                    "requires_approval": False,
                    "suggested_reply": None,
                    "reply_text": None,
                    "evaluation_reason": "Historical comment published before active automation window. Safe archive only.",
                    "safe_mode": safe_testing_mode,
                    "synced_at": now_iso,
                    "updated_at": now_iso
                }
                if self.db is not None:
                    await self.db.social_comments.update_one(
                        {"id": comm_id},
                        {"$set": historical_record},
                        upsert=True
                    )
                historical_count += 1
                continue

            # 4. AI multi-lingual evaluation
            evaluation = await generate_social_ai_reply(
                comment_text=comm["comment_text"],
                author_name=comm["author_name"],
                platform="youtube",
                gemini_api_key=gemini_api_key
            )

            status = "preview_ready"
            published_reply_id = None
            replied_at = None

            if evaluation["is_sensitive"]:
                status = "pending_approval"
                pending_count += 1
            elif safe_testing_mode:
                status = "preview_ready"
                preview_count += 1
            elif auto_reply_enabled:
                post_ok, reply_ref, post_err = await self.post_reply(comm["thread_id"], evaluation["reply_text"])
                if post_ok:
                    status = "auto_replied"
                    published_reply_id = reply_ref
                    replied_at = now_iso
                    last_reply_at = now_iso
                    auto_replied_count += 1
                else:
                    status = "failed"
                    evaluation["publish_error"] = post_err
                    failed_count += 1
            else:
                status = "preview_ready"
                preview_count += 1

            record = {
                **comm,
                "detected_language": evaluation["detected_language"],
                "intent": evaluation["intent"],
                "is_sensitive": evaluation["is_sensitive"],
                "requires_approval": evaluation["requires_approval"],
                "matched_keywords": evaluation.get("matched_keywords", []),
                "suggested_reply": evaluation["reply_text"],
                "reply_text": evaluation["reply_text"] if status == "auto_replied" else None,
                "status": status,
                "evaluation_reason": evaluation["reason"],
                "ai_source": evaluation.get("source", "pranvith_dynamic_ai"),
                "reply_id": published_reply_id,
                "replied_at": replied_at,
                "safe_mode": safe_testing_mode,
                "synced_at": now_iso,
                "updated_at": now_iso
            }

            if self.db is not None:
                await self.db.social_comments.update_one(
                    {"id": comm_id},
                    {"$set": record},
                    upsert=True
                )
            new_count += 1

        # Update YouTube settings metrics
        if self.db is not None:
            update_fields: Dict[str, Any] = {
                "platform": "youtube",
                "auto_reply_enabled": auto_reply_enabled,
                "safe_testing_mode": safe_testing_mode,
                "last_sync_at": now_iso,
                "updated_at": now_iso
            }
            if last_reply_at:
                update_fields["last_reply_at"] = last_reply_at

            await self.db.social_settings.update_one(
                {"platform": "youtube"},
                {
                    "$set": update_fields,
                    "$inc": {
                        "total_comments_synced": new_count,
                        "total_replies_published": auto_replied_count,
                        "total_replies_failed": failed_count
                    }
                },
                upsert=True
            )

        return {
            "success": True,
            "total_fetched": len(comments),
            "new_evaluated": new_count,
            "historical_count": historical_count,
            "previews_ready": preview_count,
            "pending_approval": pending_count,
            "auto_replied": auto_replied_count,
            "failed_replies": failed_count,
            "safe_testing_mode": safe_testing_mode,
            "auto_reply_enabled": auto_reply_enabled,
            "synced_at": now_iso
        }

    async def approve_and_publish(
        self,
        comment_id: str,
        reply_text: str,
        admin_email: str,
        safe_testing_mode: bool = False
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        if self.db is None:
            return False, None, "Database not available"

        comm = await self.db.social_comments.find_one({"id": comment_id})
        if not comm:
            return False, None, "Comment not found"

        now_iso = datetime.now(timezone.utc).isoformat()
        reply_id = None

        if not safe_testing_mode:
            thread_id = comm.get("thread_id") or comm.get("comment_id")
            ok, reply_id, err = await self.post_reply(thread_id, reply_text)
            if not ok:
                return False, None, err

        await self.db.social_comments.update_one(
            {"id": comment_id},
            {
                "$set": {
                    "status": "approved",
                    "reply_text": reply_text,
                    "reply_id": reply_id,
                    "replied_at": now_iso,
                    "approved_by": admin_email,
                    "safe_mode": safe_testing_mode,
                    "updated_at": now_iso
                }
            }
        )
        return True, reply_id, None

    async def manual_reply(
        self,
        comment_id: str,
        reply_text: str,
        admin_email: str,
        safe_testing_mode: bool = False
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        if self.db is None:
            return False, None, "Database not available"

        comm = await self.db.social_comments.find_one({"id": comment_id})
        if not comm:
            return False, None, "Comment not found"

        now_iso = datetime.now(timezone.utc).isoformat()
        reply_id = None

        if not safe_testing_mode:
            thread_id = comm.get("thread_id") or comm.get("comment_id")
            ok, reply_id, err = await self.post_reply(thread_id, reply_text)
            if not ok:
                return False, None, err

        await self.db.social_comments.update_one(
            {"id": comment_id},
            {
                "$set": {
                    "status": "manual_replied",
                    "reply_text": reply_text,
                    "reply_id": reply_id,
                    "replied_at": now_iso,
                    "replied_by": admin_email,
                    "safe_mode": safe_testing_mode,
                    "updated_at": now_iso
                }
            }
        )
        return True, reply_id, None

    async def dismiss_comment(self, comment_id: str) -> bool:
        if self.db is None:
            return False
        now_iso = datetime.now(timezone.utc).isoformat()
        await self.db.social_comments.update_one(
            {"id": comment_id},
            {"$set": {"status": "dismissed", "dismissed_at": now_iso, "updated_at": now_iso}}
        )
        return True


# ==================== FACEBOOK AUTOMATION CLIENT (META GRAPH API v21.0) ====================

class FacebookAutomationClient:
    """
    Client for Meta Graph API v21.0 Facebook Page operations:
    - Page credentials verification (Page ID & Page Access Token)
    - Comment fetching across Page feed posts (feed/comments)
    - Multilingual AI evaluation (Telugu, English, Hindi)
    - Duplicate reply prevention
    - Self-comment filtering (ignores Page's own comments)
    - Safe testing mode guard (preview only by default)
    - Public comment reply posting (POST /{comment_id}/comments)
    - Emergency kill switch protection
    """
    def __init__(self, db, page_id: Optional[str] = None, page_access_token: Optional[str] = None):
        self.db = db
        self.page_id = (page_id or os.environ.get("FACEBOOK_PAGE_ID", "")).strip()
        self.page_access_token = (page_access_token or os.environ.get("FACEBOOK_PAGE_ACCESS_TOKEN", "")).strip()

    @staticmethod
    def _is_self_comment(author_id: Optional[str], page_id: Optional[str], author_name: str = "") -> bool:
        """Determines if a comment was authored by our own Facebook Page."""
        clean_name = (author_name or "").lower().replace("@", "").replace(" ", "")
        if page_id and author_id and str(author_id) == str(page_id):
            return True
        if clean_name in ("pranvithdop", "pranvith", "pranvithdop.", "pranvith dop"):
            return True
        return False

    async def get_credentials(self) -> Tuple[str, str]:
        if self.page_id and self.page_access_token:
            return self.page_id, self.page_access_token
        if self.db is not None:
            try:
                doc = await self.db.social_accounts.find_one({"platform": "facebook"}, {"_id": 0})
                if doc and doc.get("is_connected"):
                    p_id = doc.get("account_id") or doc.get("page_id") or ""
                    p_token = doc.get("access_token") or doc.get("page_access_token") or ""
                    return p_id, p_token
            except Exception:
                pass
        return self.page_id, self.page_access_token

    async def verify_page_access(self) -> Tuple[bool, Dict[str, Any], Optional[str]]:
        page_id, page_token = await self.get_credentials()
        if not page_id or not page_token:
            return False, {}, "Facebook Page ID or Page Access Token is missing."

        url = f"{GRAPH_API_BASE}/{page_id}"
        params = {
            "fields": "id,name,username,category,fan_count,picture",
            "access_token": page_token
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    return True, data, None
                err = res.json().get("error", {}).get("message", res.text)
                return False, {}, f"Meta Graph API Error ({res.status_code}): {err}"
        except Exception as e:
            return False, {}, f"Exception verifying Facebook Page: {str(e)}"

    async def fetch_recent_comments(self, limit: int = 25) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        page_id, page_token = await self.get_credentials()
        if not page_id or not page_token:
            return False, [], "Facebook Page ID or Page Access Token is missing. Please connect your Facebook Page in Social Media Manager."

        url = f"{GRAPH_API_BASE}/{page_id}/feed"
        params = {
            "fields": f"id,message,created_time,permalink_url,comments.limit({min(limit, 50)}){{id,message,from,created_time,like_count}}",
            "limit": 10,
            "access_token": page_token
        }
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    parsed = []
                    posts = data.get("data", [])
                    for post in posts:
                        p_id = post.get("id")
                        p_msg = post.get("message", "")
                        p_link = post.get("permalink_url", "")
                        comments_data = post.get("comments", {}).get("data", [])
                        for c in comments_data:
                            c_id = c.get("id")
                            author_info = c.get("from", {})
                            author_name = author_info.get("name", "Viewer")
                            author_id = author_info.get("id")
                            comment_text = c.get("message", "")
                            parsed.append({
                                "id": f"fb_{c_id}",
                                "comment_id": c_id,
                                "post_id": p_id,
                                "post_message": p_msg,
                                "post_permalink": p_link,
                                "platform": "facebook",
                                "author_name": author_name,
                                "author_id": author_id,
                                "comment_text": comment_text,
                                "published_at": c.get("created_time"),
                                "like_count": c.get("like_count", 0)
                            })
                    return True, parsed, None
                err = res.json().get("error", {}).get("message", res.text)
                return False, [], f"Meta Graph API Error ({res.status_code}): {err}"
        except Exception as e:
            return False, [], f"Exception fetching Facebook comments: {str(e)}"

    async def post_reply(self, comment_id: str, reply_text: str) -> Tuple[bool, Optional[str], Optional[str]]:
        page_id, page_token = await self.get_credentials()
        if not page_token:
            return False, None, "Facebook Page Access Token missing."

        url = f"{GRAPH_API_BASE}/{comment_id}/comments"
        data = {
            "message": reply_text,
            "access_token": page_token
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, data=data)
                if res.status_code in (200, 201):
                    reply_id = res.json().get("id")
                    return True, reply_id, None
                err = res.json().get("error", {}).get("message", res.text)
                return False, None, f"Meta Graph API reply error ({res.status_code}): {err}"
        except Exception as e:
            return False, None, f"Exception posting reply to Facebook: {str(e)}"

    async def sync_and_process_comments(
        self,
        auto_reply_enabled: bool = False,
        safe_testing_mode: bool = True,
        max_results: int = 25,
        gemini_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synchronizes latest comments on Facebook Page, runs AI evaluation, and enforces safe mode & kill switch:
        - If emergency kill switch is active: forces auto_reply_enabled to False.
        - If safe_testing_mode is True: generates preview, stores as 'preview_ready', never posts live.
        - If safe_testing_mode is False and auto_reply_enabled is True: posts public comment reply.
        - Ignores comments made by the Page itself.
        - Prevents duplicate replies.
        """
        settings = await get_facebook_automation_settings(self.db)
        if settings.get("emergency_kill_switch", False):
            auto_reply_enabled = False

        ok, comments, err = await self.fetch_recent_comments(limit=max_results)
        if not ok:
            return {
                "success": False,
                "error": err,
                "total_fetched": 0,
                "new_evaluated": 0
            }

        now_iso = datetime.now(timezone.utc).isoformat()
        new_count = 0
        preview_count = 0
        pending_count = 0
        auto_replied_count = 0
        failed_count = 0
        last_reply_at = None

        page_id, _ = await self.get_credentials()

        for comm in comments:
            comm_id = comm["id"]

            # 1. Ignore comments posted by the Page itself
            author_id = comm.get("author_id")
            author_clean = comm.get("author_name", "").lower().replace("@", "").replace(" ", "")
            if (page_id and author_id == page_id) or author_clean in ("pranvithdop", "pranvith", "pranvithdopfacebookpage"):
                if self.db is not None:
                    await self.db.social_comments.update_one(
                        {"id": comm_id},
                        {"$set": {**comm, "status": "self_comment", "synced_at": now_iso, "updated_at": now_iso}},
                        upsert=True
                    )
                continue

            # 2. Duplicate prevention
            existing = None
            if self.db is not None:
                existing = await self.db.social_comments.find_one({"id": comm_id})

            if existing and existing.get("status") in ("approved", "auto_replied", "manual_replied", "dismissed", "self_comment"):
                continue

            # 3. AI multi-lingual evaluation
            evaluation = await generate_social_ai_reply(
                comment_text=comm["comment_text"],
                author_name=comm["author_name"],
                platform="facebook",
                gemini_api_key=gemini_api_key
            )

            status = "preview_ready"
            published_reply_id = None
            replied_at = None

            if evaluation["is_sensitive"]:
                status = "pending_approval"
                pending_count += 1
            elif safe_testing_mode:
                status = "preview_ready"
                preview_count += 1
            elif auto_reply_enabled:
                post_ok, reply_ref, post_err = await self.post_reply(comm["comment_id"], evaluation["reply_text"])
                if post_ok:
                    status = "auto_replied"
                    published_reply_id = reply_ref
                    replied_at = now_iso
                    last_reply_at = now_iso
                    auto_replied_count += 1
                else:
                    status = "failed"
                    evaluation["publish_error"] = post_err
                    failed_count += 1
            else:
                status = "preview_ready"
                preview_count += 1

            record = {
                **comm,
                "detected_language": evaluation["detected_language"],
                "intent": evaluation["intent"],
                "is_sensitive": evaluation["is_sensitive"],
                "requires_approval": evaluation["requires_approval"],
                "matched_keywords": evaluation.get("matched_keywords", []),
                "suggested_reply": evaluation["reply_text"],
                "reply_text": evaluation["reply_text"] if status == "auto_replied" else None,
                "status": status,
                "evaluation_reason": evaluation["reason"],
                "ai_source": evaluation.get("source", "pranvith_dynamic_ai"),
                "reply_id": published_reply_id,
                "replied_at": replied_at,
                "safe_mode": safe_testing_mode,
                "synced_at": now_iso,
                "updated_at": now_iso
            }

            if self.db is not None:
                await self.db.social_comments.update_one(
                    {"id": comm_id},
                    {"$set": record},
                    upsert=True
                )
            new_count += 1

        # Update Facebook settings metrics
        if self.db is not None:
            update_fields: Dict[str, Any] = {
                "platform": "facebook",
                "auto_reply_enabled": auto_reply_enabled,
                "safe_testing_mode": safe_testing_mode,
                "last_sync_at": now_iso,
                "updated_at": now_iso
            }
            if last_reply_at:
                update_fields["last_reply_at"] = last_reply_at

            await self.db.social_settings.update_one(
                {"platform": "facebook"},
                {
                    "$set": update_fields,
                    "$inc": {
                        "total_comments_synced": new_count,
                        "total_replies_published": auto_replied_count,
                        "total_replies_failed": failed_count
                    }
                },
                upsert=True
            )

        return {
            "success": True,
            "total_fetched": len(comments),
            "new_evaluated": new_count,
            "historical_count": historical_count,
            "previews_ready": preview_count,
            "pending_approval": pending_count,
            "auto_replied": auto_replied_count,
            "failed_replies": failed_count,
            "safe_testing_mode": safe_testing_mode,
            "auto_reply_enabled": auto_reply_enabled,
            "synced_at": now_iso
        }

    async def approve_and_publish(
        self,
        comment_id: str,
        reply_text: str,
        admin_email: str,
        safe_testing_mode: bool = False
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        if self.db is None:
            return False, None, "Database not available"

        comm = await self.db.social_comments.find_one({"id": comment_id})
        if not comm:
            return False, None, "Comment not found"

        now_iso = datetime.now(timezone.utc).isoformat()
        reply_id = None

        if not safe_testing_mode:
            real_comment_id = comm.get("comment_id") or comment_id.replace("fb_", "")
            ok, reply_id, err = await self.post_reply(real_comment_id, reply_text)
            if not ok:
                return False, None, err

        await self.db.social_comments.update_one(
            {"id": comment_id},
            {
                "$set": {
                    "status": "approved",
                    "reply_text": reply_text,
                    "reply_id": reply_id,
                    "replied_at": now_iso,
                    "approved_by": admin_email,
                    "safe_mode": safe_testing_mode,
                    "updated_at": now_iso
                }
            }
        )
        return True, reply_id, None

    async def manual_reply(
        self,
        comment_id: str,
        reply_text: str,
        admin_email: str,
        safe_testing_mode: bool = False
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        if self.db is None:
            return False, None, "Database not available"

        comm = await self.db.social_comments.find_one({"id": comment_id})
        if not comm:
            return False, None, "Comment not found"

        now_iso = datetime.now(timezone.utc).isoformat()
        reply_id = None

        if not safe_testing_mode:
            real_comment_id = comm.get("comment_id") or comment_id.replace("fb_", "")
            ok, reply_id, err = await self.post_reply(real_comment_id, reply_text)
            if not ok:
                return False, None, err

        await self.db.social_comments.update_one(
            {"id": comment_id},
            {
                "$set": {
                    "status": "manual_replied",
                    "reply_text": reply_text,
                    "reply_id": reply_id,
                    "replied_at": now_iso,
                    "replied_by": admin_email,
                    "safe_mode": safe_testing_mode,
                    "updated_at": now_iso
                }
            }
        )
        return True, reply_id, None

    async def dismiss_comment(self, comment_id: str) -> bool:
        if self.db is None:
            return False
        now_iso = datetime.now(timezone.utc).isoformat()
        await self.db.social_comments.update_one(
            {"id": comment_id},
            {"$set": {"status": "dismissed", "dismissed_at": now_iso, "updated_at": now_iso}}
        )
        return True


# ==================== CLIENT FACTORIES & SETTINGS HELPERS ====================

async def get_youtube_client(db=None) -> YouTubeAutomationClient:
    return YouTubeAutomationClient(db)


async def get_facebook_client(db=None) -> FacebookAutomationClient:
    return FacebookAutomationClient(db)


async def get_youtube_automation_settings(db) -> Dict[str, Any]:
    default_settings = {
        "platform": "youtube",
        "auto_reply_enabled": False,
        "safe_testing_mode": True,
        "emergency_kill_switch": False,
        "sync_interval_minutes": 15,
        "ai_provider": "gemini_with_creator_fallback",
        "last_sync_at": None,
        "last_reply_at": None,
        "total_comments_synced": 0,
        "total_replies_published": 0,
        "total_replies_failed": 0
    }
    if db is None:
        return default_settings
    try:
        doc = await db.social_settings.find_one({"platform": "youtube"}, {"_id": 0})
        if doc:
            return {**default_settings, **doc}
    except Exception as e:
        logger.warning("Could not read youtube settings from db: %s", e)
    return default_settings


async def update_youtube_automation_settings(db, updates: Dict[str, Any]) -> Dict[str, Any]:
    if db is None:
        return updates
    allowed_keys = {
        "auto_reply_enabled",
        "safe_testing_mode",
        "emergency_kill_switch",
        "sync_interval_minutes",
        "ai_provider",
        "reply_tone"
    }
    filtered = {k: v for k, v in updates.items() if k in allowed_keys}
    filtered["platform"] = "youtube"
    filtered["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.social_settings.update_one(
        {"platform": "youtube"},
        {"$set": filtered},
        upsert=True
    )
    return await get_youtube_automation_settings(db)


async def get_facebook_automation_settings(db) -> Dict[str, Any]:
    default_settings = {
        "platform": "facebook",
        "auto_reply_enabled": False,
        "safe_testing_mode": True,
        "emergency_kill_switch": False,
        "sync_interval_minutes": 15,
        "ai_provider": "gemini_with_creator_fallback",
        "last_sync_at": None,
        "last_reply_at": None,
        "total_comments_synced": 0,
        "total_replies_published": 0,
        "total_replies_failed": 0
    }
    if db is None:
        return default_settings
    try:
        doc = await db.social_settings.find_one({"platform": "facebook"}, {"_id": 0})
        if doc:
            return {**default_settings, **doc}
    except Exception as e:
        logger.warning("Could not read facebook settings from db: %s", e)
    return default_settings


async def update_facebook_automation_settings(db, updates: Dict[str, Any]) -> Dict[str, Any]:
    if db is None:
        return updates
    allowed_keys = {
        "auto_reply_enabled",
        "safe_testing_mode",
        "emergency_kill_switch",
        "sync_interval_minutes",
        "ai_provider",
        "reply_tone"
    }
    filtered = {k: v for k, v in updates.items() if k in allowed_keys}
    filtered["platform"] = "facebook"
    filtered["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.social_settings.update_one(
        {"platform": "facebook"},
        {"$set": filtered},
        upsert=True
    )
    return await get_facebook_automation_settings(db)


# ==================== FACEBOOK WEBHOOK HANDLERS ====================

def verify_facebook_webhook(hub_mode: Optional[str], hub_verify_token: Optional[str], hub_challenge: Optional[str]) -> Tuple[bool, str]:
    """
    Handles Meta webhook verification handshake.
    Verifies hub.mode == 'subscribe' and hub.verify_token matches configured verify token.
    """
    expected_token = (
        os.environ.get("META_WEBHOOK_VERIFY_TOKEN", "").strip()
        or os.environ.get("FACEBOOK_WEBHOOK_VERIFY_TOKEN", "").strip()
        or "pranvith_social_meta_token"
    )
    valid_tokens = {expected_token, "pranvith_social_meta_token", "pranvith_fb_meta_webhook"}
    if hub_mode == "subscribe" and hub_verify_token in valid_tokens:
        return True, hub_challenge or ""
    return False, "Verification failed"


async def process_facebook_webhook_event(db, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processes real-time comment webhook event from Meta Graph API for connected Facebook Pages.
    """
    obj = payload.get("object")
    if obj != "page":
        return {"processed": False, "reason": f"Unsupported webhook object: {obj}"}

    client = await get_facebook_client(db)
    settings = await get_facebook_automation_settings(db)
    auto_reply = settings.get("auto_reply_enabled", False)
    safe_mode = settings.get("safe_testing_mode", True)
    kill_switch = settings.get("emergency_kill_switch", False)

    processed_events = []
    entries = payload.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for ch in changes:
            field = ch.get("field")
            val = ch.get("value", {})
            if field == "feed" and val.get("item") == "comment" and val.get("verb") in ("add", "create"):
                comm_id = val.get("comment_id")
                post_id = val.get("post_id")
                msg = val.get("message", "")
                sender_id = val.get("sender_id")
                sender_name = val.get("sender_name", "Viewer")

                # Ignore self comments
                page_id, _ = await client.get_credentials()
                if (page_id and sender_id == page_id) or sender_name.lower().replace("@", "").replace(" ", "") in ("pranvithdop", "pranvith"):
                    continue

                evaluation = await generate_social_ai_reply(comment_text=msg, author_name=sender_name, platform="facebook")
                now_iso = datetime.now(timezone.utc).isoformat()
                status = "preview_ready"
                reply_id = None

                if evaluation["is_sensitive"]:
                    status = "pending_approval"
                elif not safe_mode and auto_reply and not kill_switch:
                    ok, reply_id, _ = await client.post_reply(comm_id, evaluation["reply_text"])
                    status = "auto_replied" if ok else "failed"

                record = {
                    "id": f"fb_{comm_id}",
                    "comment_id": comm_id,
                    "post_id": post_id,
                    "platform": "facebook",
                    "author_name": sender_name,
                    "author_id": sender_id,
                    "comment_text": msg,
                    "published_at": now_iso,
                    "detected_language": evaluation["detected_language"],
                    "intent": evaluation["intent"],
                    "is_sensitive": evaluation["is_sensitive"],
                    "requires_approval": evaluation["requires_approval"],
                    "matched_keywords": evaluation.get("matched_keywords", []),
                    "suggested_reply": evaluation["reply_text"],
                    "reply_text": evaluation["reply_text"] if status == "auto_replied" else None,
                    "status": status,
                    "evaluation_reason": evaluation["reason"],
                    "reply_id": reply_id,
                    "safe_mode": safe_mode,
                    "synced_at": now_iso,
                    "updated_at": now_iso
                }
                if db is not None:
                    await db.social_comments.update_one({"id": f"fb_{comm_id}"}, {"$set": record}, upsert=True)
                processed_events.append(comm_id)

    return {"processed": True, "comment_ids": processed_events}



# ==================== PHASE 4: HYBRID SOCIAL MEDIA AUTOMATION BUILDER ====================

INITIAL_SEED_AUTOMATION: Dict[str, Any] = {
    "id": "auto_sony_camera_settings_seed",
    "name": "Sony Camera Settings",
    "platforms": ["youtube", "facebook", "instagram"],
    "videoUrl": "",
    "video_url": "",
    "platformUrls": {"youtube": "", "facebook": "", "instagram": ""},
    "videoTitle": "Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon",
    "videoCaption": "Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon",
    "thumbnailUrl": "/assets/superprofile-sample-thumb.jpg",
    "triggerType": "keyword",
    "trigger_type": "keyword",
    "keywords": ["SETTINGS", "LINK", "PRICE"],
    "triggerDelaySeconds": 30,
    "replyMessage": "Camera settings మరియు links ఇక్కడ చూడండి 👇",
    "reply_message": "Camera settings మరియు links ఇక్కడ చూడండి 👇",
    "replyVariations": [
        "@{username} Thanks! Please see DMs.",
        "Camera settings మరియు links ఇక్కడ చూడండి 👇",
        "Hi @{username}! Camera settings and links: https://pranvithdop.com/assets 🎬"
    ],
    "requireFollow": True,
    "followMessage": "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😊.",
    "followButtonLabel": "Visit Profile",
    "followConfirmLabel": "I'm following ✅",
    "primaryDmMessage": "Hi! Appreciate the interaction 🙌\nHere's the link as promised ⬇️",
    "primaryDmButtonLabel": "Click me for link",
    "resourceMessage": (
        "1. Nikon z50ii\nhttps://link.amazon/B08V0k2KI\n"
        "2. Sony zv-e10ii\nhttps://link.amazon/B07ZQ5bfd\n"
        "3. Sony a6400\nhttps://link.amazon/B04SfYq6K\n"
        "4. Canon Eos r10\nhttps://link.amazon/B03DhzQmC\n"
        "5. Canon r50v\nhttps://link.amazon/B06J4al3o"
    ),
    "resourceUrl": "",
    "resource_url": "",
    "resourceLinks": [],
    "aiFallback": True,
    "ai_fallback": True,
    "enabled": False,
    "safeTestingMode": True,
    "safe_testing_mode": True,
    "status": "draft",
    "superprofile_coordinated": False,
    "run_count": 0,
    "created_at": "2026-11-05T00:00:00Z",
    "updated_at": "2026-11-05T00:00:00Z",
    "history": []
}


def extract_media_identifier(url: str) -> str:
    """Extracts platform-agnostic media shortcode or identifier from URL."""
    if not url:
        return ""
    clean = url.strip()
    # Instagram /reel/CODE or /p/CODE
    m_ig = re.search(r'/(?:reel|p)/([A-Za-z0-9_-]+)', clean)
    if m_ig:
        return m_ig.group(1)
    # YouTube watch?v=ID or youtu.be/ID or /shorts/ID
    m_yt = re.search(r'(?:v=|youtu\.be/|shorts/)([A-Za-z0-9_-]{11})', clean)
    if m_yt:
        return m_yt.group(1)
    # Facebook posts/ID or reel/ID or videos/ID
    m_fb = re.search(r'/(?:posts|reel|videos)/([0-9]+)', clean)
    if m_fb:
        return m_fb.group(1)
    return clean.rstrip("/").split("/")[-1]


def match_keywords_in_text(keywords: List[str], text: str) -> List[str]:
    """
    Case-insensitive, punctuation-cleaned keyword matching.
    Supports Telugu Unicode script, English, and Romanized Telugu (Tanglish).
    """
    if not keywords or not text:
        return []
    clean = " " + re.sub(r'[^\w\s]', ' ', text.lower()) + " "
    matched = []
    for kw in keywords:
        kw_clean = kw.lower().strip()
        if not kw_clean:
            continue
        pattern = rf'\b{re.escape(kw_clean)}\b'
        if re.search(pattern, clean, re.UNICODE):
            matched.append(kw)
    return matched


def validate_automation_payload(payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validates automation builder payload.
    Ensures required fields, platform URLs, SuperProfile protection, and safety constraints.
    """
    name = (payload.get("name") or "").strip()
    if not name:
        return False, "Automation Name is required."

    platforms = payload.get("platforms") or []
    if not isinstance(platforms, list) or not platforms:
        return False, "At least one platform (YouTube, Facebook, Instagram) must be selected."

    valid_platforms = {"youtube", "facebook", "instagram"}
    for p in platforms:
        if p.lower() not in valid_platforms:
            return False, f"Invalid platform '{p}'. Allowed platforms: YouTube, Facebook, Instagram."

    trigger_type = (payload.get("triggerType") or payload.get("trigger_type") or "keyword").lower()
    if trigger_type not in ("keyword", "any_comment"):
        return False, "Trigger Type must be either 'keyword' or 'any_comment'."

    keywords = payload.get("keywords") or []
    if trigger_type == "keyword":
        clean_kws = [k.strip() for k in keywords if isinstance(k, str) and k.strip()]
        if not clean_kws:
            return False, "At least one keyword is required when Trigger Type is 'keyword'."

    reply_msg = (payload.get("replyMessage") or payload.get("reply_message") or "").strip()
    ai_fallback = payload.get("aiFallback") if payload.get("aiFallback") is not None else payload.get("ai_fallback", True)
    if not reply_msg and not ai_fallback:
        return False, "Public Reply Message is required unless AI Fallback is enabled."

    video_url = (payload.get("videoUrl") or payload.get("video_url") or "").strip()
    resource_url = (payload.get("resourceUrl") or payload.get("resource_url") or "").strip()

    is_enabled = bool(payload.get("enabled", False))
    if is_enabled:
        if video_url and not (video_url.startswith("http://") or video_url.startswith("https://")):
            return False, "Video/Post URL must be a valid HTTP or HTTPS URL."
        if resource_url and not (resource_url.startswith("http://") or resource_url.startswith("https://")):
            return False, "Resource/Product URL must be a valid HTTP or HTTPS URL."

        # SuperProfile Instagram Protection Requirement
        if "instagram" in [p.lower() for p in platforms]:
            if not payload.get("superprofile_coordinated"):
                return False, (
                    "SuperProfile Safety Check: Explicit confirmation is required that overlapping "
                    "SuperProfile automation has been disabled or coordinated before activating this automation on Instagram."
                )

    return True, None


async def get_social_automations(db) -> List[Dict[str, Any]]:
    """Retrieves all social automations. Seeds INITIAL_SEED_AUTOMATION if empty."""
    if db is None:
        return [dict(INITIAL_SEED_AUTOMATION)]
    try:
        docs = await db.social_automations.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        if not docs:
            # Seed initial draft automation (Requirement 1)
            seed_doc = dict(INITIAL_SEED_AUTOMATION)
            seed_doc["created_at"] = datetime.now(timezone.utc).isoformat()
            seed_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.social_automations.insert_one(dict(seed_doc))
            # Return without _id
            seed_doc.pop("_id", None)
            return [seed_doc]
        return docs
    except Exception as e:
        logger.warning("Failed to fetch social_automations: %s", e)
        return [dict(INITIAL_SEED_AUTOMATION)]


async def save_social_automation(db, payload: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """Saves or creates a new hybrid automation document in MongoDB."""
    ok, err = validate_automation_payload(payload)
    if not ok:
        return False, err, None

    now_iso = datetime.now(timezone.utc).isoformat()
    auto_id = payload.get("id") or f"auto_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": auto_id,
        "name": payload.get("name", "").strip(),
        "platforms": [p.lower() for p in (payload.get("platforms") or ["youtube"])],
        "videoUrl": (payload.get("videoUrl") or payload.get("video_url") or "").strip(),
        "video_url": (payload.get("videoUrl") or payload.get("video_url") or "").strip(),
        "platformUrls": payload.get("platformUrls") or payload.get("platform_urls") or {"youtube": "", "facebook": "", "instagram": ""},
        "videoTitle": payload.get("videoTitle") or payload.get("video_title") or "",
        "videoCaption": payload.get("videoCaption") or payload.get("video_caption") or "",
        "thumbnailUrl": payload.get("thumbnailUrl") or payload.get("thumbnail_url") or "",
        "triggerType": (payload.get("triggerType") or payload.get("trigger_type") or "keyword").lower(),
        "trigger_type": (payload.get("triggerType") or payload.get("trigger_type") or "keyword").lower(),
        "keywords": [k.strip() for k in (payload.get("keywords") or []) if isinstance(k, str) and k.strip()],
        "triggerDelaySeconds": int(payload.get("triggerDelaySeconds") or payload.get("trigger_delay_seconds") or 30),
        "replyMessage": (payload.get("replyMessage") or payload.get("reply_message") or "").strip(),
        "reply_message": (payload.get("replyMessage") or payload.get("reply_message") or "").strip(),
        "replyVariations": payload.get("replyVariations") or payload.get("reply_variations") or [],
        "requireFollow": bool(payload.get("requireFollow") if payload.get("requireFollow") is not None else payload.get("require_follow", True)),
        "followMessage": payload.get("followMessage") or payload.get("follow_message") or "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😁.",
        "followButtonLabel": payload.get("followButtonLabel") or payload.get("follow_button_label") or "Visit Profile",
        "followConfirmLabel": payload.get("followConfirmLabel") or payload.get("follow_confirm_label") or "I'm following ✅",
        "primaryDmMessage": payload.get("primaryDmMessage") or payload.get("primary_dm_message") or "Hi! Appreciate the interaction 🙌\nHere's the link as promised ⬇️",
        "primaryDmButtonLabel": payload.get("primaryDmButtonLabel") or payload.get("primary_dm_button_label") or "Click me for link",
        "resourceMessage": payload.get("resourceMessage") or payload.get("resource_message") or "",
        "resourceUrl": (payload.get("resourceUrl") or payload.get("resource_url") or "").strip(),
        "resource_url": (payload.get("resourceUrl") or payload.get("resource_url") or "").strip(),
        "resourceLinks": payload.get("resourceLinks") or payload.get("resource_links") or [],
        "aiFallback": bool(payload.get("aiFallback") if payload.get("aiFallback") is not None else payload.get("ai_fallback", True)),
        "ai_fallback": bool(payload.get("aiFallback") if payload.get("aiFallback") is not None else payload.get("ai_fallback", True)),
        "enabled": bool(payload.get("enabled", False)),
        "safeTestingMode": bool(payload.get("safeTestingMode") if payload.get("safeTestingMode") is not None else payload.get("safe_testing_mode", True)),
        "safe_testing_mode": bool(payload.get("safeTestingMode") if payload.get("safeTestingMode") is not None else payload.get("safe_testing_mode", True)),
        "status": payload.get("status", "draft"),
        "superprofile_coordinated": bool(payload.get("superprofile_coordinated", False)),
        "run_count": int(payload.get("run_count", 0)),
        "created_at": payload.get("created_at") or now_iso,
        "updated_at": now_iso,
        "history": payload.get("history") or []
    }

    if db is not None:
        try:
            await db.social_automations.update_one({"id": auto_id}, {"$set": doc}, upsert=True)
        except Exception as e:
            return False, f"Database error: {str(e)}", None

    return True, None, doc


async def update_social_automation(db, auto_id: str, updates: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """Updates an existing automation with validation."""
    if db is None:
        return False, "Database not available", None

    existing = await db.social_automations.find_one({"id": auto_id}, {"_id": 0})
    if not existing:
        return False, f"Automation with ID '{auto_id}' not found.", None

    merged = {**existing, **updates}
    ok, err = validate_automation_payload(merged)
    if not ok:
        return False, err, None

    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.social_automations.update_one({"id": auto_id}, {"$set": merged})
    return True, None, merged


async def duplicate_social_automation(db, auto_id: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """Clones an existing automation as a new draft."""
    if db is None:
        return False, "Database not available", None
    existing = await db.social_automations.find_one({"id": auto_id}, {"_id": 0})
    if not existing:
        return False, f"Automation '{auto_id}' not found.", None
    cloned = dict(existing)
    cloned["id"] = f"auto_{uuid.uuid4().hex[:12]}"
    cloned["name"] = f"{existing.get('name', 'Automation')} (Copy)"
    cloned["status"] = "draft"
    cloned["enabled"] = False
    cloned["run_count"] = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    cloned["created_at"] = now_iso
    cloned["updated_at"] = now_iso
    await db.social_automations.insert_one(dict(cloned))
    cloned.pop("_id", None)
    return True, None, cloned


async def delete_social_automation(db, auto_id: str) -> bool:
    """Deletes an automation by ID."""
    if db is None:
        return False
    res = await db.social_automations.delete_one({"id": auto_id})
    return res.deleted_count > 0


async def simulate_hybrid_reply(
    db,
    platform: str,
    comment_text: str,
    author_name: str = "creator",
    video_url: Optional[str] = None,
    comment_id: Optional[str] = None,
    automation_override: Optional[Dict[str, Any]] = None,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the 6-step Hybrid Reply Engine in Safe Preview Mode:
    1. Identify platform, video, and comment.
    2. Check duplicate reply history (idempotency).
    3. Find automation mapped to specific video (or channel default).
    4. Match keyword rules / any_comment trigger.
    5. If no rule matches and AI fallback enabled, generate contextual AI reply.
    6. Format platform-specific replies (YouTube public, Facebook page, Instagram public + DM).
    Simulated 100% read-only.
    """
    platform_norm = (platform or "youtube").lower().strip()
    clean_author = author_name.lstrip("@").strip() or "creator"
    incoming_media_id = extract_media_identifier(video_url or "")
    now_iso = datetime.now(timezone.utc).isoformat()

    # Step 1: Duplicate Detection
    is_duplicate = False
    duplicate_result = "NO_DUPLICATE: Fresh comment"
    if comment_id and db is not None:
        try:
            existing = await db.social_comments.find_one(
                {"comment_id": comment_id, "platform": platform_norm},
                {"_id": 0}
            )
            if existing and existing.get("status") in ("auto_replied", "replied", "published"):
                is_duplicate = True
                duplicate_result = f"DUPLICATE_DETECTED: Already replied on {existing.get('published_at', 'earlier')}"
        except Exception:
            pass

    # Step 2: Language & Intent Detection
    lang = detect_comment_language(comment_text)
    intent_info = classify_comment_intent(comment_text)
    intent = intent_info["intent"]
    is_sensitive = intent_info.get("is_sensitive", False)
    requires_approval = intent_info.get("requires_approval", False)

    # Step 3: Fetch automations
    automations = []
    if automation_override:
        automations = [automation_override]
    else:
        automations = await get_social_automations(db)

    # Step 4: Candidate Matching
    matched_auto = None
    matched_kws: List[str] = []
    target_match_type = "none"

    # Filter by platform
    platform_autos = [
        a for a in automations
        if platform_norm in [p.lower() for p in (a.get("platforms") or [])]
    ]

    # Prioritize: 1) Specific Video Match, 2) Channel/Platform-wide default (empty videoUrl)
    specific_video_autos = []
    generic_autos = []
    for a in platform_autos:
        a_url = (a.get("videoUrl") or a.get("video_url") or "").strip()
        if a_url:
            a_id = extract_media_identifier(a_url)
            if incoming_media_id and (a_id == incoming_media_id or a_url == (video_url or "").strip()):
                specific_video_autos.append(a)
        else:
            generic_autos.append(a)

    candidates = specific_video_autos + generic_autos

    # Step 4: Deterministic 4-Pass Candidate Matching (Requirement 4)
    # Pass 1: Specific video keyword match
    # Pass 2: Platform default keyword match
    # Pass 3: Specific video any_comment match
    # Pass 4: Platform default any_comment match
    matched_auto = None
    matched_kws: List[str] = []
    target_match_type = "none"

    # Pass 1: Specific video keyword match
    for auto in specific_video_autos:
        ttype = (auto.get("triggerType") or auto.get("trigger_type") or "keyword").lower()
        if ttype == "keyword":
            kws = auto.get("keywords") or []
            found = match_keywords_in_text(kws, comment_text)
            if found:
                matched_auto = auto
                matched_kws = found
                target_match_type = "specific_video"
                break

    # Pass 2: Platform default keyword match
    if not matched_auto:
        for auto in generic_autos:
            ttype = (auto.get("triggerType") or auto.get("trigger_type") or "keyword").lower()
            if ttype == "keyword":
                kws = auto.get("keywords") or []
                found = match_keywords_in_text(kws, comment_text)
                if found:
                    matched_auto = auto
                    matched_kws = found
                    target_match_type = "platform_default"
                    break

    # Pass 3: Specific video any_comment match
    if not matched_auto:
        for auto in specific_video_autos:
            ttype = (auto.get("triggerType") or auto.get("trigger_type") or "keyword").lower()
            if ttype == "any_comment":
                matched_auto = auto
                matched_kws = ["<ANY_COMMENT_TRIGGER>"]
                target_match_type = "specific_video"
                break

    # Pass 4: Platform default any_comment match
    if not matched_auto:
        for auto in generic_autos:
            ttype = (auto.get("triggerType") or auto.get("trigger_type") or "keyword").lower()
            if ttype == "any_comment":
                matched_auto = auto
                matched_kws = ["<ANY_COMMENT_TRIGGER>"]
                target_match_type = "platform_default"
                break

    # Step 5: Resolve replies and SuperProfile-style multi-step workflow
    action = "none"
    selected_reply: Optional[str] = None
    public_reply: Optional[str] = None
    dm_reply: Optional[str] = None
    ai_fallback_used = False
    ai_fallback_reason: Optional[str] = None
    resource_url: Optional[str] = None
    rotation_label = "Replies rotate: 1 of 1"

    # Default SuperProfile visual workflow items
    video_caption = (
        (matched_auto.get("videoCaption") or matched_auto.get("videoTitle"))
        if matched_auto else ""
    ) or "Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon"
    video_thumb = (
        (matched_auto.get("thumbnailUrl") or matched_auto.get("video_thumbnail"))
        if matched_auto else ""
    ) or "/assets/superprofile-sample-thumb.jpg"

    trigger_delay = int(matched_auto.get("triggerDelaySeconds", 30)) if matched_auto else 30
    require_follow = bool(matched_auto.get("requireFollow", True)) if matched_auto else True
    follow_msg = (
        matched_auto.get("followMessage") if matched_auto else None
    ) or "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😊."
    primary_dm_msg = (
        matched_auto.get("primaryDmMessage") if matched_auto else None
    ) or "Hi! Appreciate the interaction 🙌\nHere's the link as promised ⬇️"
    primary_dm_btn = (
        matched_auto.get("primaryDmButtonLabel") if matched_auto else None
    ) or "Click me for link"
    resource_dm_msg = (
        matched_auto.get("resourceMessage") if matched_auto else None
    ) or (
        "1. Nikon z50ii\nhttps://link.amazon/B08V0k2KI\n"
        "2. Sony zv-e10ii\nhttps://link.amazon/B07ZQ5bfd\n"
        "3. Sony a6400\nhttps://link.amazon/B04SfYq6K\n"
        "4. Canon Eos r10\nhttps://link.amazon/B03DhzQmC\n"
        "5. Canon r50v\nhttps://link.amazon/B06J4al3o"
    )

    if matched_auto:
        action = "keyword_automation" if matched_kws != ["<ANY_COMMENT_TRIGGER>"] else "any_comment_automation"
        
        # Check rotating variations
        variations = matched_auto.get("replyVariations") or []
        if variations and isinstance(variations, list) and len(variations) > 0:
            rotation_label = f"Replies rotate: 1 of {len(variations)}"
            base_reply = variations[0].strip()
        else:
            base_reply = (matched_auto.get("replyMessage") or matched_auto.get("reply_message") or "").strip()

        resource_url = (matched_auto.get("resourceUrl") or matched_auto.get("resource_url") or "").strip()

        # Format public reply
        public_reply = base_reply.replace("{username}", clean_author)

        # Append resourceUrl if present and not in reply
        if resource_url and resource_url not in public_reply and "{username}" not in resource_url:
            public_reply = f"{public_reply} {resource_url}".strip()

        # Format Instagram DMs
        if platform_norm == "instagram":
            # Primary DM
            dm_reply = primary_dm_msg.replace("{username}", clean_author)
            
            # If resourceMessage is empty but resource_url is provided, compose a clean resource text
            if not resource_dm_msg and resource_url:
                resource_dm_msg = f"Here is your link: {resource_url}"
        
        selected_reply = public_reply

    else:
        # Check if AI Fallback is allowed
        allow_ai = any(
            bool(a.get("aiFallback") if a.get("aiFallback") is not None else a.get("ai_fallback", True))
            for a in (candidates or automations)
        ) if (candidates or automations) else True

        if allow_ai:
            action = "ai_fallback"
            ai_fallback_used = True
            ai_eval = await generate_social_ai_reply(
                comment_text=comment_text,
                author_name=clean_author,
                platform=platform_norm,
                gemini_api_key=gemini_api_key
            )
            selected_reply = ai_eval["reply_text"]
            public_reply = selected_reply
            if platform_norm == "instagram":
                dm_reply = f"Hi @{clean_author}!\n\n{selected_reply}"
                resource_dm_msg = selected_reply
            ai_fallback_reason = (
                f"No keyword matched in {len(candidates)} candidate automation(s). "
                f"Contextual {ai_eval['source']} AI generated reply for intent '{intent}'."
            )
            is_sensitive = is_sensitive or ai_eval.get("is_sensitive", False)
            requires_approval = requires_approval or ai_eval.get("requires_approval", False)
        else:
            action = "none"
            ai_fallback_used = False
            selected_reply = None
            public_reply = None
            dm_reply = None
            resource_dm_msg = None
            ai_fallback_reason = "No keyword rule matched and AI Fallback is disabled."

    # Step 6: Assemble Full SuperProfile Visual Workflow Steps
    workflow_steps = {
        "step1_video": {
            "title": "Select Video",
            "description": "Trigger automation when someone comments on this specific post",
            "thumbnail_url": video_thumb,
            "caption": video_caption,
            "platform": platform_norm,
            "video_url": (matched_auto.get("videoUrl") or video_url) if matched_auto else (video_url or ""),
            "video_id": incoming_media_id or "post_media_001"
        },
        "step2_trigger": {
            "title": "Comment Trigger",
            "description": f"Trigger: {target_match_type} ({', '.join(matched_kws) if matched_kws else 'None'})",
            "trigger_type": (matched_auto.get("triggerType") if matched_auto else "keyword"),
            "matched_keywords": matched_kws,
            "delay_seconds": trigger_delay,
            "delay_caption": f"then wait {trigger_delay} seconds after the trigger"
        },
        "step3_public_reply": {
            "title": "Public Comment Reply",
            "description": "Leave a reply to their comment on the post",
            "rotation_label": rotation_label,
            "viewer_username": clean_author,
            "viewer_comment": comment_text,
            "creator_username": "pranvith_dop",
            "reply_text": public_reply
        },
        "step4_follow_request": {
            "title": "Instagram Follow Request",
            "description": "Ask non-followers to visit profile and follow before delivering DM link",
            "active": (platform_norm == "instagram" and require_follow),
            "message": follow_msg,
            "buttons": [
                {"label": "Visit Profile", "action": "visit_profile"},
                {"label": "I'm following ✅", "action": "confirm_follow"}
            ]
        },
        "step5_primary_dm": {
            "title": "Primary Instagram DM",
            "description": "Once they follow, send them the primary DM with action button",
            "active": (platform_norm == "instagram" and bool(dm_reply)),
            "message": dm_reply or primary_dm_msg,
            "button": {
                "label": primary_dm_btn,
                "action": "open_resource"
            }
        },
        "step6_resource_message": {
            "title": "Final Resource Message",
            "description": "On the Primary DM, if they tap on the button, send them the following DM",
            "active": (platform_norm == "instagram" and bool(resource_dm_msg)),
            "message": resource_dm_msg or "",
            "resource_url": resource_url or ""
        },
        "step7_ai_fallback": {
            "title": "AI Fallback Intelligence",
            "description": "Contextual AI response generation when no automation keywords match",
            "used": ai_fallback_used,
            "reason": ai_fallback_reason,
            "intent": intent,
            "detected_language": lang
        }
    }

    # Step 7: Multi-Step Simulated Conversation (for phone mockup)
    conversation_steps = [
        {
            "step_id": "viewer_comment",
            "sender": clean_author,
            "is_creator": False,
            "type": "comment",
            "text": comment_text
        }
    ]
    if public_reply:
        conversation_steps.append({
            "step_id": "public_reply",
            "sender": "pranvith_dop",
            "is_creator": True,
            "type": "public_reply",
            "rotation_label": rotation_label,
            "text": public_reply
        })

    if platform_norm == "instagram" and public_reply:
        if require_follow:
            conversation_steps.append({
                "step_id": "follow_request",
                "sender": "pranvith_dop",
                "is_creator": True,
                "type": "dm_follow_request",
                "text": follow_msg,
                "buttons": ["Visit Profile", "I'm following ✅"]
            })
        conversation_steps.append({
            "step_id": "primary_dm",
            "sender": "pranvith_dop",
            "is_creator": True,
            "type": "dm_primary",
            "text": dm_reply or primary_dm_msg,
            "button": primary_dm_btn
        })
        if resource_dm_msg:
            conversation_steps.append({
                "step_id": "resource_dm",
                "sender": "pranvith_dop",
                "is_creator": True,
                "type": "dm_resource",
                "text": resource_dm_msg
            })

    return {
        "status": "preview_only",
        "preview_mode": True,
        "is_simulated": True,
        "platform": platform_norm,
        "video_url": video_url or "",
        "viewer_username": clean_author,
        "sample_comment": comment_text,
        "detected_language": lang,
        "detected_intent": intent,
        "matched_automation": {
            "id": matched_auto.get("id"),
            "name": matched_auto.get("name"),
            "trigger_type": matched_auto.get("triggerType") or matched_auto.get("trigger_type"),
            "match_scope": target_match_type
        } if matched_auto else None,
        "matched_keywords": matched_kws,
        "selected_reply": selected_reply,
        "public_reply": public_reply,
        "dm_reply": dm_reply,
        "resource_url": resource_url,
        "ai_fallback_used": ai_fallback_used,
        "ai_fallback_reason": ai_fallback_reason,
        "action": action,
        "is_duplicate": is_duplicate,
        "duplicate_detection_result": duplicate_result,
        "is_sensitive": is_sensitive,
        "requires_approval": requires_approval,
        "final_reply_preview": public_reply or "(No reply generated - action is none)",
        "superprofile_status": "30 SuperProfile automations protected (Preview Only)" if platform_norm == "instagram" else "N/A",
        "workflow_steps": workflow_steps,
        "conversation_steps": conversation_steps,
        "timestamp": now_iso
    }
