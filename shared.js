/**
 * Sadik Finance — Shared JS Engine
 * Handles: live market data, shared nav, maven config, utilities
 */
'use strict';

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const SF = window.SF = window.SF || {};

SF.FINNHUB_KEY = 'd7i9lo9r01qu8vfnrbh0d7i9lo9r01qu8vfnrbhg';
SF.BASE = 'https://finnhub.io/api/v1';
SF.api = (path) => `${SF.BASE}${path}&token=${SF.FINNHUB_KEY}`;
SF.isWeekend = () => { const d = new Date().getDay(); return d === 0 || d === 6; };
SF.isMobile = () => window.innerWidth < 600;

/* ═══════════════════════════════════════════════
   MARKET SYMBOLS MASTER LIST
═══════════════════════════════════════════════ */
SF.SYMBOLS = [
  // FOREX
  { sym:'EUR/USD', finnhub:'OANDA:EUR_USD',  type:'forex',  dp:5, pip:0.0001 },
  { sym:'GBP/USD', finnhub:'OANDA:GBP_USD',  type:'forex',  dp:5, pip:0.0001 },
  { sym:'USD/JPY', finnhub:'OANDA:USD_JPY',   type:'forex',  dp:3, pip:0.01 },
  { sym:'AUD/USD', finnhub:'OANDA:AUD_USD',   type:'forex',  dp:5, pip:0.0001 },
  { sym:'NZD/USD', finnhub:'OANDA:NZD_USD',   type:'forex',  dp:5, pip:0.0001 },
  { sym:'USD/CAD', finnhub:'OANDA:USD_CAD',   type:'forex',  dp:5, pip:0.0001 },
  { sym:'USD/CHF', finnhub:'OANDA:USD_CHF',   type:'forex',  dp:5, pip:0.0001 },
  { sym:'EUR/JPY', finnhub:'OANDA:EUR_JPY',   type:'forex',  dp:3, pip:0.01 },
  { sym:'GBP/JPY', finnhub:'OANDA:GBP_JPY',   type:'forex',  dp:3, pip:0.01 },
  { sym:'EUR/GBP', finnhub:'OANDA:EUR_GBP',   type:'forex',  dp:5, pip:0.0001 },
  { sym:'AUD/JPY', finnhub:'OANDA:AUD_JPY',   type:'forex',  dp:3, pip:0.01 },
  { sym:'CAD/JPY', finnhub:'OANDA:CAD_JPY',   type:'forex',  dp:3, pip:0.01 },
  { sym:'GBP/CHF', finnhub:'OANDA:GBP_CHF',   type:'forex',  dp:5, pip:0.0001 },
  { sym:'EUR/AUD', finnhub:'OANDA:EUR_AUD',   type:'forex',  dp:5, pip:0.0001 },
  { sym:'GBP/AUD', finnhub:'OANDA:GBP_AUD',   type:'forex',  dp:5, pip:0.0001 },
  // METALS
  { sym:'GOLD',    finnhub:'OANDA:XAU_USD',   type:'metal',  dp:2, pip:0.01 },
  { sym:'SILVER',  finnhub:'OANDA:XAG_USD',   type:'metal',  dp:4, pip:0.001 },
  // CRYPTO
  { sym:'BTC/USD', finnhub:'BINANCE:BTCUSDT', type:'crypto', dp:0, pip:1 },
  { sym:'ETH/USD', finnhub:'BINANCE:ETHUSDT', type:'crypto', dp:2, pip:0.01 },
  { sym:'SOL/USD', finnhub:'BINANCE:SOLUSDT', type:'crypto', dp:2, pip:0.01 },
  // INDICES (via ETF proxies)
  { sym:'US30',    finnhub:'AMEX:DIA',        type:'index',  dp:2, pip:0.01, etf:true },
  { sym:'NAS100',  finnhub:'NASDAQ:QQQ',      type:'index',  dp:2, pip:0.01, etf:true },
  { sym:'SPX500',  finnhub:'AMEX:SPY',        type:'index',  dp:2, pip:0.01, etf:true },
  { sym:'DXY',     finnhub:'TVC:DXY',         type:'index',  dp:3, pip:0.001 },
  // CRUDE OIL
  { sym:'CRUDE OIL',finnhub:'OANDA:BCO_USD',  type:'commodity',dp:2,pip:0.01},
];

// Quote cache
SF._cache = {};

/* ═══════════════════════════════════════════════
   QUOTE FETCHER (with cache, 15s TTL)
═══════════════════════════════════════════════ */
SF.fetchQuote = async function(finnhubSym) {
  const now = Date.now();
  const cached = SF._cache[finnhubSym];
  if (cached && now - cached.ts < 15000) return cached.data;
  try {
    const r = await fetch(SF.api(`/quote?symbol=${encodeURIComponent(finnhubSym)}`));
    if (!r.ok) return null;
    const d = await r.json();
    if (d && d.c > 0) {
      const data = { price: d.c, chg: d.dp, prev: d.pc, high: d.h, low: d.l, open: d.o };
      SF._cache[finnhubSym] = { ts: now, data };
      return data;
    }
  } catch(e) {}
  return null;
};

SF.fetchAllQuotes = async function(symbols) {
  const results = {};
  await Promise.allSettled(
    symbols.map(async s => {
      const q = await SF.fetchQuote(s.finnhub);
      if (q) results[s.sym] = { ...s, ...q };
    })
  );
  return results;
};

