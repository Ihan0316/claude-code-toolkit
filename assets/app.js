/* ===== Claude Code 셋업 툴킷 · 문서 사이트 ===== */
(function () {
  "use strict";

  var REPO = "Ihan0316/claude-code-toolkit";
  var BLOB = "https://github.com/" + REPO + "/blob/main";

  var NAV = [
    { g: "시작하기" },
    { id: "home", file: "README.md", title: "🏠 홈 · 전체 개요" },
    { id: "00-quickstart", file: "docs/00-quickstart.md", title: "00 · 빠른 시작" },
    { g: "핵심" },
    { id: "01-hooks", file: "docs/01-hooks.md", title: "01 · 훅 (안전장치)" },
    { id: "02-skills", file: "docs/02-skills.md", title: "02 · 스킬" },
    { id: "03-memory", file: "docs/03-memory.md", title: "03 · 메모리" },
    { id: "04-automation", file: "docs/04-automation.md", title: "04 · 자동 루틴" },
    { g: "확장" },
    { id: "05-mcp", file: "docs/05-mcp.md", title: "05 · MCP 서버" },
    { id: "06-caveman", file: "docs/06-caveman.md", title: "06 · caveman 압축" },
    { id: "07-settings-backup", file: "docs/07-settings-backup.md", title: "07 · 설정 · 백업" },
    { id: "08-sync-infra", file: "docs/08-sync-infra.md", title: "08 · 양 머신 동기화" },
    { id: "09-workflows", file: "docs/09-workflows.md", title: "09 · 멀티에이전트" },
    { g: "레퍼런스" },
    { id: "10-plugins-marketplaces", file: "docs/10-plugins-marketplaces.md", title: "10 · 플러그인·마켓" },
    { id: "11-inventory", file: "docs/11-inventory.md", title: "11 · 전체 인벤토리" }
  ];
  var PAGES = NAV.filter(function (n) { return n.id; });

  var CALLOUT = {
    NOTE:      { icon: "📘", label: "참고" },
    TIP:       { icon: "💡", label: "팁" },
    IMPORTANT: { icon: "📌", label: "중요" },
    WARNING:   { icon: "⚠️", label: "주의" },
    CAUTION:   { icon: "🚫", label: "경고" }
  };

  var contentEl = document.getElementById("content");
  var navEl = document.getElementById("nav");
  var tocEl = document.getElementById("toc");
  var pagerEl = document.getElementById("pager");
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("overlay");
  var cache = {};
  var mermaidReady = null;

  /* ---- helpers ---- */
  function slugify(text) {
    return String(text).trim().toLowerCase()
      .replace(/[‍️]/g, "")            // ZWJ / variation selectors
      .replace(/[^\p{L}\p{N}\s-]/gu, "")         // drop emoji & punctuation
      .replace(/\s+/g, "-");
  }

  function getMermaid() {
    if (mermaidReady) return mermaidReady;
    mermaidReady = new Promise(function (resolve) {
      var tries = 0;
      (function poll() {
        if (window.__mermaid) {
          window.__mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: currentTheme() === "dark" ? "dark" : "default",
            fontFamily: "Pretendard, system-ui, sans-serif"
          });
          resolve(window.__mermaid);
        } else if (tries++ < 150) {
          setTimeout(poll, 40);
        } else {
          resolve(null);
        }
      })();
    });
    return mermaidReady;
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  /* ---- sidebar ---- */
  function buildNav() {
    var html = "";
    NAV.forEach(function (n) {
      if (n.g) { html += '<div class="nav-group"><div class="nav-group-title">' + n.g + "</div>"; return; }
      html += '<a data-id="' + n.id + '" href="#/' + n.id + '">' + n.title + "</a>";
    });
    navEl.innerHTML = html;
  }

  function setActiveNav(id) {
    var links = navEl.querySelectorAll("a");
    links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-id") === id); });
  }

  /* ---- render pipeline ---- */
  function decorate(root) {
    // 1) heading ids + collect for TOC
    var heads = root.querySelectorAll("h1, h2, h3");
    var toc = [];
    heads.forEach(function (h) {
      if (!h.id) h.id = slugify(h.textContent);
      if (h.tagName === "H2" || h.tagName === "H3") {
        toc.push({ id: h.id, text: h.textContent, lvl: h.tagName === "H3" ? 3 : 2 });
      }
    });

    // 2) code highlight (skip mermaid)
    root.querySelectorAll("pre code").forEach(function (code) {
      if (code.classList.contains("language-mermaid")) return;
      if (window.hljs) { try { window.hljs.highlightElement(code); } catch (e) {} }
    });

    // 3) mermaid blocks → div.mermaid
    root.querySelectorAll("pre code.language-mermaid").forEach(function (code) {
      var div = document.createElement("div");
      div.className = "mermaid";
      div.textContent = code.textContent;
      var pre = code.closest("pre");
      if (pre) pre.replaceWith(div);
    });

    // 4) GitHub alerts (blockquote starting with [!TYPE])
    root.querySelectorAll("blockquote").forEach(function (bq) {
      var m = bq.textContent.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (!m) return;
      var type = m[1].toUpperCase();
      var firstP = bq.querySelector("p");
      if (firstP) {
        firstP.innerHTML = firstP.innerHTML.replace(
          /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(<br\s*\/?>)?\s*\n?/i, "");
        if (!firstP.textContent.trim() && !firstP.querySelector("img,code")) firstP.remove();
      }
      bq.classList.add("callout", "callout-" + type.toLowerCase());
      var head = document.createElement("div");
      head.className = "callout-title";
      head.innerHTML = '<span>' + CALLOUT[type].icon + "</span><span>" + CALLOUT[type].label + "</span>";
      bq.prepend(head);
    });

    // 5) rewrite links (.md → hash routes, repo files → blob, external → new tab)
    root.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href) return;
      if (/^https?:/i.test(href)) { a.target = "_blank"; a.rel = "noopener"; return; }
      if (href.charAt(0) === "#") { return; } // in-page anchor or router handled elsewhere
      if (/README\.md(#.*)?$/i.test(href)) { a.setAttribute("href", "#/home"); return; }
      var md = href.match(/(?:^|\/)(\d\d-[a-z0-9-]+)\.md(#[^)]*)?$/i);
      if (md) { a.setAttribute("href", "#/" + md[1] + (md[2] || "")); return; }
      // other repo-relative file (examples/*.ps1, etc.) → GitHub blob
      var clean = href.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
      a.setAttribute("href", BLOB + "/" + clean);
      a.target = "_blank"; a.rel = "noopener";
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
    var prev = PAGES[idx - 1], next = PAGES[idx + 1];
    var html = "";
    html += prev
      ? '<a class="prev" href="#/' + prev.id + '"><span class="lbl">← 이전</span>' + escapeHtml(prev.title) + "</a>"
      : '<span style="flex:1"></span>';
    html += next
      ? '<a class="next" href="#/' + next.id + '"><span class="lbl">다음 →</span>' + escapeHtml(next.title) + "</a>"
      : '<span style="flex:1"></span>';
    pagerEl.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
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
    contentEl.innerHTML = '<div class="loading">불러오는 중…</div>';
    return fetchDoc(item.file).then(function (md) {
      var html = window.marked.parse(md);
      contentEl.innerHTML = html;
      var toc = decorate(contentEl);
      buildTOC(toc);
      buildPager(idx);
      document.title = (item.id === "home" ? "" : item.title.replace(/^[0-9]+ · /, "") + " · ") + "Claude Code 셋업 툴킷";
      // mermaid render
      getMermaid().then(function (mm) {
        if (!mm) return;
        var nodes = contentEl.querySelectorAll(".mermaid");
        if (nodes.length) { try { mm.run({ nodes: nodes }); } catch (e) {} }
      });
      // scroll
      if (anchor) {
        setTimeout(function () { var el = document.getElementById(anchor); if (el) el.scrollIntoView(); }, 60);
      } else {
        window.scrollTo(0, 0);
      }
      setupScrollSpy(toc);
    }).catch(function (err) {
      contentEl.innerHTML = '<div class="callout callout-caution"><div class="callout-title"><span>🚫</span><span>불러오기 실패</span></div><p>' +
        escapeHtml(String(err.message || err)) + "</p><p>로컬에서 보려면 정적 서버가 필요합니다 (예: <code>python -m http.server</code>).</p></div>";
    });
  }

  function parseRoute() {
    var h = location.hash || "";
    if (h.indexOf("#/") !== 0) return null;
    var raw = h.slice(2);
    var parts = raw.split("#");
    return { id: parts[0] || "home", anchor: parts[1] || "" };
  }

  function route() {
    var r = parseRoute() || { id: "home", anchor: "" };
    var idx = PAGES.findIndex(function (p) { return p.id === r.id; });
    if (idx < 0) { idx = 0; r.id = PAGES[0].id; }
    setActiveNav(r.id);
    closeMenu();
    renderDoc(PAGES[idx], idx, r.anchor);
  }

  /* ---- scrollspy ---- */
  var spyObserver = null;
  function setupScrollSpy(toc) {
    if (spyObserver) spyObserver.disconnect();
    if (!toc.length) return;
    var links = {};
    tocEl.querySelectorAll("a[data-tid]").forEach(function (a) { links[a.getAttribute("data-tid")] = a; });
    spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.values(links).forEach(function (a) { a.classList.remove("active"); });
          var a = links[en.target.id];
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-70px 0px -75% 0px", threshold: 0 });
    toc.forEach(function (t) { var el = document.getElementById(t.id); if (el) spyObserver.observe(el); });
  }

  /* ---- search (sidebar title filter) ---- */
  function setupSearch() {
    var input = document.getElementById("search");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      navEl.querySelectorAll("a").forEach(function (a) {
        var hit = !q || a.textContent.toLowerCase().indexOf(q) >= 0;
        a.classList.toggle("hidden", !hit);
      });
    });
  }

  /* ---- theme ---- */
  function setupTheme() {
    var saved = null;
    try { saved = localStorage.getItem("cct-theme"); } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    syncThemeUI();
    document.getElementById("themeBtn").addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("cct-theme", next); } catch (e) {}
      syncThemeUI();
      // re-init mermaid + re-render current page for new theme
      mermaidReady = null;
      var r = parseRoute() || { id: "home" };
      var idx = Math.max(0, PAGES.findIndex(function (p) { return p.id === r.id; }));
      delete cache.__force;
      renderDoc(PAGES[idx], idx, r.anchor);
    });
  }
  function syncThemeUI() {
    var dark = currentTheme() === "dark";
    document.getElementById("themeBtn").textContent = dark ? "🌙" : "☀️";
    var link = document.getElementById("hljs-theme");
    link.href = "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github-" + (dark ? "dark" : "") + ".min.css";
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

  /* ---- boot ---- */
  function boot() {
    window.marked.setOptions({ gfm: true, breaks: false });
    buildNav();
    setupSearch();
    setupTheme();
    setupMenu();
    window.addEventListener("hashchange", function () {
      if ((location.hash || "").indexOf("#/") === 0) route();
      // else: in-page anchor → let browser scroll
    });
    route();
  }

  if (window.marked) boot();
  else window.addEventListener("load", boot);
})();
