'use client';

interface Props {
  score: number;
  label?: string;
  size?: number;
}

export default function ScoreGauge({ score, label = 'Score', size = 120 }: Props) {
  const pct   = Math.min(100, Math.max(0, score));
  const r     = (size / 2) * 0.75;
  const cx    = size / 2;
  const cy    = size / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;

  const color =
    pct >= 80 ? '#16a34a' :
    pct >= 60 ? '#ca8a04' :
    pct >= 40 ? '#ea580c' : '#dc2626';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.10} />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      {/* Text overlay */}
      <div className="absolute flex flex-col items-center" style={{ marginTop: -(size / 2 + 12) }}>
        <span className="font-bold text-gray-800" style={{ fontSize: size * 0.22 }}>
          {pct.toFixed(1)}
        </span>
        <span className="text-gray-500" style={{ fontSize: size * 0.10 }}>{label}</span>
      </div>
      {/* Label below (we need relative positioning) */}
      <div className="relative" style={{ marginTop: -(size + 8) }}>
        <div style={{ height: size }} className="flex flex-col items-center justify-center">
          <span className="font-bold text-gray-800" style={{ fontSize: size * 0.19 }}>
            {pct.toFixed(1)}
          </span>
          <span className="text-gray-400 text-xs">{label}</span>
        </div>
      </div>
    </div>
  );
}
