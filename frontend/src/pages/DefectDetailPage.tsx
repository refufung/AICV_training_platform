import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getDefect, updateDefect } from '../api/client';
import type { Defect, Severity, DefectStatus } from '../types';
import { GlowCard } from '../components/ui/GlowCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const selectCls =
  'w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors';

export default function DefectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [defect, setDefect] = useState<Defect | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getDefect(Number(id))
      .then(setDefect)
      .catch((e) => setError(e.message));
  }, [id]);

  const handleStatusChange = async (status: DefectStatus) => {
    if (!defect) return;
    const updated = await updateDefect(defect.id, { status });
    setDefect(updated);
  };

  const handleSeverityChange = async (severity: Severity) => {
    if (!defect) return;
    const updated = await updateDefect(defect.id, { severity });
    setDefect(updated);
  };

  if (error)
    return (
      <div className="p-6">
        <p className="text-red-400">{error}</p>
        <Link to="/defects" className="text-neon-cyan hover:underline text-sm">
          Back to list
        </Link>
      </div>
    );

  if (!defect)
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading...</p>
      </div>
    );

  return (
    <div className="p-6 max-w-4xl">
      <Link
        to="/defects"
        className="inline-flex items-center gap-1 text-neon-cyan hover:underline text-sm mb-4"
      >
        <ArrowLeft size={14} /> Back to list
      </Link>

      <SectionHeader title={`Defect #${defect.id}`} accent="purple">
        <StatusBadge type="severity" value={defect.severity} />
        <StatusBadge type="status" value={defect.status} />
      </SectionHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo */}
        <GlowCard glow="purple">
          <img
            src={defect.photo_url}
            alt="defect photo"
            className="w-full rounded-lg ring-1 ring-neon-purple/20"
          />
        </GlowCard>

        {/* Details */}
        <div className="space-y-4">
          <GlowCard glow="cyan">
            <div className="space-y-3">
              {[
                ['Class', defect.defect_class],
                ['Confidence', `${(defect.confidence * 100).toFixed(1)}%`],
                ['Floor', defect.floor],
                ['Component', defect.component_name || 'Not mapped'],
                ...(defect.gps_lat != null && defect.gps_lng != null
                  ? [['GPS', `${defect.gps_lat.toFixed(6)}, ${defect.gps_lng.toFixed(6)}`]]
                  : []),
                ['Created', new Date(defect.created_at).toLocaleString()],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="text-xs text-gray-500">{label}</span>
                  <p className="text-gray-200 font-medium text-sm">{val}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          {/* Status & Severity controls */}
          <GlowCard glow="green">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={defect.status}
                  onChange={(e) => handleStatusChange(e.target.value as DefectStatus)}
                  className={selectCls}
                >
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="repairing">Repairing</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Severity</label>
                <select
                  value={defect.severity}
                  onChange={(e) => handleSeverityChange(e.target.value as Severity)}
                  className={selectCls}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </GlowCard>

          {defect.notes && (
            <GlowCard glow="orange">
              <span className="text-xs text-gray-500">Notes</span>
              <p className="mt-1 text-sm text-gray-300">{defect.notes}</p>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  );
}
