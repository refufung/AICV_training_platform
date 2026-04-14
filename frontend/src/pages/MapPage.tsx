import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getDefects } from '../api/client';
import type { Defect } from '../types';

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export default function MapPage() {
  const [defects, setDefects] = useState<Defect[]>([]);

  useEffect(() => {
    getDefects().then(setDefects).catch(() => {});
  }, []);

  const geoDefects = defects.filter((d) => d.gps_lat != null && d.gps_lng != null);

  // Default center: first defect or Hong Kong
  const center: [number, number] =
    geoDefects.length > 0
      ? [geoDefects[0].gps_lat!, geoDefects[0].gps_lng!]
      : [22.3193, 114.1694];

  return (
    <div className="p-6 h-[calc(100vh-48px)]">
      <h1 className="text-2xl font-bold mb-4">Defect Map</h1>
      <div className="h-[calc(100%-60px)] rounded-lg overflow-hidden shadow">
        <MapContainer center={center} zoom={17} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
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
