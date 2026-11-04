"""
Pranvith DOP Camera AI PRO - Comprehensive Multi-Lingual Camera & Cinematography Intelligence Engine
Supports Nikon, Sony, Canon, DJI, Lenses, Lighting, Shooting Scenarios, Multilingual (Telugu, English, Hindi).
"""
import re
from typing import Dict, List, Optional, Tuple, Any

# ==================== CAMERA SPECIFICATIONS & HARD FACTS ====================

CAMERA_DATABASE: Dict[str, Dict[str, Any]] = {
    "nikon_z6iii": {
        "brand": "Nikon",
        "model": "Nikon Z6III",
        "aliases": ["z6iii", "z6 iii", "z63", "z 6 iii", "nikon z6 3", "nikon z6iii"],
        "sensor": "24.5MP Partially-Stacked CMOS (Full-Frame)",
        "mount": "Nikon Z-Mount (55mm diameter, 16mm flange distance)",
        "max_video": "6K 60p N-RAW (12-bit internal), 4K 120p (with 1.5x DX Crop), 4K 60p (Oversampled 6K, Full-Frame)",
        "slow_motion": "4K up to 120fps (1.5x DX Crop in N-RAW / ProRes 422 HQ / H.265), Full HD up to 240fps",
        "raw_recording": "Internal 12-bit N-RAW up to 6K 60p, 12-bit ProRes RAW HQ up to 6K 30p (internal!)",
        "codecs": ["N-RAW (12-bit)", "ProRes RAW HQ (12-bit)", "ProRes 422 HQ (10-bit)", "H.265 / HEVC (10-bit & 8-bit)", "H.264 (8-bit)"],
        "color_profiles": ["N-Log", "HLG", "Flat", "Standard SDR"],
        "base_isos": "Dual Base ISO in N-Log: ISO 800 (Low Base) & ISO 6,400 (High Base)",
        "autofocus": "9 Subject-Detection Types (People, Dogs, Cats, Birds, Cars, Bikes, Trains, Planes), 3D-Tracking, -10 EV Low-Light sensitivity",
        "evf": "5.76M-dot, 4,000 nits brightness, DCI-P3 color gamut, 120fps refresh rate",
        "card_slots": "Dual Slots: 1x CFexpress Type B / XQD + 1x SD (UHS-II)",
        "stabilization": "8.0 stops 5-axis In-Body Image Stabilization (IBIS) with Focus Point VR",
        "battery": "EN-EL15c (~390 shots / ~100 mins continuous 4K video)",
        "key_strengths": "Ultra-fast readout, internal RAW, brightest EVF, class-leading 8-stop IBIS, 4K 120p slow-mo",
        "limitations": "4K 120p requires a 1.5x DX/Super35 crop; CFexpress Type B card required for internal RAW bitrates",
    },
    "nikon_z8": {
        "brand": "Nikon",
        "model": "Nikon Z8",
        "aliases": ["z8", "z 8", "nikon z8"],
        "sensor": "45.7MP Stacked CMOS (Full-Frame, No mechanical shutter)",
        "mount": "Nikon Z-Mount",
        "max_video": "8.3K 60p N-RAW (12-bit), 4.1K 120p N-RAW (Full-Frame uncropped), 4K 120p Full-Frame",
        "slow_motion": "4K up to 120fps (Full-Frame uncropped), Full HD up to 120fps",
        "raw_recording": "Internal 12-bit N-RAW (8.3K 60p, 4.1K 120p), 12-bit ProRes RAW HQ (4.1K 60p)",
        "color_profiles": ["N-Log", "HLG", "SDR"],
        "base_isos": "Dual Base ISO in N-Log: ISO 800 (Low Base) & ISO 4,000 (High Base)",
        "autofocus": "Deep-learning subject detection with aircraft/vehicle/human/animal tracking down to -9 EV",
        "card_slots": "Dual Slots: 1x CFexpress Type B + 1x SD (UHS-II)",
        "stabilization": "6.0 stops 5-axis IBIS with Synchro VR",
        "battery": "EN-EL15c",
        "key_strengths": "8K internal RAW, uncropped 4K 120p, zero shutter distortion, cinema-grade body",
        "limitations": "Heavier body (~910g), higher power consumption when recording 8K RAW",
    },
    "nikon_z9": {
        "brand": "Nikon",
        "model": "Nikon Z9",
        "aliases": ["z9", "z 9", "nikon z9"],
        "sensor": "45.7MP Full-Frame Stacked CMOS (Flagship, integrated vertical grip)",
        "mount": "Nikon Z-Mount",
        "max_video": "8.3K 60p N-RAW (12-bit), 4.1K 120p N-RAW, 4K 120p uncropped",
        "raw_recording": "Internal N-RAW 8.3K 60p and ProRes RAW HQ",
        "base_isos": "N-Log Dual Base: ISO 800 & ISO 4,000",
        "card_slots": "Dual CFexpress Type B slots (both high-speed)",
        "battery": "EN-EL18d (huge capacity for all-day shoot)",
        "key_strengths": "Unlimited 8K recording without overheating, dual CFexpress B, ultimate rugged build",
    },
    "nikon_zf": {
        "brand": "Nikon",
        "model": "Nikon Zf",
        "aliases": ["zf", "z f", "nikon zf"],
        "sensor": "24.5MP BSI CMOS (Full-Frame)",
        "mount": "Nikon Z-Mount",
        "max_video": "4K 30p uncropped (oversampled 6K), 4K 60p (1.5x DX Crop)",
        "color_profiles": ["N-Log (10-bit H.265 internal)", "HLG", "Monochrome"],
        "base_isos": "ISO 800 in N-Log",
        "card_slots": "1x SD (UHS-II) + 1x MicroSD (UHS-I)",
        "stabilization": "8.0 stops 5-axis IBIS with Focus Point VR",
        "key_strengths": "Vintage retro dial styling, 8.0 stops IBIS, dedicated Black & White switch, 96MP Pixel Shift",
    },
    "nikon_z50ii": {
        "brand": "Nikon",
        "model": "Nikon Z50II",
        "aliases": ["z50ii", "z50 ii", "z50 mark ii", "nikon z50ii"],
        "sensor": "20.9MP APS-C (DX) CMOS",
        "mount": "Nikon Z-Mount",
        "max_video": "4K 30p uncropped (oversampled 5.6K), 4K 60p (with 1.5x additional crop)",
        "color_profiles": ["N-Log 10-bit", "N-Rec.709", "Picture Controls"],
        "base_isos": "ISO 400 (SDR) / ISO 800 (N-Log)",
        "card_slots": "1x SD (UHS-II)",
        "key_strengths": "EXPEED 7 processor with 9-subject autofocus detection, dedicated Picture Control button, product review mode for creators",
    },
    "nikon_z5": {
        "brand": "Nikon",
        "model": "Nikon Z5 / Z5II",
        "aliases": ["z5", "z 5", "nikon z5", "z5ii", "z5 ii"],
        "sensor": "24.3MP Full-Frame CMOS",
        "mount": "Nikon Z-Mount",
        "max_video": "4K 30p (1.7x crop on Z5) | 1080p 60p uncropped",
        "card_slots": "Dual SD (UHS-II)",
        "key_strengths": "Affordable entry into full-frame Nikon Z photography, dual SD card slots, solid 5-axis IBIS",
        "limitations": "4K video incurs a 1.7x crop on original Z5; video focused creators should consider Z6III or Zf.",
    },
    "nikon_z6ii": {
        "brand": "Nikon",
        "model": "Nikon Z6II",
        "aliases": ["z6ii", "z6 ii", "z62", "z6 2", "nikon z6ii", "nikon z6 ii", "nikon z6 2", "z6", "nikon z6"],
        "sensor": "24.5MP BSI Full-Frame CMOS",
        "mount": "Nikon Z-Mount",
        "max_video": "4K 60p (with 1.5x DX Crop), 4K 30p Full-Frame uncropped",
        "raw_recording": "12-bit RAW output via HDMI (ProRes RAW / Blackmagic RAW with paid upgrade)",
        "color_profiles": ["N-Log (10-bit via HDMI)", "Flat", "HLG", "Standard"],
        "base_isos": "Base ISO 100 (SDR) / ISO 800 in N-Log (via HDMI recorder)",
        "stabilization": "5.0 stops 5-axis IBIS",
        "card_slots": "Dual Slots: 1x CFexpress Type B + 1x SD (UHS-II)",
        "key_strengths": "Dual EXPEED 6 processors, reliable full-frame 4K 30p, clean HDMI 10-bit output",
        "limitations": "N-Log 10-bit is available via external HDMI recorder only (Atomos Ninja); internal video is 8-bit Flat/Standard.",
    },
    "sony_fx3": {
        "brand": "Sony",
        "model": "Sony FX3 (Cinema Line)",
        "aliases": ["fx3", "fx-3", "sony fx3", "ilme-fx3"],
        "sensor": "12.1MP Full-Frame Back-Illuminated Exmor R CMOS",
        "mount": "Sony E-Mount",
        "max_video": "4K up to 120p (Full-Frame, ~1.1x crop at 120p only), 10-bit 4:2:2 All-Intra",
        "slow_motion": "4K 120fps (5x slow-mo on 24p timeline) with continuous autofocus and audio",
        "raw_recording": "16-bit RAW output via full-size HDMI to compatible recorder (Atomos Ninja)",
        "color_profiles": ["S-Log3 / S-Gamut3.Cine", "S-Cinetone", "HLG"],
        "base_isos": "Dual Base ISO in S-Log3: ISO 800 (Low Base) & ISO 12,800 (High Base / Low-Light Beast)",
        "cooling": "Internal active cooling fan for unlimited 4K 60p/120p recording with no overheating",
        "audio": "Removable top handle with 2x XLR/TRS combo inputs (24-bit 4-channel audio)",
        "autofocus": "Real-time Eye AF (Humans/Animals/Birds), Touch Tracking, AF Transition Speed control",
        "card_slots": "Dual Slots: Both accept either CFexpress Type A or SD (UHS-II)",
        "stabilization": "5.5 stops 5-axis IBIS with Active SteadyShot Mode",
        "key_strengths": "Best low-light performance on market at ISO 12,800, built-in active cooling, XLR handle, compact cage-free design",
        "limitations": "No electronic variable ND (unlike FX6), 12MP resolution limits high-res photography",
    },
    "sony_fx6": {
        "brand": "Sony",
        "model": "Sony FX6 (Cinema Line)",
        "aliases": ["fx6", "fx-6", "sony fx6", "ilme-fx6"],
        "sensor": "10.2MP Full-Frame Back-Illuminated CMOS",
        "mount": "Sony E-Mount",
        "max_video": "4K 120p Full-Frame, DCI 4K up to 60p, 10-bit 4:2:2",
        "color_profiles": ["S-Log3 / S-Gamut3.Cine", "S-Cinetone"],
        "base_isos": "Dual Base ISO in S-Log3: ISO 800 & ISO 12,800 (clean up to 25,600)",
        "built_in_nd": "Electronic Variable ND (1/4 to 1/128 ND) with Auto ND mode",
        "outputs": "12G-SDI, HDMI, timecode in/out, dual XLR inputs on body",
        "key_strengths": "Built-in electronic variable ND, SDI output for broadcast, dual base ISO 800/12,800",
    },
    "sony_fx30": {
        "brand": "Sony",
        "model": "Sony FX30 (Cinema Line Super35)",
        "aliases": ["fx30", "fx-30", "sony fx30"],
        "sensor": "26MP APS-C / Super35 Exmor R BSI CMOS",
        "mount": "Sony E-Mount (APS-C / E)",
        "max_video": "4K 60p oversampled from 6K, 4K 120p (with 1.62x crop)",
        "color_profiles": ["S-Log3 / S-Gamut3.Cine", "S-Cinetone"],
        "base_isos": "Dual Base ISO in S-Log3: ISO 800 & ISO 2,500",
        "cooling": "Active fan for unlimited continuous shooting",
        "key_strengths": "Cinema Line ergonomics, dual base ISO 800/2500, affordable entry into professional 10-bit S-Log3",
        "limitations": "APS-C sensor (1.5x crop vs full-frame), 4K 120p has additional 1.62x crop",
    },
    "sony_a7iv": {
        "brand": "Sony",
        "model": "Sony A7 IV (ILCE-7M4)",
        "aliases": ["a7iv", "a7m4", "a74", "a7 iv", "a7 4", "m4", "sony iv"],
        "sensor": "33MP Full-Frame Exmor R BSI CMOS",
        "mount": "Sony E-Mount",
        "max_video": "4K 30p full-frame (7K oversampling, no crop), 4K 60p (with 1.5x Super35 crop)",
        "slow_motion": "4K 60fps (1.5x crop), Full HD up to 120fps (uncropped)",
        "color_profiles": ["S-Log3 / S-Gamut3.Cine", "S-Cinetone", "HLG"],
        "base_isos": "Dual Base ISO in S-Log3: ISO 800 (Low Base) & ISO 3,200 (High Base)",
        "autofocus": "759 phase-detection points, Real-time Eye AF for Humans, Animals, Birds",
        "card_slots": "Slot 1: CFexpress Type A or SD UHS-II | Slot 2: SD UHS-II",
        "key_strengths": "Outstanding 33MP photo + 10-bit 4:2:2 video hybrid, focus breathing compensation",
        "limitations": "4K 60p incurs a 1.5x Super35 crop; rolling shutter noticeable in fast pans",
    },
    "sony_a7iii": {
        "brand": "Sony",
        "model": "Sony A7 III (ILCE-7M3)",
        "aliases": ["a7iii", "a7 iii", "a73", "a7 3", "sony a7iii", "sony a7 iii", "sony a7 3", "a7m3", "a7 m3"],
        "sensor": "24.2MP Back-Illuminated Full-Frame Exmor R CMOS",
        "mount": "Sony E-Mount",
        "max_video": "4K 24p (uncropped 6K oversampled), 4K 30p (1.2x crop), Full HD up to 120fps",
        "color_profiles": ["S-Log2", "S-Log3", "HLG", "Cine4"],
        "base_isos": "Base ISO 800 in S-Log2 / S-Log3, Base ISO 100 in Standard/HLG",
        "stabilization": "5.0 stops 5-axis SteadyShot Inside",
        "card_slots": "Dual SD card slots (Slot 1 UHS-II)",
        "key_strengths": "Legendary battery life (NP-FZ100), 6K to 4K 24p oversampling, dual card slots, great low light",
        "limitations": "8-bit 4:2:0 internal video (S-Log2 or HLG recommended to avoid 8-bit banding instead of aggressive S-Log3)",
    },
    "sony_a7siii": {
        "brand": "Sony",
        "model": "Sony A7S III",
        "aliases": ["a7siii", "a7s3", "a7s 3", "a7s iii"],
        "sensor": "12.1MP Full-Frame BSI CMOS",
        "mount": "Sony E-Mount",
        "max_video": "4K 120p 10-bit 4:2:2 All-Intra",
        "color_profiles": ["S-Log3", "S-Cinetone"],
        "base_isos": "Dual Base ISO in S-Log3: ISO 800 & ISO 12,800",
        "evf": "9.44M-dot QXGA OLED viewfinder (highest in class)",
        "key_strengths": "Clean low light at ISO 12,800, identical video engine to FX3, incredible 9.44M EVF",
    },
    "sony_a7v": {
        "brand": "Sony",
        "model": "Sony A7 V (Anticipated / Unreleased)",
        "aliases": ["a7v", "a7 v", "sony a7v", "a7 5", "a7m5"],
        "status": "Unreleased / Industry Speculation",
        "guidance": "Sony has not officially released or announced confirmed specifications for the Sony A7 V. For verified production gear today, rely on the Sony A7 IV, Sony FX3, or Sony A7S III.",
    },
    "canon_r5": {
        "brand": "Canon",
        "model": "Canon EOS R5",
        "aliases": ["eos r5", "canon r5", "r5"],
        "sensor": "45MP Full-Frame Dual Pixel CMOS",
        "mount": "Canon RF Mount",
        "max_video": "8K 30p RAW internal, 4K 120p full-frame, 4K 60p HQ oversampled from 8K",
        "color_profiles": ["C-Log", "C-Log3", "HDR PQ"],
        "base_isos": "C-Log3 Native Base: ISO 800",
        "card_slots": "1x CFexpress Type B + 1x SD (UHS-II)",
        "key_strengths": "8K internal RAW, beautiful Canon colors, Dual Pixel AF II",
        "limitations": "Thermal recording limits on early firmware when shooting 8K or 4K HQ",
    },
    "canon_r5_ii": {
        "brand": "Canon",
        "model": "Canon EOS R5 Mark II",
        "aliases": ["r5 mark ii", "r5m2", "r5 ii", "canon r5 ii", "r5 mark 2"],
        "sensor": "45MP Back-Illuminated Stacked Full-Frame CMOS",
        "mount": "Canon RF Mount",
        "max_video": "8K 60p RAW internal, 4K 120p with audio, 2K up to 240p",
        "color_profiles": ["C-Log2 (16+ stops dynamic range!)", "C-Log3", "Custom Picture"],
        "base_isos": "Dual Base ISOs in C-Log2 / C-Log3: Base ISO 800 & Base ISO 3,200",
        "cooling": "Built-in airflow exhaust ducts + optional cooling fan battery grip",
        "key_strengths": "C-Log2 with 16-stop dynamic range, stacked sensor with zero rolling shutter, Eye-Control AF",
    },
    "canon_r6_ii": {
        "brand": "Canon",
        "model": "Canon EOS R6 Mark II",
        "aliases": ["r6 mark ii", "r6m2", "r6 ii", "canon r6 ii", "r6 2", "canon r6", "eos r6", "r6"],
        "sensor": "24.2MP Full-Frame CMOS",
        "mount": "Canon RF Mount",
        "max_video": "4K 60p uncropped oversampled from 6K, 6K RAW output via HDMI to Atomos",
        "slow_motion": "Full HD up to 180fps",
        "color_profiles": ["C-Log3", "HDR PQ"],
        "base_isos": "Base ISO 800 in C-Log3",
        "key_strengths": "Uncropped 4K 60p with 6K oversampling, no overheating issues, class-leading autofocus tracking",
    },
    "canon_r7": {
        "brand": "Canon",
        "model": "Canon EOS R7",
        "aliases": ["eos r7", "canon r7", "r7"],
        "sensor": "32.5MP APS-C CMOS",
        "mount": "Canon RF / RF-S",
        "max_video": "4K 60p (uncropped), 4K 30p Fine (oversampled 7K)",
        "color_profiles": ["C-Log3 10-bit"],
        "base_isos": "Base ISO 800 in C-Log3",
        "card_slots": "Dual SD (UHS-II)",
        "key_strengths": "32.5MP high-resolution APS-C, up to 7-stop IBIS, dual SD cards, uncropped 4K 60p",
    },
    "dji_rs4": {
        "brand": "DJI",
        "model": "DJI RS 4 / RS 4 Pro Gimbal",
        "aliases": ["dji rs4", "rs4", "rs 4", "rs4 pro", "rs 4 pro", "dji rs 4"],
        "payload": "RS 4: 3.0 kg (6.6 lbs) | RS 4 Pro: 4.5 kg (10 lbs) carbon fiber arms",
        "vertical_shooting": "2nd-Gen native horizontal/vertical quick-release switch without rebalancing",
        "focus_support": "DJI Focus Pro LiDAR (76,800 ranging points, 20-meter range for manual cinema lenses)",
        "motor_torque": "RS 4 Pro features 20% motor torque increase for cinema camera payloads",
        "key_strengths": "Automated axis locks, native vertical switch for Reels/TikTok, LiDAR autofocus integration",
    },
    "dji_rs3": {
        "brand": "DJI",
        "model": "DJI RS 3 / RS 3 Pro Gimbal",
        "aliases": ["dji rs3", "rs3", "rs 3", "rs3 pro", "rs 3 pro", "ronin rs3"],
        "payload": "RS 3: 3.0 kg | RS 3 Pro: 4.5 kg carbon fiber",
        "key_strengths": "SuperSmooth stabilization mode, automated axis locks, Bluetooth shutter control",
    },
    "dji_ronin_4d": {
        "brand": "DJI",
        "model": "DJI Ronin 4D (6K / 8K Cinema Camera)",
        "aliases": ["ronin 4d", "ronin4d", "dji 4d"],
        "sensor": "Full-Frame Zenmuse X9-6K / X9-8K",
        "stabilization": "Revolutionary 4-Axis Active Stabilization (adds Z-axis vertical stabilization to eliminate walking shake)",
        "codecs": "Internal Apple ProRes 422 HQ / Apple ProRes RAW / CinemaDNG",
        "built_in_nd": "Built-in 9-stop physical ND filters (ND 0.3 to ND 2.7)",
        "focus": "Integrated LiDAR range finder waveform focusing",
    },
    "dji_drones": {
        "brand": "DJI",
        "model": "DJI Cinematography Drones (Mavic 3 Pro, Air 3, Mini 4 Pro)",
        "aliases": ["dji drone", "dji drones", "mavic 3", "mavic 3 pro", "air 3", "mini 4 pro"],
        "mavic_3_pro": "Triple camera: Hasselblad 20MP 4/3 CMOS (24mm f/2.8-f/11), 70mm f/2.8 3x tele, 166mm 7x tele. 5.1K 50p, 4K 120p, 10-bit D-Log, D-Log M, HLG.",
        "mini_4_pro": "<249g ultralight, True Vertical 4K 60p shooting, 10-bit D-Log M, omnidirectional obstacle sensing.",
        "air_3": "Dual primary cameras (24mm wide + 70mm medium tele), 48MP photos, 4K 60p HDR, 10-bit D-Log M.",
    },
}

