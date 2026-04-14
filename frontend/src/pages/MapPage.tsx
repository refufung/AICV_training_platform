import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDefects } from '../api/client';
import { Crosshair } from 'lucide-react';
import type { Defect } from '../types';

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

// Blue pulsing icon for user location
const userLocationIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 17, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
}

export default function MapPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  useEffect(() => {
    getDefects().then(setDefects).catch(() => {});
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setLocError(err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const geoDefects = defects.filter((d) => d.gps_lat != null && d.gps_lng != null);

  // Default center: first defect or Hong Kong
  const center: [number, number] =
    geoDefects.length > 0
      ? [geoDefects[0].gps_lat!, geoDefects[0].gps_lng!]
      : [22.3193, 114.1694];

  return (
    <div className="p-6 h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Defect Map</h1>
        <div className="flex items-center gap-2">
          {locError && <span className="text-red-500 text-sm">{locError}</span>}
          <button
            onClick={handleLocateMe}
            disabled={locating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <Crosshair size={16} className={locating ? 'animate-spin' : ''} />
            {locating ? 'Locating...' : 'My Location'}
          </button>
        </div>
      </div>
      <div className="h-[calc(100%-60px)] rounded-lg overflow-hidden shadow">
        <MapContainer center={center} zoom={17} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToLocation position={userPos} />
          {userPos && (
            <Marker position={userPos} icon={userLocationIcon}>
              <Popup>
                <div className="text-sm font-medium">You are here</div>
              </Popup>
            </Marker>
          )}
          {geoDefects.map((d) => (
            <CircleMarker
              key={d.id}
              center={[d.gps_lat!, d.gps_lng!]}
              radius={8}
              pathOptions={{
                color: SEVERITY_COLOR[d.severity] || '#94a3b8',
                fillColor: SEVERITY_COLOR[d.severity] || '#94a3b8',
                fillOpacity: 0.7,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>#{d.id}</strong> — {d.defect_class}
                  <br />
                  Severity: {d.severity} | Floor: {d.floor}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
