"use client";

import { useMemo, useState } from "react";

interface SparklineProps {
  values: number[];
  height?: number;
}

/**
 * Lightweight inline-SVG line+area chart. No deps — we have one chart on
 * one page, and bringing in recharts/visx is overkill.
 */
export default function Sparkline({ values, height = 120 }: SparklineProps) {
  const width = 600; // viewBox width; SVG scales to container.
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  const { path, area, points, max, dayLabels } = useMemo(() => {
    const max = Math.max(1, ...values);
    const stepX = values.length > 1 ? width / (values.length - 1) : width;
    const points = values.map((v, i) => {
      const x = values.length > 1 ? i * stepX : width / 2;
      const y = height - (v / max) * (height - 12) - 6;
      return { x, y, v, i };
    });
    const path = points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");
    const area =
      points.length > 0
        ? `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
        : "";
    // Build day labels for the tooltip. Day 0 = (today - (n-1)) days.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayLabels = values.map((_, i) => {
      const d = new Date(
        today.getTime() - (values.length - 1 - i) * 86_400_000,
      );
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    });
    return { path, area, points, max, dayLabels };
  }, [values, height]);

  if (!values.length) {
    return (
      <div
        className="rounded-md border border-dashed bg-muted/30"
        style={{ height }}
      />
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block h-[120px] w-full"
        onMouseLeave={() => setHover(null)}
      >
        <path d={area} fill="currentColor" className="text-primary/15" />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-primary"
        />
        {points.map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={hover?.i === p.i ? 4 : 2}
            className="text-primary"
            fill="currentColor"
          />
        ))}
        {/* Invisible hit areas for hover tooltips. */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={Math.max(0, p.x - 10)}
            y={0}
            width={20}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover({ i, x: p.x, y: p.y })}
          />
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs shadow"
          style={{
            left: `${(hover.x / width) * 100}%`,
            top: `${(hover.y / height) * 100}%`,
          }}
        >
          <div className="font-medium">{values[hover.i]}</div>
          <div className="text-muted-foreground">{dayLabels[hover.i]}</div>
        </div>
      )}
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{dayLabels[0]}</span>
        <span>peak {max}</span>
        <span>{dayLabels[dayLabels.length - 1]}</span>
      </div>
    </div>
  );
}
