import { useState, useRef, useMemo, useEffect, useCallback } from "react";

const BN = "০১২৩৪৫৬৭৮৯";
const toBn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
const toEn = (s) =>
  String(s)
    .replace(/[০-৯]/g, (d) => BN.indexOf(d))
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");

function safeCalc(expr) {
  const clean = toEn(expr).replace(/[^0-9+\-*/.() ]/g, "").trim();
  if (!clean) return null;
  try {
    const tokens = clean.match(/(\d+\.?\d*)|([+\-*/()])/g);
    if (!tokens) return null;
    let i = 0;
    const peek    = () => tokens[i];
    const consume = () => tokens[i++];
    const parseNum = () => {
      const t = consume();
      if (t === "(") { const v = parseAdd(); consume(); return v; }
      if (t === undefined) return 0;
      return parseFloat(t);
    };
    const parseMul = () => {
      let v = parseNum();
      while (peek() === "*" || peek() === "/") {
        const op = consume(), r = parseNum();
        v = op === "*" ? v * r : r !== 0 ? v / r : NaN;
      }
      return v;
    };
    const parseAdd = () => {
      let v = parseMul();
      while (peek() === "+" || peek() === "-") {
        const op = consume(), r = parseMul();
        v = op === "+" ? v + r : v - r;
      }
      return v;
    };
    const result = parseAdd();
    return isFinite(result) ? result : null;
  } catch { return null; }
}

function evalLine(raw) {
  const en = toEn(raw);
  if (/[+\-*\/]/.test(en)) return safeCalc(en);
  const m = en.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function calcTotal(arr) {
  let s = 0;
  arr.forEach((l) => { const v = evalLine(l); if (v !== null && !isNaN(v)) s += v; });
  return s;
}

function fmtNum(n) {
  if (n === null || isNaN(n)) return "";
  const sign = n < 0 ? "−" : "";
  const abs  = Math.abs(n);
  const str  = Number.isInteger(abs) ? String(abs) : abs.toFixed(4).replace(/\.?0+$/, "");
  return sign + toBn(str);
}

/* ── Safe localStorage wrapper ── */
const STORE_KEY = "calnote_v1";
function loadData() {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveData(obj) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(obj));
  } catch {}
}

/* ── Breathing logo ── */
function BreatheLogo() {
  const parts = [
    { ch: "ক্যা", delay: 0   },
    { ch: "ল",    delay: 0.4 },
    { ch: "নো",   delay: 0.8 },
    { ch: "ট",    delay: 1.2 },
  ];
  return (
    <span style={{ display: "flex", alignItems: "baseline" }}>
      {parts.map(({ ch, delay }) => (
        <span key={ch + delay} style={{
          display: "inline-block",
          fontFamily: "'Atma', sans-serif",
          fontSize: 26, fontWeight: 700,
          letterSpacing: "0.5px", color: "#1a1a1a",
          animationName: "wBreath",
          animationDuration: "6s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDelay: `${delay}s`,
          lineHeight: 1,
        }}>{ch}</span>
      ))}
    </span>
  );
}

