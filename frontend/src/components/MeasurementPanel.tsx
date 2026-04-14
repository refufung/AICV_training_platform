import { useState } from 'react';
import { Ruler, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export type MeasureMode = 'length' | 'area';
export type MeasureUnit = 'm' | 'cm' | 'mm' | 'ft';

export interface Measurement {
  id: string;
  points: { x: number; y: number; z: number }[];
  distance: number; // in meters
  mode: MeasureMode;
}

interface MeasurementPanelProps {
  active: boolean;
  measurements: Measurement[];
  mode: MeasureMode;
  unit: MeasureUnit;
  onToggleActive: () => void;
  onClearAll: () => void;
  onDeleteMeasurement: (id: string) => void;
  onModeChange: (mode: MeasureMode) => void;
  onUnitChange: (unit: MeasureUnit) => void;
}

const UNIT_FACTORS: Record<MeasureUnit, number> = {
  m: 1,
  cm: 100,
  mm: 1000,
  ft: 3.28084,
};

function formatDistance(meters: number, unit: MeasureUnit): string {
  const val = meters * UNIT_FACTORS[unit];
  return `${val.toFixed(2)} ${unit}`;
}

export default function MeasurementPanel({
  active,
  measurements,
  mode,
  unit,
  onToggleActive,
  onClearAll,
  onDeleteMeasurement,
  onModeChange,
  onUnitChange,
}: MeasurementPanelProps) {
  const [howToOpen, setHowToOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(true);

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col text-gray-200 overflow-y-auto">
      {/* Measurement header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Ruler size={16} className="text-blue-400" />
          <span className="font-semibold text-sm">Measurement</span>
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggleActive}
          className={`w-full py-2 rounded text-sm font-medium transition-colors ${
            active
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {active ? 'Disable Measurement' : 'Enable Measurement'}
        </button>

        {/* Delete all */}
        <button
          onClick={onClearAll}
          disabled={measurements.length === 0}
          className="w-full py-2 mt-2 rounded text-sm font-medium bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Trash2 size={14} />
          Delete All Measurements
        </button>
      </div>

      {/* Measurement Type */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => setTypeOpen(!typeOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800"
        >
          <span className="text-sm font-semibold text-blue-400">Measurement Type</span>
          {typeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {typeOpen && (
          <div className="px-4 pb-3 space-y-3">
            {/* Mode */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Mode</span>
              <select
                value={mode}
                onChange={(e) => onModeChange(e.target.value as MeasureMode)}
                className="bg-gray-800 text-xs text-gray-300 border border-gray-600 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
              >
                <option value="length">Length</option>
                <option value="area">Area</option>
              </select>
            </div>
            {/* Unit */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Unit</span>
              <select
                value={unit}
                onChange={(e) => onUnitChange(e.target.value as MeasureUnit)}
                className="bg-gray-800 text-xs text-gray-300 border border-gray-600 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
              >
                <option value="m">m</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="ft">ft</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Measurements list */}
      {measurements.length > 0 && (
        <div className="border-b border-gray-700">
          <div className="px-4 py-2.5">
            <span className="text-sm font-semibold text-blue-400">
              Results ({measurements.length})
            </span>
          </div>
          <div className="px-2 pb-2 space-y-1 max-h-48 overflow-y-auto">
            {measurements.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-2 py-1.5 bg-gray-800 rounded text-xs group"
              >
                <div>
                  <span className="text-gray-400">#{i + 1}</span>{' '}
                  <span className="text-gray-200 font-mono">
                    {formatDistance(m.distance, unit)}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteMeasurement(m.id)}
                  className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to measure */}
      <div>
        <button
          onClick={() => setHowToOpen(!howToOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800"
        >
          <span className="text-sm font-semibold text-blue-400">How to Measure</span>
          {howToOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {howToOpen && (
          <div className="px-4 pb-4 space-y-3 text-xs text-gray-400 leading-relaxed">
            <div>
              <div className="text-gray-300 font-medium mb-1">Create Measurement</div>
              <p>
                Enable measurement, then click on the model to set the start and end points.
              </p>
              <p className="mt-1">
                For area measurements, click multiple points and press <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> to complete.
              </p>
            </div>
            <div>
              <div className="text-gray-300 font-medium mb-1">Delete Measurement</div>
              <p>
                Hover over a measurement and press <kbd className="bg-gray-700 px-1 rounded">Delete</kbd> or <kbd className="bg-gray-700 px-1 rounded">Backspace</kbd> to remove the most recent measurement.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
