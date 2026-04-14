import { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import { createDefect, locateComponent } from '../api/client';
import type { DefectClass, Severity, LocateResult } from '../types';

export default function CaptureDefect() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [defectClass, setDefectClass] = useState<DefectClass>('crack');
  const [floor, setFloor] = useState('1F');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locateResult, setLocateResult] = useState<LocateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSuccess(false);
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGps(coords);
        try {
          const result = await locateComponent(coords.lat, coords.lng, floor);
          setLocateResult(result);
        } catch {
          // non-critical
        }
      },
      (err) => setError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      await createDefect(
        {
          defect_class: defectClass,
          confidence: 0,
          bbox: '0,0,0,0',
          floor,
          severity,
          notes: notes || undefined,
          gps_lat: gps?.lat,
          gps_lng: gps?.lng,
        },
        file
      );
      setSuccess(true);
      setFile(null);
      setPreview(null);
      setNotes('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const defectClasses: DefectClass[] = [
    'crack', 'spallation', 'corrosion', 'efflorescence',
    'exposed_rebar', 'water_damage', 'mould', 'other',
  ];

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Capture Defect</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo capture */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-48 rounded" />
          ) : (
            <>
              <Camera size={40} className="text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">Tap to take or select photo</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {/* Defect class */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Defect Class
          </label>
          <select
            value={defectClass}
            onChange={(e) => setDefectClass(e.target.value as DefectClass)}
            className="w-full border rounded px-3 py-2"
          >
            {defectClasses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Floor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Floor
          </label>
          <input
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. 1F, B1, RF"
          />
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severity
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {locateResult?.component && (
            <p className="text-xs text-gray-500 mt-1">
              Nearest: <span className="font-medium">{locateResult.component.name}</span>
              {' '}({locateResult.component.type}) —{' '}
              {(locateResult.component.distance / 1000).toFixed(1)}m away
            </p>
          )}
        </div>

        {/* GPS */}
        <div>
          <button
            type="button"
            onClick={captureGps}
            className="text-sm text-blue-600 hover:underline"
          >
            {gps ? `GPS: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : 'Capture GPS Location'}
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">Defect uploaded successfully!</p>}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Submit Defect'}
        </button>
      </form>
    </div>
  );
}
