import { useState, useCallback, useEffect } from 'react';
import { Filter, X, RotateCcw, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import type { StoreyInfo, ColorFilter } from './BimViewer';

const COLOR_PRESETS = [
  '#22c55e', '#3b82f6', '#eab308', '#ef4444',
  '#a855f7', '#f97316', '#06b6d4', '#ec4899',
];

interface ViewFilter {
  id: string;
  type: 'class' | 'storey' | 'text';
  value: string;
  color: string;
  enabled: boolean;
}

interface FilterPanelProps {
  ifcClasses: string[];
  storeys: StoreyInfo[];
  onFiltersChange: (filters: ColorFilter[]) => void;
  onClose: () => void;
}

let filterId = 0;

export default function FilterPanel({ ifcClasses, storeys, onFiltersChange, onClose }: FilterPanelProps) {
  const [filters, setFilters] = useState<ViewFilter[]>([]);
  const [addType, setAddType] = useState<'class' | 'storey' | 'text'>('class');
  const [addValue, setAddValue] = useState('');
  const [addColor, setAddColor] = useState(COLOR_PRESETS[0]);

  const emitFilters = useCallback((fs: ViewFilter[]) => {
    const active = fs.filter(f => f.enabled).map(f => {
      const cf: ColorFilter = {
        type: f.type,
        value: f.value,
        color: parseInt(f.color.slice(1), 16),
      };
      if (f.type === 'storey') {
        const idx = storeys.findIndex(s => s.name === f.value);
        if (idx >= 0) {
          const bottom = storeys[idx].elevation;
          const top = idx < storeys.length - 1 ? storeys[idx + 1].elevation : bottom + 4;
          cf.elevationRange = [bottom, top];
        }
      }
      return cf;
    });
    onFiltersChange(active);
  }, [storeys, onFiltersChange]);

  const handleAdd = () => {
    if (!addValue.trim()) return;
    const newFilter: ViewFilter = {
      id: `filter-${++filterId}`,
      type: addType,
      value: addValue.trim(),
      color: addColor,
      enabled: true,
    };
    const next = [...filters, newFilter];
    setFilters(next);
    emitFilters(next);
    const nextColorIdx = (COLOR_PRESETS.indexOf(addColor) + 1) % COLOR_PRESETS.length;
    setAddColor(COLOR_PRESETS[nextColorIdx]);
    setAddValue('');
  };

  const handleToggle = (id: string) => {
    const next = filters.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f);
    setFilters(next);
    emitFilters(next);
  };

  const handleRemove = (id: string) => {
    const next = filters.filter(f => f.id !== id);
    setFilters(next);
    emitFilters(next);
  };

  const handleResetAll = () => {
    setFilters([]);
    onFiltersChange([]);
  };

  useEffect(() => {
    if (addType === 'class' && ifcClasses.length > 0) {
      setAddValue(ifcClasses[0]);
    } else if (addType === 'storey' && storeys.length > 0) {
      setAddValue(storeys[0].name);
    } else {
      setAddValue('');
    }
  }, [addType, ifcClasses, storeys]);

  const typeLabel = { class: 'Class', storey: 'Storey', text: 'Text' } as const;

  return (
    <div className="w-72 shrink-0 border-r border-gray-700 bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-blue-400" />
          <span className="text-sm font-semibold text-gray-200">Filters</span>
        </div>
        <div className="flex items-center gap-1">
          {filters.length > 0 && (
            <button
              onClick={handleResetAll}
              className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-white/10"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-white/10"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Add filter form */}
      <div className="px-3 py-2 border-b border-gray-700/50 space-y-2">
        <div className="flex gap-1.5">
          {(['class', 'storey', 'text'] as const).map(t => (
            <button
              key={t}
              onClick={() => setAddType(t)}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                addType === t
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              {typeLabel[t]}
            </button>
          ))}
        </div>

        {addType === 'class' && (
          <select
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            className="w-full text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
          >
            {ifcClasses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {addType === 'storey' && (
          <select
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            className="w-full text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
          >
            {storeys.map(s => (
              <option key={s.name} value={s.name}>{s.name} ({s.elevation.toFixed(1)}m)</option>
            ))}
          </select>
        )}

        {addType === 'text' && (
          <input
            type="text"
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder="Search Name, GlobalId, Tag…"
            className="w-full text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        )}

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              onClick={() => setAddColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                addColor === c ? 'border-white scale-110' : 'border-transparent hover:border-gray-500'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          onClick={handleAdd}
          disabled={!addValue.trim()}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 disabled:opacity-40 disabled:cursor-default transition-colors"
        >
          <Plus size={13} />
          Add Filter
        </button>
      </div>

      {/* Active filters */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filters.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">
            No filters active. Add a filter above to colorize elements.
          </p>
        )}
        {filters.map(f => (
          <div
            key={f.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${
              f.enabled
                ? 'bg-gray-800/80 border-gray-700'
                : 'bg-gray-900 border-gray-800 opacity-50'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: f.color }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">{typeLabel[f.type]}</span>
              <div className="text-xs text-gray-200 truncate">{f.value}</div>
            </div>
            <button
              onClick={() => handleToggle(f.id)}
              className="text-gray-400 hover:text-gray-200 shrink-0"
              title={f.enabled ? 'Disable' : 'Enable'}
            >
              {f.enabled ? <ToggleRight size={16} className="text-blue-400" /> : <ToggleLeft size={16} />}
            </button>
            <button
              onClick={() => handleRemove(f.id)}
              className="text-gray-500 hover:text-red-400 shrink-0"
              title="Remove"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      {filters.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-700 text-[11px] text-gray-500">
          {filters.filter(f => f.enabled).length} active filter{filters.filter(f => f.enabled).length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
