from __future__ import annotations

import hashlib
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import premium_social_campaign as engine  # noqa: E402

CACHE_DIR = ROOT / "assets/generated/ai-social-library"
TARGET_GROUPS = ROOT / ".github/scripts/target_groups.json"


def _registry_status() -> tuple[int, int]:
    try:
        document = __import__("json").loads(TARGET_GROUPS.read_text(encoding="utf-8"))
        rows = document.get("groups") if isinstance(document, dict) else []
        enabled = sum(1 for row in rows if isinstance(row, dict) and bool(row.get("enabled")))
        return len(rows) if isinstance(rows, list) else 0, enabled
    except Exception:
        return 0, 0
_original_download = engine.download_ai_background
_original_build_copy = engine.build_copy


def _cache_fresh_ai(image: Image.Image, prompt: str, seed: int) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fingerprint = hashlib.sha256(prompt.encode("utf-8", errors="ignore")).hexdigest()[:16]
    target = CACHE_DIR / f"ai-background-{fingerprint}.jpg"
    ImageOps.fit(image.convert("RGB"), (1536, 1920), method=Image.Resampling.LANCZOS).save(
        target,
        "JPEG",
        quality=91,
        optimize=True,
        progressive=True,
    )
    return target


def _cached_ai(prompt: str) -> tuple[Image.Image, str] | None:
    fingerprint = hashlib.sha256(prompt.encode("utf-8", errors="ignore")).hexdigest()[:16]
    target = CACHE_DIR / f"ai-background-{fingerprint}.jpg"
    if not target.exists():
        return None
    try:
        image = Image.open(target).convert("RGB")
        print("Fresh AI unavailable; reusing the exact cached creative for the same visual prompt:", target)
        return image, "cached-ai-exact"
    except Exception as exc:
        print("Exact cached AI background failed:", exc)
        return None



