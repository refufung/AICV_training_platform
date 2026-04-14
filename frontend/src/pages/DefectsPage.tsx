import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDefects, bulkUpdateDefects } from '../api/client';
import type { Defect, DefectClass, Severity, DefectStatus } from '../types';

const SEVERITY_COLORS: Record<Severity, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

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

  // Client-side text search
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
    'crack',
    'spallation',
    'corrosion',
    'efflorescence',
    'exposed_rebar',
    'water_damage',
    'mould',
    'other',
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Defect List</h1>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search defects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-56"
        />
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All classes</option>
          {defectClasses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as DefectStatus)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="reviewed">Reviewed</option>
              <option value="repairing">Repairing</option>
              <option value="fixed">Fixed</option>
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={bulkLoading}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkLoading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400">No defects found.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Floor</th>
                <th className="px-4 py-3">Component</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggleSelect(d.id)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Link to={`/defects/${d.id}`} className="text-blue-600 hover:underline">
                      #{d.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <img
                      src={d.photo_url}
                      alt="defect"
                      className="w-12 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="px-4 py-2">{d.defect_class}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[d.severity]}`}
                    >
                      {d.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2">{d.floor}</td>
                  <td className="px-4 py-2">{d.component_name || '-'}</td>
                  <td className="px-4 py-2 capitalize">{d.status}</td>
                  <td className="px-4 py-2">{(d.confidence * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
