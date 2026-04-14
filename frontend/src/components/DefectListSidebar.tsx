import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, X, ExternalLink } from 'lucide-react';
import type { Defect } from '../types';

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const SEVERITY_TEXT: Record<string, string> = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-600/20 text-blue-400',
  reviewed: 'bg-purple-600/20 text-purple-400',
  repairing: 'bg-yellow-600/20 text-yellow-400',
  fixed: 'bg-green-600/20 text-green-400',
};

interface DefectListSidebarProps {
  defects: Defect[];
  componentName: string | null;
  onClose: () => void;
  onDefectClick?: (defect: Defect) => void;
}

function DefectCard({ defect, onClick }: { defect: Defect; onClick?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors"
    >
      <div
        className="flex items-start gap-2 p-2.5 cursor-pointer"
        onClick={() => {
          setExpanded(!expanded);
          onClick?.();
        }}
      >
        {/* Severity dot */}
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${SEVERITY_COLORS[defect.severity]}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-gray-200 truncate">
              #{defect.id} — {defect.defect_class}
            </span>
            {expanded ? <ChevronDown size={12} className="text-gray-500 shrink-0" /> : <ChevronRight size={12} className="text-gray-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-medium uppercase ${SEVERITY_TEXT[defect.severity]}`}>
              {defect.severity}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_BADGE[defect.status]}`}>
              {defect.status}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-gray-700/50 pt-2">
          {defect.photo_url && (
            <img
              src={defect.photo_url}
              alt="defect"
              className="w-full h-24 object-cover rounded"
            />
          )}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <div>
              <span className="text-gray-500">Confidence</span>
              <p className="text-gray-300">{(defect.confidence * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-gray-500">Floor</span>
              <p className="text-gray-300">{defect.floor}</p>
            </div>
            <div>
              <span className="text-gray-500">Created</span>
              <p className="text-gray-300">{new Date(defect.created_at).toLocaleDateString()}</p>
            </div>
            {defect.notes && (
              <div className="col-span-2">
                <span className="text-gray-500">Notes</span>
                <p className="text-gray-300 line-clamp-2">{defect.notes}</p>
              </div>
            )}
          </div>
          <Link
            to={`/defects/${defect.id}`}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-1"
          >
            <ExternalLink size={10} />
            View full details
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DefectListSidebar({
  defects,
  componentName,
  onClose,
  onDefectClick,
}: DefectListSidebarProps) {
  const severityCounts = defects.reduce((acc, d) => {
    acc[d.severity] = (acc[d.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-72 shrink-0 bg-gray-900 border-l border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-400" />
          <span className="text-sm font-semibold text-gray-200">Defects</span>
          <span className="text-xs bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded-full">
            {defects.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Component name */}
      {componentName && (
        <div className="px-3 py-1.5 border-b border-gray-700/50">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Component</span>
          <p className="text-xs text-gray-300 truncate">{componentName}</p>
        </div>
      )}

      {/* Severity summary */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-700/50">
        {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
          const count = severityCounts[sev] || 0;
          if (count === 0) return null;
          return (
            <div key={sev} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[sev]}`} />
              <span className={`text-[10px] ${SEVERITY_TEXT[sev]}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Defect list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        {defects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <AlertTriangle size={24} className="mb-2 opacity-50" />
            <span className="text-xs">No defects found</span>
          </div>
        ) : (
          defects.map((d) => (
            <DefectCard
              key={d.id}
              defect={d}
              onClick={() => onDefectClick?.(d)}
            />
          ))
        )}
      </div>
    </div>
  );
}
