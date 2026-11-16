// 深夜放映室 — 全站唯一腳本
// 首頁：讀 data/works.json → 票根卡片、類型/類型標籤篩選、搜尋、排序、?creator= / ?genre= 篩選
// 作品頁：work.html?w=slug → 讀 json + works/<slug>.md → 票根頁頭（含觀影現場）、評分條、手記各區塊、劇透折疊、[[slug]] 連結
(function () {
  const SCORE_LABELS = { story: "劇情", character: "角色", visual: "畫面", music: "音樂", rewatch: "重看指數" };
  const params = new URLSearchParams(location.search);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const avg = (w) => {
    const v = Object.values(w.scores);
    return v.reduce((a, b) => a + b, 0) / v.length;
  };

  function ticketHTML(w, opts = {}) {
    const tag = opts.link ? "a" : "div";
    const href = opts.link ? ` href="work.html?w=${encodeURIComponent(w.slug)}"` : "";
    const creator = opts.linkCreator
      ? `<a href="index.html?creator=${encodeURIComponent(w.creator)}">${esc(w.creator)}</a>`
      : esc(w.creator);
    const genres = opts.linkCreator
      ? w.genres.map((g) => `<a href="index.html?genre=${encodeURIComponent(g)}">${esc(g)}</a>`).join("、")
      : w.genres.map(esc).join("、");
    return `<${tag} class="ticket" data-hue="${Number(w.hue) || 0}"${href}>
      ${w.status === "draft" ? '<span class="draft-flag">DRAFT</span>' : ""}
      <div class="stub">
        <span class="kind">ADMIT ONE · ${esc(w.type)}</span>
        <h2>${esc(w.title)}</h2>
        <span class="orig">${esc(w.original)}</span>
      </div>
      <div class="info">
        <dl class="meta">
          <dt>YEAR</dt><dd>${esc(w.year)} · ${esc(w.runtime)} 分鐘</dd>
          <dt>BY</dt><dd>${creator}</dd>
          <dt>GENRE</dt><dd>${genres}</dd>
        </dl>
        <dl class="meta scene">
          <dt>場次</dt><dd>${esc(w.date.replace(/-/g, "."))} ${esc(w.scene.time)}</dd>
          <dt>座位</dt><dd>${esc(w.scene.place)}</dd>
          ${opts.full ? `<dt>同行</dt><dd>${esc(w.scene.with)}</dd><dt>零食</dt><dd>${esc(w.scene.snack)}</dd>` : ""}
        </dl>
        <p class="pitch">${esc(w.pitch)}</p>
        <div class="ticket-foot">
          <span class="score-badge">${avg(w).toFixed(1)}<small>/5</small></span>
          <span class="moods">${w.mood.map((m) => `<span>${esc(m)}</span>`).join("")}</span>
        </div>
      </div>
    </${tag}>`;
  }

  // 票根色相是 CLAUDE.md 允許的唯一「inline」樣式，由這裡統一設定
  function paint(root) {
    root.querySelectorAll(".ticket[data-hue]").forEach((t) => t.style.setProperty("--h", t.dataset.hue));
  }

  function loadWorks() {
    return fetch("data/works.json").then((r) => {
      if (!r.ok) throw new Error("works.json");
      return r.json();
    });
  }

  function fail(el, msg) {
    el.innerHTML = `<p class="notice">${msg}</p>`;
  }

  // ---------- 首頁 ----------
  function home() {
    const grid = document.querySelector("[data-grid]");
    const state = {
      q: "",
      type: "全部",
      genre: params.get("genre") || "全部",
      creator: params.get("creator") || "",
      sort: "date",
    };

    loadWorks().then((works) => {
      const hours = works.reduce((s, w) => s + Number(w.runtime || 0), 0) / 60;
      document.querySelector("[data-stats]").textContent = `${works.length} 部作品 · 共 ${hours.toFixed(1)} 小時`;

      const types = ["全部", ...new Set(works.map((w) => w.type))];
      const genres = ["全部", ...new Set(works.flatMap((w) => w.genres))];
      chips("[data-type-chips]", types, "type");
      chips("[data-genre-chips]", genres, "genre");

      document.querySelector("[data-search]").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); draw(); });
      document.querySelector("[data-sort]").addEventListener("change", (e) => { state.sort = e.target.value; draw(); });

      function chips(sel, list, key) {
        const box = document.querySelector(sel);
        box.innerHTML = list.map((v) => `<button type="button" data-v="${esc(v)}">${key === "genre" && v !== "全部" ? "#" : ""}${esc(v)}</button>`).join("");
        box.addEventListener("click", (e) => {
          const v = e.target.dataset.v;
          if (v === undefined) return;
          state[key] = v;
          draw();
        });
      }

      function draw() {
        let list = works.filter((w) =>
          (state.type === "全部" || w.type === state.type) &&
          (state.genre === "全部" || w.genres.includes(state.genre)) &&
          (!state.creator || w.creator === state.creator) &&
          (!state.q || [w.title, w.original, w.creator, ...w.genres].join(" ").toLowerCase().includes(state.q))
        );
        const by = {
          date: (a, b) => b.date.localeCompare(a.date),
          score: (a, b) => avg(b) - avg(a),
          year: (a, b) => b.year - a.year,
        }[state.sort];
        list.sort(by);

        grid.innerHTML = list.length
          ? list.map((w) => ticketHTML(w, { link: true })).join("")
          : '<p class="empty">這個條件下還沒有作品。今晚就去看一部吧。</p>';
        paint(grid);

        document.querySelectorAll("[data-type-chips] button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === state.type));
        document.querySelectorAll("[data-genre-chips] button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === state.genre));
        const af = document.querySelector("[data-active-filter]");
        af.hidden = !state.creator;
        if (state.creator) af.innerHTML = `只看「${esc(state.creator)}」的作品<a href="index.html">清除</a>`;
      }
      draw();
    }).catch(() => fail(grid, "讀不到 data/works.json。請用本機伺服器開啟（見 README）。"));
  }

  // ---------- 作品頁 ----------
  function work() {
    const main = document.querySelector("[data-work]");
    const slug = params.get("w");
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return fail(main, '找不到這部作品。<a href="index.html">回片庫</a>');

    Promise.all([
      loadWorks(),
      fetch(`works/${slug}.md`).then((r) => (r.ok ? r.text() : Promise.reject(new Error("md")))),
    ]).then(([works, md]) => {
      const w = works.find((x) => x.slug === slug);
      if (!w) throw new Error("not registered");
      const bySlug = Object.fromEntries(works.map((x) => [x.slug, x]));
      document.title = `${w.title}｜深夜放映室`;

      // 頁頭票根
      const hero = document.querySelector("[data-hero]");
      hero.innerHTML = ticketHTML(w, { linkCreator: true, full: true });
      paint(hero);

      // 評分條
      document.querySelector("[data-scores]").innerHTML =
        `<h3>評分</h3>` +
        Object.entries(SCORE_LABELS).map(([k, label]) => {
          const v = Number(w.scores[k]) || 0;
          return `<div class="bar-row"><span>${label}</span><span class="bar"><i data-w="${v * 20}"></i></span><b>${v}</b></div>`;
        }).join("");
      document.querySelectorAll(".bar i").forEach((i) => (i.style.width = i.dataset.w + "%"));

      // [[slug]] → 連結（找不到的作品顯示為刪除線，方便發現錯誤）
      const linked = md.replace(/\[\[([a-z0-9-]+)\]\]/g, (_, s) =>
        bySlug[s] ? `[${bySlug[s].title}](work.html?w=${s})` : `<span class="broken-link">${s}</span>`
      );

      // 依 ## 標題切區塊，放進 work.html 對應的 data-sec 位置
      const sections = {};
      linked.split(/^##\s+/m).slice(1).forEach((chunk) => {
        const nl = chunk.indexOf("\n");
        const title = chunk.slice(0, nl === -1 ? undefined : nl).trim();
        sections[title] = nl === -1 ? "" : chunk.slice(nl + 1).trim();
      });

      document.querySelectorAll("[data-sec]").forEach((slot) => {
        const name = slot.dataset.sec;
        const body = sections[name];
        if (body === undefined) { slot.remove(); return; }
        const html = marked.parse(body);
        if (name === "劇透區") {
          slot.innerHTML = `<details class="spoiler"><summary>劇透區：確定看過《${esc(w.title)}》了嗎？</summary><div class="spoiler-body">${html}</div></details>`;
        } else if (name === "那天晚上") {
          slot.innerHTML = `<h3>那天晚上</h3><div class="diary">${html}</div>`;
        } else if (name === "邊看邊記") {
          slot.innerHTML = `<h3>邊看邊記</h3>${html}`;
        } else if (name === "記憶點") {
          slot.innerHTML = `<h3 class="sec-title">記憶點</h3>${html}`;
        } else {
          slot.innerHTML = `<h3>${esc(name)}</h3>${html}`;
        }
      });
    }).catch(() => fail(main, '這部作品還沒寫好，或檔名和 works.json 對不上。<a href="index.html">回片庫</a>'));
  }

  if (document.body.classList.contains("page-work")) work();
  else home();
})();
