#!/usr/bin/env python3
from pathlib import Path

SIZE = 17
OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "luts"


def clamp(v):
    return min(1.0, max(0.0, v))


def lerp(a, b, t):
    return a + (b - a) * t


def sat(r, g, b, amount):
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lerp(luma, r, amount), lerp(luma, g, amount), lerp(luma, b, amount)


def contrast(r, g, b, amount):
    return lerp(0.5, r, amount), lerp(0.5, g, amount), lerp(0.5, b, amount)


def lift_gamma_gain(r, g, b, lift, gamma, gain):
    def apply(c, i):
        return clamp(max(0.0, c * gain[i] + lift[i]) ** (1 / gamma[i]))

    return apply(r, 0), apply(g, 1), apply(b, 2)


def s_curve(x, amount):
    t = clamp(x)
    curved = t * t * (3 - 2 * t)
    return lerp(t, curved, amount)


def kodak_2383(rgb):
    r, g, b = contrast(*rgb, 1.18)
    r, g, b = s_curve(r, 0.35), s_curve(g, 0.32), s_curve(b, 0.38)
    return lift_gamma_gain(r, g, b, (0.02, 0.03, 0.04), (1.05, 1.02, 0.96), (1.08, 1.02, 0.92))


def teal_orange(rgb):
    r, g, b = rgb
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = r + (1 - luma) * -0.08 + luma * 0.12
    g = g + (1 - luma) * 0.02 + luma * 0.04
    b = b + (1 - luma) * 0.10 + luma * -0.10
    r, g, b = sat(r, g, b, 1.12)
    r, g, b = contrast(r, g, b, 1.16)
    return clamp(r), clamp(g), clamp(b)


def bleach_bypass(rgb):
    r, g, b = sat(*rgb, 0.42)
    r, g, b = contrast(r, g, b, 1.38)
    return lift_gamma_gain(r, g, b, (0.01, 0.02, 0.04), (0.95, 0.97, 1.02), (1.02, 1.04, 1.08))


def golden_hour(rgb):
    r, g, b = lift_gamma_gain(*rgb, (0.04, 0.02, 0.0), (1.08, 1.04, 0.98), (1.12, 1.04, 0.86))
    r, g, b = sat(r, g, b, 1.08)
    return tuple(clamp(v) for v in contrast(r, g, b, 0.92))


def fuji_eterna(rgb):
    r, g, b = contrast(*rgb, 0.88)
    r, g, b = sat(r, g, b, 0.86)
    return lift_gamma_gain(r, g, b, (0.03, 0.04, 0.03), (1.04, 1.06, 1.02), (0.98, 1.04, 1.0))


def night_neon(rgb):
    r, g, b = contrast(*rgb, 1.28)
    r, g, b = r * 1.08 + 0.04, g * 0.9, b * 1.16 + 0.06
    r, g, b = sat(r, g, b, 1.25)
    return clamp(r * 0.92), clamp(g * 0.86), clamp(b)


def vintage_fade(rgb):
    r, g, b = contrast(*rgb, 0.78)
    r, g, b = sat(r, g, b, 0.72)
    return lift_gamma_gain(r, g, b, (0.08, 0.07, 0.04), (1.1, 1.06, 1.02), (1.04, 0.98, 0.88))


def arctic_cool(rgb):
    r, g, b = contrast(*rgb, 1.14)
    r, g, b = sat(r, g, b, 0.9)
    return lift_gamma_gain(r, g, b, (0.0, 0.02, 0.05), (0.98, 1.02, 1.08), (0.92, 1.02, 1.1))


def autumn_ember(rgb):
    r, g, b = rgb[0] * 1.1 + 0.04, rgb[1] * 0.96 + 0.02, rgb[2] * 0.82
    r, g, b = sat(r, g, b, 1.1)
    return tuple(clamp(v) for v in contrast(r, g, b, 1.08))


def bw_classic(rgb):
    y = 0.25 * rgb[0] + 0.65 * rgb[1] + 0.1 * rgb[2]
    c = s_curve(y, 0.4)
    return clamp(c * 1.02), clamp(c), clamp(c * 0.96)


def portrait_soft(rgb):
    r, g, b = contrast(*rgb, 0.86)
    r, g, b = sat(r, g, b, 0.92)
    return lift_gamma_gain(r, g, b, (0.05, 0.03, 0.03), (1.06, 1.03, 1.02), (1.06, 1.0, 0.96))


def ocean_cyan(rgb):
    r, g, b = lift_gamma_gain(*rgb, (0.0, 0.03, 0.05), (1.0, 1.06, 1.08), (0.9, 1.06, 1.12))
    r, g, b = sat(r, g, b, 1.06)
    return tuple(clamp(v) for v in contrast(r, g, b, 1.06))


RECIPES = {
    "kodak-2383": ("Kodak 2383", kodak_2383),
    "teal-orange": ("Teal Orange", teal_orange),
    "bleach-bypass": ("Bleach Bypass", bleach_bypass),
    "golden-hour": ("Golden Hour", golden_hour),
    "fuji-eterna": ("Fuji Eterna", fuji_eterna),
    "night-neon": ("Night Neon", night_neon),
    "vintage-fade": ("Vintage Fade", vintage_fade),
    "arctic-cool": ("Arctic Cool", arctic_cool),
    "autumn-ember": ("Autumn Ember", autumn_ember),
    "bw-classic": ("BW Classic", bw_classic),
    "portrait-soft": ("Portrait Soft", portrait_soft),
    "ocean-cyan": ("Ocean Cyan", ocean_cyan),
}


def write_cube(lut_id, title, mapper):
    lines = [
        f"# {title}",
        "# Generated demo LUT for LOOKTABLE",
        f'TITLE "{title}"',
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
        f"LUT_3D_SIZE {SIZE}",
        "",
    ]
    last = SIZE - 1
    for kb in range(SIZE):
        for kg in range(SIZE):
            for kr in range(SIZE):
                mapped = mapper((kr / last, kg / last, kb / last))
                r, g, b = (clamp(v) for v in mapped)
                lines.append(f"{r:.6f} {g:.6f} {b:.6f}")
    (OUT_DIR / f"{lut_id}.cube").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for lut_id, (title, mapper) in RECIPES.items():
        write_cube(lut_id, title, mapper)
        print(f"wrote {lut_id}.cube")


if __name__ == "__main__":
    main()
