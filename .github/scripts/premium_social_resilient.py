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


def main() -> None:
    engine.download_ai_background = resilient_download
    engine.main()


if __name__ == "__main__":
    main()
