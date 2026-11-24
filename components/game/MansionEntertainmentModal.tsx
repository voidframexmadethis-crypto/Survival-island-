'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Gamepad2, Joystick, MonitorPlay, Play, RotateCcw, Trophy, X } from 'lucide-react';

type GameTab = 'pool' | 'arcade' | 'xbox';

interface MansionEntertainmentModalProps {
  initialStationId: string;
  onClose: () => void;
}

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  number: number;
  cue?: boolean;
  pocketed?: boolean;
};

const TABLE_W = 900;
const TABLE_H = 500;
const RAIL = 34;
const BALL_R = 10.5;

function initialPoolBalls(): Ball[] {
  const colors = [
    '#facc15', '#1d4ed8', '#dc2626', '#7c3aed', '#f97316',
    '#15803d', '#7f1d1d', '#111827', '#facc15', '#1d4ed8',
    '#dc2626', '#7c3aed', '#f97316', '#15803d', '#7f1d1d',
  ];
  const balls: Ball[] = [
    { x: 240, y: TABLE_H / 2, vx: 0, vy: 0, color: '#f8fafc', number: 0, cue: true },
  ];
  let index = 0;
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i <= row; i++) {
      balls.push({
        x: 620 + row * 20,
        y: TABLE_H / 2 + (i - row / 2) * 21,
        vx: 0,
        vy: 0,
        color: colors[index],
        number: index + 1,
      });
      index++;
    }
  }
  return balls;
}

function PoolGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<Ball[]>(initialPoolBalls());
  const aimRef = useRef({ x: 0, y: 0, power: 0, dragging: false });
  const [potted, setPotted] = useState(0);
  const [shots, setShots] = useState(0);
  const [status, setStatus] = useState('Drag from the cue ball to aim, then release.');

  const reset = useCallback(() => {
    ballsRef.current = initialPoolBalls();
    aimRef.current = { x: 0, y: 0, power: 0, dragging: false };
    setPotted(0);
    setShots(0);
    setStatus('Drag from the cue ball to aim, then release.');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const pockets = [
      [RAIL + 8, RAIL + 8],
      [TABLE_W / 2, RAIL + 4],
      [TABLE_W - RAIL - 8, RAIL + 8],
      [RAIL + 8, TABLE_H - RAIL - 8],
      [TABLE_W / 2, TABLE_H - RAIL - 4],
      [TABLE_W - RAIL - 8, TABLE_H - RAIL - 8],
    ];

    const tick = () => {
      const balls = ballsRef.current;
      for (const ball of balls) {
        if (ball.pocketed) continue;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= 0.992;
        ball.vy *= 0.992;
        if (Math.abs(ball.vx) < 0.018) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.018) ball.vy = 0;
        if (ball.x < RAIL + BALL_R) {
          ball.x = RAIL + BALL_R;
          ball.vx = Math.abs(ball.vx) * 0.92;
        }
        if (ball.x > TABLE_W - RAIL - BALL_R) {
          ball.x = TABLE_W - RAIL - BALL_R;
          ball.vx = -Math.abs(ball.vx) * 0.92;
        }
        if (ball.y < RAIL + BALL_R) {
          ball.y = RAIL + BALL_R;
          ball.vy = Math.abs(ball.vy) * 0.92;
        }
        if (ball.y > TABLE_H - RAIL - BALL_R) {
          ball.y = TABLE_H - RAIL - BALL_R;
          ball.vy = -Math.abs(ball.vy) * 0.92;
        }
        for (const [px, py] of pockets) {
          if (Math.hypot(ball.x - px, ball.y - py) < 24) {
            ball.pocketed = true;
            ball.vx = 0;
            ball.vy = 0;
            if (ball.cue) {
              ball.x = 240;
              ball.y = TABLE_H / 2;
              ball.pocketed = false;
              setStatus('Scratched — cue ball returned to the baulk line.');
            } else {
              setPotted((value) => value + 1);
              setStatus(`Potted the ${ball.number} ball. Keep the run alive.`);
            }
            break;
          }
        }
      }
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (a.pocketed) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (b.pocketed) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.001 && dist < BALL_R * 2) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = BALL_R * 2 - dist;
            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;
            b.x += nx * overlap * 0.5;
            b.y += ny * overlap * 0.5;
            const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (relative < 0) {
              const impulse = relative * 0.96;
              a.vx += nx * impulse;
              a.vy += ny * impulse;
              b.vx -= nx * impulse;
              b.vy -= ny * impulse;
            }
          }
        }
      }

      ctx.fillStyle = '#15110d';
      ctx.fillRect(0, 0, TABLE_W, TABLE_H);
      ctx.fillStyle = '#73451f';
      ctx.fillRect(RAIL - 15, RAIL - 15, TABLE_W - RAIL * 2 + 30, TABLE_H - RAIL * 2 + 30);
      ctx.fillStyle = '#0d5b42';
      ctx.fillRect(RAIL, RAIL, TABLE_W - RAIL * 2, TABLE_H - RAIL * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 2;
      ctx.strokeRect(RAIL, RAIL, TABLE_W - RAIL * 2, TABLE_H - RAIL * 2);
      for (const [px, py] of pockets) {
        ctx.beginPath();
        ctx.fillStyle = '#050505';
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const ball of balls) {
        if (ball.pocketed) continue;
        ctx.beginPath();
        ctx.fillStyle = ball.color;
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (!ball.cue && ball.number > 0) {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 5.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#111';
          ctx.font = '700 6px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(ball.number), ball.x, ball.y + 0.5);
        }
      }
      const aim = aimRef.current;
      if (aim.dragging) {
        const cue = balls.find((ball) => ball.cue);
        if (cue) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255,255,255,.75)';
          ctx.lineWidth = 2;
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(cue.x - Math.cos(aim.x) * (35 + aim.power * 90), cue.y - Math.sin(aim.x) * (35 + aim.power * 90));
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * TABLE_W,
      y: ((event.clientY - rect.top) / rect.height) * TABLE_H,
    };
  };

  const onDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const p = point(event);
    const cue = ballsRef.current.find((ball) => ball.cue);
    if (!cue) return;
    aimRef.current = {
      x: Math.atan2(p.y - cue.y, p.x - cue.x),
      y: 0,
      power: 0,
      dragging: true,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aimRef.current.dragging) return;
    const p = point(event);
    const cue = ballsRef.current.find((ball) => ball.cue);
    if (!cue) return;
    aimRef.current.x = Math.atan2(p.y - cue.y, p.x - cue.x);
    aimRef.current.power = Math.min(1, Math.hypot(p.x - cue.x, p.y - cue.y) / 260);
  };

  const onUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aimRef.current.dragging) return;
    const p = point(event);
    const cue = ballsRef.current.find((ball) => ball.cue);
    if (cue) {
      const angle = Math.atan2(p.y - cue.y, p.x - cue.x);
      const power = Math.max(0.18, Math.min(1, Math.hypot(p.x - cue.x, p.y - cue.y) / 260));
      if (Math.hypot(p.x - cue.x, p.y - cue.y) > 8) {
        cue.vx = Math.cos(angle + Math.PI) * power * 27;
        cue.vy = Math.sin(angle + Math.PI) * power * 27;
        setShots((value) => value + 1);
        setStatus('Shot away — read the angles and keep potting.');
      }
    }
    aimRef.current.dragging = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore a pointer that the browser has already released.
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-emerald-300/70">Potted</div>
          <div className="font-display text-2xl font-bold text-emerald-200">{potted} / 15</div>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-stone-950/40 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-amber-300/70">Shots</div>
          <div className="font-display text-2xl font-bold text-amber-200">{shots}</div>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-950/40 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-stone-400">Table</div>
          <div className="text-sm font-semibold text-stone-200">8-ball · 9 ft</div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-amber-900/60 bg-stone-950 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={TABLE_W}
          height={TABLE_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="block h-auto w-full touch-none cursor-crosshair"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-400">{status}</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stone-700 bg-stone-800 px-4 py-2 text-sm font-bold text-stone-200 transition hover:bg-stone-700"
        >
          <RotateCcw className="h-4 w-4" /> Rack again
        </button>
      </div>
    </div>
  );
}

