(function () {
  const catalog = window.LUT_CATALOG || [];
  const categories = window.LUT_CATEGORIES || [];
  const dict = window.LUT_I18N || {};
  const page = document.body.dataset.page;
  const LANG_KEY = "looktable-lang";

  let lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh";

  function t(key) {
    const value = dict[lang] && dict[lang][key];
    return value == null ? key : value;
  }

  function byId(id) {
    return catalog.find((item) => item.id === id);
  }

  function nameOf(item) {
    return lang === "en" ? item.nameEn : item.nameZh;
  }

  function labelOf(categoryId) {
    const found = categories.find((item) => item.id === categoryId);
    if (!found) return categoryId;
    return lang === "en" ? found.en : found.zh;
  }

  function traitHTML(item) {
    const primary = lang === "en" ? item.summaryEn : item.summaryZh;
    const secondary = lang === "en" ? item.summaryZh : item.summaryEn;
    return `
      <p class="trait trait-primary">${primary}</p>
      <p class="trait trait-secondary">${secondary}</p>
    `;
  }

  function setLang(next) {
    lang = next;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    renderHeader();
    renderFooter();
    applyStaticCopy();
    if (page === "home") renderHome();
    if (page === "gallery") renderGallery();
    const modal = document.getElementById("lut-modal");
    if (modal && !modal.hidden && modal.dataset.openId) {
      openModal(modal.dataset.openId);
    }
  }

  function applyStaticCopy() {
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const value = t(node.dataset.i18n);
      if (typeof value === "string") node.textContent = value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
    });
    const titleKey = document.body.dataset.titleKey;
    if (titleKey) document.title = `${t(titleKey)} · LOOKTABLE`;
  }

  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;
    host.innerHTML = `
      <header class="site-header">
        <div class="container header-inner">
          <a class="logo" href="index.html">
            <span class="logo-mark" aria-hidden="true"></span>
            <span class="logo-text">LOOKTABLE</span>
          </a>
          <nav id="site-nav" class="site-nav">
            <a href="index.html" data-nav="home">${t("home")}</a>
            <a href="gallery.html" data-nav="gallery">${t("gallery")}</a>
            <button class="lang-toggle" type="button" data-lang-toggle>${t("otherLang")}</button>
          </nav>
        </div>
      </header>
    `;
    const active = host.querySelector(`[data-nav="${page}"]`);
    if (active) active.classList.add("is-active");

    host.querySelector("[data-lang-toggle]").addEventListener("click", () => {
      setLang(lang === "zh" ? "en" : "zh");
    });
  }

  function renderFooter() {
    const host = document.getElementById("site-footer");
    if (!host) return;
    const email = "mcry416@outlook.com";
    const notice = String(t("footerNotice")).replace(
      "{email}",
      `<a href="mailto:${email}">${email}</a>`
    );
    host.innerHTML = `
      <footer class="site-footer">
        <div class="container footer-bar">
          <div>
            <p class="footer-logo">LOOKTABLE</p>
            <p class="muted">${t("footerTag")}</p>
            <p class="muted footer-notice">${notice}</p>
          </div>
          <span class="muted">${t("pages")}</span>
        </div>
      </footer>
    `;
  }

  function paletteHTML(colors) {
    return `<div class="swatches" aria-hidden="true">${colors
      .map((color) => `<span style="background:${color}"></span>`)
      .join("")}</div>`;
  }

  function cardHTML(item) {
    return `
      <article class="lut-card" data-id="${item.id}">
        <button class="lut-card-hit" type="button" data-open="${item.id}">
          <div class="lut-thumb">
            <canvas data-preview="${item.id}" width="480" height="320"></canvas>
            <span class="lut-cat">${labelOf(item.category)}</span>
          </div>
          <div class="lut-card-body">
            <p class="eyebrow">${lang === "en" ? item.nameZh : item.nameEn}</p>
            <h3>${nameOf(item)}</h3>
            ${traitHTML(item)}
            ${paletteHTML(item.palette)}
          </div>
        </button>
      </article>
    `;
  }

  function paintCards(scope) {
    const nodes = [...(scope || document).querySelectorAll("canvas[data-preview]")];
    const run = (canvas) => {
      const item = byId(canvas.dataset.preview);
      const paintKey = `${item.file}|${item.preview || ""}`;
      if (!item || canvas.dataset.painted === paintKey) return;
      canvas.dataset.painted = paintKey;
      window.LUTEngine.paintPreview(canvas, item.file, 480, 320, item.preview);
    };
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(run);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "160px" });
    nodes.forEach((canvas) => observer.observe(canvas));
  }

  function setupCompare(root, item) {
    if (!root || !item) return;
    const before = root.querySelector("[data-role='before']");
    const after = root.querySelector("[data-role='after']");
    const range = root.querySelector("input[type='range']");
    const label = root.querySelector("[data-role='after-label']");
    const original = root.querySelector("[data-role='before-label']");
    if (label) label.textContent = nameOf(item);
    if (original) original.textContent = t("original");
    if (!root.querySelector(".compare-handle")) {
      const handle = document.createElement("span");
      handle.className = "compare-handle";
      handle.setAttribute("aria-hidden", "true");
      root.appendChild(handle);
    }

    window.LUTEngine.paintPreview(before, null, 720, 480, item.preview);
    window.LUTEngine.paintPreview(after, item.file, 720, 480, item.preview);

    const next = range.cloneNode(true);
    range.replaceWith(next);

    const setSplit = (clientX) => {
      const rect = root.getBoundingClientRect();
      const pct = Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
      next.value = String(pct);
      root.style.setProperty("--split", `${pct}%`);
    };

    const sync = () => {
      root.style.setProperty("--split", `${Number(next.value)}%`);
    };
    next.addEventListener("input", sync);

    let dragging = false;
    root.onpointerdown = (event) => {
      if (event.target.closest("a, button")) return;
      dragging = true;
      root.setPointerCapture(event.pointerId);
      setSplit(event.clientX);
    };
    root.onpointermove = (event) => {
      if (!dragging) return;
      setSplit(event.clientX);
    };
    root.onpointerup = () => {
      dragging = false;
    };
    root.onpointercancel = () => {
      dragging = false;
    };
    sync();
  }

  let scrollLockY = 0;

  function lockPage() {
    scrollLockY = window.scrollY;
    document.body.style.top = `-${scrollLockY}px`;
    document.body.classList.add("modal-open");
  }

  function unlockPage() {
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, scrollLockY);
  }

  function openModal(id) {
    const item = byId(id);
    const modal = document.getElementById("lut-modal");
    if (!item || !modal) return;

    modal.hidden = false;
    modal.dataset.openId = id;
    lockPage();
    modal.querySelector("[data-field='name']").textContent = nameOf(item);
    modal.querySelector("[data-field='nameAlt']").textContent = lang === "en" ? item.nameZh : item.nameEn;
    modal.querySelector("[data-field='traits']").innerHTML = traitHTML(item);
    modal.querySelector("[data-field='meta']").innerHTML = `
      <span>${labelOf(item.category)}</span>
      <span>${item.size}</span>
      <span>${item.input}</span>
    `;
    const tags = lang === "en" ? item.tagsEn : item.tagsZh;
    modal.querySelector("[data-field='tags']").innerHTML = tags.map((tag) => `<span>${tag}</span>`).join("");
    modal.querySelector("[data-field='palette']").innerHTML = paletteHTML(item.palette);
    modal.querySelector("[data-field='download']").setAttribute("href", item.file);
    modal.querySelector("[data-field='download']").setAttribute("download", item.file.split("/").pop());
    modal.querySelector("[data-field='download']").textContent = t("download");
    modal.querySelector(".modal-close").textContent = t("close");

    setupCompare(modal.querySelector(".compare"), item);
    modal.querySelector(".modal-close").focus();
  }

  function closeModal() {
    const modal = document.getElementById("lut-modal");
    if (!modal) return;
    modal.hidden = true;
    delete modal.dataset.openId;
    unlockPage();
  }

  function bindOpeners(scope) {
    (scope || document).querySelectorAll("[data-open]").forEach((button) => {
      button.addEventListener("click", () => openModal(button.dataset.open));
    });
  }

  function renderHome() {
    const featured = catalog.filter((item) => item.featured);
    const lead = featured[0] || catalog[0];
    const strip = document.getElementById("featured-strip");
    const picks = document.getElementById("home-picks");
    if (strip) {
      strip.innerHTML = featured.map((item) => `
        <button class="strip-item" type="button" data-feature="${item.id}">
          ${paletteHTML(item.palette)}
          <span>${nameOf(item)}</span>
        </button>
      `).join("");
    }
    if (picks) {
      picks.innerHTML = catalog.map((item) => cardHTML(item)).join("");
      paintCards(picks);
      bindOpeners(picks);
    }

    const compare = document.getElementById("home-compare");
    setupCompare(compare, lead);

    if (strip && !strip.dataset.bound) {
      strip.dataset.bound = "1";
      strip.addEventListener("click", (event) => {
        const button = event.target.closest("[data-feature]");
        if (!button) return;
        strip.querySelectorAll(".strip-item").forEach((node) => node.classList.toggle("is-active", node === button));
        setupCompare(compare, byId(button.dataset.feature));
      });
    }
    strip?.querySelector(".strip-item")?.classList.add("is-active");
  }

  const gallery = { filter: "all" };

  function renderGallery() {
    const grid = document.getElementById("gallery-grid");
    const filters = document.getElementById("gallery-filters");
    const search = document.getElementById("gallery-search");
    const count = document.getElementById("gallery-count");
    if (!grid) return;

    filters.innerHTML = categories
      .map((item) => `<button class="chip${item.id === gallery.filter ? " is-active" : ""}" type="button" data-filter="${item.id}">${lang === "en" ? item.en : item.zh}</button>`)
      .join("");

    const paint = () => {
      const query = (search.value || "").trim().toLowerCase();
      const list = catalog.filter((item) => {
        const matchCat = gallery.filter === "all" || item.category === gallery.filter;
        const hay = [
          item.nameZh,
          item.nameEn,
          item.summaryZh,
          item.summaryEn,
          item.tagsZh.join(" "),
          item.tagsEn.join(" "),
        ].join(" ").toLowerCase();
        return matchCat && (!query || hay.includes(query));
      });
      count.textContent = t("count")(list.length);
      grid.innerHTML = list.length
        ? list.map((item) => cardHTML(item)).join("")
        : `<p class="empty">${t("empty")}</p>`;
      paintCards(grid);
      bindOpeners(grid);
    };

    gallery.paint = paint;

    if (!filters.dataset.bound) {
      filters.dataset.bound = "1";
      filters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-filter]");
        if (!button) return;
        gallery.filter = button.dataset.filter;
        filters.querySelectorAll(".chip").forEach((node) => node.classList.toggle("is-active", node === button));
        gallery.paint();
      });
      search.addEventListener("input", () => gallery.paint());
    }
    paint();
  }

  function renderModalShell() {
    if (document.getElementById("lut-modal")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div id="lut-modal" class="modal" hidden>
        <div class="modal-backdrop" data-close-modal></div>
        <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="lut-modal-title">
          <button class="modal-close" type="button" data-close-modal>${t("close")}</button>
          <div class="compare" id="modal-compare">
            <canvas data-role="after"></canvas>
            <canvas data-role="before"></canvas>
            <input type="range" min="0" max="100" value="50" aria-label="compare">
            <span class="compare-handle" aria-hidden="true"></span>
            <span class="compare-tag left" data-role="before-label">${t("original")}</span>
            <span class="compare-tag right" data-role="after-label">LUT</span>
          </div>
          <div class="modal-copy">
            <p class="eyebrow" data-field="nameAlt"></p>
            <h2 id="lut-modal-title" data-field="name"></h2>
            <div class="meta-row" data-field="meta"></div>
            <div data-field="traits"></div>
            <div data-field="palette"></div>
            <div class="tag-row" data-field="tags"></div>
            <a class="button" data-field="download" href="#">${t("download")}</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap.firstElementChild);
    document.getElementById("lut-modal").addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  renderHeader();
  renderFooter();
  renderModalShell();
  applyStaticCopy();

  if (page === "home") renderHome();
  if (page === "gallery") renderGallery();
})();