# ==================== LENS KNOWLEDGE BASE ====================

LENS_RECOMMENDATIONS = {
    "nikon_z": {
        "wedding_cinematography": [
            {"lens": "NIKKOR Z 24-70mm f/2.8 S", "role": "The ultimate wedding workhorse. Sharp edge-to-edge, fast autofocus, multi-focusing stepping motors."},
            {"lens": "NIKKOR Z 35mm f/1.8 S", "role": "Ideal for documentary wedding moments, low-light baraat, prep sequences with cinematic context."},
            {"lens": "NIKKOR Z 50mm f/1.8 S or 50mm f/1.2 S", "role": "Superb bokeh, natural perspective, creamy subject separation for bride/groom portraits."},
            {"lens": "NIKKOR Z 85mm f/1.8 S or 85mm f/1.2 S", "role": "Cinematic compressed emotional portraits, vows, rings, and stage close-ups."},
            {"lens": "NIKKOR Z 70-200mm f/2.8 VR S", "role": "Long-range ceremonies, candid emotional moments from afar without disturbing rituals."},
            {"lens": "NIKKOR Z 28-75mm f/2.8 (Budget Choice)", "role": "Lightweight, affordable f/2.8 constant zoom for versatile event filming."},
        ],
        "low_light": [
            {"lens": "NIKKOR Z 50mm f/1.2 S", "role": "The absolute low-light king on Z-mount. Incredible light transmission at f/1.2 with surgical sharpness."},
            {"lens": "NIKKOR Z 35mm f/1.8 S", "role": "Compact, fast, lightweight prime with virtually zero focus breathing in dim wedding halls."},
            {"lens": "NIKKOR Z 85mm f/1.8 S", "role": "Low-light portrait prime that renders dreamy falloff in candlelit receptions."},
        ],
    },
    "sony_e": {
        "wedding_cinematography": [
            {"lens": "Sony FE 24-70mm f/2.8 GM II", "role": "Industry standard wedding zoom. World's lightest f/2.8 24-70mm, 4 XD linear motors."},
            {"lens": "Tamron 35-150mm f/2-f/2.8 Di III VXD", "role": "The king of single-lens event coverage. Replaces 2-3 lenses during fast-moving events."},
            {"lens": "Sony FE 35mm f/1.4 GM", "role": "Compact, stunning low-light, dreamlike falloff for story-led cinematic wedding shots."},
            {"lens": "Sony FE 50mm f/1.2 GM", "role": "Breathtaking depth of field, razor-sharp wide open at f/1.2."},
            {"lens": "Sigma 24-70mm f/2.8 DG DN Art II", "role": "Top-tier optical performance at a fraction of GM cost."},
            {"lens": "Sony FE 70-200mm f/2.8 GM OSS II", "role": "Ultralight telephoto zoom for candid stage and ceremony coverage."},
        ],
        "low_light": [
            {"lens": "Sony FE 50mm f/1.2 GM", "role": "Industry benchmark low-light cinema lens. Lets in 4x more light than f/2.8 zooms."},
            {"lens": "Sony FE 35mm f/1.4 GM", "role": "Crisp wide low-light performance with dual XD linear motors."},
            {"lens": "Sigma 85mm f/1.4 DG DN Art", "role": "Dreamy compression and exceptional low-light gathering for stage portraits."},
        ],
        "budget": [
            {"lens": "Tamron 28-75mm f/2.8 G2", "role": "Best budget full-frame wedding & commercial lens under ₹70,000."},
            {"lens": "Viltrox 16mm f/1.8 FE", "role": "Budget wide-angle cinema marvel with LCD display and clickless aperture."},
            {"lens": "Sigma 85mm f/1.4 DG DN Art", "role": "Benchmark portrait prime, beautiful oval bokeh."},
        ],
    },
    "canon_rf": {
        "wedding_cinematography": [
            {"lens": "Canon RF 24-70mm f/2.8L IS USM", "role": "5-stop optical IS combined with IBIS for rock-solid handheld event shooting."},
            {"lens": "Canon RF 28-70mm f/2L USM", "role": "A bag of primes in one zoom with revolutionary f/2 aperture throughout."},
            {"lens": "Canon RF 50mm f/1.2L USM", "role": "Creamy magical skin tones and iconic Canon color science."},
            {"lens": "Canon RF 70-200mm f/2.8L IS USM", "role": "Compact telescoping design, unobtrusive ceremony filming."},
        ],
        "low_light": [
            {"lens": "Canon RF 50mm f/1.2L USM", "role": "Legendary low-light gathering, ultra-shallow depth of field, sublime color reproduction."},
            {"lens": "Canon RF 28-70mm f/2L USM", "role": "Full-stop brighter than standard f/2.8 zooms across the entire range."},
            {"lens": "Canon RF 35mm f/1.8 Macro IS STM", "role": "Affordable low-light prime with 5-stop optical stabilization."},
        ]
    }
}

