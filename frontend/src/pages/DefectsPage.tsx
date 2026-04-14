import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDefects, bulkUpdateDefects } from '../api/client';
import type { Defect, DefectClass, Severity, DefectStatus } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';

const filterCls =
  'bg-surface-800 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple/30 transition-colors';

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<DefectStatus>('reviewed');
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchDefects = () => {
    const params: Record<string, string> = {};
    if (filterClass) params.defect_class = filterClass;
    if (filterSeverity) params.severity = filterSeverity;
    setLoading(true);
    getDefects(params)
      .then(setDefects)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDefects();
  }, [filterClass, filterSeverity]);

  const filtered = search
    ? defects.filter((d) => {
        const q = search.toLowerCase();
        return (
          d.defect_class.includes(q) ||
          d.severity.includes(q) ||
          d.floor.toLowerCase().includes(q) ||
          (d.component_name || '').toLowerCase().includes(q) ||
          (d.notes || '').toLowerCase().includes(q) ||
          String(d.id).includes(q)
        );
      })
    : defects;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await bulkUpdateDefects([...selected], { status: bulkStatus });
      setSelected(new Set());
      fetchDefects();
    } catch {
      alert('Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const defectClasses: DefectClass[] = [
    'crack', 'spallation', 'corrosion', 'efflorescence',
    'exposed_rebar', 'water_damage', 'mould', 'other',
  ];

  return (
    <div className="p-6">
      <SectionHeader title="Defect List" accent="purple" />

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search defects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${filterCls} w-56`}
        />
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className={filterCls}>
          <option value="">All classes</option>
          {defectClasses.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className={filterCls}>
          <option value="">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-400">{selected.size} selected</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as DefectStatus)}
              className={filterCls}
            >
              <option value="reviewed">Reviewed</option>
              <option value="repairing">Repairing</option>
              <option value="fixed">Fixed</option>
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={bulkLoading}
              className="bg-gradient-to-r from-neon-purple to-neon-magenta text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {bulkLoading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No defects found.</p>
      ) : (
        <div className="bg-surface-800 rounded-xl border border-surface-600 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-900/60 text-left text-gray-400">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="accent-neon-purple"
                  />
                </th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Photo</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Floor</th>
                <th className="px-4 py-3 font-medium">Component</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-surface-700/50 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggleSelect(d.id)}
                      className="accent-neon-purple"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Link to={`/defects/${d.id}`} className="text-neon-cyan hover:underline">
                      #{d.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <img
                      src={d.photo_url}
                      alt="defect"
                      className="w-12 h-12 object-cover rounded-lg ring-1 ring-surface-600"
                    />
                  </td>
                  <td className="px-4 py-2 text-gray-300">{d.defect_class}</td>
                  <td className="px-4 py-2">
                    <StatusBadge type="severity" value={d.severity} />
                  </td>
                  <td className="px-4 py-2 text-gray-400">{d.floor}</td>
                  <td className="px-4 py-2 text-gray-400">{d.component_name || '-'}</td>
                  <td className="px-4 py-2">
                    <StatusBadge type="status" value={d.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-400">{(d.confidence * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
