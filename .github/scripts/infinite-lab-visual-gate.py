from PIL import Image
from pathlib import Path

root = Path("qa-artifacts")
path = root / "01-solar-system.png"
if not path.exists():
    raise SystemExit("VISUAL GATE FAIL: 01-solar-system.png missing")

im = Image.open(path).convert("RGB")
if im.width < 900 or im.height < 600:
    raise SystemExit(f"VISUAL GATE FAIL: unexpected screenshot size {im.size}")

crop = im.crop((300, 260, min(im.width - 260, 1050), min(im.height - 230, 620)))
pixels = list(crop.getdata())
nonblack = sum(1 for r, g, b in pixels if r + g + b > 30) / len(pixels)
bright = sum(1 for r, g, b in pixels if r + g + b > 120) / len(pixels)

print(f"VISUAL GATE solar crop: nonblack={nonblack:.4f} bright={bright:.4f}")
if nonblack < 0.02 or bright < 0.002:
    raise SystemExit("VISUAL GATE FAIL: rendered scene is effectively empty")
print("VISUAL GATE PASS: rendered 3D scene has measurable scene pixels")