# ==================== SCENARIO SETTINGS RECIPES ====================

SCENARIO_RECIPES = {
    "wedding_cinematography": {
        "title": "Professional Wedding Cinematography Settings",
        "frame_rate": "24fps or 25fps for dialogues/vows/rituals (cinematic cadence) | 50fps/60fps for emotional candid slow-mo",
        "shutter_speed": "1/50s for 24/25fps | 1/100s for 50fps | 1/120s for 60fps (Strict 180° Rule)",
        "aperture": "f/1.8 – f/2.8 for portraits & emotional separation | f/4.0 – f/5.6 for family group stage shots",
        "iso": "Always shoot at camera Base ISO (e.g. Nikon Z6III: ISO 800 or 6400 | Sony FX3: ISO 800 or 12800). Use Variable ND outdoors!",
        "white_balance": "Custom Kelvin (5600K for day outdoors | 3800K-4500K for mixed banquet halls | 3200K for warm halogen/mandap)",
        "autofocus": "Continuous AF (AF-C), Face/Eye Priority: Human. Set AF Transition Speed to Moderate (3/5) so focus racks smoothly without snapping.",
        "picture_profile": "10-bit Log (N-Log on Nikon | S-Log3 on Sony | C-Log3 on Canon). Expose to the right (ETTR +1.0 to +1.7 EV).",
        "resolution": "4K UHD (3840x2160) 10-Bit 4:2:2",
    },
    "indoor_wedding": {
        "title": "Indoor Wedding Cinematography Settings (Banquet Halls & Mandap)",
        "frame_rate": "25fps (in 50Hz countries like India/UK) or 24fps (60Hz countries like USA)",
        "shutter_speed": "1/50s (at 25fps) or 1/100s (at 50fps). Use Variable Shutter / ECS / Synchro Scan to tune out fine LED frequency banding.",
        "aperture": "f/1.8 – f/2.8 on fast primes or f/2.8 zooms to maximize light gathering under dimmer stage lights.",
        "iso": "Switch directly to camera High Base ISO (Sony: ISO 12,800 | Nikon Z6III: ISO 6,400 | Canon R5 II: ISO 3,200). Avoid middle ISOs (like 2,500-6,400 on Sony) where noise is highest!",
        "white_balance": "Manual Kelvin locked between 3800K and 4500K for mixed LED/Tungsten decor, or 3200K for golden mandap fire rituals. Do NOT use Auto WB to prevent fluctuating skin tones.",
        "autofocus": "AF-C with Human Face/Eye Detection. Set AF Tracking Sensitivity to 'Delayed' (3 or 4) so guests walking past do not steal focus from the bride/groom.",
        "picture_profile": "10-bit Log (N-Log / S-Log3 / C-Log3) exposed +1.0 to +1.5 EV over standard meter (ETTR).",
        "resolution": "4K UHD 10-Bit 4:2:2",
    },
    "slow_motion": {
        "title": "Cinematic Slow-Motion Recipe",
        "frame_rate": "50fps / 60fps (smooth 2x-2.5x slow-mo) OR 100fps / 120fps (dramatic 4x-5x slow-mo)",
        "shutter_speed": "1/100s for 50fps | 1/120s for 60fps | 1/200s for 100fps | 1/240s for 120fps",
        "light_compensation": "120fps loses ~2.3 stops of light compared to 24fps. You MUST open aperture by 2 stops or switch to your camera's high Base ISO (e.g. ISO 6400 on Z6III, ISO 12800 on FX3).",
        "timeline_interpretation": "In Premiere Pro / DaVinci Resolve: Right-click footage ➔ Modify ➔ Interpret Footage ➔ Assume 24.0 or 25.0 fps.",
        "crop_warning": "Nikon Z6III crops 1.5x in 4K 120p; Sony A7 IV crops 1.5x in 4K 60p; Sony FX3 / A7S III records 4K 120p with only 1.1x crop.",
    },
    "instagram_reels": {
        "title": "Professional Instagram Reels & Vertical Video Settings",
        "resolution": "1080x1920 (9:16 vertical) or capture 4K UHD and crop in post with safe guides",
        "frame_rate": "30fps or 60fps (Instagram converts all 24fps to 30fps cadence, causing micro-judder on mobile screens; 30fps looks buttery smooth on Instagram!)",
        "shutter_speed": "1/60s for 30fps | 1/120s for 60fps",
        "codec": "H.264 MP4, 15–20 Mbps bitrate (Do NOT upload 100 Mbps 4K directly—Instagram will heavily compress and pixelate it!)",
        "color_profile": "Export in Rec.709 sRGB color space. High contrast, punchy saturation, clean middle greys.",
    },
    "low_light": {
        "title": "Low-Light / Night Cinematography Settings",
        "iso_strategy": "Directly engage the High Base ISO (Sony: ISO 12,800 | Nikon Z6III: ISO 6,400 | Canon: ISO 3,200). Never sit between the two bases where noise is highest!",
        "aperture": "f/1.4 to f/2.0 wide open on fast prime lenses.",
        "shutter_speed": "Keep strictly at 1/50s (for 24/25fps). Never drop below 1/50s or you will get blurry motion trail.",
        "white_balance": "Fix Kelvin to 3200K – 4000K to prevent color tint hunting.",
    }
}

