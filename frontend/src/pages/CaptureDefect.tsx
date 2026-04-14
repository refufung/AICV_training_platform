import { useState, useRef } from 'react';
import { Camera, MapPin, CheckCircle2, Upload } from 'lucide-react';
import { createDefect, locateComponent } from '../api/client';
import type { DefectClass, Severity, LocateResult } from '../types';
import { GlowCard } from '../components/ui/GlowCard';
import { SectionHeader } from '../components/ui/SectionHeader';

const FLOORS = ['B2', 'B1', '1F', '2F', '3F', '4F', '5F', '6F', '7F', '8F', 'RF'];

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

  const inputCls =
    'w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-gray-200 focus:border-neon-orange focus:outline-none focus:ring-1 focus:ring-neon-orange/30 transition-colors';

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <SectionHeader title="Capture Defect" accent="orange" />

      {success && (
        <GlowCard glow="green">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-neon-green" size={24} />
            <div>
              <p className="text-gray-200 font-medium">Defect uploaded successfully!</p>
              <button
                onClick={() => setSuccess(false)}
                className="text-xs text-neon-cyan hover:underline mt-1"
              >
                Capture another
              </button>
            </div>
          </div>
        </GlowCard>
      )}

      <GlowCard glow="orange">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo capture */}
          <div
            onClick={() => fileRef.current?.click()}
            className="group relative border-2 border-dashed border-surface-600 rounded-xl p-6 flex flex-col items-center cursor-pointer hover:border-neon-orange/60 transition-colors"
          >
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="max-h-48 rounded-lg ring-2 ring-neon-orange/30"
              />
            ) : (
              <>
                <Camera size={36} className="text-gray-500 mb-2 group-hover:text-neon-orange transition-colors" />
                <p className="text-gray-500 text-sm group-hover:text-gray-400">
                  Tap to take or select photo
                </p>
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
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Defect Class
            </label>
            <select
              value={defectClass}
              onChange={(e) => setDefectClass(e.target.value as DefectClass)}
              className={inputCls}
            >
              {defectClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Floor */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Floor
            </label>
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className={inputCls}
            >
              {FLOORS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className={inputCls}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            {locateResult?.component && (
              <p className="text-xs text-gray-500 mt-1.5">
                Nearest: <span className="font-medium text-neon-cyan">{locateResult.component.name}</span>
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
              className="inline-flex items-center gap-1.5 text-sm text-neon-cyan hover:text-neon-cyan/80 transition-colors"
            >
              <MapPin size={14} />
              {gps ? `GPS: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : 'Capture GPS Location'}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
              rows={2}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-neon-orange to-neon-magenta text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Upload size={16} />
            {loading ? 'Uploading...' : 'Submit Defect'}
          </button>
        </form>
      </GlowCard>
    </div>
  );
}
