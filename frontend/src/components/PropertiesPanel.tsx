import { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Download, Search } from 'lucide-react';
import type { SelectedElement, IfcPropertyGroup } from './BimViewer';

interface PropertiesPanelProps {
  element: SelectedElement | null;
  onClose: () => void;
}

function PropertyGroup({ group, search }: { group: IfcPropertyGroup; search: string }) {
  const [open, setOpen] = useState(true);

  const filtered = useMemo(() => {
    if (!search.trim()) return group.properties;
    const term = search.toLowerCase();
    return group.properties.filter(
      (p) =>
        p.key.toLowerCase().includes(term) ||
        p.value.toLowerCase().includes(term),
    );
  }, [group.properties, search]);

  if (filtered.length === 0 && search) return null;

  return (
    <div className="border-b border-gray-700/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-800/50 text-left"
      >
        {open ? (
          <ChevronDown size={12} className="shrink-0 text-gray-500" />
        ) : (
          <ChevronRight size={12} className="shrink-0 text-gray-500" />
        )}
        <span className="text-xs text-gray-300 font-medium">{group.name}</span>
        <span className="text-[10px] text-gray-500 ml-1">({group.properties.length})</span>
      </button>
      {open && (
        <div className="px-3 pb-2">
          {(search ? filtered : group.properties).map((p, i) => (
            <div
              key={`${p.key}-${i}`}
              className="flex items-start justify-between gap-2 py-0.5 text-xs hover:bg-gray-800/30 px-1 rounded"
            >
              <span className="text-gray-500 shrink-0 min-w-[80px] truncate" title={p.key}>
                {p.key}
              </span>
              <span className="text-gray-200 text-right break-all font-mono text-[11px]" title={p.value}>
                {p.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function exportToExcel(element: SelectedElement) {
  const rows: string[][] = [['Group', 'Property', 'Value']];
  for (const g of element.groups) {
    for (const p of g.properties) {
      rows.push([g.name, p.key, p.value]);
    }
  }
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${element.name || 'properties'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PropertiesPanel({ element, onClose }: PropertiesPanelProps) {
  const [search, setSearch] = useState('');

  if (!element) return null;

  const totalProps = element.groups.reduce((sum, g) => sum + g.properties.length, 0);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200 border-l border-gray-700 w-80">
      {/* Header with element name */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 font-mono">{totalProps}+</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>
        <div className="text-sm font-medium text-gray-200 truncate" title={element.name}>
          {element.name}
        </div>
      </div>

      {/* Export buttons */}
      <div className="px-3 py-2 border-b border-gray-700 space-y-1.5">
        <button
          onClick={() => exportToExcel(element)}
          className="w-full flex items-center justify-center gap-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Download size={13} />
          Download Excel
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-gray-700">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 text-xs text-gray-300 rounded pl-7 pr-2 py-1.5 placeholder-gray-500 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Property groups */}
      <div className="flex-1 overflow-y-auto">
        {element.groups.map((g) => (
          <PropertyGroup key={g.name} group={g} search={search} />
        ))}
      </div>
    </div>
  );
}