# ==================== LANGUAGE & CONTEXT ENGINE ====================

TELUGU_SPECIFIC_WORDS = [
    "ela", "cheyyali", "cheyali", "cheppandi", "cheppava", "enti", "undha", "undhi", "kavali",
    "baguntundi", "eppudu", "chala", "manchi", "chesukovali", "gurinchi", "pettali", "telugulo",
    "pedithe", "chusthe", "vadali", "vaadali", "pelliki", "pelli", "edhi", "ekkada", "chesi",
    "అలా", "ఎలా", "ఏంటి", "చెప్పండి", "ఉంది", "ఉందా", "కావాలి", "బాగుంటుంది", "తెలుగు", "పెళ్లి"
]

HINDI_SPECIFIC_WORDS = [
    "kaise", "kare", "karna", "karein", "batao", "bataiye", "kya", "hai", "konsa", "kaunsa",
    "accha", "hota", "chahiye", "shadi", "me kaise",
    "कैसा", "कैसे", "करना", "बताओ", "बताइए", "क्या", "है", "कौनसा", "अच्छा", "हिंदी"
]

def detect_language(query: str) -> str:
    """Detects Telugu, Hindi, or English (including Romanized script)."""
    text = query.lower()

    # Explicit language requests have highest priority
    if "telugu" in text or "తెలుగు" in text or "telugulo" in text or "in telugu" in text:
        return "telugu"
    if "hindi" in text or "हिंदी" in text or "hindime" in text or "hindi me" in text or "in hindi" in text:
        return "hindi"
    if "english" in text or "in english" in text:
        return "english"

    # Native script detection
    if re.search(r'[\u0C00-\u0C7F]', query):
        return "telugu"
    if re.search(r'[\u0900-\u097F]', query):
        return "hindi"

    # Count language-specific Romanized words
    telugu_score = sum(1 for w in TELUGU_SPECIFIC_WORDS if re.search(rf'\b{re.escape(w)}\b', text))
    hindi_score = sum(1 for w in HINDI_SPECIFIC_WORDS if re.search(rf'\b{re.escape(w)}\b', text))

    if telugu_score >= 1 and telugu_score >= hindi_score:
        return "telugu"
    if hindi_score >= 1:
        return "hindi"
    return "english"

def extract_camera_context(message: str, history: Optional[List[Dict[str, str]]] = None) -> Optional[str]:
    """Finds if a specific camera model was mentioned in current query or history."""
    all_text = (message or "").lower()
    
    # Check current message first
    for cam_id, data in CAMERA_DATABASE.items():
        for alias in data.get("aliases", []):
            if re.search(rf'\b{re.escape(alias)}\b', all_text):
                return cam_id

    # If not found in current turn, check conversation history in reverse
    if history:
        for turn in reversed(history[-6:]):
            turn_text = (turn.get("text") or turn.get("content") or "").lower()
            for cam_id, data in CAMERA_DATABASE.items():
                for alias in data.get("aliases", []):
                    if re.search(rf'\b{re.escape(alias)}\b', turn_text):
                        return cam_id
    return None

# ==================== RESPONSE BUILDERS ====================

def get_nikon_z6iii_120fps_guide(lang: str = "english") -> str:
    if lang == "telugu":
        return (
            "🎥 **Nikon Z6III లో 4K 120fps రికార్డింగ్ గైడ్:**\n\n"
            "Nikon Z6III లో **4K 120fps** అద్భుతంగా రికార్డ్ చేయవచ్చు! అయితే ఈ ముఖ్యమైన సెట్టింగ్స్ పాటించాలి:\n\n"
            "• **1.5x DX Crop గమనించండి:** 4K 120p లో Nikon Z6III **1.5x DX (Super35) crop** తీసుకుంటుంది. కాబట్టి వైడ్-యాంగిల్ లెన్స్ (ఉదాహరణకు 20mm లేదా 24mm) వాడితే ఫ్రేమింగ్ సరిపోతుంది.\n"
            "• **రికార్డింగ్ ఫార్మాట్:** N-RAW 12-bit (Internal) లేదా ProRes 422 HQ 10-bit లేదా H.265 10-bit ఎంచుకోండి.\n"
            "• **180-డిగ్రీ షట్టర్ రూల్:** 120fps కు షట్టర్ స్పీడ్ ఖచ్చితంగా **1/240s** (లేదా 1/250s) గా సెట్ చేయాలి.\n"
            "• **లైట్ అవసరం (Light Requirement):** షట్టర్ స్పీడ్ 1/240s కావడం వల్ల దాదాపు 2.3 స్టాప్స్ వెలుతురు తగ్గుతుంది. కాబట్టి ఎపర్చర్ ఓపెన్ చేయండి (f/1.8 - f/2.8) లేదా Z6III యొక్క **High Base ISO 6,400** కి మారండి.\n"
            "• **మెమరీ కార్డ్:** హై బిట్‌రేట్ కోసం ఖచ్చితంగా వేగవంతమైన **CFexpress Type B** కార్డ్ అవసరం.\n\n"
            "💡 **సినిమాటిక్ టిప్:** DaVinci Resolve లేదా Premiere Pro లో ఫుటేజ్‌ని 24fps టైమ్‌లైన్‌పై వేసి 'Interpret Footage ➔ 24fps' చేస్తే **5x స్మూత్ డ్రమాటిక్ స్లో మోషన్** వస్తుంది!"
        )
    elif lang == "hindi":
        return (
            "🎥 **Nikon Z6III में 4K 120fps रिकॉर्ड करने का तरीका:**\n\n"
            "Nikon Z6III में 4K 120fps इंटरनल रिकॉर्डिंग उपलब्ध है! ये सेटिंग्स फॉलो करें:\n\n"
            "• **1.5x DX Crop:** 4K 120fps में कैमरा 1.5x DX क्रॉप लेता है।\n"
            "• **शटर स्पीड (180° Rule):** 120fps के लिए शटर स्पीड **1/240s** रखें।\n"
            "• **ISO स्ट्रेटेजी:** हाई फ्रेम रेट में लाइट कम हो जाती है, इसलिए N-Log में इसके **High Base ISO 6,400** पर स्विच करें।\n"
            "• **कोडेक:** N-RAW 12-bit या ProRes 422 HQ / H.265 10-bit सिलेक्ट करें।\n"
            "• **मेमोरी कार्ड:** CFexpress Type B कार्ड का उपयोग करें।"
        )
    else:
        return (
            "🎥 **How to Record 4K 120fps on Nikon Z6III:**\n\n"
            "The Nikon Z6III natively supports high-speed **4K 120p** recording internally. Here is the verified technical guide:\n\n"
            "| Setting | Recommended Value | Reason |\n"
            "|---|---|---|\n"
            "| **Resolution & Frame Rate** | 4K UHD @ 120p | Enables 5x cinematic slow motion on a 24p timeline |\n"
            "| **Sensor Area / Crop** | 1.5x DX (Super35) | Z6III requires a 1.5x crop for 4K 120p |\n"
            "| **Codec** | N-RAW 12-bit or ProRes 422 HQ / H.265 | Highest dynamic range & 10-bit/12-bit color |\n"
            "| **Shutter Speed** | **1/240s** (or 1/250s) | Strict 180° shutter rule for natural motion cadence |\n"
            "| **Base ISO in N-Log** | **ISO 6,400** (High Base) | 1/240s shutter loses ~2.3 stops of light; jump to 2nd Base ISO for zero noise |\n"
            "| **Media Requirement** | High-speed CFexpress Type B card | Required for continuous 120p data throughput |\n\n"
            "🎬 **Editing Workflow:** In Premiere Pro or DaVinci Resolve, right-click the clip ➔ *Modify ➔ Interpret Footage ➔ Assume 24.0 fps* to get silky-smooth 5x slow motion."
        )