export default function CalNote() {
  const saved = loadData();
  const [title, setTitle] = useState(saved?.title ?? "আমার হিসাব");
  const [lines, setLines] = useState(
    Array.isArray(saved?.lines) && saved.lines.length > 0 ? saved.lines : [""]
  );

  const refsArr    = useRef([]);
  const saveTimer  = useRef(null);
  const pulseTimer = useRef(null);
  const prevTotal  = useRef(0);
  const [totalPulse, setTotalPulse] = useState(false);

  const total       = useMemo(() => calcTotal(lines), [lines]);
  const lineResults = useMemo(() =>
    lines.map((l) => {
      const en = toEn(l);
      if (!/[+\-*\/]/.test(en)) return null;
      return evalLine(l);
    }), [lines]);

  /* online/offline */
  useEffect(() => {
    const goOn  = () => setIsOnline(true);
    const goOff = () => setIsOnline(false);
    window.addEventListener("online",  goOn);
    window.addEventListener("offline", goOff);
    return () => {
      window.removeEventListener("online",  goOn);
      window.removeEventListener("offline", goOff);
    };
  }, []);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  /* total pulse */
  useEffect(() => {
    if (total !== prevTotal.current) {
      prevTotal.current = total;
      setTotalPulse(true);
      clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => setTotalPulse(false), 700);
    }
  }, [total]);

  useEffect(() => {
    refsArr.current = refsArr.current.slice(0, lines.length);
  }, [lines.length]);

  /* mobile vh fix */
  useEffect(() => {
    const setVh = () =>
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
  }, []);

  /* PWA setup */
  useEffect(() => {
    try {
      /* viewport — viewport-fit=cover fills camera cutout area */
      let vp = document.querySelector("meta[name=viewport]");
      if (!vp) { vp = document.createElement("meta"); vp.name = "viewport"; document.head.appendChild(vp); }
      vp.content = "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";

      /* theme-color — must match background exactly so status bar blends in */
      const setTheme = (color) => {
        let t = document.querySelector("meta[name=theme-color]");
        if (!t) { t = document.createElement("meta"); t.name = "theme-color"; document.head.appendChild(t); }
        t.content = color;
      };
      setTheme("#eeece8");

      /* manifest */
      if (!document.querySelector("link[rel=manifest]")) {
        const l = document.createElement("link"); l.rel = "manifest"; l.href = "/manifest.json";
        document.head.appendChild(l);
      }

      /* apple PWA — black-translucent makes status bar overlay the app bg */
      const appleMetas = [
        ["apple-mobile-web-app-capable",          "yes"],
        ["apple-mobile-web-app-status-bar-style", "black-translucent"],
        ["apple-mobile-web-app-title",            "ক্যালনোট"],
      ];
      appleMetas.forEach(([n, c]) => {
        let m = document.querySelector(`meta[name="${n}"]`);
        if (!m) { m = document.createElement("meta"); m.name = n; document.head.appendChild(m); }
        m.content = c;
      });

      /* service worker */
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    } catch {}
  }, []);

  const triggerSave = useCallback((t, l) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveData({ title: t, lines: l }), 600);
  }, []);

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleTitleChange = (e) => {
    const v = e.target.value;
    setTitle(v);
    triggerSave(v, lines);
  };

  const handleLineChange = (i, e) => {
    const nl = [...lines]; nl[i] = e.target.value;
    setLines(nl); autoResize(e.target); triggerSave(title, nl);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const el  = refsArr.current[i];
      const pos = el?.selectionStart ?? lines[i].length;
      const nl  = [...lines.slice(0, i), lines[i].slice(0, pos), lines[i].slice(pos), ...lines.slice(i + 1)];
      setLines(nl); triggerSave(title, nl);
      setTimeout(() => {
        const next = refsArr.current[i + 1];
        if (next) { next.focus(); next.setSelectionRange(0, 0); autoResize(next); }
      }, 0);
    }
    if (e.key === "Backspace") {
      const el  = refsArr.current[i];
      const pos = el?.selectionStart ?? 0;
      if (pos === 0 && i > 0) {
        e.preventDefault();
        const pLen = lines[i - 1].length;
        const nl   = [...lines.slice(0, i - 1), lines[i - 1] + lines[i], ...lines.slice(i + 1)];
        setLines(nl); triggerSave(title, nl);
        setTimeout(() => {
          const prev = refsArr.current[i - 1];
          if (prev) { prev.focus(); prev.setSelectionRange(pLen, pLen); autoResize(prev); }
        }, 0);
      }
    }
  };

  /* date */
  const now = new Date();
  const bnM = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
               "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  const bnD = ["রবিবার","সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার","শনিবার"];
  const dateFull = `${toBn(now.getDate())} ${bnM[now.getMonth()]}, ${toBn(now.getFullYear())}`;
  const dayName  = bnD[now.getDay()];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Atma:wght@300;400;500;600;700&display=swap');

        *,*::before,*::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; margin:0; padding:0; }
        html { height:100%; height:-webkit-fill-available; }
        body {
          min-height: 100vh;
          min-height: calc(var(--vh,1vh)*100);
          background: #eeece8;
          overscroll-behavior-y: none;
          /* Extend background color into safe areas (camera cutout, home bar) */
          background-color: #eeece8;
        }

        @keyframes wBreath {
          0%,100% { font-weight:700; opacity:1;   }
          35%     { font-weight:300; opacity:0.5;  }
          65%     { font-weight:700; opacity:1;    }
        }

        .cn-page {
          min-height: 100vh;
          min-height: calc(var(--vh,1vh)*100);
          background: #eeece8;
          display: flex;
          justify-content: center;
          /* Top safe-area already handled by body, just add content padding */
          padding: 36px 18px calc(80px + env(safe-area-inset-bottom)) 18px;
          font-family: 'Atma', sans-serif;
          overscroll-behavior: none;
          /* Ensure no white edges */
          width: 100%;
          position: relative;
        }
        .cn-wrap { width:100%; max-width:420px; display:flex; flex-direction:column; gap:18px; }

        .cn-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }

        .cn-date-block { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
        .cn-date-main  { font-family:'Atma',sans-serif; font-size:12.5px; font-weight:600; color:#555; white-space:nowrap; line-height:1; }
        .cn-date-day   { font-family:'Atma',sans-serif; font-size:11px; font-weight:400; color:#aaa; line-height:1; }

        .cn-paper {
          background:#fff; border-radius:20px; border:1px solid #e5e0d8;
          box-shadow:0 1px 2px rgba(0,0,0,.03),0 4px 16px rgba(0,0,0,.055),0 18px 44px rgba(0,0,0,.045);
          overflow:hidden;
        }
        .cn-title-row  { padding:20px 20px 16px; border-bottom:1px solid #f0ebe4; }
        .cn-title-input {
          width:100%; background:transparent; border:none; outline:none;
          font-family:'Atma',sans-serif; font-size:19px; font-weight:700;
          color:#1a1a1a; line-height:1.45; caret-color:#bbb;
        }
        .cn-title-input::placeholder { color:#ccc; }

        .cn-lines { padding:4px 0 6px; }
        .cn-row { display:flex; align-items:flex-start; border-bottom:1px solid #f4f0eb; transition:background .12s; }
        .cn-row:last-child   { border-bottom:none; }
        .cn-row:focus-within { background:#faf8f5; }

        .cn-num {
          width:42px; flex-shrink:0; padding-top:15px;
          display:flex; justify-content:center;
          font-family:'Atma',sans-serif; font-size:11px; font-weight:600; color:#ccc;
          user-select:none; pointer-events:none;
        }
        .cn-input {
          flex:1; background:transparent; border:none; outline:none;
          resize:none; overflow:hidden; font-family:'Atma',sans-serif;
          font-size:16px; font-weight:400; line-height:1.85; color:#1a1a1a;
          padding:11px 8px 11px 0; min-height:48px; caret-color:#bbb; word-break:break-word;
        }
        .cn-input::placeholder { color:#d2cec8; }
        .cn-input::-webkit-scrollbar { display:none; }

        .cn-line-result {
          align-self:center; margin-right:14px;
          font-family:'Atma',sans-serif; font-size:13px; font-weight:600; color:#bbb;
          white-space:nowrap; opacity:0; transform:translateX(4px);
          transition:opacity .2s,transform .2s; pointer-events:none;
        }
        .cn-line-result.show { opacity:1; transform:translateX(0); }

        .cn-total-bar { border-top:1.5px solid #f0ebe4; padding:14px 20px 18px; display:flex; justify-content:flex-end; }
        .cn-total-value {
          font-family:'Atma',sans-serif; font-size:34px; font-weight:700;
          color:#1a1a1a; line-height:1; letter-spacing:-.5px; display:inline-block;
          transition:transform .38s cubic-bezier(0.34,1.56,0.64,1);
        }
        .cn-total-value.pulse { transform:scale(1.1); }


        @media(max-width:380px) {
          .cn-total-value { font-size:28px; }
          .cn-input        { font-size:15px; }
          .cn-title-input  { font-size:17px; }
        }
      `}</style>

      <div className="cn-page">
        <div className="cn-wrap">

          <header className="cn-header">
            <BreatheLogo />
            <div className="cn-date-block">
              <span className="cn-date-main">{dateFull}</span>
              <span className="cn-date-day">{dayName}</span>
            </div>
          </header>

          <div className="cn-paper">
            <div className="cn-title-row">
              <input className="cn-title-input" value={title}
                onChange={handleTitleChange} placeholder="হিসাবের নাম লিখুন"/>
            </div>

            <div className="cn-lines">
              {lines.map((line, i) => (
                <div className="cn-row" key={i}>
                  <span className="cn-num">{toBn(i + 1)}</span>
                  <textarea
                    ref={(el) => { refsArr.current[i] = el; }}
                    className="cn-input" value={line} rows={1} spellCheck={false}
                    onChange={(e) => handleLineChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => autoResize(e.target)}
                  />
                  <span className={`cn-line-result${lineResults[i] !== null ? " show" : ""}`}>
                    {lineResults[i] !== null ? `= ${fmtNum(lineResults[i])}` : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="cn-total-bar">
              <span className={`cn-total-value${totalPulse ? " pulse" : ""}`}>
                {fmtNum(total)}
              </span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
