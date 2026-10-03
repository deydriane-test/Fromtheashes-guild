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
import shutil
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageOps, ImageChops

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


def build_one(avatar_path: Path, style: dict, output_root: Path, quality: int,
              thumbnail_root: Path | None = None):
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
    # Later source tiles include a blank strip / part of the preceding tile.
    # Trim that first, then remove the thumbnail's own decorative border.
    avatar = crop_avatar_source(avatar, override.get("tile_inset", [0, 0, 0, 0]))
    avatar = crop_avatar_source(avatar, source_inset)
    portrait = cover(
        avatar,
        (sw, sh),
        float(override.get("focus_x", style.get("avatar_focus_x", 0.50))),
        float(override.get("focus_y", style.get("avatar_focus_y", 0.46))),
    )

    # The portrait must never become an opaque square outside the opening.
    mask = octagon_mask((sw, sh), style.get("slot_corner_cut", 0.22))
    portrait.putalpha(ImageChops.multiply(portrait.getchannel("A"), mask))
    canvas.alpha_composite(portrait, (x1, y1))
    canvas.alpha_composite(frame)

    # Use the same fully framed portrait for the grid and compact phone header.
    # Original individual avatars remain untouched for future styles.
    if thumbnail_root is not None:
        thumbnail_root.mkdir(parents=True, exist_ok=True)
        icon = canvas.copy()
        if "icon_polygon" in style:
            icon_mask = Image.new("L", canvas.size, 0)
            ImageDraw.Draw(icon_mask).polygon(
                [(round(x * canvas.width), round(y * canvas.height))
                 for x, y in style["icon_polygon"]], fill=255)
            icon.putalpha(ImageChops.multiply(icon.getchannel("A"), icon_mask))
        icon = icon.crop(normalized_box(canvas.size, style["icon_crop"]))
        icon = ImageOps.pad(icon, (256, 256), method=RESAMPLE, color=(0, 0, 0, 0))
        icon.save(thumbnail_root / f"{avatar_path.stem}.webp", "WEBP",
                  quality=quality, method=6, exact=True)

    if "output_crop" in style:
        canvas = canvas.crop(normalized_box(canvas.size, style["output_crop"]))

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


def create_previews(output_root: Path, styles: list[dict], thumbnail_root: Path):
    picks = ["avatar-001", "avatar-005", "avatar-010", "avatar-021", "avatar-026", "avatar-044"]
    for style in styles:
        paths = [output_root / style["id"] / f"{avatar}.webp" for avatar in picks]
        images = [Image.open(p).convert("RGBA") for p in paths if p.exists()]
        if not images:
            continue
        height = round(images[0].height * 900 / images[0].width)
        sheet = Image.new("RGBA", (900, (height + 24) * len(images)), (7, 9, 12, 255))
        for i, img in enumerate(images):
            sheet.alpha_composite(img.resize((900, height), RESAMPLE), (0, i * (height + 24)))
        sheet.convert("RGB").save(output_root / f'{style["id"]}-preview.webp',
                                  "WEBP", quality=88, method=6)

    thumbnails = sorted(thumbnail_root.glob("avatar-*.webp"))
    if thumbnails:
        cell, columns = 140, 8
        sheet = Image.new("RGB", (cell * columns, 160 * ((len(thumbnails) + columns - 1) // columns)), (7, 9, 12))
        draw = ImageDraw.Draw(sheet)
        for i, path in enumerate(thumbnails):
            x, y = (i % columns) * cell, (i // columns) * 160
            img = Image.open(path).convert("RGBA").resize((cell, cell), RESAMPLE)
            sheet.paste(img, (x, y), img)
            draw.text((x + 38, y + cell + 4), path.stem, fill=(220, 220, 220))
        sheet.save(thumbnail_root / "preview.webp", "WEBP", quality=88, method=6)


def main():
    args = parse_args()
    if args.clean and (args.style or args.avatar):
        raise SystemExit("--clean requires a full build; omit it for a single avatar/style.")
    config = load_config(args.config)

    avatar_dir = ROOT / config["avatar_directory"]
    output_root = ROOT / config["output_directory"]
    thumbnail_root = ROOT / config["thumbnail_directory"]
    quality = int(config.get("webp_quality", 86))

    if args.clean and output_root.exists():
        shutil.rmtree(output_root)
    if args.clean and thumbnail_root.exists():
        shutil.rmtree(thumbnail_root)

    avatars = list(iter_avatars(avatar_dir, args.avatar))
    if not avatars:
        raise SystemExit(f"No avatar files found in {avatar_dir}")

    styles = [s for s in config["styles"] if not args.style or s["id"] == args.style]
    if not styles:
        raise SystemExit(f"No matching bar style: {args.style}")

    outputs = []
    avatar_rules = config.get("avatar_overrides", {})
    thumbnail_style = config["styles"][0]["id"]
    for style in styles:
        style = dict(style)
        style["_avatar_rules"] = avatar_rules
        frame_path = ROOT / style["frame"]
        if not frame_path.exists():
            raise SystemExit(f"Missing frame asset: {frame_path}")
        for avatar in avatars:
            outputs.append(build_one(avatar, style, output_root, quality,
                                     thumbnail_root if style["id"] == thumbnail_style else None))

    manifest = {
        "generator_version": config.get("generator_version", 4),
        "avatar_count": len(list(iter_avatars(avatar_dir, None))),
        "style_count": len(config["styles"]),
        "styles": [s["id"] for s in config["styles"]],
        "files": [str(p.relative_to(ROOT)).replace("\\", "/")
                  for p in sorted(output_root.glob("bar-*/avatar-*.webp"))],
        "thumbnails": [str(p.relative_to(ROOT)).replace("\\", "/")
                       for p in sorted(thumbnail_root.glob("avatar-*.webp"))],
    }
    manifest["generated_count"] = len(manifest["files"])
    output_root.mkdir(parents=True, exist_ok=True)
    with (output_root / "manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")

    create_previews(output_root, styles, thumbnail_root)

    print(f"Generated {len(outputs)} character-bar composites.")
    for p in outputs[:8]:
        print(" ", p.relative_to(ROOT))
    if len(outputs) > 8:
        print(f"  ... and {len(outputs) - 8} more")


if __name__ == "__main__":
    main()