def get_180_shutter_rule_guide(lang: str = "english") -> str:
    if lang == "telugu":
        return (
            "📐 **180-డిగ్రీ షట్టర్ రూల్ (180° Shutter Rule) అంటే ఏమిటి?**\n\n"
            "సినిమాటోగ్రఫీలో కంటికి సహజమైన మోషన్ బ్లర్ (Natural Motion Blur) కనిపించడానికి 180° షట్టర్ రూల్ ఉపయోగిస్తారు.\n\n"
            "• **సింపుల్ ఫార్ములా:**\n"
            "  $$\\text{Shutter Speed} = \\frac{1}{2 \\times \\text{Frame Rate}}$$\n\n"
            "• **ఫ్రేమ్ రేట్ ప్రకారం సెట్టింగ్స్:**\n"
            "  - **24 fps** (సినిమాటిక్ డైలాగ్స్): షట్టర్ **1/50s** (లేదా 1/48s)\n"
            "  - **25 fps** (ఇండియన్/PAL స్టాండర్డ్): షట్టర్ **1/50s**\n"
            "  - **50 fps** (2x స్లో-మో): షట్టర్ **1/100s**\n"
            "  - **60 fps** (2.5x స్లో-మో): షట్టర్ **1/120s**\n"
            "  - **120 fps** (5x సూపర్ స్లో-మో): షట్టర్ **1/240s**\n\n"
            "⚠️ **ముఖ్యమైన రూల్:** ఎండలో (Daylight) వీడియో తీసేటప్పుడు ఎక్స్పోజర్ తగ్గించడానికి షట్టర్ స్పీడ్‌ని పెంచకూడదు! షట్టర్ స్పీడ్ పెంచితే వీడియో రోబోటిక్/స్ట్రటర్ అవుతుంది. ఎక్స్పోజర్ తగ్గించడానికి **ND Filter (Neutral Density)** వాడాలి!"
        )
    else:
        return (
            "📐 **The 180-Degree Shutter Rule Explained:**\n\n"
            "The 180° shutter rule is the foundational cinematography principle that produces organic, natural motion blur mimicking how the human eye perceives movement.\n\n"
            "### Formula:\n"
            "$$\\text{Shutter Speed} = \\frac{1}{2 \\times \\text{Frame Rate}}$$\n\n"
            "### Quick Reference Guide:\n"
            "| Frame Rate | Shutter Speed | Best Used For |\n"
            "|---|---|---|\n"
            "| **24 fps** | **1/50s** (or 1/48s) | Traditional Hollywood cinematic narrative |\n"
            "| **25 fps** | **1/50s** | PAL Standard (India/Europe) anti-flicker standard |\n"
            "| **50 fps** | **1/100s** | 2x PAL smooth slow-motion |\n"
            "| **60 fps** | **1/120s** | 2.5x cinematic slow motion & smooth mobile video |\n"
            "| **120 fps** | **1/240s** (or 1/250s) | 5x dramatic slow-motion action shots |\n\n"
            "💡 **Pro Tip:** Never use your shutter speed to darken bright daylight footage—that causes jittery, staccato motion! Keep your shutter locked to the 180° rule and control exposure with a **Variable ND Filter**."
        )

def get_aperture_guide(lang: str = "english") -> str:
    if lang == "telugu":
        return (
            "📸 **ఎపర్చర్ (Aperture) అంటే ఏమిటి? (సరళమైన తెలుగులో):**\n\n"
            "ఎపర్చర్ అంటే కెమెరా లెన్స్ లోపల ఉండే ఒక కిటికీ (Iris/Opening). ఇది కెమెరా సెన్సార్‌పై ఎంత వెలుతురు పడాలో మరియు బ్యాక్‌గ్రౌండ్ ఎంత బ్లర్ (Bokeh) అవ్వాలో నిర్ణయిస్తుంది.\n\n"
            "• **f-number (f-stop):**\n"
            "  - **చిన్న నంబర్ (f/1.4, f/1.8, f/2.8) ➔ పెద్ద ఓపెనింగ్:** ఎక్కువ వెలుతురు లోపలికి వస్తుంది. బ్యాక్‌గ్రౌండ్ అందంగా బ్లర్ అయి సబ్జెక్ట్ పాప్ అవుతుంది (పోర్ట్రెయిట్స్, వెడ్డింగ్ క్లోజప్స్ కు పర్ఫెక్ట్!).\n"
            "  - **పెద్ద నంబర్ (f/8, f/11, f/16) ➔ చిన్న ఓపెనింగ్:** తక్కువ వెలుతురు వస్తుంది. ఫ్రేమ్ మొత్తం (ముందు నుంచి వెనుక వరకు) షార్ప్‌గా ఉంటుంది (ల్యాండ్‌స్కేప్స్, గ్రూప్ ఫోటోలకు పర్ఫెక్ట్).\n\n"
            "💡 **గుర్తుంచుకోవాల్సిన సూత్రం:** తక్కువ f-number = ఎక్కువ బోకె + ఎక్కువ బ్రైట్‌నెస్!"
        )
    else:
        return (
            "📸 **Aperture & Depth of Field Guide:**\n\n"
            "Aperture refers to the diaphragm opening inside your camera lens that regulates how much light reaches the sensor and controls your **Depth of Field (DoF)**.\n\n"
            "• **Wide Aperture (Low f-number: f/1.2, f/1.4, f/1.8, f/2.8):**\n"
            "  - Lets in maximum light.\n"
            "  - Creates shallow depth of field with creamy background blur (bokeh).\n"
            "  - Best for: Bride/groom portraits, cinematic interviews, low-light shooting.\n\n"
            "• **Narrow Aperture (High f-number: f/8, f/11, f/16):**\n"
            "  - Restricts light intake.\n"
            "  - Keeps foreground to background sharp in focus.\n"
            "  - Best for: Landscapes, architecture, large family group stage photos."
        )

def get_iso_guide(camera_id: Optional[str] = None, lang: str = "english") -> str:
    cam = CAMERA_DATABASE.get(camera_id or "nikon_z6iii")
    cam_name = cam["model"] if cam else "Camera"
    base_iso = cam.get("base_isos", "Base ISO 800")

    if lang == "telugu":
        return (
            f"💡 **ISO అంటే ఏమిటి? (సరళమైన తెలుగులో):**\n\n"
            f"ISO అంటే కెమెరా సెన్సార్ కాంతిని ఎంత సున్నితంగా గ్రహిస్తుందో తెలిపే సంఖ్య (Sensor Light Sensitivity).\n\n"
            f"• **తక్కువ ISO (ISO 100 – 800):**\n"
            f"  - పగటిపూట లేదా మంచి లైటింగ్ ఉన్నప్పుడు వాడతారు.\n"
            f"  - పిక్చర్ చాలా క్లీన్‌గా, నాయిస్/గ్రైన్ లేకుండా అత్యుత్తమ డైనమిక్ రేంజ్‌తో వస్తుంది.\n\n"
            f"• **ఎక్కువ ISO (ISO 3200 – 12800):**\n"
            f"  - రాత్రిపూట లేదా తక్కువ వెలుతురు ఉన్న హాల్స్‌లో ఫోటోలు/వీడియోలు తీయడానికి వాడతారు.\n"
            f"  - అయితే ISO చాలా ఎక్కువ పెంచితే వీడియోలో చీమలు పాకినట్లు నాయిస్ (Grain) వస్తుంది.\n\n"
            f"🎯 **డ్యూయల్ బేస్ ISO (Dual Base ISO) సీక్రెట్:**\n"
            f"ఆధునిక సినిమా కెమెరాల్లో రెండు నేటివ్ బేస్ ISOలు ఉంటాయి. ఉదాహరణకు **{cam_name}** లో: **{base_iso}**.\n"
            f"తక్కువ వెలుతురులో షూట్ చేసేటప్పుడు మధ్యలో ఉండే నాయిసీ ISOలలో ఉండకుండా, నేరుగా సెకండ్ బేస్ ISO కి మారితే షాడోస్ చాలా క్లీన్‌గా ఉంటాయి!"
        )
    else:
        return (
            f"💡 **ISO and Dual Base ISO Master Guide:**\n\n"
            f"ISO measures the sensitivity of your camera's image sensor to light.\n\n"
            f"• **Low ISO (ISO 100 - 800):** Maximum dynamic range, clean color reproduction, zero digital noise. Use in daylight or well-lit studios.\n"
            f"• **High ISO (ISO 3200 - 12800):** Electronically amplifies the signal in dark scenes. In standard cameras, high ISO introduces noise and grain.\n\n"
            f"### Dual Base ISO in Cinema & Mirrorless Cameras:\n"
            f"Modern sensors feature two separate analog gain readout circuits per pixel:\n"
            f"• **{cam_name} Base ISOs:** **{base_iso}**\n"
            f"• **Sony FX3 / A7S III:** ISO 800 (Base 1) & ISO 12,800 (Base 2)\n"
            f"• **Sony A7 IV:** ISO 800 (Base 1) & ISO 3,200 (Base 2)\n"
            f"• **Canon R5 Mark II:** ISO 800 (Base 1) & ISO 3,200 (Base 2)\n\n"
            f"💡 **Pro Filmmaking Rule:** Never shoot in no-man's land between the two bases (e.g. ISO 6400 or 10,000 on Sony FX3). Switch directly to Base 2 (ISO 12,800) for pristine, grain-free shadows!"
        )

