interface SectionHeaderProps {
  title: string;
  accent?: 'cyan' | 'purple' | 'green' | 'orange';
  children?: React.ReactNode;
}

const ACCENT_GRADIENT: Record<string, string> = {
  cyan: 'from-neon-cyan/80 to-transparent',
  purple: 'from-neon-purple/80 to-transparent',
  green: 'from-neon-green/80 to-transparent',
  orange: 'from-neon-orange/80 to-transparent',
};

export function SectionHeader({ title, accent = 'cyan', children }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        <div className={`h-0.5 w-16 mt-1 rounded bg-gradient-to-r ${ACCENT_GRADIENT[accent]}`} />
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
