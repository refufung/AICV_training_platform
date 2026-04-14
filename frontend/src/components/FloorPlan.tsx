import { useEffect, useState, useRef, useCallback } from 'react';
import { getComponents, getDefects } from '../api/client';
import type { Component, Defect } from '../types';
import { SEVERITY_HEX } from '../theme/colors';

interface FloorPlanProps {
  floor: string;
  onComponentClick?: (comp: Component) => void;
}

/* ── Heat-map gradient stops ── */
const HEAT_STEPS = [
  { label: '0', color: '#334155' },
  { label: '', color: '#22c55e' },
  { label: '', color: '#eab308' },
  { label: '', color: '#f97316' },
  { label: 'max', color: '#ef4444' },
];

export default function FloorPlan({ floor, onComponentClick }: FloorPlanProps) {
  const [components, setComponents] = useState<Component[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [heatmapOn, setHeatmapOn] = useState(true);
  const [hoveredComp, setHoveredComp] = useState<Component | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    getComponents({ storey: floor }).then(setComponents).catch(() => {});
    getDefects({ floor }).then(setDefects).catch(() => {});
  }, [floor]);

  // Compute initial viewBox when components change
  useEffect(() => {
    if (components.length === 0) return;
    const xs = components.map((c) => c.x);
    const ys = components.map((c) => c.y);
    const minX = Math.min(...xs) - 2;
    const minY = Math.min(...ys) - 2;
    const maxX = Math.max(...xs) + 2;
    const maxY = Math.max(...ys) + 2;
    setViewBox({ x: minX, y: minY, w: maxX - minX || 100, h: maxY - minY || 100 });
  }, [components]);

  // Build defect map: component_id -> list of defects
  const defectMap = new Map<number, Defect[]>();
  for (const d of defects) {
    if (d.component_id) {
      const list = defectMap.get(d.component_id) || [];
      list.push(d);
      defectMap.set(d.component_id, list);
    }
  }

  const maxCount = Math.max(1, ...Array.from(defectMap.values()).map((v) => v.length));

  const getColor = (comp: Component): string => {
    if (!heatmapOn) return '#475569'; // neutral slate when off
    const count = defectMap.get(comp.id)?.length || 0;
    if (count === 0) return '#334155';
    const ratio = Math.min(count / maxCount, 1);
    if (ratio < 0.33) {
      return lerpColor('#22c55e', '#eab308', ratio / 0.33);
    } else if (ratio < 0.66) {
      return lerpColor('#eab308', '#f97316', (ratio - 0.33) / 0.33);
    } else {
      return lerpColor('#f97316', '#ef4444', (ratio - 0.66) / 0.34);
    }
  };

  // Zoom via scroll
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      setViewBox((vb) => {
        const newW = vb.w * factor;
        const newH = vb.h * factor;
        return {
          x: vb.x + (vb.w - newW) / 2,
          y: vb.y + (vb.h - newH) / 2,
          w: newW,
          h: newH,
        };
      });
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - panStart.current.x) / rect.width) * viewBox.w;
    const dy = ((e.clientY - panStart.current.y) / rect.height) * viewBox.h;
    panStart.current = { x: e.clientX, y: e.clientY };
    setViewBox((vb) => ({ ...vb, x: vb.x - dx, y: vb.y + dy })); // +dy because scaleY(-1)
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleCompEnter = (comp: Component, e: React.MouseEvent) => {
    setHoveredComp(comp);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleCompMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleCompLeave = () => {
    setHoveredComp(null);
  };

  const handleCompClick = (comp: Component) => {
    setSelectedId(comp.id === selectedId ? null : comp.id);
    onComponentClick?.(comp);
  };

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No components for floor {floor}
      </div>
    );
  }

  const hoveredDefects = hoveredComp ? defectMap.get(hoveredComp.id) || [] : [];

  return (
    <div className="relative w-full h-full bg-surface-950">
      {/* ── Top controls bar ── */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setHeatmapOn(!heatmapOn)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
            heatmapOn
              ? 'bg-neon-orange/15 text-orange-400 border-neon-orange/40 shadow-glow-orange'
              : 'bg-surface-800 text-gray-400 border-surface-600 hover:border-surface-500'
          }`}
        >
          {heatmapOn ? '🔥 Heat Map ON' : 'Heat Map OFF'}
        </button>
        <span className="text-[10px] text-gray-500">
          {components.length} components · {defects.length} defects
        </span>
      </div>

      {/* ── Heat map legend ── */}
      {heatmapOn && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-surface-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-surface-600">
          <span className="text-[10px] text-gray-500 mr-1">Defects</span>
          {HEAT_STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className="w-5 h-2.5 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              {s.label && (
                <span className="text-[9px] text-gray-500">{s.label}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Severity legend ── */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 bg-surface-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-surface-600">
        {Object.entries(SEVERITY_HEX).map(([sev, hex]) => (
          <div key={sev} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
            <span className="text-[10px] text-gray-400 capitalize">{sev}</span>
          </div>
        ))}
      </div>

      {/* ── SVG Floor Plan ── */}
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full"
        style={{ transform: 'scaleY(-1)', cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="fp-grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#1e293b" strokeWidth="0.03" />
          </pattern>
        </defs>
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w}
          height={viewBox.h}
          fill="url(#fp-grid)"
        />

        {components.map((c) => {
          const hasBbox = c.bbox_min_x != null && c.bbox_max_x != null;
          const rectW = hasBbox ? (c.bbox_max_x! - c.bbox_min_x!) : 1;
          const rectH = hasBbox ? (c.bbox_max_y! - c.bbox_min_y!) : 1;
          const rx = hasBbox ? c.bbox_min_x! : c.x - 0.5;
          const ry = hasBbox ? c.bbox_min_y! : c.y - 0.5;
          const isSelected = c.id === selectedId;
          const compDefects = defectMap.get(c.id) || [];
          const fillColor = getColor(c);

          return (
            <g
              key={c.id}
              onClick={() => handleCompClick(c)}
              onMouseEnter={(e) => handleCompEnter(c, e)}
              onMouseMove={handleCompMove}
              onMouseLeave={handleCompLeave}
              className="cursor-pointer"
            >
              {/* Glow ring for selected */}
              {isSelected && (
                <rect
                  x={rx - 0.15}
                  y={ry - 0.15}
                  width={Math.abs(rectW) + 0.3 || 1.3}
                  height={Math.abs(rectH) + 0.3 || 1.3}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={0.12}
                  opacity={0.8}
                  rx={0.08}
                />
              )}
              <rect
                x={rx}
                y={ry}
                width={Math.abs(rectW) || 1}
                height={Math.abs(rectH) || 1}
                fill={fillColor}
                stroke={isSelected ? '#06b6d4' : '#1e293b'}
                strokeWidth={isSelected ? 0.08 : 0.04}
                opacity={0.75}
                rx={0.05}
              />
              {/* Defect count badge */}
              {heatmapOn && compDefects.length > 0 && Math.abs(rectW) > 0.6 && (
                <g style={{ transform: 'scaleY(-1)' }} transform={`translate(${rx + Math.abs(rectW) / 2}, ${-(ry + Math.abs(rectH) / 2)})`}>
                  <circle r={0.3} fill="#0f172a" opacity={0.85} />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#f87171"
                    fontSize={0.35}
                    fontWeight="bold"
                  >
                    {compDefects.length}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* ── Rich tooltip ── */}
      {hoveredComp && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
        >
          <div className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 shadow-xl min-w-[180px] max-w-[260px]">
            <p className="text-xs font-semibold text-gray-200 truncate">
              {hoveredComp.name}
            </p>
            <p className="text-[10px] text-gray-500 mb-1.5">{hoveredComp.type}</p>

            {hoveredDefects.length === 0 ? (
              <p className="text-[10px] text-gray-500">No defects</p>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 font-medium">
                  {hoveredDefects.length} defect{hoveredDefects.length > 1 ? 's' : ''}:
                </p>
                {hoveredDefects.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: SEVERITY_HEX[d.severity] || '#64748b' }}
                    />
                    <span className="text-gray-300">#{d.id}</span>
                    <span className="text-gray-400">{d.defect_class}</span>
                    <span className="text-gray-500 capitalize">{d.severity}</span>
                  </div>
                ))}
                {hoveredDefects.length > 5 && (
                  <p className="text-[9px] text-gray-500">
                    +{hoveredDefects.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const ca = parse(a);
  const cb = parse(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
