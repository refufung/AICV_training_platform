import { useEffect, useState, useRef, useCallback } from 'react';
import { getComponents, getDefects } from '../api/client';
import type { Component, Defect } from '../types';

interface FloorPlanProps {
  floor: string;
  onComponentClick?: (comp: Component) => void;
}

export default function FloorPlan({ floor, onComponentClick }: FloorPlanProps) {
  const [components, setComponents] = useState<Component[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

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
    const count = defectMap.get(comp.id)?.length || 0;
    if (count === 0) return '#94a3b8';
    // Gradient: green(0) -> yellow(0.33) -> orange(0.66) -> red(1)
    const ratio = Math.min(count / maxCount, 1);
    if (ratio < 0.33) {
      const t = ratio / 0.33;
      return lerpColor('#22c55e', '#eab308', t);
    } else if (ratio < 0.66) {
      const t = (ratio - 0.33) / 0.33;
      return lerpColor('#eab308', '#f97316', t);
    } else {
      const t = (ratio - 0.66) / 0.34;
      return lerpColor('#f97316', '#ef4444', t);
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

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No components for floor {floor}
      </div>
    );
  }

  return (
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
      {components.map((c) => {
        const hasBbox = c.bbox_min_x != null && c.bbox_max_x != null;
        const rectW = hasBbox ? (c.bbox_max_x! - c.bbox_min_x!) : 1;
        const rectH = hasBbox ? (c.bbox_max_y! - c.bbox_min_y!) : 1;
        const rx = hasBbox ? c.bbox_min_x! : c.x - 0.5;
        const ry = hasBbox ? c.bbox_min_y! : c.y - 0.5;
        const compDefects = defectMap.get(c.id) || [];

        return (
          <g key={c.id} onClick={() => onComponentClick?.(c)} className="cursor-pointer">
            <rect
              x={rx}
              y={ry}
              width={Math.abs(rectW) || 1}
              height={Math.abs(rectH) || 1}
              fill={getColor(c)}
              stroke="#334155"
              strokeWidth={0.05}
              opacity={0.7}
            >
              <title>
                {c.name} ({c.type})
                {'\n'}Defects: {compDefects.length}
                {compDefects.length > 0 &&
                  '\n' + compDefects.map((d) => `#${d.id} ${d.defect_class} (${d.severity})`).join('\n')}
              </title>
            </rect>
          </g>
        );
      })}
    </svg>
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
