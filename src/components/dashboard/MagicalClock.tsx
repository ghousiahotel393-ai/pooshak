import React, { useEffect, useState } from 'react';
import { formatAppTime } from '../../lib/dateUtils';
import { TYPOGRAPHY } from '../../shared/ui/typography';

export function MagicalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setTime(new Date());
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center p-2">
      {/* Digital Time — clean, professional */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <time 
          className={`${TYPOGRAPHY.money} text-2xl sm:text-3xl font-mono tabular-nums text-neutral-900 dark:text-white leading-none tracking-tighter`}
          dateTime={time.toISOString()}
        >
          {formatAppTime(time)}
        </time>
        <span className={`${TYPOGRAPHY.caption} text-neutral-500 dark:text-neutral-400 mt-1 tracking-wider uppercase`}>
          {time.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Simple analog indicators — thin, professional */}
      <svg viewBox="0 0 100 100" className="w-full h-full max-w-[220px] overflow-visible">
        <defs>
          <linearGradient id="handGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        {/* Dial background */}
        <circle cx="50" cy="50" r="48" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="48" fill="none" stroke="#0f172a" strokeWidth="0.5" strokeDasharray="1.5 5.5" />
        {/* Hour marks */}
        <g stroke="#94a3b8" strokeWidth="0.5">
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1={50 + 38 * Math.cos((i * 30 - 90) * Math.PI / 180)}
              y1={50 + 38 * Math.sin((i * 30 - 90) * Math.PI / 180)}
              x2={50 + 44 * Math.cos((i * 30 - 90) * Math.PI / 180)}
              y2={50 + 44 * Math.sin((i * 30 - 90) * Math.PI / 180)}
              strokeWidth="0.75"
            />
          ))}
        </g>
        {/* Hands */}
        <g transform="rotate(-90 50 50)">
          {/* Hour hand */}
          <line
            x1="50" y1="50"
            x2={50 + 22 * Math.cos((time.getHours() % 12 + time.getMinutes() / 60) * 30 * Math.PI / 180)}
            y2={50 + 22 * Math.sin((time.getHours() % 12 + time.getMinutes() / 60) * 30 * Math.PI / 180)}
            stroke="url(#handGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Minute hand */}
          <line
            x1="50" y1="50"
            x2={50 + 32 * Math.cos(time.getMinutes() * 6 * Math.PI / 180)}
            y2={50 + 32 * Math.sin(time.getMinutes() * 6 * Math.PI / 180)}
            stroke="#475569"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Second hand */}
          <line
            x1="50" y1="50"
            x2={50 + 36 * Math.cos((time.getSeconds() + time.getMilliseconds() / 1000) * 6 * Math.PI / 180)}
            y2={50 + 36 * Math.sin((time.getSeconds() + time.getMilliseconds() / 1000) * 6 * Math.PI / 180)}
            stroke="#ef4444"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
        {/* Center cap */}
        <circle cx="50" cy="50" r="3.5" fill="#1e293b" stroke="#0f172a" strokeWidth="0.5" />
      </svg>
    </div>
  );
}