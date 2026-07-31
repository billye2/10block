#!/usr/bin/env python3
"""Generate 10block icons: red stop-sign octagon with white "10" inside."""
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "icons")

RED = (218, 33, 39)   # stop-sign red
WHITE = (255, 255, 255)


def octagon_metric(x, y, cx, cy):
    """Distance metric for a stop-sign-oriented regular octagon.
    Point is inside octagon of apothem a iff metric <= a."""
    dx = abs(x - cx)
    dy = abs(y - cy)
    return max(dx, dy, (dx + dy) / (2 ** 0.5))


def in_ellipse(x, y, cx, cy, rx, ry):
    if rx <= 0 or ry <= 0:
        return False
    nx = (x - cx) / rx
    ny = (y - cy) / ry
    return nx * nx + ny * ny <= 1.0


def make_icon(size, path, canvas=None):
    """Draw the mark at `size` px. With `canvas`, centre it on a larger
    transparent square — the Chrome Web Store icon is a 96px mark on 128px."""
    ss = 4  # supersampling factor
    dim = canvas or size
    c = dim / 2.0                      # centre of the canvas
    a = size / 2.0 - max(0.5, size * 0.01)  # octagon apothem, tiny margin
    small = size <= 16                 # too small for a border ring
    ring_out = 0 if small else a * 0.88
    ring_in = 0 if small else a * 0.76

    # "10" glyph geometry (bigger digits when there's no ring)
    scale = 1.25 if small else 1.0
    stroke = size * 0.095 * scale      # stroke width for both digits
    half_h = size * 0.20 * scale       # digit half-height
    one_cx = c - size * 0.155 * scale  # "1" bar center
    zero_cx = c + size * 0.115 * scale # "0" center
    zero_rx = size * 0.135 * scale     # "0" outer semi-axes
    zero_ry = half_h

    rows = []
    for py in range(dim):
        row = bytearray()
        for px in range(dim):
            body = 0.0
            white = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    x = px + (sx + 0.5) / ss
                    y = py + (sy + 0.5) / ss
                    m = octagon_metric(x, y, c, c)
                    if m > a:
                        continue
                    body += 1
                    # white border ring
                    if ring_in <= m <= ring_out:
                        white += 1
                        continue
                    # "1": vertical bar
                    if abs(x - one_cx) <= stroke / 2 and abs(y - c) <= half_h:
                        white += 1
                        continue
                    # "0": elliptical ring
                    if in_ellipse(x, y, zero_cx, c, zero_rx, zero_ry) and not in_ellipse(
                        x, y, zero_cx, c, zero_rx - stroke, zero_ry - stroke
                    ):
                        white += 1
            n = ss * ss
            body /= n
            white /= n
            if body == 0:
                row += bytes((0, 0, 0, 0))
            else:
                t = white / body
                r_ = round(RED[0] + (WHITE[0] - RED[0]) * t)
                g_ = round(RED[1] + (WHITE[1] - RED[1]) * t)
                b_ = round(RED[2] + (WHITE[2] - RED[2]) * t)
                row += bytes((r_, g_, b_, round(255 * body)))
        rows.append(bytes(row))

    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(typ, data):
        ch = struct.pack(">I", len(data)) + typ + data
        ch += struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        return ch

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", dim, dim, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")

    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({dim}x{dim})")


def main(argv):
    # --store PATH writes the Chrome Web Store listing icon: the same mark at
    # 96px, centred on a 128px canvas (the 16px margin the store expects).
    if len(argv) >= 2 and argv[0] == "--store":
        os.makedirs(os.path.dirname(os.path.abspath(argv[1])), exist_ok=True)
        make_icon(96, argv[1], canvas=128)
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    for s in (16, 48, 128):
        make_icon(s, os.path.join(OUT_DIR, f"icon{s}.png"))


if __name__ == "__main__":
    import sys
    main(sys.argv[1:])
