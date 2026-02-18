"use client";

export interface SessionSample {
  second: number;
  wpm: number;
  accuracy: number;
}

interface SessionGraphProps {
  samples: SessionSample[];
}

function toPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
}

export function SessionGraph({ samples }: SessionGraphProps) {
  if (!samples.length) return null;

  const width = 760;
  const height = 240;
  const paddingX = 44;
  const paddingY = 24;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const maxSecond = Math.max(1, samples[samples.length - 1]?.second ?? 1);
  const maxWpm = Math.max(20, ...samples.map((sample) => sample.wpm));

  const wpmPoints = samples.map((sample) => ({
    x: paddingX + (sample.second / maxSecond) * chartWidth,
    y: height - paddingY - (sample.wpm / maxWpm) * chartHeight,
  }));

  const accuracyPoints = samples.map((sample) => ({
    x: paddingX + (sample.second / maxSecond) * chartWidth,
    y: height - paddingY - (sample.accuracy / 100) * chartHeight,
  }));

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
        <span>Session graph</span>
        <span>
          0-{maxSecond}s · WPM max {maxWpm}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        role="img"
        aria-label="WPM and accuracy over time"
      >
        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          className="stroke-zinc-700"
          strokeWidth="1"
        />
        <line
          x1={paddingX}
          y1={paddingY}
          x2={paddingX}
          y2={height - paddingY}
          className="stroke-zinc-700"
          strokeWidth="1"
        />
        <path d={toPath(wpmPoints)} fill="none" className="stroke-cyan-400" strokeWidth="2.5" />
        <path
          d={toPath(accuracyPoints)}
          fill="none"
          className="stroke-emerald-400"
          strokeWidth="2.5"
        />
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          WPM
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Accuracy
        </span>
      </div>
    </div>
  );
}
