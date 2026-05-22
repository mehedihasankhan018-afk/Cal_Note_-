import { useState, useRef, useMemo, useEffect, useCallback } from "react";

const BN = "০১২৩৪৫৬৭৮৯";

const toBn = (n) => String(n).replace(/\d/g, (d) => BN[d]);

const toEn = (s) =>
  String(s)
    .replace(/[০-৯]/g, (d) => BN.indexOf(d))
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-");

function safeCalc(expr) {
  const clean = toEn(expr)
    .replace(/[^0-9+\-*/.() ]/g, "")
    .trim();

  if (!clean) return null;

  try {
    const tokens = clean.match(/(\d+\.?\d*)|([+\-*/()])/g);
    if (!tokens) return null;

    let i = 0;

    const peek = () => tokens[i];
    const consume = () => tokens[i++];

    const parsePrimary = () => {
      const t = consume();

      if (t === "(") {
        const value = parseAdd();

        if (peek() === ")") consume();

        return value;
      }

      if (t === "-") {
        return -parsePrimary();
      }

      if (t === undefined) return 0;

      const num = parseFloat(t);
      return Number.isNaN(num) ? 0 : num;
    };

    const parseMul = () => {
      let value = parsePrimary();

      while (peek() === "*" || peek() === "/") {
        const op = consume();
        const right = parsePrimary();

        if (op === "*") {
          value *= right;
        } else {
          value = right !== 0 ? value / right : NaN;
        }
      }

      return value;
    };

    const parseAdd = () => {
      let value = parseMul();

      while (peek() === "+" || peek() === "-") {
        const op = consume();
        const right = parseMul();

        if (op === "+") {
          value += right;
        } else {
          value -= right;
        }
      }

      return value;
    };

    const result = parseAdd();

    if (i < tokens.length) {
      return null;
    }

    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function evalLine(raw) {
  const en = toEn(raw);

  if (/[+\-*/]/.test(en)) {
    return safeCalc(en);
  }

  const match = en.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function calcTotal(arr) {
  return arr.reduce((sum, line) => {
    const value = evalLine(line);

    if (value !== null && !Number.isNaN(value)) {
      return sum + value;
    }

    return sum;
  }, 0);
}

function fmtNum(n) {
  if (n === null || Number.isNaN(n)) return "";

  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);

  const str = Number.isInteger(abs)
    ? String(abs)
    : abs.toFixed(4).replace(/\.?0+$/, "");

  return sign + toBn(str);
}

const STORE_KEY = "calnote_v2";

function loadData() {
  try {
    if (typeof window === "undefined") return null;

    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveData(data) {
  try {
    if (typeof window === "undefined") return;

    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage failures
  }
}

function BreatheLogo() {
  const parts = [
    { ch: "ক্যা", delay: 0 },
    { ch: "ল", delay: 0.4 },
    { ch: "নো", delay: 0.8 },
    { ch: "ট", delay: 1.2 },
  ];

  return (
    <span style={{ display: "flex", alignItems: "baseline" }}>
      {parts.map(({ ch, delay }) => (
        <span
          key={`${ch}-${delay}`}
          style={{
            display: "inline-block",
            fontFamily: "'Atma', sans-serif",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.5px",
            color: "#1a1a1a",
            animationName: "wBreath",
            animationDuration: "6s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDelay: `${delay}s`,
            lineHeight: 1,
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

export default function CalNote() {
  const saved = useMemo(() => loadData(), []);

  const [title, setTitle] = useState(saved?.title ?? "আমার হিসাব");
  const [lines, setLines] = useState(
    Array.isArray(saved?.lines) && saved.lines.length > 0
      ? saved.lines
      : [""]
  );

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const [totalPulse, setTotalPulse] = useState(false);

  const refsArr = useRef([]);
  const saveTimer = useRef(null);
  const pulseTimer = useRef(null);
  const prevTotal = useRef(0);

  const total = useMemo(() => calcTotal(lines), [lines]);

  const lineResults = useMemo(
    () =>
      lines.map((line) => {
        const en = toEn(line);

        if (!/[+\-*/]/.test(en)) {
          return null;
        }

        return evalLine(line);
      }),
    [lines]
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (total !== prevTotal.current) {
      prevTotal.current = total;

      setTotalPulse(true);

      if (pulseTimer.current) {
        clearTimeout(pulseTimer.current);
      }

      pulseTimer.current = setTimeout(() => {
        setTotalPulse(false);
      }, 700);
    }

    return () => {
      if (pulseTimer.current) {
        clearTimeout(pulseTimer.current);
      }
    };
  }, [total]);

  useEffect(() => {
    refsArr.current = refsArr.current.slice(0, lines.length);
  }, [lines.length]);

  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };

    setVh();

    window.addEventListener("resize", setVh);

    return () => {
      window.removeEventListener("resize", setVh);
    };
  }, []);

  useEffect(() => {
    refsArr.current.forEach((el) => {
      if (!el) return;

      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [lines]);

  useEffect(() => {
    try {
      let viewport = document.querySelector("meta[name=viewport]");

      if (!viewport) {
        viewport = document.createElement("meta");
        viewport.name = "viewport";
        document.head.appendChild(viewport);
      }

      viewport.content =
        "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover";

      let themeMeta = document.querySelector("meta[name=theme-color]");

      if (!themeMeta) {
        themeMeta = document.createElement("meta");
        themeMeta.name = "theme-color";
        document.head.appendChild(themeMeta);
      }

      themeMeta.content = "#eeece8";

      if (!document.querySelector("link[rel='manifest']")) {
        const manifest = document.createElement("link");
        manifest.rel = "manifest";
        manifest.href = "/manifest.json";
        document.head.appendChild(manifest);
      }

      const appleMetas = [
        ["apple-mobile-web-app-capable", "yes"],
        ["apple-mobile-web-app-status-bar-style", "black-translucent"],
        ["apple-mobile-web-app-title", "ক্যালনোট"],
      ];

      appleMetas.forEach(([name, content]) => {
        let meta = document.querySelector(`meta[name='${name}']`);

        if (!meta) {
          meta = document.createElement("meta");
          meta.name = name;
          document.head.appendChild(meta);
        }

        meta.content = content;
      });

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // ignore registration failure
        });
      }
    } catch {
      // ignore browser-specific failures
    }
  }, []);

  const triggerSave = useCallback((nextTitle, nextLines) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(() => {
      saveData({ title: nextTitle, lines: nextLines });
    }, 600);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  const autoResize = (el) => {
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;

    setTitle(value);
    triggerSave(value, lines);
  };

  const handleLineChange = (index, e) => {
    const nextLines = [...lines];
    nextLines[index] = e.target.value;

    setLines(nextLines);
    autoResize(e.target);
    triggerSave(title, nextLines);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const current = refsArr.current[index];
      const cursor = current?.selectionStart ?? lines[index].length;

      const nextLines = [
        ...lines.slice(0, index),
        lines[index].slice(0, cursor),
        lines[index].slice(cursor),
        ...lines.slice(index + 1),
      ];

      setLines(nextLines);
      triggerSave(title, nextLines);

      setTimeout(() => {
        const next = refsArr.current[index + 1];

        if (next) {
          next.focus();
          next.setSelectionRange(0, 0);
          autoResize(next);
        }
      }, 0);
    }

    if (e.key === "Backspace") {
      const current = refsArr.current[index];
      const cursor = current?.selectionStart ?? 0;

      if (cursor === 0 && index > 0) {
        e.preventDefault();

        const previousLength = lines[index - 1].length;

        const nextLines = [
          ...lines.slice(0, index - 1),
          lines[index - 1] + lines[index],
          ...lines.slice(index + 1),
        ];

        setLines(nextLines);
        triggerSave(title, nextLines);

        setTimeout(() => {
          const previous = refsArr.current[index - 1];

          if (previous) {
            previous.focus();
            previous.setSelectionRange(previousLength, previousLength);
            autoResize(previous);
          }
        }, 0);
      }
    }
  };

  const now = new Date();

  const bnMonths = [
    "জানুয়ারি",
    "ফেব্রুয়ারি",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগস্ট",
    "সেপ্টেম্বর",
    "অক্টোবর",
    "নভেম্বর",
    "ডিসেম্বর",
  ];

  const bnDays = [
    "রবিবার",
    "সোমবার",
    "মঙ্গলবার",
    "বুধবার",
    "বৃহস্পতিবার",
    "শুক্রবার",
    "শনিবার",
  ];

  const dateFull = `${toBn(now.getDate())} ${bnMonths[now.getMonth()]}, ${toBn(
    now.getFullYear()
  )}`;

  const dayName = bnDays[now.getDay()];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Atma:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
          margin: 0;
          padding: 0;
        }

        html {
          height: 100%;
          height: -webkit-fill-available;
        }

        body {
          min-height: 100vh;
          min-height: calc(var(--vh, 1vh) * 100);
          background: #eeece8;
          background-color: #eeece8;
          overscroll-behavior-y: none;
        }

        @keyframes wBreath {
          0%, 100% {
            font-weight: 700;
            opacity: 1;
          }

          35% {
            font-weight: 300;
            opacity: 0.5;
          }

          65% {
            font-weight: 700;
            opacity: 1;
          }
        }

        .cn-page {
          min-height: 100vh;
          min-height: calc(var(--vh, 1vh) * 100);
          background: #eeece8;
          display: flex;
          justify-content: center;
          padding: 36px 18px calc(80px + env(safe-area-inset-bottom)) 18px;
          font-family: 'Atma', sans-serif;
          overscroll-behavior: none;
          width: 100%;
          position: relative;
        }

        .cn-wrap {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .cn-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .cn-status {
          margin-top: 6px;
          font-size: 11px;
          color: #8a8a8a;
          text-align: right;
        }

        .cn-date-block {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .cn-date-main {
          font-size: 12.5px;
          font-weight: 600;
          color: #555;
          white-space: nowrap;
          line-height: 1;
        }

        .cn-date-day {
          font-size: 11px;
          font-weight: 400;
          color: #aaa;
          line-height: 1;
        }

        .cn-paper {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #e5e0d8;
          box-shadow:
            0 1px 2px rgba(0,0,0,.03),
            0 4px 16px rgba(0,0,0,.055),
            0 18px 44px rgba(0,0,0,.045);
          overflow: hidden;
        }

        .cn-title-row {
          padding: 20px 20px 16px;
          border-bottom: 1px solid #f0ebe4;
        }

        .cn-title-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'Atma', sans-serif;
          font-size: 19px;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.45;
          caret-color: #bbb;
        }

        .cn-title-input::placeholder {
          color: #ccc;
        }

        .cn-lines {
          padding: 4px 0 6px;
        }

        .cn-row {
          display: flex;
          align-items: flex-start;
          border-bottom: 1px solid #f4f0eb;
          transition: background .12s;
        }

        .cn-row:last-child {
          border-bottom: none;
        }

        .cn-row:focus-within {
          background: #faf8f5;
        }

        .cn-num {
          width: 42px;
          flex-shrink: 0;
          padding-top: 15px;
          display: flex;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #ccc;
          user-select: none;
          pointer-events: none;
        }

        .cn-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          overflow: hidden;
          font-family: 'Atma', sans-serif;
          font-size: 16px;
          line-height: 1.85;
          color: #1a1a1a;
          padding: 11px 8px 11px 0;
          min-height: 48px;
          caret-color: #bbb;
          word-break: break-word;
        }

        .cn-input::placeholder {
          color: #d2cec8;
        }

        .cn-input::-webkit-scrollbar {
          display: none;
        }

        .cn-line-result {
          align-self: center;
          margin-right: 14px;
          font-size: 13px;
          font-weight: 600;
          color: #bbb;
          white-space: nowrap;
          opacity: 0;
          transform: translateX(4px);
          transition: opacity .2s, transform .2s;
          pointer-events: none;
        }

        .cn-line-result.show {
          opacity: 1;
          transform: translateX(0);
        }

        .cn-total-bar {
          border-top: 1.5px solid #f0ebe4;
          padding: 14px 20px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .cn-total-label {
          font-size: 14px;
          color: #8d8d8d;
        }

        .cn-total-value {
          font-size: 34px;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1;
          letter-spacing: -.5px;
          display: inline-block;
          transition: transform .38s cubic-bezier(0.34,1.56,0.64,1);
        }

        .cn-total-value.pulse {
          transform: scale(1.1);
        }

        @media (max-width: 380px) {
          .cn-total-value {
            font-size: 28px;
          }

          .cn-input {
            font-size: 15px;
          }

          .cn-title-input {
            font-size: 17px;
          }
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
              <input
                className="cn-title-input"
                value={title}
                onChange={handleTitleChange}
                placeholder="হিসাবের নাম লিখুন"
              />
            </div>

            <div className="cn-lines">
              {lines.map((line, index) => (
                <div className="cn-row" key={`${index}-${line}`}>
                  <span className="cn-num">{toBn(index + 1)}</span>

                  <textarea
                    ref={(el) => {
                      refsArr.current[index] = el;
                    }}
                    className="cn-input"
                    value={line}
                    rows={1}
                    spellCheck={false}
                    onChange={(e) => handleLineChange(index, e)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={(e) => autoResize(e.target)}
                    placeholder=""
                  />

                  <span
                    className={`cn-line-result${
                      lineResults[index] !== null ? " show" : ""
                    }`}
                  >
                    {lineResults[index] !== null
                      ? `= ${fmtNum(lineResults[index])}`
                      : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="cn-total-bar">
              <span className="cn-total-label"></span>

              <span
                className={`cn-total-value${totalPulse ? " pulse" : ""}`}
              >
                {fmtNum(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
