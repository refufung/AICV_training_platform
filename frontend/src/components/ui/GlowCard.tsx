import { GLOW_MAP } from '../../theme/colors';

export type GlowColor = 'cyan' | 'purple' | 'green' | 'orange' | 'red' | 'blue';

interface GlowCardProps {
  glow?: GlowColor;
  className?: string;
  children: React.ReactNode;
}

export function GlowCard({ glow = 'cyan', className = '', children }: GlowCardProps) {
  return (
    <div
      className={`bg-surface-800 rounded-xl border p-4 transition-shadow ${GLOW_MAP[glow] || ''} ${className}`}
    >
      {children}
    </div>
  );
}
