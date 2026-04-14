import { type LucideIcon } from 'lucide-react';
import { GLOW_MAP } from '../../theme/colors';

type GlowColor = 'cyan' | 'purple' | 'green' | 'orange' | 'red' | 'blue';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  glow?: GlowColor;
  sub?: string;
  pulse?: boolean;
}

export function StatCard({ icon: Icon, label, value, glow = 'cyan', sub, pulse }: StatCardProps) {
  return (
    <div
      className={`bg-surface-800 rounded-xl border p-4 flex items-start gap-3 transition-shadow ${GLOW_MAP[glow] || ''}`}
    >
      <div className={`p-2 rounded-lg bg-surface-700 ${pulse ? 'animate-pulse' : ''}`}>
        <Icon size={20} className="text-gray-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-100 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
