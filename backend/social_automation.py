"""
Pranvith DOP Social Media Automation Engine
Meta Graph API (Instagram Business) Integration, Language Detection, Keyword Mapping, and Admin Approval Flow.
Supports Instagram now; extensible to Facebook and YouTube.
"""
import os
import re
import uuid
import logging
from datetime import datetime, timezone
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
    "bagundi", "bavundi", "anna", "bro", "dharalu", "dara", "entha", "emi",
    "అలా", "ఎలా", "ఏంటి", "చెప్పండి", "ఉంది", "ఉందా", "కావాలి", "బాగుంటుంది", "తెలుగు", "పెళ్లి",
    "బాగుంది", "ఎంత", "ధర"
]

def detect_comment_language(text: str) -> str:
    """Detects if comment is in Telugu, English, or Hindi."""
    raw = (text or "").lower()
    
    # 1. Native script
    if re.search(r'[\u0C00-\u0C7F]', raw):
        return "telugu"
    if re.search(r'[\u0900-\u097F]', raw):
        return "hindi"
        
    # 2. Explicit or Romanized Telugu
    telugu_score = sum(1 for w in TELUGU_WORDS if re.search(rf'\b{re.escape(w)}\b', raw))
    if telugu_score >= 1:
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
