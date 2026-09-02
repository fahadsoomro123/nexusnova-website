from __future__ import annotations

import hashlib
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import premium_social_campaign as engine  # noqa: E402

CACHE_DIR = ROOT / "assets/generated/ai-social-library"
_original_download = engine.download_ai_background
_original_build_copy = engine.build_copy


def _cache_fresh_ai(image: Image.Image, prompt: str, seed: int) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fingerprint = hashlib.sha256(f"{seed}:{prompt}".encode("utf-8", errors="ignore")).hexdigest()[:16]
    target = CACHE_DIR / f"ai-background-{fingerprint}.jpg"
    ImageOps.fit(image.convert("RGB"), (1536, 1920), method=Image.Resampling.LANCZOS).save(
        target,
        "JPEG",
        quality=91,
        optimize=True,
        progressive=True,
    )
    return target


def _cached_ai(seed: int) -> tuple[Image.Image, str] | None:
    candidates = sorted(CACHE_DIR.glob("*.jpg")) + sorted(CACHE_DIR.glob("*.jpeg")) + sorted(CACHE_DIR.glob("*.png"))
    if not candidates:
        return None
    chosen = candidates[seed % len(candidates)]
    try:
        image = Image.open(chosen).convert("RGB")
        print("Fresh AI unavailable; rotating cached AI background:", chosen)
        return image, "cached-ai-library"
    except Exception as exc:
        print("Cached AI background failed:", exc)
        return None


def _emergency_background(seed: int) -> tuple[Image.Image, str]:
    print("No fresh/cached AI image available; using emergency branded continuity background.")
    image = Image.new("RGB", (1536, 1920), (5, 14, 29))
    draw = ImageDraw.Draw(image)
    for y in range(1920):
        t = y / 1919
        draw.line((0, y, 1536, y), fill=(int(5 + 9*t), int(14 + 22*t), int(29 + 38*t)))
    for idx, radius in enumerate((620, 470, 330, 220)):
        cx = 260 + ((seed >> (idx * 5)) % 1020)
        cy = 280 + ((seed >> (idx * 7)) % 1250)
        alpha = 26 + idx * 8
        glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), fill=(45, 181, 255, alpha))
        image = Image.alpha_composite(image.convert("RGBA"), glow).convert("RGB")
    return image, "emergency-branded"


def resilient_download(prompt: str, seed: int) -> tuple[Image.Image, str]:
    try:
        image, provider = _original_download(prompt, seed)
        cached = _cache_fresh_ai(image, prompt, seed)
        print("Fresh AI creative cached for future quota/outage continuity:", cached)
        return image, provider
    except Exception as exc:
        print("Fresh AI generation unavailable:", exc)
        cached = _cached_ai(seed)
        if cached:
            return cached
        return _emergency_background(seed)


def _append_x(base: str, teaser: str, limit: int = 190) -> str:
    base = engine.clean(base, limit)
    teaser = engine.clean(teaser, limit)
    if not base:
        return teaser[:limit]
    room = limit - len(teaser) - 3
    if room < 40:
        return teaser[:limit]
    trimmed = base[:room].rstrip(" ,.;:-")
    return f"{trimmed} • {teaser}"[:limit]


def brand_aware_copy(item: dict, slot: int, trends: list[str]) -> dict:
    copy = _original_build_copy(item, slot, trends)
    platform = dict(copy.get("platform_copy") or {})
    hashtags = list(copy.get("hashtags") or [])

    if slot == 2:
        teaser = "NexusNova app is coming soon with 60+ premium tools."
        platform["x"] = _append_x(platform.get("x", ""), teaser)
        platform["facebook"] = engine.clean(
            f"{platform.get('facebook','')}\n\nComing soon: the NexusNova app with 60+ premium tools.",
            700,
        )
        platform["instagram"] = engine.clean(
            f"{platform.get('instagram','')}\n\nComing soon: the NexusNova app with 60+ premium tools.",
            1500,
        )
        copy["image_prompt"] = engine.clean(
            f"{copy.get('image_prompt','')} Include a subtle premium mobile-app launch concept representing a unified ecosystem of 60+ digital tools; no readable text, no fake app-store badges.",
            900,
        )
        for tag in ("NexusNovaApp", "DigitalTools"):
            if tag not in hashtags:
                hashtags.append(tag)

    elif slot == 5:
        teaser = "Mining is already live on nexusnovatools.com; the 60+ tools app is coming soon."
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
    engine.download_ai_background = resilient_download
    engine.build_copy = brand_aware_copy
    engine.main()


if __name__ == "__main__":
    main()
