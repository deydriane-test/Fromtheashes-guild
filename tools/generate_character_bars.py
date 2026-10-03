#!/usr/bin/env python3
"""
From The Ashes — Character Bar Composite Generator

Builds every avatar × bar-style combination into a finished WebP asset.
The generated image contains ONLY the bar artwork + avatar portrait.
Character name, role, online status and dropdown controls remain live HTML.

Usage:
    python tools/generate_character_bars.py
    python tools/generate_character_bars.py --style bar-001
    python tools/generate_character_bars.py --avatar avatar-021
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "character-bars.json"

RESAMPLE = Image.Resampling.LANCZOS


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    p.add_argument("--style", help="Generate only this style id, e.g. bar-001")
    p.add_argument("--avatar", help="Generate only this avatar id, e.g. avatar-021")
    p.add_argument("--clean", action="store_true", help="Remove generated output before building")
    return p.parse_args()


def load_config(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def iter_avatars(directory: Path, only: str | None) -> Iterable[Path]:
    for path in sorted(directory.glob("avatar-*.webp")):
        if only and path.stem != only:
            continue
        yield path


def normalized_box(size: tuple[int, int], box: list[float]) -> tuple[int, int, int, int]:
    w, h = size
    x, y, bw, bh = box
    return (
        round(x * w),
        round(y * h),
        round((x + bw) * w),
        round((y + bh) * h),
    )


def crop_avatar_source(img: Image.Image, inset: list[float]) -> Image.Image:
    """Crop baked thumbnail border using normalized L/T/R/B inset."""
    l, t, r, b = inset
    w, h = img.size
    box = (
        round(l * w),
        round(t * h),
        round(w - r * w),
        round(h - b * h),
    )
    return img.crop(box)


def cover(
    img: Image.Image,
    target_size: tuple[int, int],
    focus_x: float = 0.50,
    focus_y: float = 0.46,
) -> Image.Image:
    """Resize/crop like object-fit:cover with independent X/Y focal points."""
    tw, th = target_size
    iw, ih = img.size
    scale = max(tw / iw, th / ih)
    nw, nh = max(1, round(iw * scale)), max(1, round(ih * scale))
    img = img.resize((nw, nh), RESAMPLE)

    overflow_x = max(0, nw - tw)
    overflow_y = max(0, nh - th)
    fx = max(0.0, min(1.0, focus_x))
    fy = max(0.0, min(1.0, focus_y))
    left = min(overflow_x, round(overflow_x * fx))
    top = min(overflow_y, round(overflow_y * fy))
    return img.crop((left, top, left + tw, top + th))


def octagon_mask(size: tuple[int, int], cut: float) -> Image.Image:
    w, h = size
    c = round(min(w, h) * cut)
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.polygon(
        [
            (c, 0), (w - c, 0), (w, c), (w, h - c),
            (w - c, h), (c, h), (0, h - c), (0, c),
        ],
        fill=255,
    )
    return mask


def glow_layer(size, poly, width, color, blur):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.line(poly + [poly[0]], fill=color, width=width, joint="curve")
    return layer.filter(ImageFilter.GaussianBlur(blur))


def draw_slot_border(canvas: Image.Image, box, style: dict):
    x1, y1, x2, y2 = box
    w, h = x2 - x1, y2 - y1
    cut = round(min(w, h) * style.get("slot_corner_cut", 0.14))
    poly = [
        (x1 + cut, y1), (x2 - cut, y1), (x2, y1 + cut), (x2, y2 - cut),
        (x2 - cut, y2), (x1 + cut, y2), (x1, y2 - cut), (x1, y1 + cut),
    ]

    glow = style.get("slot_glow", {})
    if glow.get("enabled", True):
        g = glow_layer(
            canvas.size,
            poly,
            max(1, round(min(w, h) * glow.get("width", 0.055))),
            tuple(glow.get("color", [255, 101, 22, 190])),
            max(1, round(min(w, h) * glow.get("blur", 0.055))),
        )
        canvas.alpha_composite(g)

    d = ImageDraw.Draw(canvas)
    outer = tuple(style.get("slot_border_outer", [255, 111, 28, 255]))
    inner = tuple(style.get("slot_border_inner", [255, 183, 74, 255]))
    ow = max(1, round(min(w, h) * style.get("slot_border_width", 0.032)))
    iw = max(1, round(ow * 0.42))
    d.line(poly + [poly[0]], fill=outer, width=ow, joint="curve")

    pad = max(2, ow + 1)
    ix1, iy1, ix2, iy2 = x1 + pad, y1 + pad, x2 - pad, y2 - pad
    ic = max(2, cut - pad // 2)
    ipoly = [
        (ix1 + ic, iy1), (ix2 - ic, iy1), (ix2, iy1 + ic), (ix2, iy2 - ic),
        (ix2 - ic, iy2), (ix1 + ic, iy2), (ix1, iy2 - ic), (ix1, iy1 + ic),
    ]
    d.line(ipoly + [ipoly[0]], fill=inner, width=iw, joint="curve")


def build_one(avatar_path: Path, style: dict, output_root: Path, quality: int):
    frame_path = ROOT / style["frame"]
    frame = Image.open(frame_path).convert("RGBA")
    avatar = Image.open(avatar_path).convert("RGBA")

    target_width = int(style.get("output_width", frame.width))
    if target_width != frame.width:
        target_height = round(frame.height * (target_width / frame.width))
        frame = frame.resize((target_width, target_height), RESAMPLE)

    canvas = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    slot = normalized_box(frame.size, style["avatar_slot"])
    x1, y1, x2, y2 = slot
    sw, sh = x2 - x1, y2 - y1

    avatar_rules = style.get("_avatar_rules", {})
    override = avatar_rules.get(avatar_path.stem, {})
    source_inset = override.get(
        "source_inset",
        style.get("avatar_source_inset", [0.04, 0.04, 0.04, 0.04])
    )
    avatar = crop_avatar_source(avatar, source_inset)
    portrait = cover(
        avatar,
        (sw, sh),
        float(override.get("focus_x", style.get("avatar_focus_x", 0.50))),
        float(override.get("focus_y", style.get("avatar_focus_y", 0.46))),
    )

    canvas.alpha_composite(portrait, (x1, y1))
    canvas.alpha_composite(frame)

    out_dir = output_root / style["id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{avatar_path.stem}.webp"
    canvas.save(
        out_path,
        "WEBP",
        quality=quality,
        method=6,
        exact=True,
    )
    return out_path


from PIL import ImageChops


def main():
    args = parse_args()
    config = load_config(args.config)

    avatar_dir = ROOT / config["avatar_directory"]
    output_root = ROOT / config["output_directory"]
    quality = int(config.get("webp_quality", 86))

    if args.clean and output_root.exists():
        shutil.rmtree(output_root)

    avatars = list(iter_avatars(avatar_dir, args.avatar))
    if not avatars:
        raise SystemExit(f"No avatar files found in {avatar_dir}")

    styles = [s for s in config["styles"] if not args.style or s["id"] == args.style]
    if not styles:
        raise SystemExit(f"No matching bar style: {args.style}")

    outputs = []
    avatar_rules = config.get("avatar_overrides", {})
    for style in styles:
        style = dict(style)
        style["_avatar_rules"] = avatar_rules
        frame_path = ROOT / style["frame"]
        if not frame_path.exists():
            raise SystemExit(f"Missing frame asset: {frame_path}")
        for avatar in avatars:
            outputs.append(build_one(avatar, style, output_root, quality))

    manifest = {
        "avatar_count": len(avatars),
        "style_count": len(styles),
        "generated_count": len(outputs),
        "styles": [s["id"] for s in styles],
        "files": [str(p.relative_to(ROOT)).replace("\\", "/") for p in outputs],
    }
    output_root.mkdir(parents=True, exist_ok=True)
    with (output_root / "manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Generated {len(outputs)} character-bar composites.")
    for p in outputs[:8]:
        print(" ", p.relative_to(ROOT))
    if len(outputs) > 8:
        print(f"  ... and {len(outputs) - 8} more")


if __name__ == "__main__":
    main()
