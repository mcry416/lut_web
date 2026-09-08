(function (global) {
  const DEFAULT_REF = "assets/ref_wallpaper_scene.jpg";

  function clampByte(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  function parseCube(text) {
    let size = 0;
    const values = [];
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line || line[0] === "#" || line.startsWith("TITLE") || line.startsWith("DOMAIN")) {
        continue;
      }
      if (line.startsWith("LUT_3D_SIZE")) {
        size = Number(line.split(/\s+/)[1]);
        continue;
      }
      const parts = line.split(/\s+/);
      if (parts.length < 3) continue;
      const r = Number(parts[0]);
      const g = Number(parts[1]);
      const b = Number(parts[2]);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) continue;
      values.push(r, g, b);
    }

    if (!size) {
      size = Math.round(Math.cbrt(values.length / 3));
    }

    return { size, data: Float32Array.from(values) };
  }

  function sampleLUT(lut, r, g, b) {
    const n = lut.size;
    const max = n - 1;
    const rF = r * max;
    const gF = g * max;
    const bF = b * max;
    const r0 = Math.floor(rF);
    const g0 = Math.floor(gF);
    const b0 = Math.floor(bF);
    const r1 = r0 < max ? r0 + 1 : max;
    const g1 = g0 < max ? g0 + 1 : max;
    const b1 = b0 < max ? b0 + 1 : max;
    const rd = rF - r0;
    const gd = gF - g0;
    const bd = bF - b0;

    const data = lut.data;
    const n2 = n * n;
    const corner = (ri, gi, bi) => {
      const idx = (bi * n2 + gi * n + ri) * 3;
      return [data[idx], data[idx + 1], data[idx + 2]];
    };

    const c000 = corner(r0, g0, b0);
    const c100 = corner(r1, g0, b0);
    const c010 = corner(r0, g1, b0);
    const c110 = corner(r1, g1, b0);
    const c001 = corner(r0, g0, b1);
    const c101 = corner(r1, g0, b1);
    const c011 = corner(r0, g1, b1);
    const c111 = corner(r1, g1, b1);

    const out = [0, 0, 0];
    for (let i = 0; i < 3; i += 1) {
      const c00 = c000[i] + (c100[i] - c000[i]) * rd;
      const c10 = c010[i] + (c110[i] - c010[i]) * rd;
      const c01 = c001[i] + (c101[i] - c001[i]) * rd;
      const c11 = c011[i] + (c111[i] - c011[i]) * rd;
      const c0 = c00 + (c10 - c00) * gd;
      const c1 = c01 + (c11 - c01) * gd;
      out[i] = c0 + (c1 - c0) * bd;
    }
    return out;
  }

  function applyLUT(imageData, lut) {
    const src = imageData.data;
    const out = new ImageData(imageData.width, imageData.height);
    const dst = out.data;
    for (let i = 0; i < src.length; i += 4) {
      const mapped = sampleLUT(lut, src[i] / 255, src[i + 1] / 255, src[i + 2] / 255);
      dst[i] = clampByte(mapped[0] * 255);
      dst[i + 1] = clampByte(mapped[1] * 255);
      dst[i + 2] = clampByte(mapped[2] * 255);
      dst[i + 3] = src[i + 3];
    }
    return out;
  }

  async function applyLUTAsync(imageData, lut) {
    const src = imageData.data;
    const out = new ImageData(imageData.width, imageData.height);
    const dst = out.data;
    const row = imageData.width * 4;
    const chunk = row * 48;
    for (let i = 0; i < src.length; i += chunk) {
      const end = Math.min(src.length, i + chunk);
      for (let j = i; j < end; j += 4) {
        const mapped = sampleLUT(lut, src[j] / 255, src[j + 1] / 255, src[j + 2] / 255);
        dst[j] = clampByte(mapped[0] * 255);
        dst[j + 1] = clampByte(mapped[1] * 255);
        dst[j + 2] = clampByte(mapped[2] * 255);
        dst[j + 3] = src[j + 3];
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return out;
  }

  const cubeCache = new Map();
  const waiters = [];
  let activeLoads = 0;

  function pumpQueue() {
    if (activeLoads >= 2 || !waiters.length) return;
    const job = waiters.shift();
    activeLoads += 1;
    job()
      .catch(() => {})
      .finally(() => {
        activeLoads -= 1;
        pumpQueue();
      });
  }

  function enqueue(task) {
    return new Promise((resolve, reject) => {
      waiters.push(() => task().then(resolve, reject));
      pumpQueue();
    });
  }

  async function loadCube(url) {
    if (cubeCache.has(url)) return cubeCache.get(url);
    const pending = enqueue(() =>
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`无法读取 LUT：${url}`);
        return res.text();
      }).then(parseCube)
    );
    cubeCache.set(url, pending);
    return pending;
  }

  const imagePromises = new Map();
  const sceneCache = new Map();

  function loadReferenceImage(url) {
    const src = url || DEFAULT_REF;
    if (imagePromises.has(src)) return imagePromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("无法读取参考图"));
      img.src = src;
    });
    imagePromises.set(src, promise);
    return promise;
  }

  async function getScene(width, height, imageUrl) {
    const src = imageUrl || DEFAULT_REF;
    const key = `${src}|${width}x${height}`;
    if (sceneCache.has(key)) return sceneCache.get(key);
    const img = await loadReferenceImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
    const data = ctx.getImageData(0, 0, width, height);
    sceneCache.set(key, data);
    return data;
  }

  async function paintPreview(canvas, lutUrl, width, height, imageUrl) {
    canvas.width = width;
    canvas.height = height;
    canvas.classList.add("is-loading");
    const ctx = canvas.getContext("2d");
    const scene = await getScene(width, height, imageUrl);
    ctx.putImageData(scene, 0, 0);
    if (!lutUrl) {
      canvas.classList.remove("is-loading");
      return;
    }
    try {
      const lut = await loadCube(lutUrl);
      const graded = await applyLUTAsync(scene, lut);
      ctx.putImageData(graded, 0, 0);
    } catch (error) {
      console.warn(error);
    }
    canvas.classList.remove("is-loading");
  }

  global.LUTEngine = {
    parseCube,
    applyLUT,
    loadCube,
    getScene,
    paintPreview,
  };
})(window);