def _native_background(prompt: str, seed: int) -> Image.Image:
    """Draw a premium, topic-matched visual when external image APIs are down.

    Final branded copy, title and CTA are rendered by render_branded(). This
    intentionally avoids unrelated stock art, fake metrics, and text baked into
    the illustration.
    """
    width, height = 1536, 1920
    rng = random.Random(seed)
    text = str(prompt or "").lower()

    categories = [
        ("qr", ("qr", "quick response", "scan code"), (45, 220, 210)),
        ("rates", ("currency", "exchange rate", "forex", "fuel price", "petrol", "diesel", "gold price"), (76, 222, 190)),
        ("weather", ("weather", "forecast", "rain radar"), (91, 160, 250)),
        ("image", ("image", "photo", "cctv", "background removal", "compression"), (166, 130, 255)),
        ("document", ("pdf", "document", "resume", "cv", "job", "career"), (125, 137, 255)),
        ("network", ("network", "dns", "ssl", "ip address", "reachability", "website checker"), (55, 195, 245)),
        ("security", ("password", "security", "privacy", "lock", "strength checker"), (50, 215, 150)),
        ("ai", ("ai token", "token calculator", "prompt", "llm", "artificial intelligence", "neural"), (185, 120, 255)),
        ("gaming", ("steam", "playtime", "gaming", "fps", "edpi", "controller"), (255, 154, 72)),
        ("time", ("calendar", "date", "timezone", "meeting", "duration", "time calculator"), (100, 160, 255)),
        ("calculator", ("calculator", "percentage", "bmi", "age calculator", "math", "number"), (160, 130, 255)),
        ("text", ("word counter", "text", "typing", "wpm", "editor"), (55, 220, 205)),
    ]
    kind, accent = "dashboard", (133, 125, 255)
    for candidate, words, color in categories:
        if any(word in text for word in words):
            kind, accent = candidate, color
            break

    top, bottom = (4, 9, 25), (25, 12, 58)
    base = Image.new("RGB", (width, height))
    gradient = ImageDraw.Draw(base)
    for y in range(height):
        blend = y / (height - 1)
        rgb = tuple(int(top[i] * (1 - blend) + bottom[i] * blend) for i in range(3))
        gradient.line((0, y, width, y), fill=rgb)

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((100, 65, 1000, 900), fill=(103, 58, 220, 100))
    g.ellipse((690, 165, 1515, 950), fill=(25, 170, 225, 65))
    g.ellipse((320, 530, 1300, 1280), fill=(135, 55, 210, 44))
    glow = glow.filter(ImageFilter.GaussianBlur(115))
    art = Image.alpha_composite(base.convert("RGBA"), glow)

    grid = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(70, width, 104):
        gd.line((x, 180, x, 1160), fill=(150, 165, 255, 16), width=2)
    for y in range(205, 1160, 104):
        gd.line((65, y, width - 65, y), fill=(150, 165, 255, 15), width=2)
    for _ in range(48):
        x, y = rng.randint(75, width - 75), rng.randint(190, 1150)
        radius = rng.choice((2, 3, 4))
        gd.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(*accent, rng.randint(45, 115)))
    art = Image.alpha_composite(art, grid)
    d = ImageDraw.Draw(art)

    def card(box, fill=(9, 19, 44, 228), outline=None, radius=28, width_line=3):
        line = outline or (*accent, 210)
        d.rounded_rectangle(box, radius=radius, fill=fill, outline=line, width=width_line)

    def bar(x1, y1, x2, y2, color=None, width_line=8):
        d.line((x1, y1, x2, y2), fill=color or (*accent, 220), width=width_line)

    card((118, 220, 1418, 1085), fill=(7, 15, 37, 215), radius=58, width_line=4)
    d.rounded_rectangle((151, 253, 1385, 1050), radius=40, outline=(235, 240, 255, 32), width=2)
    for i, col in enumerate(((248, 113, 113, 220), (250, 204, 21, 220), (74, 222, 128, 220))):
        x = 190 + i * 32
        d.ellipse((x, 282, x+14, 296), fill=col)

    if kind == "qr":
        card((500, 365, 1005, 870), fill=(245, 249, 255, 250), outline=(*accent, 235), radius=28, width_line=0)
        cell, offset, modules = 13, 548, 31
        pattern = [[rng.random() > 0.48 for _ in range(modules)] for __ in range(modules)]
        for row in range(modules):
            for col in range(modules):
                if (row < 8 and col < 8) or (row < 8 and col >= modules-8) or (row >= modules-8 and col < 8):
                    continue
                if pattern[row][col]:
                    xx, yy = offset + col*cell, 407 + row*cell
                    d.rectangle((xx, yy, xx+cell-2, yy+cell-2), fill=(13, 22, 46, 255))
        def finder(cx, cy):
            d.rectangle((cx, cy, cx+7*cell, cy+7*cell), fill=(13, 22, 46, 255))
            d.rectangle((cx+cell, cy+cell, cx+6*cell, cy+6*cell), fill=(245, 249, 255, 255))
            d.rectangle((cx+2*cell, cy+2*cell, cx+5*cell, cy+5*cell), fill=(13, 22, 46, 255))
        finder(offset, 407)
        finder(offset+(modules-8)*cell, 407)
        finder(offset, 407+(modules-8)*cell)
        card((1050, 475, 1285, 750), fill=(15, 36, 59, 245))
        d.ellipse((1103, 530, 1220, 647), outline=(*accent, 255), width=13)
        bar(1195, 620, 1248, 672, color=(*accent, 255), width_line=17)

    elif kind == "rates":
        card((245, 395, 690, 745))
        card((846, 395, 1291, 745))
        for x, color in ((345, (*accent,255)), (945, (96,165,250,255))):
            d.ellipse((x, 450, x+105, 555), fill=(*color[:3], 45), outline=color, width=5)
            bar(x+28, 503, x+77, 503, color=color, width_line=7)
            bar(x+52, 478, x+52, 528, color=color, width_line=7)
            for i, level in enumerate((45, 72, 52, 94)):
                d.rounded_rectangle((x+7+i*25, 667-level, x+23+i*25, 667), radius=5, fill=color)
        bar(681, 565, 850, 565, color=(244,247,255,230), width_line=12)
        d.polygon([(831, 535), (875,565), (831,595)], fill=(244,247,255,235))

    elif kind == "weather":
        d.ellipse((365, 360, 625, 620), fill=(accent[0],accent[1],accent[2],45), outline=(*accent,245), width=5)
        d.ellipse((438, 430, 555, 547), fill=(255,204,95,255))
        for box in ((550, 495, 760, 680), (670, 450, 900, 680), (805, 500, 995, 680)):
            d.ellipse(box, fill=(211,225,255,245))
        d.rounded_rectangle((525, 575, 985, 695), radius=50, fill=(211,225,255,245))
        for i in range(6):
            xx=625+i*52
            bar(xx, 730, xx-27, 785, color=(*accent,230), width_line=7)
        card((1040, 385, 1250, 790))
        for i, level in enumerate((80, 150, 118, 205)):
            d.rounded_rectangle((1075+i*39, 750-level, 1101+i*39, 750), radius=8, fill=(*accent,230))

    elif kind == "image":
        card((285, 365, 870, 795), fill=(10,22,52,245))
        d.rounded_rectangle((325, 405, 830, 755), radius=24, fill=(28,68,105,255))
        d.ellipse((695, 430, 786, 521), fill=(255,211,123,255))
        d.polygon([(340,720),(495,520),(610,635),(700,545),(817,720)], fill=(53,184,167,255))
        d.polygon([(480,720),(650,568),(752,660),(803,615),(817,720)], fill=(80,104,222,255))
        card((930, 405, 1268, 775), fill=(10,23,49,245))
        for i in range(4):
            yy=475+i*70
            d.rounded_rectangle((972, yy, 1215, yy+12), radius=6, fill=(93,107,153,200))
            d.ellipse((972+i*33, yy-13, 998+i*33, yy+13), fill=(*accent,245))

    elif kind == "document":
        d.rounded_rectangle((425, 365, 765, 825), radius=26, fill=(75,65,155,190), outline=(*accent,220), width=4)
        d.rounded_rectangle((690, 330, 1035, 815), radius=26, fill=(231,239,255,250), outline=(255,255,255,220), width=3)
        d.polygon([(945,331),(1034,421),(945,421)], fill=(166,188,228,255))
        for i, length in enumerate((215,250,183,235,205,247,168)):
            yy=468+i*39
            d.rounded_rectangle((748, yy, 748+length, yy+9), radius=5, fill=(69,88,134,185))
        card((1070, 460, 1270, 680), fill=(15,29,60,245))
        d.ellipse((1128, 515, 1212, 599), outline=(*accent,255), width=8)
        bar(1150, 558, 1192, 558, color=(*accent,255), width_line=6)

    elif kind == "network":
        points=[(360,465),(535,375),(690,520),(860,390),(1050,465),(1160,650),(960,755),(670,760),(440,670),(825,655)]
        edges=[(0,1),(0,2),(1,2),(1,3),(2,3),(2,7),(2,9),(3,4),(3,9),(4,5),(4,9),(5,6),(6,7),(6,9),(7,8),(8,0),(8,9)]
        for a,b in edges:
            bar(*points[a],*points[b],color=(*accent,125),width_line=4)
        for i,(x,y) in enumerate(points):
            r=22 if i==9 else 14
            d.ellipse((x-r,y-r,x+r,y+r),fill=(*accent,210) if i==9 else (185,207,255,245),outline=(255,255,255,210),width=3)
        d.ellipse((745,575,905,735), outline=(255,255,255,215), width=4)

    elif kind == "security":
        d.polygon([(770,355),(965,425),(950,610),(860,745),(770,700),(665,600),(650,425)], fill=(*accent,55))
        d.line([(770,355),(965,425),(950,610),(860,745),(770,700),(665,600),(650,425),(770,355)], fill=(*accent,255), width=9)
        d.arc((720,475,825,585),180,360,fill=(255,255,255,235),width=10)
        d.rounded_rectangle((704,530,842,660),radius=24,fill=(242,247,255,250))
        d.ellipse((760,570,783,593),fill=(18,29,57,255))
        d.rounded_rectangle((767,590,777,630),radius=5,fill=(18,29,57,255))
        for i in range(3):
            card((340+i*315, 800, 555+i*315, 862), radius=20, width_line=2)

    elif kind == "ai":
        points=[(560,410),(770,355),(970,410),(1080,555),(970,715),(770,765),(570,700),(450,555),(650,540),(890,540),(690,640),(850,660)]
        center=(770,555)
        for x,y in points:
            bar(center[0],center[1],x,y,color=(*accent,125),width_line=4)
        for i,(x,y) in enumerate(points):
            r=27 if i in (1,5,8,9) else 18
            d.ellipse((x-r,y-r,x+r,y+r),fill=(*accent,70),outline=(*accent,255),width=4)
        d.ellipse((center[0]-86,center[1]-86,center[0]+86,center[1]+86),fill=(*accent,70),outline=(255,255,255,235),width=6)
        d.ellipse((center[0]-25,center[1]-25,center[0]+25,center[1]+25),fill=(255,255,255,240))

    elif kind == "gaming":
        d.rounded_rectangle((350,455,1185,745),radius=135,fill=(11,20,47,250),outline=(*accent,255),width=8)
        d.rounded_rectangle((465,510,665,680),radius=25,fill=(35,47,85,255),outline=(160,180,230,180),width=3)
        d.rectangle((535,538,592,652),fill=(*accent,245))
        d.rectangle((507,567,620,624),fill=(*accent,245))
        for x,y,col in ((950,530,(251,113,133,255)),(1030,585,(96,165,250,255)),(950,640,(52,211,153,255)),(870,585,(250,204,21,255))):
            d.ellipse((x-24,y-24,x+24,y+24),fill=col)
        d.ellipse((710,530,790,610),outline=(255,255,255,180),width=4)

    elif kind == "time":
        card((380, 355, 850, 805), fill=(10,22,50,245))
        d.rounded_rectangle((380,355,850,470),radius=28,fill=(*accent,85),outline=(*accent,235),width=3)
        for row in range(3):
            for col in range(4):
                x,y=430+col*94,510+row*83
                d.rounded_rectangle((x,y,x+55,y+48),radius=10,fill=(90,110,165,180),outline=(180,200,255,145),width=2)
        d.ellipse((960,405,1270,715),fill=(14,26,56,240),outline=(*accent,255),width=8)
        bar(1115,560,1115,450,color=(255,255,255,235),width_line=12)
        bar(1115,560,1190,600,color=(*accent,255),width_line=12)
        d.ellipse((1098,543,1132,577),fill=(255,255,255,245))

    elif kind == "calculator":
        card((460, 330, 1000, 850), fill=(9,19,45,248), radius=42)
        d.rounded_rectangle((520,380,940,485),radius=18,fill=(5,13,31,255),outline=(*accent,220),width=3)
        d.rounded_rectangle((585,423,895,441),radius=8,fill=(*accent,205))
        for row in range(3):
            for col in range(4):
                x,y=525+col*94,525+row*88
                d.rounded_rectangle((x,y,x+66,y+57),radius=13,fill=(37,49,88,255),outline=(120,140,195,155),width=2)
        for i,h in enumerate((100,160,218,270)):
            d.rounded_rectangle((1030+i*52,785-h,1065+i*52,785),radius=8,fill=(*accent,220))

    elif kind == "text":
        card((330,360,920,820),fill=(10,20,47,245))
        d.rounded_rectangle((375,405,875,470),radius=14,fill=(*accent,38),outline=(*accent,225),width=2)
        for i,length in enumerate((390,440,310,415,360,270,385)):
            yy=520+i*35
            d.rounded_rectangle((375,yy,375+length,yy+9),radius=5,fill=(171,190,230,185))
        card((980,420,1245,720),fill=(13,26,55,240))
        d.ellipse((1035,465,1190,620),outline=(*accent,255),width=11)
        d.arc((1035,465,1190,620),210,325,fill=(255,255,255,235),width=13)
        bar(1048,660,1185,660,color=(*accent,255),width_line=7)

    else:
        card((290,365,795,790))
        card((840,400,1240,730))
        for i,level in enumerate((100,170,130,225,185)):
            x=355+i*76
            d.rounded_rectangle((x,710-level,x+37,710),radius=10,fill=(*accent,225))
        d.ellipse((950,455,1130,635),fill=(*accent,35),outline=(*accent,245),width=6)
        d.line((982,545,1030,590,1100,500),fill=(255,255,255,235),width=13,joint="curve")

    for i in range(6):
        x=rng.randint(180,1230)
        y=rng.randint(890,1010)
        d.rounded_rectangle((x,y,x+rng.randint(55,130),y+9),radius=5,fill=(*accent,rng.randint(55,130)))
    return art.convert("RGB")


