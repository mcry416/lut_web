import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "assets", "luts");
const SIZE = 17;

function clamp(v) {
  return Math.min(1, Math.max(0, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sat(r, g, b, amount) {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [lerp(l, r, amount), lerp(l, g, amount), lerp(l, b, amount)];
}

function contrast(r, g, b, amount) {
  return [
    lerp(0.5, r, amount),
    lerp(0.5, g, amount),
    lerp(0.5, b, amount),
  ];
}

function liftGammaGain(r, g, b, lift, gamma, gain) {
  const apply = (c, i) => clamp(Math.max(0, c * gain[i] + lift[i]) ** (1 / gamma[i]));
  return [apply(r, 0), apply(g, 1), apply(b, 2)];
}

function sCurve(x, amount) {
  const t = clamp(x);
  const curved = t * t * (3 - 2 * t);
  return lerp(t, curved, amount);
}

const recipes = {
  "kodak-2383": {
    title: "Kodak 2383",
    map([r, g, b]) {
      let [cr, cg, cb] = contrast(r, g, b, 1.18);
      cr = sCurve(cr, 0.35);
      cg = sCurve(cg, 0.32);
      cb = sCurve(cb, 0.38);
      return liftGammaGain(cr, cg, cb, [0.02, 0.03, 0.04], [1.05, 1.02, 0.96], [1.08, 1.02, 0.92]);
    },
  },
  "teal-orange": {
    title: "Teal Orange",
    map([r, g, b]) {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      let cr = r + (1 - l) * -0.08 + l * 0.12;
      let cg = g + (1 - l) * 0.02 + l * 0.04;
      let cb = b + (1 - l) * 0.1 + l * -0.1;
      [cr, cg, cb] = sat(cr, cg, cb, 1.12);
      [cr, cg, cb] = contrast(cr, cg, cb, 1.16);
      return [clamp(cr), clamp(cg), clamp(cb)];
    },
  },
  "bleach-bypass": {
    title: "Bleach Bypass",
    map([r, g, b]) {
      let [cr, cg, cb] = sat(r, g, b, 0.42);
      [cr, cg, cb] = contrast(cr, cg, cb, 1.38);
      return liftGammaGain(cr, cg, cb, [0.01, 0.02, 0.04], [0.95, 0.97, 1.02], [1.02, 1.04, 1.08]);
    },
  },
  "golden-hour": {
    title: "Golden Hour",
    map([r, g, b]) {
      let [cr, cg, cb] = liftGammaGain(r, g, b, [0.04, 0.02, 0.0], [1.08, 1.04, 0.98], [1.12, 1.04, 0.86]);
      [cr, cg, cb] = sat(cr, cg, cb, 1.08);
      return contrast(cr, cg, cb, 0.92).map(clamp);
    },
  },
  "fuji-eterna": {
    title: "Fuji Eterna",
    map([r, g, b]) {
      let [cr, cg, cb] = contrast(r, g, b, 0.88);
      [cr, cg, cb] = sat(cr, cg, cb, 0.86);
      return liftGammaGain(cr, cg, cb, [0.03, 0.04, 0.03], [1.04, 1.06, 1.02], [0.98, 1.04, 1.0]);
    },
  },
  "night-neon": {
    title: "Night Neon",
    map([r, g, b]) {
      let [cr, cg, cb] = contrast(r, g, b, 1.28);
      cr = cr * 1.08 + 0.04;
      cb = cb * 1.16 + 0.06;
      cg = cg * 0.9;
      [cr, cg, cb] = sat(cr, cg, cb, 1.25);
      return [clamp(cr * 0.92), clamp(cg * 0.86), clamp(cb)];
    },
  },
  "vintage-fade": {
    title: "Vintage Fade",
    map([r, g, b]) {
      let [cr, cg, cb] = contrast(r, g, b, 0.78);
      [cr, cg, cb] = sat(cr, cg, cb, 0.72);
      return liftGammaGain(cr, cg, cb, [0.08, 0.07, 0.04], [1.1, 1.06, 1.02], [1.04, 0.98, 0.88]);
    },
  },
  "arctic-cool": {
    title: "Arctic Cool",
    map([r, g, b]) {
      let [cr, cg, cb] = contrast(r, g, b, 1.14);
      [cr, cg, cb] = sat(cr, cg, cb, 0.9);
      return liftGammaGain(cr, cg, cb, [0.0, 0.02, 0.05], [0.98, 1.02, 1.08], [0.92, 1.02, 1.1]);
    },
  },
  "autumn-ember": {
    title: "Autumn Ember",
    map([r, g, b]) {
      let cr = r * 1.1 + 0.04;
      let cg = g * 0.96 + 0.02;
      let cb = b * 0.82;
      [cr, cg, cb] = sat(cr, cg, cb, 1.1);
      return contrast(cr, cg, cb, 1.08).map(clamp);
    },
  },
  "bw-classic": {
    title: "BW Classic",
    map([r, g, b]) {
      const y = 0.25 * r + 0.65 * g + 0.1 * b;
      const c = sCurve(y, 0.4);
      return [clamp(c * 1.02), clamp(c * 1.0), clamp(c * 0.96)];
    },
  },
  "portrait-soft": {
    title: "Portrait Soft",
    map([r, g, b]) {
      let [cr, cg, cb] = contrast(r, g, b, 0.86);
      [cr, cg, cb] = sat(cr, cg, cb, 0.92);
      return liftGammaGain(cr, cg, cb, [0.05, 0.03, 0.03], [1.06, 1.03, 1.02], [1.06, 1.0, 0.96]);
    },
  },
  "ocean-cyan": {
    title: "Ocean Cyan",
    map([r, g, b]) {
      let [cr, cg, cb] = liftGammaGain(r, g, b, [0.0, 0.03, 0.05], [1.0, 1.06, 1.08], [0.9, 1.06, 1.12]);
      [cr, cg, cb] = sat(cr, cg, cb, 1.06);
      return contrast(cr, cg, cb, 1.06).map(clamp);
    },
  },
};

function writeCube(id, title, map) {
  const lines = [
    `# ${title}`,
    `# Generated demo LUT for LOOKTABLE`,
    `TITLE "${title}"`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0",
    `LUT_3D_SIZE ${SIZE}`,
    "",
  ];

  for (let kb = 0; kb < SIZE; kb += 1) {
    for (let kg = 0; kg < SIZE; kg += 1) {
      for (let kr = 0; kr < SIZE; kr += 1) {
        const input = [kr / (SIZE - 1), kg / (SIZE - 1), kb / (SIZE - 1)];
        const [r, g, b] = map(input).map(clamp);
        lines.push(`${r.toFixed(6)} ${g.toFixed(6)} ${b.toFixed(6)}`);
      }
    }
  }

  writeFileSync(join(outDir, `${id}.cube`), `${lines.join("\n")}\n`);
}

mkdirSync(outDir, { recursive: true });
for (const [id, recipe] of Object.entries(recipes)) {
  writeCube(id, recipe.title, recipe.map);
  console.log(`wrote ${id}.cube`);
}