function ArcadeGame() {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [target, setTarget] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (phase !== 'playing') return;
    const tick = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 0.1) {
          setPhase('done');
          return 0;
        }
        return value - 0.1;
      });
    }, 100);
    return () => window.clearInterval(tick);
  }, [phase]);

  const spawn = () => {
    setTarget({ x: 10 + Math.random() * 80, y: 12 + Math.random() * 70 });
  };

  const start = () => {
    setScore(0);
    setTimeLeft(20);
    setPhase('playing');
    spawn();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-fuchsia-300/70">Score</div>
          <div className="font-display text-2xl font-bold text-fuchsia-200">{score}</div>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-cyan-300/70">Time</div>
          <div className="font-display text-2xl font-bold text-cyan-200">{timeLeft.toFixed(1)}s</div>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-950/40 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-stone-400">Cabinet</div>
          <div className="text-sm font-semibold text-stone-200">Bayou Blaster</div>
        </div>
      </div>
      <div className="relative h-[320px] overflow-hidden rounded-2xl border-2 border-fuchsia-500/40 bg-[radial-gradient(circle_at_50%_25%,#15103a,#050510_70%)] shadow-[0_0_40px_rgba(217,70,239,.15)]">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,211,238,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.14)_1px,transparent_1px)] [background-size:28px_28px]" />
        {phase === 'playing' && (
          <button
            type="button"
            onClick={() => {
              setScore((value) => value + 10);
              spawn();
            }}
            aria-label="Hit target"
            className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-amber-300 bg-gradient-to-br from-amber-300 to-orange-600 text-stone-950 shadow-[0_0_30px_rgba(251,191,36,.65)] transition hover:scale-110 active:scale-95"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
          >
            <span className="block text-xs font-black">HIT</span>
          </button>
        )}
        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-stone-950/60 p-5 text-center">
            <Joystick className="h-12 w-12 text-fuchsia-300" />
            <div>
              <h3 className="font-display text-2xl font-bold text-cyan-100">
                {phase === 'done' ? `Final score ${score}` : 'Bayou Blaster'}
              </h3>
              <p className="mt-1 text-sm text-stone-400">
                20 seconds. Hit as many glowing targets as you can.
              </p>
            </div>
            <button
              type="button"
              onClick={start}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-fuchsia-500 px-6 py-2.5 font-bold text-stone-950 shadow-lg transition hover:bg-fuchsia-400"
            >
              <Play className="h-4 w-4" /> {phase === 'done' ? 'Play again' : 'Insert coin'}
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-stone-400">
        Cabinet controls: click or tap the target. Each hit scores 10 and moves the target.
      </p>
    </div>
  );
}

function XboxGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [message, setMessage] = useState('Press Start to boot the console.');

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keysRef.current[event.code] = true;
      if (event.code === 'Space') setRunning(true);
    };
    const up = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let playerY = 150;
    let cpuY = 150;
    let ballX = 320;
    let ballY = 180;
    let vx = 4.2;
    let vy = 2.3;
    let player = 0;
    let cpu = 0;
    let active = false;

    const loop = () => {
      if (running) active = true;
      if (active) {
        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) playerY -= 5.5;
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) playerY += 5.5;
        playerY = Math.max(0, Math.min(300, playerY));
        const target = ballY - 30;
        cpuY += Math.max(-3.2, Math.min(3.2, target - cpuY));
        cpuY = Math.max(0, Math.min(300, cpuY));
        ballX += vx;
        ballY += vy;
        if (ballY < 0) {
          ballY = 0;
          vy = Math.abs(vy);
        }
        if (ballY > 360) {
          ballY = 360;
          vy = -Math.abs(vy);
        }
        if (ballX < 34 && ballY > playerY && ballY < playerY + 60) {
          ballX = 34;
          vx = Math.abs(vx) * 1.04;
          vy += (ballY - (playerY + 30)) * 0.08;
        }
        if (ballX > 606 && ballY > cpuY && ballY < cpuY + 60) {
          ballX = 606;
          vx = -Math.abs(vx) * 1.04;
          vy += (ballY - (cpuY + 30)) * 0.08;
        }
        if (ballX < -10) {
          cpu += 1;
          setCpuScore(cpu);
          ballX = 320;
          ballY = 180;
          vx = 4.2;
          vy = Math.random() > 0.5 ? 2.3 : -2.3;
          setMessage(cpu >= 7 ? 'CPU wins the set.' : 'CPU scores — reset.');
          if (cpu >= 7) active = false;
        }
        if (ballX > 650) {
          player += 1;
          setPlayerScore(player);
          ballX = 320;
          ballY = 180;
          vx = -4.2;
          vy = Math.random() > 0.5 ? 2.3 : -2.3;
          setMessage(player >= 7 ? 'You win the set!' : 'Point player one.');
          if (player >= 7) active = false;
        }
      }
      ctx.fillStyle = '#050b18';
      ctx.fillRect(0, 0, 640, 360);
      ctx.strokeStyle = 'rgba(34,211,238,.3)';
      ctx.setLineDash([10, 14]);
      ctx.beginPath();
      ctx.moveTo(320, 0);
      ctx.lineTo(320, 360);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(16, playerY, 18, 60);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(606, cpuY, 18, 60);
      ctx.beginPath();
      ctx.fillStyle = '#f8fafc';
      ctx.arc(ballX, ballY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(148,163,184,.9)';
      ctx.font = '700 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${player}   :   ${cpu}`, 320, 30);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const start = () => {
    setPlayerScore(0);
    setCpuScore(0);
    setRunning(true);
    setMessage('Pong booted — move with W/S or the arrow keys.');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-emerald-300/70">Player</div>
          <div className="font-display text-2xl font-bold text-emerald-200">{playerScore}</div>
        </div>
        <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-violet-300/70">CPU</div>
          <div className="font-display text-2xl font-bold text-violet-200">{cpuScore}</div>
        </div>
        <div className="rounded-xl border border-stone-700 bg-stone-950/40 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[.18em] text-stone-400">Console</div>
          <div className="text-sm font-semibold text-stone-200">Xbox · Pong</div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-black shadow-2xl">
        <canvas ref={canvasRef} width={640} height={360} className="block h-auto w-full" />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center">
            <Gamepad2 className="h-12 w-12 text-emerald-300" />
            <div className="font-display text-2xl font-bold text-white">Xbox Dashboard</div>
            <button
              type="button"
              onClick={start}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 font-bold text-stone-950 shadow-lg transition hover:bg-emerald-400"
            >
              <Play className="h-4 w-4" /> Start Pong
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-400">{message}</p>
        <div className="flex gap-2 sm:hidden">
          <button
            type="button"
            onPointerDown={() => { keysRef.current['KeyW'] = true; }}
            onPointerUp={() => { keysRef.current['KeyW'] = false; }}
            className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-2 text-sm font-bold text-white"
          >
            Up
          </button>
          <button
            type="button"
            onPointerDown={() => { keysRef.current['KeyS'] = true; }}
            onPointerUp={() => { keysRef.current['KeyS'] = false; }}
            className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-2 text-sm font-bold text-white"
          >
            Down
          </button>
        </div>
      </div>
    </div>
  );
}

export function MansionEntertainmentModal({
  initialStationId,
  onClose,
}: MansionEntertainmentModalProps) {
  const initialTab: GameTab = initialStationId.includes('pool_table')
    ? 'pool'
    : initialStationId.includes('arcade')
      ? 'arcade'
      : 'xbox';
  const [tab, setTab] = useState<GameTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const tabs: { id: GameTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pool', label: 'Pool Table', icon: <Trophy className="h-4 w-4" /> },
    { id: 'arcade', label: 'Arcade', icon: <Joystick className="h-4 w-4" /> },
    { id: 'xbox', label: 'Xbox', icon: <MonitorPlay className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-500/35 bg-stone-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-800 bg-gradient-to-r from-stone-900 via-stone-950 to-emerald-950/50 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.24em] text-amber-400/80">
              North Recreation Wing
            </div>
            <h2 className="font-display text-xl font-bold text-amber-100 sm:text-2xl">
              The Mansion Game Room
            </h2>
            <p className="mt-1 text-xs text-stone-400">
              A real pool table, four arcade cabinets, Xbox lounge and private cinema.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close game room"
            className="rounded-xl border border-stone-700 bg-stone-900 p-2 text-stone-400 transition hover:bg-stone-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2 border-b border-stone-800 bg-stone-950 px-4 py-3">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${
                tab === entry.id
                  ? 'border-amber-400 bg-amber-400 text-stone-950'
                  : 'border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800'
              }`}
            >
              {entry.icon} {entry.label}
            </button>
          ))}
        </div>
        <div className="survival-scroll overflow-y-auto p-4 sm:p-5">
          {tab === 'pool' && <PoolGame />}
          {tab === 'arcade' && <ArcadeGame />}
          {tab === 'xbox' && <XboxGame />}
        </div>
      </div>
    </div>
  );
}
