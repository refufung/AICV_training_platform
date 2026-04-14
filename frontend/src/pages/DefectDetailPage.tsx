import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDefect, updateDefect } from '../api/client';
import type { Defect, Severity, DefectStatus } from '../types';

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
        <p className="text-red-500">{error}</p>
        <Link to="/defects" className="text-blue-600 hover:underline text-sm">
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
      <Link to="/defects" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        &larr; Back to list
      </Link>
      <h1 className="text-2xl font-bold mb-4">Defect #{defect.id}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo */}
        <div className="bg-white rounded-lg shadow p-4">
          <img
            src={defect.photo_url}
            alt="defect photo"
            className="w-full rounded"
          />
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <div>
              <span className="text-sm text-gray-500">Class</span>
              <p className="font-medium">{defect.defect_class}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Confidence</span>
              <p className="font-medium">{(defect.confidence * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Floor</span>
              <p className="font-medium">{defect.floor}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Component</span>
              <p className="font-medium">{defect.component_name || 'Not mapped'}</p>
            </div>
            {defect.gps_lat != null && defect.gps_lng != null && (
              <div>
                <span className="text-sm text-gray-500">GPS</span>
                <p className="font-medium">
                  {defect.gps_lat.toFixed(6)}, {defect.gps_lng.toFixed(6)}
                </p>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-500">Created</span>
              <p className="font-medium">{new Date(defect.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Status & Severity controls */}
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Status</label>
              <select
                value={defect.status}
                onChange={(e) => handleStatusChange(e.target.value as DefectStatus)}
                className="border rounded px-3 py-1.5 text-sm w-full"
              >
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="repairing">Repairing</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Severity</label>
              <select
                value={defect.severity}
                onChange={(e) => handleSeverityChange(e.target.value as Severity)}
                className="border rounded px-3 py-1.5 text-sm w-full"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {defect.notes && (
            <div className="bg-white rounded-lg shadow p-4">
              <span className="text-sm text-gray-500">Notes</span>
              <p className="mt-1 text-sm">{defect.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