def resilient_download(prompt: str, seed: int) -> tuple[Image.Image, str]:
    try:
        image, provider = _original_download(prompt, seed)
        cached = _cache_fresh_ai(image, prompt, seed)
        print("Fresh AI creative cached for exact-prompt continuity:", cached)
        return image, provider
    except Exception as exc:
        print("Fresh AI generation unavailable:", exc)
        cached = _cached_ai(prompt)
        if cached:
            return cached
        print("No exact cached AI image exists; drawing a page-matched native creative without external services.")
        return _native_background(prompt, seed), "emergency-branded"


def _word_trim(value: str, limit: int) -> str:
    value = engine.clean(value, max(limit + 40, limit))
    if len(value) <= limit:
        return value
    chunk = value[:limit].rstrip(" ,.;:-")
    if " " in chunk:
        chunk = chunk.rsplit(" ", 1)[0].rstrip(" ,.;:-")
    return chunk


def _append_x(base: str, teaser: str, limit: int = 190) -> str:
    teaser = engine.clean(teaser, limit)
    if not base:
        return _word_trim(teaser, limit)
    room = limit - len(teaser) - 3
    if room < 40:
        return _word_trim(teaser, limit)
    trimmed = _word_trim(base, room)
    return f"{trimmed} • {teaser}"[:limit]


