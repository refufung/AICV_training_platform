import { useState, useEffect } from 'react';
import { Scissors, X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { SectionPlaneInfo } from './BimViewer';

interface SectionPlaneControlProps {
  minY: number;
  maxY: number;
  onHeightChange: (y: number) => void;
  onClose: () => void;
  sectionPlanes?: SectionPlaneInfo[];
  onRemovePlane?: (id: string) => void;
  onClearPlanes?: () => void;
}

export default function SectionPlaneControl({
  minY,
  maxY,
  onHeightChange,
  onClose,
  sectionPlanes = [],
  onRemovePlane,
  onClearPlanes,
}: SectionPlaneControlProps) {
  const range = maxY - minY;
  const [value, setValue] = useState(maxY);

  useEffect(() => {
    setValue(maxY);
  }, [maxY]);

  const handleChange = (newVal: number) => {
    const clamped = Math.max(minY, Math.min(maxY, newVal));
    setValue(clamped);
    onHeightChange(clamped);
  };

  const step = range / 50;
  const pct = range > 0 ? ((value - minY) / range) * 100 : 100;

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
      {/* Panel */}
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-3 flex flex-col items-center gap-2 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-2 w-full">
          <Scissors size={14} className="text-blue-400" />
          <span className="text-xs text-gray-300 font-medium">Section</span>
          <button
            onClick={onClose}
            className="ml-auto text-gray-500 hover:text-white p-0.5 rounded hover:bg-white/10"
          >
            <X size={12} />
          </button>
        </div>

        {/* Up button */}
        <button
          onClick={() => handleChange(value + step)}
          className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10"
        >
          <ChevronUp size={16} />
        </button>

        {/* Vertical slider */}
        <div className="relative h-48 w-6 flex justify-center">
          {/* Track bg */}
          <div className="absolute inset-x-0 mx-auto w-1 h-full bg-gray-700 rounded-full" />
          {/* Fill */}
          <div
            className="absolute bottom-0 mx-auto w-1 bg-blue-500 rounded-full transition-all"
            style={{ height: `${pct}%` }}
          />
          {/* Slider input (rotated vertical) */}
          <input
            type="range"
            min={minY}
            max={maxY}
            step={step}
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="absolute w-48 h-6 opacity-0 cursor-pointer"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: 'center center',
              top: 'calc(50% - 12px)',
              left: 'calc(50% - 96px)',
            }}
          />
          {/* Thumb indicator */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-4 h-1.5 bg-blue-400 rounded-full border border-blue-300 shadow transition-all pointer-events-none"
            style={{ bottom: `calc(${pct}% - 3px)` }}
          />
        </div>

        {/* Down button */}
        <button
          onClick={() => handleChange(value - step)}
          className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10"
        >
          <ChevronDown size={16} />
        </button>

        {/* Height label */}
        <div className="text-[10px] text-gray-500 font-mono">
          {value.toFixed(1)}m
        </div>

        {/* Section planes list */}
        {sectionPlanes.length > 0 && (
          <div className="w-full border-t border-gray-700 pt-2 mt-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-medium">Surface Cuts</span>
              <button
                onClick={onClearPlanes}
                className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            </div>
            {sectionPlanes.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 text-[11px]">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                <span className="text-gray-300 flex-1 truncate">{p.label}</span>
                <button
                  onClick={() => onRemovePlane?.(p.id)}
                  className="text-gray-500 hover:text-red-400 p-0.5 shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hint */}
        <div className="text-[9px] text-gray-600 text-center mt-1 leading-tight">
          Double-click a surface to add a cut
        </div>
      </div>
    </div>
  );
}
