(() => {
  "use strict";

  const page = document.body.dataset.page || "home";
  const inPages = location.pathname.includes("/pages/");
  const rootPrefix = inPages ? "../" : "";

  const links = [
    ["home", "📖", "今日学习", `${rootPrefix}index.html`],
    ["collection", "🎴", "卡牌收藏", `${rootPrefix}pages/collection.html`],
    ["stats", "📊", "学习统计", `${rootPrefix}pages/stats.html`],
    ["culture", "⛩", "日本文化", `${rootPrefix}pages/culture.html`],
    ["settings", "⚙", "设置", `${rootPrefix}pages/settings.html`]
  ];

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.className = "sidebar";
    sidebar.innerHTML = `
      <div class="logo-area">
        <div class="logo-jp">神月京都物语</div>
        <div class="logo-en">Kamizuki Kyoto</div>
      </div>
      <nav class="menu" aria-label="主导航">
        ${links.map(([key, icon, label, href]) => `
          <button type="button" class="menu-item ${page === key ? "active" : ""}" data-href="${href}">
            <span class="menu-icon">${icon}</span><span>${label}</span>
          </button>
        `).join("")}
      </nav>
    `;
    sidebar.addEventListener("click", e => {
      const btn = e.target.closest("[data-href]");
      if (btn) location.href = btn.dataset.href;
    });
  }

  const defaults = { dailyGoal: 5, speechRate: 0.78, autoPlay: false };

  window.Kamizuki = {
    keys: { cards:"kamizukiCards", stats:"kamizukiStats", settings:"kamizukiSettings" },

    settings() {
      let value = {};
      try { value = JSON.parse(localStorage.getItem(this.keys.settings) || "{}"); } catch {}
      return { ...defaults, ...value };
    },

    saveSettings(next) {
      const value = { ...this.settings(), ...next };
      localStorage.setItem(this.keys.settings, JSON.stringify(value));
      return value;
    },

    localDateKey(date = new Date()) {
      const y = date.getFullYear();
      const m = String(date.getMonth()+1).padStart(2,"0");
      const d = String(date.getDate()).padStart(2,"0");
      return `${y}-${m}-${d}`;
    },

    dailyKey(date = new Date()) {
      return `kamizukiDailyProgress_${this.localDateKey(date)}`;
    },

    getStats() {
      let s = {};
      try { s = JSON.parse(localStorage.getItem(this.keys.stats) || "{}"); } catch {}
      return {
        studyActions:0, correct:0, wrong:0,
        listeningCorrect:0, listeningTotal:0, exp:0,
        lastStudyDate:"", activeDays:{}, ...s
      };
    },

    addStats(delta = {}) {
      const s = this.getStats();
      for (const [k,v] of Object.entries(delta)) {
        if (typeof v === "number") s[k] = (Number(s[k]) || 0) + v;
      }
      const today = this.localDateKey();
      s.lastStudyDate = today;
      s.activeDays = s.activeDays || {};
      s.activeDays[today] = true;
      localStorage.setItem(this.keys.stats, JSON.stringify(s));
      return s;
    },

    speak(text) {
      if (!text || !("speechSynthesis" in window)) return false;
      const cfg = this.settings();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = "ja-JP";
      u.rate = Number(cfg.speechRate) || 0.78;
      u.pitch = 1;
      u.volume = 1;
      const voices = speechSynthesis.getVoices();
      const jp = voices.find(v => /^ja[-_]/i.test(v.lang));
      if (jp) u.voice = jp;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      return true;
    },

    async loadCards(path) {
      const res = await fetch(path, { cache:"no-store" });
      if (!res.ok) throw new Error(`cards.json HTTP ${res.status}`);
      const base = await res.json();

      let saved = [];
      try { saved = JSON.parse(localStorage.getItem(this.keys.cards) || "[]"); } catch {}
      if (!Array.isArray(saved)) saved = [];

      const byId = new Map(saved.map(x => [x.id,x]));
      return base.map(card => {
        const old = byId.get(card.id) || {};
        return {
          ...card, ...old,
          origin:{...(card.origin||{}),...(old.origin||{})},
          memory:{...(card.memory||{}),...(old.memory||{})},
          pronunciation:{...(card.pronunciation||{}),...(old.pronunciation||{})},
          study:{...(card.study||{}),...(old.study||{})}
        };
      });
    },

    saveCards(cards) {
      localStorage.setItem(this.keys.cards, JSON.stringify(cards));
    },

    toast(message) {
      let node = document.getElementById("global-toast");
      if (!node) {
        node = document.createElement("div");
        node.id = "global-toast";
        node.className = "global-toast";
        document.body.appendChild(node);
      }
      node.textContent = message;
      node.classList.add("show");
      clearTimeout(node._timer);
      node._timer = setTimeout(() => node.classList.remove("show"), 1800);
    }
  };

  if ("speechSynthesis" in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }
})();
