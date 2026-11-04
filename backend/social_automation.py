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

def detect_comment_language(text: str) -> str:
    """
    Detects if comment is in Telugu, English, or Hindi.
    Handles native Unicode Telugu script and Romanized Teluglish.
    """
    raw = (text or "").lower()
    
    # 1. Native script detection
    if re.search(r'[\u0C00-\u0C7F]', raw):
        return "telugu"
    if re.search(r'[\u0900-\u097F]', raw):
        return "hindi"
        
    # 2. Explicit or Romanized Telugu
    matched_te = [w for w in TELUGU_WORDS if re.search(rf'\b{re.escape(w)}\b', raw)]
    if not matched_te:
        return "english"
        
    # If the only match is 'bro' or 'plz' (borrowed words common in English), treat as english
    if set(matched_te).issubset({"bro", "plz"}):
        return "english"
        
    return "telugu"

# ==================== DEFAULT KEYWORD RULES ====================

DEFAULT_SOCIAL_RULES = {
    "auto_reply": [
        {
            "id": "rule_lut",
            "name": "LUT & Preset Request",
            "keywords": ["lut", "luts", "preset", "presets", "color grade", "grading", "కలర్ గ్రేడింగ్"],
            "reply_en": "🎨 Check out the Pranvith Creative LUT Pack (₹49) with 10+ 3D cinematic LUTs for Sony S-Log3, Canon C-Log3 & Rec.709: https://pranvithdop.com/assets/creative-lut-pack",
            "reply_te": "🎨 సోనీ S-Log3 మరియు కానన్ C-Log3 కోసం సినిమాటిక్ LUT ప్యాక్ (₹49) లింక్: https://pranvithdop.com/assets/creative-lut-pack",
            "active": True
        },
        {
            "id": "rule_settings",
            "name": "Camera Settings / PDF Request",
            "keywords": ["settings", "setting", "camera setting", "pdf", "cheat sheet", "సెట్టింగ్స్"],
            "reply_en": "🎬 Here are our verified camera & cinematography settings guides! You can also explore our complete asset catalog at https://pranvithdop.com/assets",
            "reply_te": "🎬 నమస్కారం! కెమెరా సెట్టింగ్స్ మరియు సినిమాటోగ్రఫీ గైడ్స్ కోసం మన వెబ్‌సైట్ చూడండి: https://pranvithdop.com/assets",
            "active": True
        },
        {
            "id": "rule_link",
            "name": "Direct Link / Asset Request",
            "keywords": ["link", "links", "url", "download", "డౌన్‌లోడ్", "లింక్"],
            "reply_en": "🔗 Direct link to Pranvith DOP creative packs & master courses: https://pranvithdop.com/assets",
            "reply_te": "🔗 ప్రణవిత్ DOP అసెట్స్ మరియు కోర్సెస్ డైరెక్ట్ లింక్: https://pranvithdop.com/assets",
            "active": True
        },
        {
            "id": "rule_list",
            "name": "Catalog / List Request",
            "keywords": ["list", "catalog", "packs", "assets", "store", "లిస్ట్"],
            "reply_en": "🛍️ Here is our complete digital catalog (Creative LUTs ₹49, Sound FX ₹149, Wedding Templates ₹299): https://pranvithdop.com/assets",
            "reply_te": "🛍️ మన ఎడిటింగ్ అసెట్స్ & ప్యాక్స్ మొత్తం లిస్ట్ ఇక్కడ చూడండి: https://pranvithdop.com/assets",
            "active": True
        },
        {
            "id": "rule_sound",
            "name": "Sound FX / Audio Request",
            "keywords": ["sound", "sfx", "audio", "sound fx", "whoosh"],
            "reply_en": "🔊 Get 100+ 24-bit cinematic sound FX (whooshes, risers, deep hits) for ₹149: https://pranvithdop.com/assets/cinematic-sound-fx-pack",
            "reply_te": "🔊 సినిమాటిక్ సౌండ్ ఎఫెక్ట్స్ ప్యాక్ (₹149) లింక్: https://pranvithdop.com/assets/cinematic-sound-fx-pack",
            "active": True
        }
    ],
    "approval_required": [
        {
            "id": "rule_price",
            "name": "Price & Quotation Inquiry",
            "keywords": ["price", "cost", "rate", "fee", "fees", "charges", "how much", "ధర", "ఎంత", "రేట్"],
            "suggested_en": "Hi @{username}! Creative LUT Pack is ₹49, Sound FX Pack is ₹149, and Wedding Templates are ₹299. Explore all packs at https://pranvithdop.com/assets or DM us for custom bundles!",
            "suggested_te": "నమస్కారం @{username}! Creative LUT ప్యాక్ ₹49, Sound FX ₹149, మరియు వెడ్డింగ్ టెంప్లేట్స్ ₹299. వివరాల కోసం మన వెబ్‌సైట్ చూడండి: https://pranvithdop.com/assets",
            "active": True
        },
        {
            "id": "rule_booking",
            "name": "Shoot & Commercial Booking Inquiry",
            "keywords": ["book", "booking", "hire", "service", "shoot", "event", "commercial", "బుకింగ్", "షూట్"],
            "suggested_en": "Hi @{username}! For commercial video production, wedding films, or cinematography bookings, please fill our enquiry form at https://pranvithdop.com/hire or WhatsApp +91 9059867883.",
            "suggested_te": "నమస్కారం @{username}! సినిమాటోగ్రఫీ మరియు వెడ్డింగ్ షూట్ బుకింగ్స్ కోసం మా వెబ్‌సైట్ https://pranvithdop.com/hire లో లేదా WhatsApp +91 9059867883 లో సంప్రదించండి.",
            "active": True
        },
        {
            "id": "rule_course",
            "name": "Masterclass & Training Inquiry",
            "keywords": ["course", "class", "training", "offline", "learn", "academy", "కోర్స్", "క్లాస్"],
            "suggested_en": "Hi @{username}! Our Master Cinematography Course covers practical camera operation, S-Log3/C-Log3 exposure, on-set lighting, and color grading. Details at https://pranvithdop.com/courses",
            "suggested_te": "నమస్కారం @{username}! మా మాస్టర్ సినిమాటోగ్రఫీ కోర్స్ వివరాలు, ప్రాక్టికల్ క్లాసెస్ కోసం ఇక్కడ చూడండి: https://pranvithdop.com/courses",
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
            template = rule.get("suggested_te") if lang == "telugu" else rule.get("suggested_en")
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
            reply_template = rule.get("reply_te") if lang == "telugu" else rule.get("reply_en")
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


# ==================== YOUTUBE AI AUTO-REPLY POOLS & INTENT ENGINE ====================

YOUTUBE_REPLY_POOLS: Dict[str, Dict[str, List[str]]] = {
    "CAMERA_SETTINGS": {
        "telugu": [
            "నమస్కారం @{author}! కెమెరా బెస్ట్ వీడియో సెట్టింగ్స్ & సినీమాటోగ్రఫీ గైడ్స్ కోసం మన వెబ్‌సైట్ చూడండి: https://pranvithdop.com/assets. ఇంకా ఏమైనా డౌట్స్ ఉంటే తప్పకుండా అడగండి!",
            "హాయ్ @{author}! Z-సిరీస్ / Sony కెమెరాల కంప్లీట్ సెట్టింగ్స్ PDF మరియు సినీమాటిక్ అసెట్స్ ఇక్కడ ఉన్నాయి: https://pranvithdop.com/assets. ట్రై చేసి రిజల్ట్ ఎలా ఉందో చెప్పండి bro 🔥",
            "Thanks for watching @{author}! మా రికమండెడ్ కెమెరా సెట్టింగ్స్ చీట్ షీట్స్ అన్నీ ఇక్కడ అందుబాటులో ఉన్నాయి: https://pranvithdop.com/assets. కీప్ షూటింగ్ 🎬",
            "నమస్కారం @{author}! N-Log / S-Log3 ప్రొఫైల్స్ మరియు ఎక్స్‌పోజర్ సెట్టింగ్స్ గైడ్ కోసం https://pranvithdop.com/assets విజిట్ చేయండి!"
        ],
        "english": [
            "Hi @{author}! You can download our verified camera settings guide and cinematography cheat sheets here: https://pranvithdop.com/assets. Hope it helps your workflow!",
            "Thanks for watching @{author}! We have detailed settings breakdowns and filmmaking packs available on our site: https://pranvithdop.com/assets. Keep creating 🎬",
            "Hey @{author}! Check out the complete camera profile & exposure guide on https://pranvithdop.com/assets. Let me know if you have any questions!",
            "Appreciate the comment @{author}! Full camera settings, picture profiles, and creative gear lists are right here: https://pranvithdop.com/assets"
        ]
    },
    "LUT_REQUEST": {
        "telugu": [
            "🎨 నమస్కారం @{author}! Sony S-Log3, Canon C-Log3 & Rec.709 కోసం క్రియేటివ్ సినిమాటిక్ LUT ప్యాక్ (₹49) లింక్: https://pranvithdop.com/assets/creative-lut-pack. కలర్ గ్రేడింగ్ ఈజీగా అయిపోతుంది!",
            "🎨 హాయ్ @{author}! మా అఫీషియల్ సినిమాటిక్ 3D LUT ప్యాక్ కేవలం ₹49 కే అందుబాటులో ఉంది: https://pranvithdop.com/assets/creative-lut-pack. డౌన్‌లోడ్ చేసుకుని ట్రై చేయండి bro!",
            "🎨 Thanks @{author}! 10+ సినిమాటిక్ క్యూబ్ LUTs తో కూడిన ప్యాక్ లింక్: https://pranvithdop.com/assets/creative-lut-pack. హ్యాపీ కలర్ గ్రేడింగ్!"
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
        "english": [
            "Great observation @{author}! When exposed correctly with the right picture profile, this camera delivers exceptional dynamic range and skin tones. Check https://pranvithdop.com/assets for full guides!",
            "Spot on @{author}! The sensor readout and color rendition really shine in this setup. Thanks for watching and supporting 🎬"
        ]
    },
    "APPRECIATION": {
        "telugu": [
            "చాలా థాంక్స్ @{author} bro! మీ సపోర్ట్ చాలా వాల్యుబుల్. మరిన్ని సినిమాటోగ్రఫీ వీడియోస్ త్వరలోనే వస్తున్నాయి 🔥",
            "థాంక్యూ సో మచ్ @{author} anna! వీడియో నచ్చినందుకు సంతోషం. కీప్ సపోర్టింగ్ 🎬",
            "Thanks a lot @{author}! మీలాంటి క్రియేటర్స్ సపోర్ట్ వల్లే కొత్త కంటెంట్ చేయాలనిపిస్తుంది. స్టే ట్యూన్డ్!",
            "ధన్యవాదాలు @{author}! నెక్స్ట్ ఏ కెమెరా లేదా లైటింగ్ టాపిక్ పై వీడియో కావాలో కూడా కామెంట్ చేయండి!"
        ],
        "english": [
            "Thank you so much @{author}! Really glad you enjoyed the breakdown. More filmmaking content coming soon 🔥",
            "Appreciate the kind words @{author}! Keep creating and stay tuned for our next video 🎬",
            "Thanks a lot @{author}! It means a lot to the team. Let us know what topics you want to see next!",
            "Much appreciated @{author}! Glad you found the video helpful. Have a great shoot ahead!"
        ]
    },
    "SENSITIVE_PRICE": {
        "telugu": [
            "నమస్కారం @{author}! మా క్రియేటివ్ LUT ప్యాక్ ₹49, Sound FX ₹149, మరియు వెడ్డింగ్ టెంప్లేట్స్ ₹299. ప్రాజెక్ట్ / షూట్ కొటేషన్ కోసం వెబ్‌సైట్ https://pranvithdop.com/hire లేదా WhatsApp +91 9059867883 లో సంప్రదించండి.",
            "హాయ్ @{author}! మా ప్రొడక్ట్స్ మరియు సర్వీస్ ధరల పూర్తి వివరాల కోసం https://pranvithdop.com ని సందర్శించండి లేదా డైరెక్ట్ గా వాట్సాప్ చేయండి: +91 9059867883."
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
        "english": [
            "Hi @{author}! Our Master Cinematography Course covers practical camera operation, lighting, S-Log3/C-Log3 exposure, and color grading. Details at https://pranvithdop.com/courses",
            "Thanks @{author}! You can explore course modules, offline batches, and registration details on https://pranvithdop.com/courses"
        ]
    },
    "GENERAL": {
        "telugu": [
            "నమస్కారం @{author}! కామెంట్ చేసినందుకు ధన్యవాదాలు. మా లేటెస్ట్ సినీమాటోగ్రఫీ అసెట్స్ మరియు గైడ్స్ కోసం https://pranvithdop.com ని విజిట్ చేయండి!",
            "థాంక్స్ ఫర్ వాచింగ్ @{author} bro! ఇంకా ఏమైనా డౌట్స్ ఉంటే కామెంట్ చేయండి, తప్పకుండా రిప్లై ఇస్తాను 🎬"
        ],
        "english": [
            "Hi @{author}! Thanks for watching and dropping a comment. Check out our editing packs and cinematography resources at https://pranvithdop.com",
            "Thanks for connecting @{author}! Feel free to ask any filmmaking or camera questions anytime 🎬"
        ]
    }
}


def classify_comment_intent(comment_text: str) -> Dict[str, Any]:
    """
    Classifies a comment into intent categories with sensitivity flag.
    Sensitive comments (price, booking, course) require admin approval before replying.
    """
    text_lower = (comment_text or "").lower()

    # 1. Sensitive checks first (Pricing, Shoot Booking, Masterclass)
    price_keywords = ["price", "cost", "how much", "rate", "fee", "fees", "charges", "ధర", "ఎంత", "రేట్", "ప్రైస్"]
    matched_price = [k for k in price_keywords if k in text_lower]
    if matched_price:
        return {
            "intent": "SENSITIVE_PRICE",
            "is_sensitive": True,
            "requires_approval": True,
            "matched_keywords": matched_price,
            "reason": f"Pricing inquiry matched keyword '{matched_price[0]}'. Requires admin approval."
        }

    booking_keywords = ["book", "booking", "hire", "service", "shoot", "event", "commercial", "available", "బుకింగ్", "షూట్", "రెంట్"]
    matched_booking = [k for k in booking_keywords if k in text_lower]
    if matched_booking:
        return {
            "intent": "SENSITIVE_BOOKING",
            "is_sensitive": True,
            "requires_approval": True,
            "matched_keywords": matched_booking,
            "reason": f"Shoot / production booking inquiry matched '{matched_booking[0]}'. Requires admin approval."
        }

    course_keywords = ["course", "class", "training", "offline", "learn", "academy", "కోర్స్", "క్లాస్"]
    matched_course = [k for k in course_keywords if k in text_lower]
    if matched_course:
        return {
            "intent": "SENSITIVE_COURSE",
            "is_sensitive": True,
            "requires_approval": True,
            "matched_keywords": matched_course,
            "reason": f"Course / training inquiry matched '{matched_course[0]}'. Requires admin approval."
        }

    # 2. LUTs & Color Grading Presets
    lut_keywords = ["lut", "luts", "preset", "presets", "color grade", "grading", "cube", "కలర్ గ్రేడింగ్"]
    matched_lut = [k for k in lut_keywords if k in text_lower]
    if matched_lut:
        return {
            "intent": "LUT_REQUEST",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_lut,
            "reason": "Cinematic LUT / preset request"
        }

    # 3. Camera Settings / Cheat Sheet PDF
    settings_keywords = ["setting", "settings", "cheat sheet", "pdf", "cheat", "profile", "n-log", "s-log", "nlog", "slog", "iso", "shutter", "సెట్టింగ్స్", "సెట్టింగ్"]
    matched_settings = [k for k in settings_keywords if k in text_lower]
    if matched_settings:
        return {
            "intent": "CAMERA_SETTINGS",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_settings,
            "reason": "Camera settings & cheat sheet request"
        }

    # 4. Gear list
    gear_keywords = ["gear", "lens", "lenses", "mic", "tripod", "gimbal", "list", "equipment", "లిస్ట్"]
    matched_gear = [k for k in gear_keywords if k in text_lower]
    if matched_gear:
        return {
            "intent": "GEAR_LIST",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_gear,
            "reason": "Filmmaking gear / equipment inquiry"
        }

    # 5. Technical camera discussions
    camera_keywords = ["nikon", "sony", "canon", "fx3", "z6iii", "z6ii", "z8", "z9", "zr", "r5", "r6", "dji", "slow motion", "4k 120", "autofocus", "details"]
    matched_cam = [k for k in camera_keywords if k in text_lower]
    if matched_cam:
        return {
            "intent": "CAMERA_TECHNICAL",
            "is_sensitive": False,
            "requires_approval": False,
            "matched_keywords": matched_cam,
            "reason": f"Technical discussion on camera model / feature: {matched_cam[0]}"
        }

    # 6. Appreciation & praise
    apprec_keywords = ["super", "nice", "great", "awesome", "loved", "bagundi", "bavundi", "chala bagundi", "fire", "wonderful", "excellent", "good details"]
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


async def generate_youtube_ai_reply(
    comment_text: str,
    author_name: str = "creator",
    video_title: Optional[str] = None,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a natural, context-rich, non-static reply to a YouTube comment.
    Understands Telugu (native + Teluglish), English, and mixed comments.
    Uses Gemini API if key is present, with an offline verified creator AI engine fallback.
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
                "You are Pranvith DOP, a professional cinematographer, filmmaker, and colorist replying to a YouTube comment.\n"
                f"Commenter: @{clean_author}\n"
                f"Detected Language: {lang}\n"
                f"Comment: \"{comment_text}\"\n"
                "RULES:\n"
                "1. Reply in the exact same language (Telugu in native script if comment is in Telugu; Telugu written in English letters / Teluglish if comment is Teluglish; English if English).\n"
                "2. Tone: Friendly, humble, professional cinematographer ('Thanks bro!', 'Glad you liked the lighting', etc.).\n"
                "3. Keep it brief (1 to 2 concise sentences suitable for YouTube comments).\n"
                "4. If they ask for settings/PDF, point to https://pranvithdop.com/assets.\n"
                "5. If they ask for LUTs, mention the Creative LUT Pack (₹49) at https://pranvithdop.com/assets/creative-lut-pack.\n"
                "6. If price or shoot booking, state that quotes and bookings can be made at https://pranvithdop.com/hire or WhatsApp +91 9059867883.\n"
                "7. Output only the final reply text without quotes or explanation."
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

    # 2. Dynamic multi-lingual creator engine (never monotonous, randomized variations)
    pool = YOUTUBE_REPLY_POOLS.get(intent, YOUTUBE_REPLY_POOLS["GENERAL"])
    lang_key = "telugu" if lang in ("telugu", "hindi") else "english"
    replies = pool.get(lang_key, pool["english"])
    chosen = random.choice(replies).replace("{author}", clean_author)

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


# ==================== YOUTUBE AUTOMATION CLIENT ====================

class YouTubeAutomationClient:
    """
    Client for YouTube Data API v3 operations:
    - OAuth token auto-refresh with 5-minute safety threshold
    - Comment thread fetching across channel
    - Multilingual AI evaluation with duplicate prevention
    - Safe testing mode guard (never sends live replies unless explicitly approved and enabled)
    - Public comment reply posting
    """
    def __init__(self, db, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.db = db
        self.client_id = (client_id or os.environ.get("GOOGLE_CLIENT_ID") or os.environ.get("YOUTUBE_CLIENT_ID") or "").strip()
        self.client_secret = (client_secret or os.environ.get("GOOGLE_CLIENT_SECRET") or os.environ.get("YOUTUBE_CLIENT_SECRET") or "").strip()

    async def get_valid_access_token(self) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Retrieves the valid access token, auto-refreshing via Google OAuth if expired or expiring soon.
        """
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
                # Refresh if within 300 seconds (5 mins) of expiration
                if (exp - now).total_seconds() < 300:
                    is_expired = True
            except Exception:
                pass

        if is_expired:
            if not refresh_token:
                return False, None, "Access token has expired and no refresh token is stored. Please reconnect YouTube."
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
        """
        Fetches the latest comment threads related to the connected channel via YouTube Data API v3.
        """
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
                        comment_text = top_comment.get("textDisplay") or top_comment.get("textOriginal", "")
                        parsed.append({
                            "id": f"yt_{comm_id}",
                            "comment_id": comm_id,
                            "thread_id": comm_id,
                            "platform": "youtube",
                            "author_name": author_name,
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
        """
        Posts a public reply to a YouTube comment thread via YouTube Data API v3.
        """
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
        Synchronizes latest comments, evaluates with multilingual AI, and respects safe testing mode:
        - If safe_testing_mode is True: generates AI reply preview, stores as 'preview_ready', NEVER posts to YouTube.
        - If safe_testing_mode is False and auto_reply_enabled is True:
            - If sensitive (Price, Booking, Course): flags as 'pending_approval' for human verification.
            - If non-sensitive: posts public reply to YouTube, marks as 'auto_replied'.
        - Prevents duplicate replies by checking stored comment IDs.
        """
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

        for comm in comments:
            comm_id = comm["id"]
            existing = None
            if self.db is not None:
                existing = await self.db.social_comments.find_one({"id": comm_id})

            # If already processed and has a terminal status, preserve it
            if existing and existing.get("status") in ("approved", "auto_replied", "manual_replied", "dismissed"):
                continue

            # Run AI multi-lingual evaluation
            evaluation = await generate_youtube_ai_reply(
                comment_text=comm["comment_text"],
                author_name=comm["author_name"],
                gemini_api_key=gemini_api_key
            )

            status = "preview_ready"
            published_reply_id = None
            replied_at = None

            # Determine workflow based on sensitivity and safe mode
            if evaluation["is_sensitive"]:
                status = "pending_approval"
                pending_count += 1
            elif safe_testing_mode:
                # Safe testing mode: preview only
                status = "preview_ready"
                preview_count += 1
            elif auto_reply_enabled:
                # Live auto-reply mode (only when safe_mode is explicitly turned off)
                post_ok, reply_ref, post_err = await self.post_reply(comm["thread_id"], evaluation["reply_text"])
                if post_ok:
                    status = "auto_replied"
                    published_reply_id = reply_ref
                    replied_at = now_iso
                    auto_replied_count += 1
                else:
                    status = "failed"
                    evaluation["publish_error"] = post_err
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
            await self.db.social_settings.update_one(
                {"platform": "youtube"},
                {
                    "$set": {
                        "platform": "youtube",
                        "auto_reply_enabled": auto_reply_enabled,
                        "safe_testing_mode": safe_testing_mode,
                        "last_sync_at": now_iso,
                        "updated_at": now_iso
                    },
                    "$inc": {
                        "total_comments_synced": new_count,
                        "total_replies_published": auto_replied_count
                    }
                },
                upsert=True
            )

        return {
            "success": True,
            "total_fetched": len(comments),
            "new_evaluated": new_count,
            "previews_ready": preview_count,
            "pending_approval": pending_count,
            "auto_replied": auto_replied_count,
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
        """
        Approves an AI suggested reply (or manual edit) and publishes it.
        If safe_testing_mode is True, simulates approval without calling YouTube API.
        """
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
        """
        Sends an explicit manual reply to a comment thread.
        """
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
        """Dismisses comment from active action queues."""
        if self.db is None:
            return False
        now_iso = datetime.now(timezone.utc).isoformat()
        await self.db.social_comments.update_one(
            {"id": comment_id},
            {"$set": {"status": "dismissed", "dismissed_at": now_iso, "updated_at": now_iso}}
        )
        return True


async def get_youtube_client(db=None) -> YouTubeAutomationClient:
    """Helper factory for YouTubeAutomationClient."""
    return YouTubeAutomationClient(db)


async def get_youtube_automation_settings(db) -> Dict[str, Any]:
    """Retrieves current YouTube automation settings or sensible defaults."""
    default_settings = {
        "platform": "youtube",
        "auto_reply_enabled": False,
        "safe_testing_mode": True,
        "sync_interval_minutes": 15,
        "ai_provider": "gemini_with_creator_fallback",
        "last_sync_at": None,
        "total_comments_synced": 0,
        "total_replies_published": 0
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
    """Updates YouTube automation settings in database."""
    if db is None:
        return updates

    allowed_keys = {
        "auto_reply_enabled",
        "safe_testing_mode",
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