def get_wedding_lens_guide(camera_id: Optional[str], lang: str = "english") -> str:
    cam = CAMERA_DATABASE.get(camera_id or "nikon_z6iii")
    brand = cam["brand"] if cam else "Nikon"

    if brand == "Sony":
        rec = LENS_RECOMMENDATIONS["sony_e"]["wedding_cinematography"]
        budget = LENS_RECOMMENDATIONS["sony_e"]["budget"]
        items = "\n".join([f"• **{r['lens']}**: {r['role']}" for r in rec[:4]])
        budget_items = "\n".join([f"• **{r['lens']}**: {r['role']}" for r in budget])
        return (
            f"💍 **Best Sony Lenses for Wedding Cinematography (FX3 / A7 IV / A7S III):**\n\n"
            f"### Professional Prime & Zoom Kit:\n{items}\n\n"
            f"### Budget & Versatile Choices:\n{budget_items}\n\n"
            f"💡 **Recommended 2-Lens Wedding Combo:** **Tamron 35-150mm f/2-2.8** (main ceremony) + **Sony 35mm f/1.4 GM** (low-light candid moments)."
        )
    elif brand == "Canon":
        rec = LENS_RECOMMENDATIONS["canon_rf"]["wedding_cinematography"]
        items = "\n".join([f"• **{r['lens']}**: {r['role']}" for r in rec])
        return (
            f"💍 **Best Canon RF Lenses for Wedding Cinematography (R5 / R6 II):**\n\n"
            f"{items}\n\n"
            f"💡 **Workhorse Pick:** **Canon RF 24-70mm f/2.8L IS USM** with 5-stop optical stabilization."
        )
    else:
        # Nikon Z
        rec = LENS_RECOMMENDATIONS["nikon_z"]["wedding_cinematography"]
        items = "\n".join([f"• **{r['lens']}**: {r['role']}" for r in rec])
        if lang == "telugu":
            return (
                f"💍 **Nikon Z6III / Z8 వెడ్డింగ్ సినిమాటోగ్రఫీ కోసం టాప్ లెన్సులు:**\n\n"
                f"{items}\n\n"
                f"💡 **ప్రణవిత్ రికమండేషన్ (2-లెన్స్ కిట్):**\n"
                f"1. **NIKKOR Z 24-70mm f/2.8 S** (మండపం, ఫ్యామిలీ, ఈవెంట్ కవరేజ్ కు మెయిన్ వర్క్‌హార్స్ లెన్స్).\n"
                f"2. **NIKKOR Z 85mm f/1.8 S** లేదా **50mm f/1.8 S** (సినిమాటిక్ పోర్ట్రెయిట్స్, మంగళసూత్రం క్లోజప్స్, అందమైన బోకె కోసం)."
            )
        return (
            f"💍 **Best Nikon Z Lenses for Wedding Cinematography (Nikon Z6III / Z8):**\n\n"
            f"{items}\n\n"
            f"💡 **The Essential 2-Lens Wedding Kit:**\n"
            f"1. **NIKKOR Z 24-70mm f/2.8 S** — The irreplaceable workhorse for fast-moving rituals, crowd, and stage.\n"
            f"2. **NIKKOR Z 85mm f/1.8 S (or 50mm f/1.8 S)** — Ultra-sharp, budget-friendly portrait primes for emotional vows, rings, and teary family moments."
        )

def get_low_light_lens_guide(camera_id: Optional[str], lang: str = "english") -> str:
    cam = CAMERA_DATABASE.get(camera_id or "nikon_z6iii")
    brand = cam["brand"] if cam else "Nikon"

    if brand == "Sony":
        rec = LENS_RECOMMENDATIONS["sony_e"]["low_light"]
        items = "\n".join([f"• **{r['lens']}**: {r['role']}" for r in rec])
    elif brand == "Canon":
        rec = LENS_RECOMMENDATIONS["canon_rf"]["low_light"]
        items = "\n".join([f"• **{r['lens']}**: {r['role']}" for r in rec])
    else:
        rec = LENS_RECOMMENDATIONS["nikon_z"]["low_light"]
        items = "\n".join([f"• **{r['lens']}**: {r['role']}" for r in rec])

    if lang == "telugu":
        return (
            f"🌙 **తక్కువ వెలుతురు (Low-Light) వీడియో కోసం ఉత్తమ లెన్సులు:**\n\n"
            f"తక్కువ వెలుతురులో వీడియో తీసేటప్పుడు పెద్ద ఎపర్చర్ (f/1.2, f/1.4, f/1.8) ఉన్న ప్రైమ్ లెన్సులు వాడాలి. f/1.4 లెన్స్ f/2.8 కంటే 4 రెట్లు ఎక్కువ కాంతిని లోపలికి రానిస్తుంది!\n\n"
            f"### రికమండ్ చేయబడిన లెన్సులు ({brand}):\n{items}\n\n"
            f"💡 **షూటింగ్ టిప్:** వైడ్ ఎపర్చర్ (f/1.4) తో పాటు కెమెరా యొక్క హై బేస్ ISO ని ఎంగేజ్ చేయండి."
        )
    return (
        f"🌙 **Best Lenses for Low-Light Video & Cinematography:**\n\n"
        f"In low-light environments, maximum aperture is everything. An **f/1.4 prime gathers 4x more light** (2 full stops) than a standard f/2.8 zoom!\n\n"
        f"### Top Low-Light Prime Lenses ({brand}):\n{items}\n\n"
        f"### What to Look for in Low-Light Lenses:\n"
        f"1. **Aperture (f/1.2 - f/1.8):** Maximizes physical photonic transmission onto the sensor.\n"
        f"2. **Linear AF Motors:** Fast, silent autofocus tracking in dim light without hunting.\n"
        f"3. **Minimal Focus Breathing:** Keeps framing stable during focus transitions in dark scenes.\n\n"
        f"💡 **Pro Tip:** Combine an f/1.4 prime with your camera's High Base ISO and keep shutter locked to 1/50s (180° rule)."
    )

def get_sony_fx3_vs_nikon_z6iii(lang: str = "english") -> str:
    return (
        "⚔️ **Sony FX3 vs Nikon Z6III for Filmmaking & Cinematography:**\n\n"
        "| Feature | Sony FX3 | Nikon Z6III | Advantage |\n"
        "|---|---|---|---|\n"
        "| **Sensor** | 12.1MP Full-Frame BSI | 24.5MP Partially-Stacked CMOS | Z6III for photo resolution; FX3 for video readout |\n"
        "| **Internal RAW** | No (Requires HDMI recorder) | **Yes (6K 60p N-RAW & ProRes RAW internal)** | **Nikon Z6III** |\n"
        "| **4K 120fps** | **Full-Frame (~1.1x crop)** | 1.5x DX Crop | **Sony FX3** |\n"
        "| **Dual Base ISO** | **ISO 800 & ISO 12,800** | **ISO 800 & ISO 6,400** | **Sony FX3 in extreme dark** |\n"
        "| **Viewfinder (EVF)** | None (LCD screen only) | **5.76M-dot, 4000 nits DCI-P3 EVF** | **Nikon Z6III (huge advantage in bright sun)** |\n"
        "| **Audio System** | Top XLR handle included | Standard 3.5mm mic in | **Sony FX3** |\n"
        "| **Image Stabilization** | 5.5 stops IBIS + Active | **8.0 stops IBIS with Focus Point VR** | **Nikon Z6III** |\n"
        "| **Body Ergonomics** | Cinema Line with 1/4\" cage mount threads | Hybrid DSLR/Mirrorless with deep grip | Tie (depends on style) |\n\n"
        "🎯 **Verdict:**\n"
        "• Choose **Sony FX3** if your top priority is extreme low-light sensitivity (ISO 12,800), uncropped 4K 120p, XLR audio handle, and E-mount lens selection.\n"
        "• Choose **Nikon Z6III** if you want internal 12-bit RAW video, a glorious 4,000-nit EVF, superior 8-stop stabilization, and higher 24.5MP photo quality."
    )

def get_wedding_settings_guide(camera_id: Optional[str] = None, lang: str = "english") -> str:
    cam = CAMERA_DATABASE.get(camera_id or "nikon_z6iii")
    cam_name = cam["model"] if cam else "Camera"
    base_iso = cam.get("base_isos", "Base ISO 800")

    if lang == "telugu":
        return (
            f"🎬 **{cam_name} కోసం వెడ్డింగ్ సినిమాటోగ్రఫీ బెస్ట్ సెట్టింగ్స్:**\n\n"
            f"• **రెసల్యూషన్ & కోడెక్:** 4K UHD 10-Bit 4:2:2 (N-Log / S-Log3).\n"
            f"• **ఫ్రేమ్ రేట్ & షట్టర్ స్పీడ్:**\n"
            f"  - రిచువల్స్ & డైలాగ్స్: **25fps @ 1/50s** (180° Rule).\n"
            f"  - స్లో-మోషన్ & బ్యూటీ షాట్స్: **50fps @ 1/100s** లేదా **60fps @ 1/120s**.\n"
            f"• **ISO మేనేజ్‌మెంట్:** {base_iso}. తక్కువ వెలుతురులో హై బేస్ ISOకి మాత్రమే మారండి.\n"
            f"• **వైట్ బ్యాలెన్స్:** ఆటో వాడవద్దు! హాల్ లైటింగ్‌ను బట్టి 3800K – 4500K మాన్యువల్‌గా సెట్ చేయండి.\n"
            f"• **ఆటోఫోకస్:** Continuous AF, Face/Eye Priority ఆన్ చేసి, AF స్పీడ్ 3/5 సెట్ చేయండి.\n\n"
            f"👉 కలర్ గ్రేడింగ్ కోసం మన [Creative LUT Pack (₹49)](/assets/creative-lut-pack) వాడండి!"
        )
    return (
        f"🎬 **Optimal Wedding Cinematography Settings for {cam_name}:**\n\n"
        f"| Setting | Recommended Value | Why |\n"
        f"|---|---|---|\n"
        f"| **Resolution** | 4K UHD 10-Bit 4:2:2 | Cinema color depth and high detail for client deliverables |\n"
        f"| **Frame Rate** | 24fps or 25fps for live ceremonies; 50/60fps for candid slow-mo | Narrative cadence for rituals, emotional pacing for highlights |\n"
        f"| **Shutter Speed** | 1/50s (24/25p) / 1/100s (50p) / 1/120s (60p) | 180° shutter rule preserves natural motion blur |\n"
        f"| **Aperture** | f/2.0 – f/2.8 for portraits; f/4 – f/5.6 for family groups | Creamy background isolation on bride/groom, sharp focus on groups |\n"
        f"| **ISO Strategy** | {base_iso} | Never dial between base ISOs to prevent grain in shadows |\n"
        f"| **White Balance** | Manual Kelvin: 3800K–4500K (Banquet hall mix) / 3200K (Mandap) | Prevents color shifts across edited clips |\n"
        f"| **Autofocus** | AF-C + Human Eye Detection, Transition speed 3/5 | Smooth cinema rack focus without sudden hunting |\n\n"
        f"👉 Color grade your footage in one click using the [Pranvith Creative LUT Pack (₹49)](/assets/creative-lut-pack)!"
    )