/* ═══════════════════════════════════════════════
   FORMAT HELPERS
═══════════════════════════════════════════════ */
SF.fmtPrice = (p, dp) => {
  if (p == null || isNaN(p)) return '—';
  if (p > 10000) return p.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (p > 100) return p.toLocaleString('en-US', { minimumFractionDigits: dp ?? 2, maximumFractionDigits: dp ?? 2 });
  return p.toFixed(dp ?? 5);
};
SF.fmtChg = (c) => {
  if (c == null || isNaN(c)) return '—';
  return (c >= 0 ? '+' : '') + c.toFixed(2) + '%';
};
SF.updown = (c) => (c == null ? '' : c >= 0 ? 'up' : 'down');

/* ═══════════════════════════════════════════════
   MAVEN CONFIG AUTO-UPDATE
═══════════════════════════════════════════════ */
SF.MAVEN_FALLBACK = {
  link: 'https://app.mavenfunded.com/?ref=sadik',
  code: 'SADIK',
  cta: 'Start Your Challenge',
  banner: 'Exclusive Discount — Limited Time',
  expiry: '2026-12-31T23:59:59'
};

SF.loadMaven = async function() {
  let cfg = SF.MAVEN_FALLBACK;
  try {
    const r = await fetch('/config/maven.json?v=' + Date.now());
    if (r.ok) {
      const j = await r.json();
      cfg = { ...SF.MAVEN_FALLBACK, ...j };
    }
  } catch(e) {}

  // Apply to DOM
  document.querySelectorAll('.maven-link').forEach(el => {
    el.href = cfg.link;
    if (!el.getAttribute('target')) el.target = '_blank';
  });
  document.querySelectorAll('.promo-code').forEach(el => el.textContent = cfg.code);
  document.querySelectorAll('.maven-cta').forEach(el => el.textContent = cfg.cta);
  document.querySelectorAll('.maven-banner').forEach(el => el.textContent = cfg.banner);

  if (cfg.expiry) {
    const exp = new Date(cfg.expiry);
    document.querySelectorAll('.maven-expiry').forEach(el => {
      el.textContent = exp.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    });
    SF.startCountdown(exp);
  }
  return cfg;
};

SF.startCountdown = function(expiry) {
  const els = document.querySelectorAll('.maven-countdown');
  if (!els.length) return;
  function tick() {
    const diff = expiry - Date.now();
    if (diff <= 0) { els.forEach(el => el.textContent = 'EXPIRED'); return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const str = `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    els.forEach(el => el.textContent = str);
  }
  tick();
  setInterval(tick, 1000);
};

/* ═══════════════════════════════════════════════
   MARKET IMPACT ANALYSIS
═══════════════════════════════════════════════ */
SF.analyzeImpact = function(headline) {
  const h = (headline || '').toLowerCase();
  const impacts = {};
  if (h.match(/cpi|inflation.*(rise|surge|hot|above|beat)/))       { impacts['USD']='bullish'; impacts['GOLD']='bearish'; impacts['NASDAQ']='bearish'; }
  if (h.match(/inflation.*(cool|soft|below|eases|falls|drop)/))    { impacts['USD']='bearish'; impacts['GOLD']='bullish'; impacts['NASDAQ']='bullish'; }
  if (h.match(/fed.*(cut|dovish|pause|pivot)|rate cut/))           { impacts['USD']='bearish'; impacts['GOLD']='bullish'; impacts['NASDAQ']='bullish'; }
  if (h.match(/fed.*(hike|hawkish|raise|tighten)|rate hike/))      { impacts['USD']='bullish'; impacts['GOLD']='bearish'; impacts['NASDAQ']='bearish'; }
  if (h.match(/nfp|non.?farm|jobs.*(beat|strong|above|surge)/))    { impacts['USD']='bullish'; impacts['GOLD']='bearish'; }
  if (h.match(/jobs.*(weak|miss|below|fall)|payroll.*(miss|fall)/)) { impacts['USD']='bearish'; impacts['GOLD']='bullish'; }
  if (h.match(/war|conflict|escalat|attack|missile|invasion/))      { impacts['GOLD']='bullish'; impacts['OIL']='bullish'; impacts['NASDAQ']='bearish'; }
  if (h.match(/opec|oil.*(cut|output)/))                           { impacts['OIL']='bullish'; }
  if (h.match(/oil.*(surplus|inventory|build)/))                   { impacts['OIL']='bearish'; }
  if (h.match(/bitcoin|btc|crypto.*(etf|approval|inflow|rally)/)) { impacts['BTC']='bullish'; }
  if (h.match(/crypto.*(ban|crash|hack|collapse)/))               { impacts['BTC']='bearish'; }
  if (h.match(/earnings.*(beat|surpass|above|record)/))           { impacts['NASDAQ']='bullish'; impacts['SPX500']='bullish'; }
  return impacts;
};

SF.impactHTML = function(impacts) {
  if (!Object.keys(impacts).length) return '';
  return Object.entries(impacts).map(([asset, dir]) => {
    const cls = dir === 'bullish' ? 'bullish' : dir === 'bearish' ? 'bearish' : 'neutral';
    const arrow = dir === 'bullish' ? '↑' : dir === 'bearish' ? '↓' : '→';
    return `<span class="impact-badge ${cls}">${asset} ${arrow}</span>`;
  }).join('');
};

/* ═══════════════════════════════════════════════
   SHARED MENU / OVERLAY LOGIC
═══════════════════════════════════════════════ */
SF.initMenu = function() {
  window.toggleMenu = function() {
    document.getElementById('navMenu')?.classList.toggle('open');
    document.getElementById('hamburger')?.classList.toggle('open');
    document.getElementById('overlay')?.classList.toggle('show');
    document.body.classList.toggle('no-scroll');
  };
  window.openModal = function() {
    document.getElementById('modalOverlay')?.classList.add('show');
    document.body.classList.add('no-scroll');
  };
  window.closeModal = function() {
    document.getElementById('modalOverlay')?.classList.remove('show');
    document.body.classList.remove('no-scroll');
  };
  window.handleModalClick = function(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  };
};
