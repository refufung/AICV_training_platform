import {
  Maximize,
  Box,
  Grid3x3,
  Scissors,
  Ruler,
  Eye,
  EyeOff,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Orbit,
  Layers,
} from 'lucide-react';
import { useState } from 'react';

interface ViewerToolbarProps {
  onFitView?: () => void;
  onToggleGrid?: () => void;
  onToggleWireframe?: () => void;
  onToggleOrtho?: () => void;
  onResetView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleSection?: () => void;
  onToggleMeasure?: () => void;
  onToggleFloorPlan?: () => void;
  gridVisible?: boolean;
  wireframeOn?: boolean;
  orthoOn?: boolean;
  sectionOn?: boolean;
  measureOn?: boolean;
  floorPlanOn?: boolean;
}

interface ToolButton {
  id: string;
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  action: () => void;
  active?: boolean;
  separator?: false;
}

interface ToolSeparator {
  separator: true;
  id: string;
}

type ToolItem = ToolButton | ToolSeparator;

export default function ViewerToolbar({
  onFitView,
  onToggleGrid,
  onToggleWireframe,
  onToggleOrtho,
  onResetView,
  onZoomIn,
  onZoomOut,
  onToggleSection,
  onToggleMeasure,
  onToggleFloorPlan,
  gridVisible = true,
  wireframeOn = false,
  orthoOn = false,
  sectionOn = false,
  measureOn = false,
  floorPlanOn = false,
}: ViewerToolbarProps) {
  const [tooltip, setTooltip] = useState('');

  const tools: ToolItem[] = [
    { id: 'orbit', icon: Orbit, label: 'Orbit', action: () => {}, active: true },
    { id: 'pan', icon: Move, label: 'Pan', action: () => {} },
    { separator: true, id: 'sep1' },
    { id: 'fit', icon: Maximize, label: 'Fit to View', action: () => onFitView?.() },
    { id: 'zoomin', icon: ZoomIn, label: 'Zoom In', action: () => onZoomIn?.() },
    { id: 'zoomout', icon: ZoomOut, label: 'Zoom Out', action: () => onZoomOut?.() },
    { separator: true, id: 'sep2' },
    { id: 'ortho', icon: Box, label: 'Orthographic', action: () => onToggleOrtho?.(), active: orthoOn },
    { id: 'grid', icon: Grid3x3, label: 'Toggle Grid', action: () => onToggleGrid?.(), active: gridVisible },
    {
      id: 'wireframe',
      icon: wireframeOn ? Eye : EyeOff,
      label: 'Wireframe',
      action: () => onToggleWireframe?.(),
      active: wireframeOn,
    },
    { separator: true, id: 'sep3' },
    { id: 'section', icon: Scissors, label: 'Section Plane', action: () => onToggleSection?.(), active: sectionOn },
    { id: 'measure', icon: Ruler, label: 'Measure', action: () => onToggleMeasure?.(), active: measureOn },
    { id: 'floorplan', icon: Layers, label: 'Floor Plan (樓層平面)', action: () => onToggleFloorPlan?.(), active: floorPlanOn },
    { separator: true, id: 'sep4' },
    { id: 'reset', icon: RotateCcw, label: 'Reset View', action: () => onResetView?.() },
  ];

  return (
    <div className="flex flex-col items-center bg-gray-900/95 border-r border-gray-700 py-2 px-1 gap-0.5">
      {tools.map((tool) =>
        tool.separator ? (
          <div key={tool.id} className="w-6 border-t border-gray-700 my-1" />
        ) : (
          <div key={tool.id} className="relative">
            <button
              onClick={tool.action}
              onMouseEnter={() => setTooltip(tool.id)}
              onMouseLeave={() => setTooltip('')}
              className={`p-1.5 rounded transition-colors ${
                tool.active
                  ? 'bg-blue-600/30 text-blue-400'
                  : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'
              }`}
              title={tool.label}
            >
              <tool.icon size={18} />
            </button>
            {tooltip === tool.id && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 shadow-lg border border-gray-700">
                {tool.label}
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}
