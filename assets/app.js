/* ===== Claude Code 셋업 툴킷 · 문서 사이트 ===== */
(function () {
  "use strict";

  var REPO = "Ihan0316/claude-code-toolkit";
  var BLOB = "https://github.com/" + REPO + "/blob/main";

  var NAV = [
    { g: "시작하기" },
    { id: "home", file: "README.md", title: "전체 개요", num: "~" },
    { id: "00-quickstart", file: "docs/00-quickstart.md", title: "빠른 시작", num: "00" },
    { g: "핵심" },
    { id: "01-hooks", file: "docs/01-hooks.md", title: "훅 (안전장치)", num: "01" },
    { id: "02-skills", file: "docs/02-skills.md", title: "스킬", num: "02" },
    { id: "03-memory", file: "docs/03-memory.md", title: "메모리", num: "03" },
    { id: "04-automation", file: "docs/04-automation.md", title: "자동 루틴", num: "04" },
    { g: "확장" },
    { id: "05-mcp", file: "docs/05-mcp.md", title: "MCP 서버", num: "05" },
    { id: "06-caveman", file: "docs/06-caveman.md", title: "caveman 압축", num: "06" },
    { id: "07-settings-backup", file: "docs/07-settings-backup.md", title: "설정 · 백업", num: "07" },
    { id: "08-sync-infra", file: "docs/08-sync-infra.md", title: "양 머신 동기화", num: "08" },
    { id: "09-workflows", file: "docs/09-workflows.md", title: "멀티에이전트", num: "09" },
    { g: "레퍼런스" },
    { id: "10-plugins-marketplaces", file: "docs/10-plugins-marketplaces.md", title: "플러그인·마켓", num: "10" },
    { id: "11-inventory", file: "docs/11-inventory.md", title: "전체 인벤토리", num: "11" }
  ];
  var PAGES = NAV.filter(function (n) { return n.id; });

  var CALLOUT = {
    NOTE:      { icon: "🛈", label: "참고" },
    TIP:       { icon: "✦", label: "팁" },
    IMPORTANT: { icon: "★", label: "중요" },
    WARNING:   { icon: "▲", label: "주의" },
    CAUTION:   { icon: "⛔", label: "경고" }
  };

  var HERO =
    '<div class="kicker">~/.claude · DEV SETUP TOOLKIT</div>' +
    '<h1 class="hero-title">Claude Code<br><span class="grad">실전 셋업 툴킷</span></h1>' +
    '<p class="hero-sub">실무에서 매일 쓰며 다듬은 훅 · 스킬 · 메모리 · 자동화 모음. ' +
    '단순 "이렇게 하세요"가 아니라 — <strong>무엇을 / 왜 썼고 / 무엇이 좋아졌는지</strong>까지.</p>' +
    '<div class="hero-cta">' +
      '<a class="btn btn-primary" href="#/00-quickstart">빠른 시작</a>' +
      '<a class="btn btn-ghost" href="https://github.com/' + REPO + '" target="_blank" rel="noopener">GitHub 저장소</a>' +
    '</div>' +
    '<div class="hero-stats">' +
      '<div class="stat"><b>12</b><span>문서</span></div>' +
      '<div class="stat"><b>6</b><span>훅</span></div>' +
      '<div class="stat"><b>14</b><span>스킬</span></div>' +
      '<div class="stat"><b>19</b><span>다이어그램</span></div>' +
      '<div class="stat"><b>0</b><span>비밀 유출</span></div>' +
    '</div>';

  var contentEl = document.getElementById("content");
  var heroEl = document.getElementById("hero");
  var navEl = document.getElementById("nav");
  var tocEl = document.getElementById("toc");
  var pagerEl = document.getElementById("pager");
  var progressEl = document.getElementById("progress");
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("overlay");
  var cache = {};
  var mermaidReady = null;
  // 한글 완비 폰트 우선 — SVG <text> 라벨이 한글 글리프를 바로 그린다
  var MERMAID_FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, "Malgun Gothic", sans-serif';

  function slugify(text) {
    // GitHub 호환: 공백을 개별 하이픈으로(붕괴 금지) — '—'·'&'·'/' 제거 후 남는 이중 공백이 이중 하이픈이 됨
    return String(text).trim().toLowerCase()
      .replace(/[‍️]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s/g, "-");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function currentTheme() { return document.documentElement.getAttribute("data-theme") || "dark"; }

  function getMermaid() {
    if (mermaidReady) return mermaidReady;
    mermaidReady = new Promise(function (resolve) {
      var tries = 0;
      (function poll() {
        if (window.__mermaid) {
          var dark = currentTheme() === "dark";
          window.__mermaid.initialize({
            startOnLoad: false, securityLevel: "loose",
            theme: "base",
            // 한글 라벨 렌더 핵심:
            // (1) htmlLabels:false → 라벨을 foreignObject(HTML) 대신 SVG <text>로 렌더.
            //     mermaid의 foreignObject HTML 라벨은 Chromium에서 한글 자모가 깨진다
            //     (단일행 라벨: "경계 위반"→"겨게 이바"). SVG <text>는 정상 렌더됨.
            // (2) fontFamily는 한글 완비 폰트(Pretendard) — SVG <text>가 한글 글리프를 바로 그림.
            fontFamily: MERMAID_FONT,
            htmlLabels: false,
            flowchart: { htmlLabels: false },
            themeVariables: {
              background: "transparent",
              fontFamily: MERMAID_FONT,
              primaryColor: dark ? "#1d1d1f" : "#f5f5f7",
              primaryBorderColor: dark ? "#48484a" : "#d2d2d7",
              primaryTextColor: dark ? "#f5f5f7" : "#1d1d1f",
              lineColor: dark ? "#86868b" : "#a1a1a6",
              secondaryColor: dark ? "#161617" : "#fbfbfd",
              tertiaryColor: dark ? "#0a0a0a" : "#ffffff",
              fontSize: "14px"
            }
          });
          resolve(window.__mermaid);
        } else if (tries++ < 150) { setTimeout(poll, 40); }
        else { resolve(null); }
      })();
    });
    return mermaidReady;
  }

  // On narrow screens mermaid fits diagrams to container width, shrinking text to ~30% (illegible).
  // Force each svg to its natural width (mermaid stores it as inline max-width) so .mermaid scrolls horizontally instead.
  function fitMermaidMobile() {
    if (!window.matchMedia || !window.matchMedia("(max-width: 900px)").matches) return;
    contentEl.querySelectorAll(".mermaid svg").forEach(function (svg) {
      var natural = parseFloat(svg.style.maxWidth) || svg.getBBox && svg.getBBox().width;
      if (natural) { svg.style.width = Math.ceil(natural) + "px"; svg.style.maxWidth = "none"; }
    });
  }

  /* ---- sidebar ---- */
  function buildNav() {
    var html = "";
    NAV.forEach(function (n) {
      if (n.g) { html += '<div class="nav-group"><div class="nav-group-title">' + n.g + "</div>"; return; }
      html += '<a data-id="' + n.id + '" href="#/' + n.id + '"><span class="num">' + n.num + '</span>' + escapeHtml(n.title) + "</a>";
    });
    navEl.innerHTML = html;
  }
  function setActiveNav(id) {
    navEl.querySelectorAll("a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-id") === id); });
  }

  /* ---- render pipeline ---- */
  function decorate(root) {
    // 1) heading ids + anchors + TOC
    var toc = [];
    root.querySelectorAll("h1, h2, h3").forEach(function (h) {
      if (!h.id) h.id = slugify(h.textContent);
      if (h.tagName === "H2" || h.tagName === "H3") {
        toc.push({ id: h.id, text: h.textContent, lvl: h.tagName === "H3" ? 3 : 2 });
        var a = document.createElement("a");
        a.className = "anchor"; a.href = "#" + h.id; a.textContent = "#"; a.setAttribute("aria-hidden", "true");
        h.insertBefore(a, h.firstChild);
      }
    });

    // 1b) layout tables (README 3-card blocks) — class instead of :has() for old browsers
    root.querySelectorAll("table").forEach(function (t) {
      if (t.querySelector("td[width]")) t.classList.add("layout-cards");
    });

    // 1c) wrap data tables in a horizontal-scroll container. Border/radius live on the
    //     wrapper so the table stays a real `display:table` (fills width, no empty gap).
    //     Most text tables compress to fit; only genuinely wide ones overflow and scroll.
    //     When a table does overflow, the wrapper gets tabindex=0 so keyboard-only users
    //     can scroll to the clipped columns (WCAG 2.1.1). Skip layout-cards.
    root.querySelectorAll("table").forEach(function (t) {
      if (t.classList.contains("layout-cards")) return;
      if (t.parentElement && t.parentElement.classList.contains("table-wrap")) return;
      var wrap = document.createElement("div");
      wrap.className = "table-wrap";
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
      if (t.scrollWidth > wrap.clientWidth + 1) wrap.tabIndex = 0;
    });

    // 2) mermaid blocks → div.mermaid (before code-window wrapping)
    root.querySelectorAll("pre code.language-mermaid").forEach(function (code) {
      var div = document.createElement("div");
      div.className = "mermaid"; div.textContent = code.textContent;
      var pre = code.closest("pre"); if (pre) pre.replaceWith(div);
    });

    // 3) highlight + wrap remaining code blocks in a window chrome
    root.querySelectorAll("pre > code").forEach(function (code) {
      if (window.hljs) { try { window.hljs.highlightElement(code); } catch (e) {} }
      var pre = code.parentElement;
      var lang = (String(code.className).match(/language-([\w-]+)/) || [])[1] || "code";
      var wrap = document.createElement("div"); wrap.className = "code-block";
      var head = document.createElement("div"); head.className = "code-head";
      head.innerHTML = '<span class="code-lang">' + escapeHtml(lang) + '</span><button class="code-copy" type="button">복사</button>';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(head); wrap.appendChild(pre);
      var btn = head.querySelector(".code-copy");
      btn.addEventListener("click", function () {
        var txt = code.textContent;
        function ok() {
          btn.textContent = "복사됨 ✓"; btn.classList.add("done");
          setTimeout(function () { btn.textContent = "복사"; btn.classList.remove("done"); }, 1300);
        }
        function fail() {
          btn.textContent = "복사 실패";
          setTimeout(function () { btn.textContent = "복사"; }, 1300);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(ok).catch(fail);
        } else {
          // 비보안(http)·구형 브라우저 폴백
          var ta = document.createElement("textarea");
          ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy") ? ok() : fail(); } catch (e) { fail(); }
          document.body.removeChild(ta);
        }
      });
    });

    // 4) GitHub alerts
    root.querySelectorAll("blockquote").forEach(function (bq) {
      var m = bq.textContent.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (!m) return;
      var type = m[1].toUpperCase();
      var firstP = bq.querySelector("p");
      if (firstP) {
        firstP.innerHTML = firstP.innerHTML.replace(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br\s*\/?>)?\s*\n?/i, "");
        if (!firstP.textContent.trim() && !firstP.querySelector("img,code")) firstP.remove();
      }
      bq.classList.add("callout", "callout-" + type.toLowerCase());
      var head = document.createElement("div"); head.className = "callout-title";
      head.innerHTML = '<span class="ico">' + CALLOUT[type].icon + "</span><span>" + CALLOUT[type].label + "</span>";
      bq.prepend(head);
    });

    // 5) link rewrite
    root.querySelectorAll("a[href]").forEach(function (a) {
      if (a.classList.contains("anchor")) return;
      var href = a.getAttribute("href"); if (!href) return;
      if (/^https?:/i.test(href)) { a.target = "_blank"; a.rel = "noopener"; return; }
      if (href.charAt(0) === "#") return;
      if (/README\.md(#.*)?$/i.test(href)) { a.setAttribute("href", "#/home"); return; }
      var md = href.match(/(?:^|\/)(\d\d-[a-z0-9-]+)\.md(#[^)]*)?$/i);
      if (md) { a.setAttribute("href", "#/" + md[1] + (md[2] || "")); return; }
      var clean = href.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
      a.setAttribute("href", BLOB + "/" + clean); a.target = "_blank"; a.rel = "noopener";
    });

    return toc;
  }

  function buildTOC(toc) {
    if (!toc.length) { tocEl.innerHTML = ""; return; }
    var html = '<div class="toc-title">이 페이지</div>';
    toc.forEach(function (t) {
      html += '<a href="#' + t.id + '" class="' + (t.lvl === 3 ? "lvl3" : "") + '" data-tid="' + t.id + '">' + escapeHtml(t.text) + "</a>";
    });
    tocEl.innerHTML = html;
  }

  function buildPager(idx) {
    var prev = PAGES[idx - 1], next = PAGES[idx + 1], html = "";
    html += prev ? '<a class="prev" href="#/' + prev.id + '"><span class="lbl">← 이전</span>' + escapeHtml(prev.title) + "</a>" : '<span style="flex:1"></span>';
    html += next ? '<a class="next" href="#/' + next.id + '"><span class="lbl">다음 →</span>' + escapeHtml(next.title) + "</a>" : '<span style="flex:1"></span>';
    pagerEl.innerHTML = html;
  }

  /* ---- load + route ---- */
  function fetchDoc(file) {
    if (cache[file]) return Promise.resolve(cache[file]);
    return fetch(file, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(r.status + " " + file);
      return r.text();
    }).then(function (t) { cache[file] = t; return t; });
  }

  function renderDoc(item, idx, anchor) {
    var isHome = item.id === "home";
    contentEl.innerHTML = '<div class="loading"><span class="spin"></span> 불러오는 중…</div>';
    return fetchDoc(item.file).then(function (md) {
      if (isHome) {
        heroEl.innerHTML = HERO; heroEl.hidden = false;
        md = md.replace(/^[\s\S]*?\n---\n/, ""); // strip README's centered header (now in hero)
      } else {
        heroEl.hidden = true; heroEl.innerHTML = "";
      }
      contentEl.innerHTML = window.marked.parse(md);
      var toc = decorate(contentEl);
      buildTOC(toc);
      buildPager(idx);
      document.title = (isHome ? "" : item.title + " · ") + "Claude Code 셋업 툴킷";
      updateMeta(item, isHome);
      // re-trigger enter animation
      contentEl.classList.remove("enter"); void contentEl.offsetWidth; contentEl.classList.add("enter");
      function scrollToAnchor() { var el = document.getElementById(anchor); if (el) el.scrollIntoView(); }
      getMermaid().then(function (mm) {
        if (!mm) return;
        var nodes = contentEl.querySelectorAll(".mermaid");
        if (!nodes.length) return;
        // 다이어그램 렌더 후 문서 높이가 바뀌므로 앵커로 재스크롤 (70ms 초기 스크롤이 어긋남 보정)
        try { Promise.resolve(mm.run({ nodes: nodes })).then(fitMermaidMobile, fitMermaidMobile).then(function () { if (anchor) scrollToAnchor(); }); }
        catch (e) { fitMermaidMobile(); if (anchor) scrollToAnchor(); }
      });
      if (anchor) { setTimeout(scrollToAnchor, 70); }
      else { window.scrollTo(0, 0); }
      setupScrollSpy(toc);
      updateProgress();
    }).catch(function (err) {
      heroEl.hidden = true;
      contentEl.innerHTML = '<div class="callout callout-caution"><div class="callout-title"><span class="ico">⛔</span><span>불러오기 실패</span></div><p>' +
        escapeHtml(String(err.message || err)) + "</p><p>로컬에서 보려면 정적 서버가 필요합니다 (예: <code>python -m http.server</code>).</p></div>";
    });
  }

  function parseRoute() {
    var h = location.hash || "";
    if (h.indexOf("#/") !== 0) return null;
    var parts = h.slice(2).split("#");
    return { id: parts[0] || "home", anchor: parts[1] || "" };
  }
  function route() {
    var r = parseRoute() || { id: "home", anchor: "" };
    var idx = PAGES.findIndex(function (p) { return p.id === r.id; });
    if (idx < 0) { idx = 0; r.id = PAGES[0].id; }
    setActiveNav(r.id); closeMenu();
    renderDoc(PAGES[idx], idx, r.anchor);
  }

  /* ---- scrollspy + progress ---- */
  var spyObserver = null;
  function setupScrollSpy(toc) {
    if (spyObserver) spyObserver.disconnect();
    if (!toc.length) return;
    var links = {};
    tocEl.querySelectorAll("a[data-tid]").forEach(function (a) { links[a.getAttribute("data-tid")] = a; });
    spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("active"); });
          if (links[en.target.id]) links[en.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-72px 0px -75% 0px", threshold: 0 });
    toc.forEach(function (t) { var el = document.getElementById(t.id); if (el) spyObserver.observe(el); });
  }
  function updateProgress() {
    var d = document.documentElement;
    var max = d.scrollHeight - d.clientHeight;
    var pct = max > 0 ? (d.scrollTop / max) * 100 : 0;
    progressEl.style.width = pct + "%";
  }

  /* ---- search ---- */
  function setupSearch() {
    var input = document.getElementById("search");
    function apply() {
      var q = input.value.trim().toLowerCase();
      navEl.querySelectorAll("a").forEach(function (a) {
        a.classList.toggle("hidden", !!q && a.textContent.toLowerCase().indexOf(q) < 0);
      });
    }
    input.addEventListener("input", apply);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; apply(); input.blur(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input && !/^(input|textarea)$/i.test((document.activeElement || {}).tagName || "")) {
        e.preventDefault(); input.focus();
      }
      if (e.key === "Escape" && sidebar.classList.contains("open")) closeMenu();
    });
  }

  /* ---- theme ---- */
  function setupTheme() {
    var saved = null; try { saved = localStorage.getItem("cct-theme"); } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) document.documentElement.setAttribute("data-theme", "light");
    syncThemeUI();
    document.getElementById("themeBtn").addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("cct-theme", next); } catch (e) {}
      syncThemeUI();
      mermaidReady = null;
      var r = parseRoute() || { id: "home" };
      var idx = Math.max(0, PAGES.findIndex(function (p) { return p.id === r.id; }));
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      renderDoc(PAGES[idx], idx, "").then(function () { window.scrollTo(0, y); });   // 테마 전환 시 스크롤 위치 유지
    });
  }
  function syncThemeUI() {
    var dark = currentTheme() === "dark";
    // theme-color starts media-scoped (no-JS fallback); once JS owns the theme, pin it to the chosen one
    document.head.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.removeAttribute("media");
      m.setAttribute("content", dark ? "#000000" : "#fbfbfd");
    });
    document.getElementById("hljs-theme").href =
      "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/" + (dark ? "github-dark" : "xcode") + ".min.css";
  }

  /* ---- per-route meta (SEO; helps JS-rendering crawlers) ---- */
  function setMeta(sel, attr, key, val) {
    var el = document.head.querySelector(sel);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
    el.setAttribute("content", val);
  }
  function updateMeta(item, isHome) {
    var title = (isHome ? "Claude Code 실전 셋업 툴킷" : item.title + " · Claude Code 셋업 툴킷");
    var desc;
    if (isHome) {
      desc = "실무에서 매일 쓰며 다듬은 Claude Code 설정·훅·스킬·자동화 모음 — 무엇을/왜 썼고/무엇이 좋아졌는지.";
    } else {
      var p = contentEl.querySelector("p");
      desc = (p ? p.textContent : item.title).replace(/\s+/g, " ").trim().slice(0, 155);
    }
    setMeta('meta[name="description"]', "name", "description", desc);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", desc);
    setMeta('meta[property="og:url"]', "property", "og:url", location.href);
    var canon = document.head.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.setAttribute("rel", "canonical"); document.head.appendChild(canon); }
    canon.setAttribute("href", location.origin + location.pathname + (isHome ? "" : location.hash));
  }

  /* ---- mobile menu ---- */
  function openMenu() { sidebar.classList.add("open"); overlay.hidden = false; }
  function closeMenu() { sidebar.classList.remove("open"); overlay.hidden = true; }
  function setupMenu() {
    document.getElementById("menuBtn").addEventListener("click", function () {
      sidebar.classList.contains("open") ? closeMenu() : openMenu();
    });
    overlay.addEventListener("click", closeMenu);
  }

  /* ---- responsive search: 좁은 화면(<=560px)에선 검색을 드로어(사이드바)로 이동해 접근 가능하게 ---- */
  function setupResponsiveSearch() {
    var wrap = document.querySelector(".search-wrap");
    var topbar = document.querySelector(".topbar");
    var themeBtn = document.getElementById("themeBtn");
    if (!wrap || !topbar || !sidebar || !window.matchMedia) return;
    var mq = window.matchMedia("(max-width: 560px)");
    function place() {
      if (mq.matches) { if (wrap.parentElement !== sidebar) sidebar.insertBefore(wrap, sidebar.firstChild); }
      else { if (wrap.parentElement !== topbar) topbar.insertBefore(wrap, themeBtn); }
    }
    place();
    if (mq.addEventListener) mq.addEventListener("change", place);
    else if (mq.addListener) mq.addListener(place);
  }

  /* ---- boot ---- */
  function boot() {
    window.marked.setOptions({ gfm: true, breaks: false });
    buildNav(); setupSearch(); setupTheme(); setupMenu(); setupResponsiveSearch();
    window.addEventListener("hashchange", function () { if ((location.hash || "").indexOf("#/") === 0) route(); });
    window.addEventListener("scroll", updateProgress, { passive: true });
    route();
  }
  if (window.marked) boot();
  else window.addEventListener("load", boot);
})();
