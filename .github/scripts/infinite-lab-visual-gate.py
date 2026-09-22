import struct, zlib
from pathlib import Path

def decode_png(path):
    b = Path(path).read_bytes()
    if b[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    pos, idat, width, height, bit_depth, color_type, interlace = 8, [], None, None, None, None, None
    while pos < len(b):
        n = struct.unpack(">I", b[pos:pos+4])[0]; typ = b[pos+4:pos+8]; data = b[pos+8:pos+8+n]; pos += 12 + n
        if typ == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", data)
        elif typ == b"IDAT":
            idat.append(data)
        elif typ == b"IEND":
            break
    if bit_depth != 8 or color_type not in (2, 6) or interlace != 0:
        raise ValueError(f"unsupported PNG format: bit_depth={bit_depth}, color_type={color_type}, interlace={interlace}")
    raw = zlib.decompress(b"".join(idat))
    channels = 3 if color_type == 2 else 4
    stride = width * channels
    rows, prev, off = [], bytearray(stride), 0
    for _ in range(height):
        f = raw[off]; off += 1
        cur = bytearray(raw[off:off+stride]); off += stride
        if f == 1:
            for i in range(stride):
                cur[i] = (cur[i] + (cur[i-channels] if i >= channels else 0)) & 255
        elif f == 2:
            for i in range(stride):
                cur[i] = (cur[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                left = cur[i-channels] if i >= channels else 0
                cur[i] = (cur[i] + ((left + prev[i]) // 2)) & 255
        elif f == 4:
            for i in range(stride):
                a = cur[i-channels] if i >= channels else 0
                bb = prev[i]
                cc = prev[i-channels] if i >= channels else 0
                p = a + bb - cc
                pa, pb, pc = abs(p-a), abs(p-bb), abs(p-cc)
                pr = a if pa <= pb and pa <= pc else (bb if pb <= pc else cc)
                cur[i] = (cur[i] + pr) & 255
        elif f != 0:
            raise ValueError(f"unsupported PNG filter {f}")
        rows.append(cur); prev = cur
    return width, height, channels, rows

root = Path("qa-artifacts")
targets = [root / "01-solar-system.png"]
for p in targets:
    if not p.exists():
        raise SystemExit(f"VISUAL GATE FAIL: {p.name} missing")
    w, h, ch, rows = decode_png(p)
    if w < 900 or h < 600:
        raise SystemExit(f"VISUAL GATE FAIL: unexpected screenshot size {(w,h)}")
    x0, y0, x1, y1 = 300, 260, min(w - 260, 1050), min(h - 230, 620)
    total = max(1, (x1-x0)*(y1-y0))
    nonblack = bright = 0
    for y in range(y0, y1):
        row = rows[y]
        for x in range(x0, x1):
            i = x*ch
            s = row[i] + row[i+1] + row[i+2]
            if s > 30: nonblack += 1
            if s > 120: bright += 1
    nr, br = nonblack/total, bright/total
    print(f"VISUAL GATE {p.name}: nonblack={nr:.4f} bright={br:.4f}")
    if nr < 0.02 or br < 0.002:
        raise SystemExit("VISUAL GATE FAIL: rendered scene is effectively empty")
print("VISUAL GATE PASS: screenshot contains measurable rendered scene pixels")