def _grounded_platform_copy(item: dict, copy: dict) -> dict:
    """Use AI for the hook/creative direction, but keep factual body copy tied to page metadata."""
    title = engine.clean(item.get("title", "NexusNova Tools"), 120)
    summary = engine.clean(item.get("summary", ""), 280)
    hook = engine.clean(copy.get("hook") or title, 180)
    if summary:
        x = _word_trim(f"{hook} {summary}", 190)
        facebook = engine.clean(
            f"{hook}\n\n{summary}\n\nOpen it on NexusNova Tools and save the page for the next time you need it.",
            700,
        )
        instagram = engine.clean(
            f"{hook}\n\n{summary}\n\nA focused browser tool from NexusNova. Save this post and use the link when you need the tool.",
            1500,
        )
    else:
        x = _word_trim(hook, 190)
        facebook = engine.clean(f"{hook}\n\nExplore {title} on NexusNova Tools.", 700)
        instagram = engine.clean(f"{hook}\n\nExplore {title} on NexusNova Tools and save it for later.", 1500)
    return {"x": x, "facebook": facebook, "instagram": instagram}


def brand_aware_copy(item: dict, slot: int, trends: list[str]) -> dict:
    copy = _original_build_copy(item, slot, trends)
    platform = _grounded_platform_copy(item, copy)
    hashtags = list(copy.get("hashtags") or [])
    title = engine.clean(item.get("title", "this tool"), 110)

    if slot == 2:
        teaser = "App coming soon: 60+ premium tools. Follow @NexusNovaTools for launch updates."
        platform["x"] = _append_x(platform.get("x", ""), teaser)
        platform["facebook"] = engine.clean(
            f"{platform.get('facebook','')}\n\nComing soon: the NexusNova app with 60+ premium tools. Which tool would you want first in the app? Follow NexusNova for launch updates.",
            700,
        )
        platform["instagram"] = engine.clean(
            f"{platform.get('instagram','')}\n\nComing soon: the NexusNova app with 60+ premium tools. Which tool would you want first in the app? Follow @nexusnovatools for launch updates.",
            1500,
        )
        copy["image_prompt"] = engine.clean(
            f"{copy.get('image_prompt','')} Include a subtle premium mobile-app launch concept representing a unified ecosystem of 60+ digital tools; no readable text, no fake app-store badges.",
            900,
        )
        for tag in ("NexusNovaApp", "DigitalTools"):
            if tag not in hashtags:
                hashtags.append(tag)

    elif slot == 4:
        platform["x"] = _word_trim(
            f"{title}: what would make a tool like this more useful for you? Follow @NexusNovaTools for practical tools and product updates.",
            190,
        )
        platform["facebook"] = engine.clean(
            f"{title}\n\nWhat would make a tool like this more useful for you? We use real feedback to shape what NexusNova improves next. Follow NexusNova for practical tools and product updates.",
            700,
        )
        platform["instagram"] = engine.clean(
            f"{title}\n\nWhat would make a tool like this more useful for you? We use real feedback to shape what NexusNova improves next. Follow @nexusnovatools for practical tools, app previews and product updates.",
            1500,
        )
        copy["image_prompt"] = engine.clean(
            f"{copy.get('image_prompt','')} Make the composition discussion-worthy and save-worthy, focused on one clear visual idea related to {title}; no readable text, no fake claims.",
            900,
        )
        for tag in ("NexusNova", "OnlineTools", "Productivity"):
            if tag not in hashtags:
                hashtags.append(tag)

    elif slot == 5:
        teaser = "Mining is live on nexusnovatools.com; the 60+ tools app is coming soon."
        platform["x"] = _append_x(platform.get("x", ""), teaser)
        platform["facebook"] = engine.clean(
            f"{platform.get('facebook','')}\n\nNexusNova mining is already live on the web experience at nexusnovatools.com. The NexusNova app is coming soon with 60+ premium tools.",
            700,
        )
        platform["instagram"] = engine.clean(
            f"{platform.get('instagram','')}\n\nNexusNova mining is already live on the web experience at nexusnovatools.com. The NexusNova app is coming soon with 60+ premium tools.",
            1500,
        )
        copy["image_prompt"] = engine.clean(
            f"{copy.get('image_prompt','')} Blend in a sophisticated abstract mining-progress dashboard and premium mobile-app ecosystem visual; no coins, currency symbols, earnings claims, readable text, or fake store badges.",
            900,
        )
        for tag in ("NexusNovaApp", "NexusNovaMining"):
            if tag not in hashtags:
                hashtags.append(tag)

    copy["platform_copy"] = platform
    copy["hashtags"] = hashtags[:5]
    return copy


def main() -> None:
    total_targets, enabled_targets = _registry_status()
    print("Target groups registry:", total_targets, "slots;", enabled_targets, "enabled")
    engine.download_ai_background = resilient_download
    engine.build_copy = brand_aware_copy
    engine.main()


if __name__ == "__main__":
    main()
