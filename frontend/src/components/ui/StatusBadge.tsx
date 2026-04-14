import { SEVERITY_CLASSES, STATUS_CLASSES } from '../../theme/colors';

interface StatusBadgeProps {
  type: 'severity' | 'status';
  value: string;
  className?: string;
}

export function StatusBadge({ type, value, className = '' }: StatusBadgeProps) {
  const map = type === 'severity' ? SEVERITY_CLASSES : STATUS_CLASSES;
  const cls = map[value] || 'bg-gray-700 text-gray-400 border-gray-600';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cls} ${className}`}
    >
      {value}
    </span>
  );
}
