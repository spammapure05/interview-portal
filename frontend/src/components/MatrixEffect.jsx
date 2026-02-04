import { useEffect, useRef, useState } from "react";

const KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
const CHARS = KATAKANA + LATIN;
const FONT_SIZE = 18;

export default function MatrixEffect({ onExit }) {
  const [phase, setPhase] = useState("crt");
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Matrix rain
  useEffect(() => {
    if (phase !== "rain") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const columns = Math.floor(canvas.width / FONT_SIZE);
    const drops = Array.from({ length: columns }, () =>
      Math.random() * -100 | 0
    );

    // Pre-fill with black
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const draw = () => {
      // Fade trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.random() * CHARS.length | 0];
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        // Head character is brighter white-green
        if (Math.random() > 0.1) {
          ctx.fillStyle = "#0f0";
        } else {
          ctx.fillStyle = "#fff";
        }
        ctx.fillText(char, x, y);

        // Slightly dimmer character behind head
        if (drops[i] > 0) {
          const prevChar = CHARS[Math.random() * CHARS.length | 0];
          ctx.fillStyle = "rgba(0, 255, 0, 0.6)";
          ctx.fillText(prevChar, x, (drops[i] - 1) * FONT_SIZE);
        }

        // Reset drop or advance
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [phase]);

  // Exit on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit]);

  return (
    <div
      onClick={onExit}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        cursor: "pointer",
      }}
    >
      <style>{`
        @keyframes crt-flicker {
          0%   { opacity: 0; }
          5%   { opacity: 1; }
          10%  { opacity: 0.2; }
          15%  { opacity: 0.9; }
          20%  { opacity: 0.1; }
          25%  { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes crt-line {
          0%   { transform: scaleY(0.003); filter: brightness(3); }
          50%  { transform: scaleY(0.003); filter: brightness(3); }
          70%  { transform: scaleY(0.5); filter: brightness(1.5); }
          85%  { transform: scaleY(0.8); filter: brightness(1.2); }
          100% { transform: scaleY(1); filter: brightness(1); }
        }
        @keyframes crt-glow {
          0%   { box-shadow: inset 0 0 100px rgba(0,255,0,0.3); }
          100% { box-shadow: inset 0 0 30px rgba(0,255,0,0.05); }
        }
        @keyframes scanlines {
          0%   { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
        .matrix-crt-screen {
          position: absolute;
          inset: 0;
          background: #000;
          animation: crt-flicker 0.6s ease-out forwards, crt-line 1.4s ease-out forwards, crt-glow 1.5s 1.2s ease-out forwards;
          overflow: hidden;
        }
        .matrix-crt-screen::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 0, 0.03) 0px,
            rgba(0, 255, 0, 0.03) 1px,
            transparent 1px,
            transparent 3px
          );
          pointer-events: none;
          opacity: 0;
          animation: crt-flicker 0.3s 1s ease-out forwards;
        }
        .matrix-exit-hint {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(0, 255, 0, 0.5);
          font-family: monospace;
          font-size: 14px;
          z-index: 100000;
          pointer-events: none;
          animation: crt-flicker 0.5s 2.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      {phase === "crt" && (
        <div
          className="matrix-crt-screen"
          onAnimationEnd={(e) => {
            if (e.animationName === "crt-line") {
              setPhase("rain");
            }
          }}
        />
      )}

      {phase === "rain" && (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            background: "#000",
          }}
        />
      )}

      <div className="matrix-exit-hint">
        Premi ESC o clicca per uscire
      </div>
    </div>
  );
}
