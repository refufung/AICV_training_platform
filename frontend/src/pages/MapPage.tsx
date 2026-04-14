import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDefects } from '../api/client';
import { Crosshair } from 'lucide-react';
import type { Defect } from '../types';
import { SEVERITY_HEX } from '../theme/colors';
import { SectionHeader } from '../components/ui/SectionHeader';

// Neon cyan pulsing icon for user location
const userLocationIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#06b6d4;border:3px solid #1e293b;border-radius:50%;box-shadow:0 0 10px rgba(6,182,212,0.6);"></div>',
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

  const center: [number, number] =
    geoDefects.length > 0
      ? [geoDefects[0].gps_lat!, geoDefects[0].gps_lng!]
      : [22.3193, 114.1694];

  return (
    <div className="p-6 h-[calc(100vh-48px)]">
      <SectionHeader title="Defect Map" accent="purple">
        <div className="flex items-center gap-2">
          {locError && <span className="text-red-400 text-xs">{locError}</span>}
          <button
            onClick={handleLocateMe}
            disabled={locating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-neon-cyan to-neon-blue text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Crosshair size={14} className={locating ? 'animate-spin' : ''} />
            {locating ? 'Locating...' : 'My Location'}
          </button>
        </div>
      </SectionHeader>

      <div className="h-[calc(100%-60px)] rounded-xl overflow-hidden border border-surface-600">
        <MapContainer center={center} zoom={17} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
                color: SEVERITY_HEX[d.severity] || '#64748b',
                fillColor: SEVERITY_HEX[d.severity] || '#64748b',
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