def get_indoor_wedding_settings_guide(camera_id: Optional[str] = None, lang: str = "english") -> str:
    cam = CAMERA_DATABASE.get(camera_id or "nikon_z6iii")
    cam_name = cam["model"] if cam else "Camera"
    base_iso = cam.get("base_isos", "Base ISO 800 / 6400")

    if lang == "telugu":
        return (
            f"🏛️ **{cam_name} ఇండోర్ వెడ్డింగ్ & బాంక్వెట్ హాల్ సెట్టింగ్స్:**\n\n"
            f"• **షట్టర్ స్పీడ్ (ఫ్లికర్ లేకుండా):** ఇండియాలో కరెంట్ 50Hz కాబట్టి, LED లైట్ల ఫ్లికర్ రాకుండా ఉండటానికి ఖచ్చితంగా **25fps @ 1/50s** లేదా **50fps @ 1/100s** వాడాలి.\n"
            f"• **ఎపర్చర్:** f/1.8 – f/2.8 (వైడ్ ఓపెన్) ఉంచండి, తద్వారా హాల్ లోని తక్కువ కాంతిలో కూడా క్లీన్ ఇమేజ్ వస్తుంది.\n"
            f"• **ISO:** {base_iso}. హాల్ చీకటిగా ఉంటే నేరుగా హై బేస్ ISO కి మారండి.\n"
            f"• **వైట్ బ్యాలెన్స్:** ఆటో WB పెట్టవద్దు! హాల్ లోని మిక్స్‌డ్ లైట్ల కోసం Kelvin 3800K – 4200K మాన్యువల్ గా లాక్ చేయండి.\n"
            f"• **ఆటోఫోకస్:** AF-C + Face/Eye Detection (People), AF Tracking Delay పెంచండి تاکہ జనాలు అడ్డం వచ్చినా ఫోకస్ తప్పదు."
        )
    return (
        f"🏛️ **Indoor Wedding Cinematography Settings for {cam_name}:**\n\n"
        f"Indoor banquet halls present tough challenges: low light, mixed color temperatures, and flickering LED panels. Here are the professional settings:\n\n"
        f"| Setting | Recommendation | Why |\n"
        f"|---|---|---|\n"
        f"| **Frame Rate** | **25 fps** (in 50Hz regions like India/UK) or **24 fps** (60Hz USA) | Anti-flicker standard with electricity grid |\n"
        f"| **Shutter Speed** | **1/50s** (for 25fps) or **1/100s** (for 50fps) | Strictly eliminates light banding; use Variable Shutter / ECS if fine banding appears |\n"
        f"| **Aperture** | **f/1.8 – f/2.8** | Maximum photon collection on dim banquet stages |\n"
        f"| **ISO Setting** | **{base_iso}** | Switch straight to the High Base ISO; avoids noisy analog amplification |\n"
        f"| **White Balance** | **Manual 3800K - 4500K** | Halogen mandap fire + cool LED chandeliers. Lock WB to prevent fluctuating tints |\n"
        f"| **Autofocus Mode** | **AF-C + Human Face/Eye Priority** | Keeps bride/groom sharp; set Tracking Sensitivity to *Delayed* so guests walking past don't pull focus |\n"
        f"| **Picture Profile** | **10-bit Log (N-Log / S-Log3 / C-Log3)** | Expose to the right (ETTR +1.0 to +1.3 EV) for rich shadow recovery in post |\n\n"
        f"💡 **Pro Tip:** In mixed banquet hall lighting, test shoot a white paper or grey card to lock custom Kelvin before the ceremonies start."
    )

def get_autofocus_guide(camera_id: Optional[str] = None, lang: str = "english") -> str:
    cam = CAMERA_DATABASE.get(camera_id or "nikon_z6iii")
    cam_name = cam["model"] if cam else "Nikon Z6III"

    if "nikon" in cam_name.lower():
        if lang == "telugu":
            return (
                f"🎯 **Nikon Z6III వెడ్డింగ్ ఆటోఫోకస్ (Autofocus) సెట్టింగ్స్:**\n\n"
                f"• **AF-Area Mode:** **Wide-Area (L-People)** లేదా **3D-Tracking** ఎంచుకోండి.\n"
                f"• **సబ్జెక్ట్ డిటెక్షన్:** **People** (మనుషులు/కళ్ళు). పెళ్లికూతురు ముసుగు (Veil) వేసుకున్నా కళ్ళను ఖచ్చితంగా గుర్తిస్తుంది.\n"
                f"• **AF Speed (Custom Setting g6):** **-1 లేదా -2** (Slow/Smooth) గా ఉంచండి. దీనివల్ల ఫోకస్ ఉన్నట్టుండి ఝట్కా లాగకుండా సినిమాటిక్‌గా మారుతుంది.\n"
                f"• **AF Tracking Sensitivity (Custom Setting g7):** **3 లేదా 4 (Delayed)** గా సెట్ చేయండి. దీనివల్ల పెళ్లికూతురు, పెళ్లికొడుకు మధ్యలోకి చుట్టాలు లేదా గెస్టులు అడ్డం వచ్చినా ఫోకస్ వాళ్ళపైకి మారకుండా కపుల్ పైనే లాక్ అయి ఉంటుంది.\n"
                f"• **Focus Point VR:** On (కెమెరాలోని 8-స్టాప్ IBIS ఫోకస్ పాయింట్‌తో లింక్ అయి షేక్ లేకుండా చేస్తుంది)."
            )
        return (
            f"🎯 **Nikon Z6III Cinema Autofocus Settings for Weddings:**\n\n"
            f"| AF Parameter | Setting | Impact on Video |\n"
            f"|---|---|---|\n"
            f"| **AF Mode** | **AF-C** (Continuous AF) | Constant subject tracking |\n"
            f"| **AF-Area Mode** | **Wide-Area (L-People)** or **3D-Tracking** | Locks specifically on the bride/groom without roaming |\n"
            f"| **Subject Detection** | **People (Face/Eye AF)** | Tracks bride's eyes even through jewelry and wedding veils |\n"
            f"| **AF Speed (Menu g6)** | **-1 to -2 (Slow / Cinematic)** | Prevents jarring, jerky focus snaps; gives smooth cinema rack focus |\n"
            f"| **AF Tracking Sensitivity (Menu g7)** | **3 to 4 (Delayed)** | If guests or photographers walk across the frame, focus stays firmly locked on the couple |\n"
            f"| **Focus Point VR** | **Enabled** | Concentrates 8.0-stop IBIS stability directly around your subject |\n\n"
            f"💡 **Pro Tip:** Assign 'AF-ON' to the rear button for instant re-acquisition if the couple temporarily leaves the frame."
        )
    else:
        return (
            f"🎯 **Cinema Autofocus Settings for {cam_name}:**\n\n"
            f"• **Focus Mode:** Continuous AF (AF-C / Movie AF).\n"
            f"• **Subject Recognition:** Human Eye / Face Detection enabled.\n"
            f"• **AF Transition Speed:** Set to 3 or 4 out of 7 (Moderate/Smooth) for natural focus transitions.\n"
            f"• **AF Subject Shift Sensitivity:** Set to 1 or 2 (Locked-on / Persistent) to prevent guests crossing the aisle from stealing focus."
        )

# ==================== MASTER AI CONTROLLER ====================

