import { ChevronUp } from 'lucide-react';
import type { StoreyInfo } from './BimViewer';

interface FloorPlanPanelProps {
  storeys: StoreyInfo[];
  activeStorey: string | null;
  onStoreyClick: (storey: StoreyInfo) => void;
  onCollapse: () => void;
}

export default function FloorPlanPanel({
  storeys,
  activeStorey,
  onStoreyClick,
  onCollapse,
}: FloorPlanPanelProps) {
  return (
    <div className="flex flex-col h-full bg-surface-900 text-gray-200 border-r border-surface-700 w-72 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-700">
        <span className="font-semibold text-sm">樓層平面</span>
        <button
          onClick={onCollapse}
          className="text-gray-400 hover:text-cyan-400 p-0.5 rounded hover:bg-white/10 transition-colors"
          title="Collapse"
        >
          <ChevronUp size={16} />
        </button>
      </div>

      {/* Description */}
      <div className="px-3 py-2 border-b border-surface-700/50">
        <p className="text-xs text-gray-500 leading-relaxed">
          點擊樓層平面可跳轉到對應樓層。視圖將被裁切，僅顯示該樓層。
        </p>
      </div>

      {/* Storey list */}
      <div className="flex-1 overflow-y-auto">
        {storeys.map((s) => {
          const isActive = activeStorey === s.name;
          return (
            <button
              key={s.name}
              onClick={() => onStoreyClick(s)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-surface-800/50 transition-colors ${
                isActive
                  ? 'bg-neon-cyan/10 text-cyan-400 border-l-2 border-l-neon-cyan'
                  : 'text-gray-300 hover:bg-surface-800/60'
              }`}
            >
              {s.name}
              {!s.name.includes('(') && (
                <span className="text-gray-500 ml-1">
                  ({s.elevation.toFixed(2)}m)
                </span>
              )}
            </button>
          );
        })}
        {storeys.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-500">
            No storeys detected in this model.
          </div>
        )}
      </div>
    </div>
  );
}