async def answer_camera_query(
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    admin_settings: Optional[Dict[str, Any]] = None,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main intelligence entry point.
    1. If gemini_api_key is available, calls Gemini with the comprehensive camera master prompt.
    2. Otherwise, uses the built-in multi-lingual verified camera expert system.
    """
    query = (message or "").strip()
    if not query:
        return {"response": "Please enter a question about cameras, lenses, or filmmaking settings.", "source": "pranvith_ai"}

    lang = detect_language(query)
    camera_id = extract_camera_context(query, history)
    q_clean = query.lower()

    # Check if admin disabled the chatbot
    if admin_settings and admin_settings.get("camera_ai_enabled") is False:
        return {
            "response": "Camera AI Assistant is temporarily paused for maintenance. Please check back shortly or email info@pranvithdop.com.",
            "source": "pranvith_admin"
        }

    # If Gemini API Key is present, leverage Gemini with specialized prompt
    if gemini_api_key:
        try:
            import httpx
            custom_instructions = (admin_settings or {}).get("camera_ai_system_instructions", "")
            knowledge_notes = (admin_settings or {}).get("camera_ai_knowledge_notes", "")

            system_prompt = (
                "You are Camera AI PRO, the official camera, lenses, cinematography, and filmmaking expert for PranvithDOP (https://pranvithdop.com).\n"
                "You provide verified, highly accurate technical camera advice on Nikon (Z6III, Z8, Z9, Zf, Z50II), Sony (FX3, FX6, FX30, A7IV, A7SIII), Canon (R5, R6II, R5II), DJI gimbals and drones.\n"
                "LANGUAGE RULES:\n"
                "- If the user asks in Telugu (or Telugu written in English letters / Teluglish), respond in Telugu.\n"
                "- If the user asks in Hindi, respond in Hindi.\n"
                "- If the user asks in English, respond in English.\n"
                "- Keep technical terms (Shutter Speed, Aperture, ISO, Picture Profile, Dual Base ISO, 4K 120fps, N-Log, S-Log3) in English.\n"
                "CONVERSATION CONTEXT:\n"
                "- Remember the camera model and shooting scenario mentioned in earlier turns.\n"
                "ACCURACY & FORMATTING:\n"
                "- Never invent camera features or crop factors (e.g. Nikon Z6III 4K 120p has a 1.5x DX crop; Sony FX3 has S-Log3 base ISOs 800 & 12,800).\n"
                "- Use clean markdown headings, bullet points, and tables where helpful.\n"
                "- When appropriate, mention PranvithDOP products: [Creative LUT Pack (₹49)](/assets/creative-lut-pack), [Sound FX Pack (₹149)](/assets/cinematic-sound-fx-pack), [Wedding Templates (₹299)](/assets/premiere-pro-wedding-templates).\n"
            )
            if custom_instructions:
                system_prompt += f"\nADMIN CUSTOM INSTRUCTIONS:\n{custom_instructions}\n"
            if knowledge_notes:
                system_prompt += f"\nADMIN KNOWLEDGE BASE NOTES:\n{knowledge_notes}\n"

            chat_contents = []
            if history:
                for h in history[-6:]:
                    role = "user" if h.get("role") == "user" or h.get("sender") == "user" else "model"
                    chat_contents.append({"role": role, "parts": [{"text": h.get("text") or h.get("content") or ""}]})

            chat_contents.append({
                "role": "user",
                "parts": [{"text": f"System Context:\n{system_prompt}\n\nCurrent User Question: {query}"}]
            })

            async with httpx.AsyncClient(timeout=18.0) as client:
                res = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}",
                    json={"contents": chat_contents}
                )
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if content:
                            return {"response": content, "source": "gemini"}
        except Exception:
            pass  # Fall through to built-in verified engine

    # ==================== BUILT-IN VERIFIED INTELLIGENCE ENGINE ====================

    # 1. Nikon Z6III 120fps question
    if ("z6" in q_clean or "z6iii" in q_clean or camera_id == "nikon_z6iii") and ("120" in q_clean or "slow" in q_clean or "fps" in q_clean):
        return {"response": get_nikon_z6iii_120fps_guide(lang), "source": "pranvith_camera_ai"}

    # 2. 180-degree shutter rule
    if any(k in q_clean for k in ["180", "180 degree", "shutter rule", "shutter speed rule", "180-degree"]):
        return {"response": get_180_shutter_rule_guide(lang), "source": "pranvith_camera_ai"}

    # 3. Aperture explanations
    if "aperture" in q_clean or "ఎపర్చర్" in q_clean:
        return {"response": get_aperture_guide(lang), "source": "pranvith_camera_ai"}

    # 4. ISO explanations
    if re.search(r'\biso\b', q_clean) or "dual base iso" in q_clean or "ఐఎస్ఓ" in q_clean:
        return {"response": get_iso_guide(camera_id, lang), "source": "pranvith_camera_ai"}

    # 5. Sony FX3 vs Nikon Z6III comparison
    if ("fx3" in q_clean and "z6" in q_clean) or ("vs" in q_clean and ("fx3" in q_clean or "z6" in q_clean)):
        return {"response": get_sony_fx3_vs_nikon_z6iii(lang), "source": "pranvith_camera_ai"}

    # 6. Autofocus settings (e.g. Nikon Z6III autofocus settings for wedding)
    if any(k in q_clean for k in ["autofocus", "af settings", "focus settings", "ఆటోఫోకస్", "tracking sensitivity"]):
        return {"response": get_autofocus_guide(camera_id, lang), "source": "pranvith_camera_ai"}

    # 7. Low light lenses
    if ("lens" in q_clean or "lenses" in q_clean or "లెన్స్" in q_clean) and any(k in q_clean for k in ["low light", "low-light", "night", "dark", "తక్కువ వెలుతురు"]):
        return {"response": get_low_light_lens_guide(camera_id, lang), "source": "pranvith_camera_ai"}

    # 8. General wedding lens recommendation
    if "lens" in q_clean or "lenses" in q_clean or "లెన్స్" in q_clean:
        return {"response": get_wedding_lens_guide(camera_id, lang), "source": "pranvith_camera_ai"}

    # 9. Indoor wedding settings
    if any(k in q_clean for k in ["indoor", "banquet", "hall", "ఇండోర్"]) and any(k in q_clean for k in ["wedding", "marriage", "పెళ్లి", "వెడ్డింగ్"]):
        return {"response": get_indoor_wedding_settings_guide(camera_id, lang), "source": "pranvith_camera_ai"}

    # 10. General wedding settings
    if any(k in q_clean for k in ["wedding", "marriage", "పెళ్లి", "వెడ్డింగ్", "mandap"]):
        return {"response": get_wedding_settings_guide(camera_id, lang), "source": "pranvith_camera_ai"}

    # 11. Slow motion general
    if any(k in q_clean for k in ["slow motion", "slowmo", "స్లో మోషన్", "60fps", "120fps"]):
        recipe = SCENARIO_RECIPES["slow_motion"]
        resp = (
            f"⚡ **{recipe['title']}**\n\n"
            f"• **Frame Rate Choices:** {recipe['frame_rate']}\n"
            f"• **180° Shutter Rule:** {recipe['shutter_speed']}\n"
            f"• **Light Compensation:** {recipe['light_compensation']}\n"
            f"• **Timeline Workflow:** {recipe['timeline_interpretation']}\n"
            f"• **Sensor Crop Notice:** {recipe['crop_warning']}"
        )
        return {"response": resp, "source": "pranvith_camera_ai"}

    # 12. Instagram Reels & Vertical
    if any(k in q_clean for k in ["reel", "reels", "instagram", "vertical"]):
        recipe = SCENARIO_RECIPES["instagram_reels"]
        resp = (
            f"📱 **{recipe['title']}**\n\n"
            f"• **Resolution:** {recipe['resolution']}\n"
            f"• **Frame Rate:** {recipe['frame_rate']}\n"
            f"• **Shutter Speed:** {recipe['shutter_speed']}\n"
            f"• **Codec & Bitrate:** {recipe['codec']}\n"
            f"• **Color Space:** {recipe['color_profile']}"
        )
        return {"response": resp, "source": "pranvith_camera_ai"}

    # 13. Low light general
    if any(k in q_clean for k in ["low light", "low-light", "night", "dark", "తక్కువ వెలుతురు"]):
        recipe = SCENARIO_RECIPES["low_light"]
        resp = (
            f"🌙 **{recipe['title']}**\n\n"
            f"• **Dual Base ISO Strategy:** {recipe['iso_strategy']}\n"
            f"• **Aperture:** {recipe['aperture']}\n"
            f"• **Shutter Speed:** {recipe['shutter_speed']}\n"
            f"• **White Balance:** {recipe['white_balance']}"
        )
        return {"response": resp, "source": "pranvith_camera_ai"}

    # 14. Specific camera inquiry
    if camera_id and camera_id in CAMERA_DATABASE:
        cam = CAMERA_DATABASE[camera_id]
        if "guidance" in cam:
            return {"response": f"ℹ️ **{cam['model']} Information:**\n\n{cam['guidance']}", "source": "pranvith_camera_ai"}
        resp = (
            f"🎥 **{cam['model']} Cinematography Profile:**\n\n"
            f"• **Sensor & Mount:** {cam['sensor']} | {cam['mount']}\n"
            f"• **Video Capabilities:** {cam['max_video']}\n"
            f"• **Slow Motion:** {cam.get('slow_motion', 'Supports high-speed video')}\n"
            f"• **Color Profiles & Base ISOs:** {cam.get('base_isos', 'Native ISO')}\n"
            f"• **Autofocus:** {cam.get('autofocus', 'Continuous AF with subject tracking')}\n"
            f"• **Key Strengths:** {cam.get('key_strengths', '')}\n"
        )
        return {"response": resp, "source": "pranvith_camera_ai"}

    # 15. Products / LUTs / SFX fallback
    if any(k in q_clean for k in ["lut", "preset", "sound", "pack", "template", "buy", "price"]):
        resp = (
            "🛍️ **PranvithDOP Digital Assets & Filmmaking Packs:**\n\n"
            "1. **Creative LUT Pack:** ₹49 ➔ [View LUTs](/assets/creative-lut-pack)\n"
            "2. **Cinematic Sound FX Pack:** ₹149 ➔ [View Sound FX](/assets/cinematic-sound-fx-pack)\n"
            "3. **Premiere Pro Wedding Templates:** ₹299 ➔ [View Templates](/assets/premiere-pro-wedding-templates)\n"
            "4. **Wedding Album PSD Pack:** ₹199 ➔ [View PSD Pack](/assets/wedding-album-psd-pack)\n\n"
            "👉 [Browse All Creative Assets](/assets)"
        )
        return {"response": resp, "source": "pranvith_ai"}

    # Default friendly greeting / guide
    if lang == "telugu":
        resp = (
            f"🎬 **నమస్కారం! నేను Pranvith Camera AI PRO అసిస్టెంట్.**\n\n"
            f"మీరు ఏ కెమెరా వాడుతున్నారు? (Nikon Z6III, Sony FX3, Canon R6 II, DJI?)\n\n"
            f"నేను మీకు సహాయం చేయగలను:\n"
            f"• **కెమెరా సెట్టింగ్స్:** వెడ్డింగ్, స్లో-మోషన్, తక్కువ వెలుతురు (Low Light)\n"
            f"• **లెన్స్ సలహాలు:** బడ్జెట్ మరియు సినిమాటిక్ లెన్సులు\n"
            f"• **టెక్నికల్ రూల్స్:** 180° షట్టర్ రూల్, ఎపర్చర్, బేస్ ISO, N-Log/S-Log3 ఎక్స్‌పోజర్\n"
            f"• **ఎడిటింగ్ ప్యాక్స్:** [Creative LUT Pack (₹49)](/assets/creative-lut-pack) & [Sound FX (₹149)](/assets/cinematic-sound-fx-pack)"
        )
    else:
        resp = (
            f"🎬 **Camera AI PRO Assistant for: \"{query}\"**\n\n"
            "I'm your dedicated cinematography and camera expert. Ask me about:\n\n"
            "• **Camera Settings:** Nikon Z6III/Z8, Sony FX3/A7IV, Canon R5/R6, DJI gimbals\n"
            "• **Shooting Scenarios:** Weddings, 4K 120fps slow-motion, low-light events, Instagram Reels\n"
            "• **Lens Recommendations:** Best prime & zoom lenses for your camera mount & budget\n"
            "• **Editing Assets:** [Creative LUT Pack (₹49)](/assets/creative-lut-pack) & [Sound FX Pack (₹149)](/assets/cinematic-sound-fx-pack)"
        )
    return {"response": resp, "source": "pranvith_camera_ai"}
