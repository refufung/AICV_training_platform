import { useEffect, useState } from 'react';
import BimViewer from '../components/BimViewer';
import FloorPlan from '../components/FloorPlan';
import { useStore } from '../store';
import type { Component } from '../types';

interface IfcFile {
  name: string;
  size_mb: number;
}

export default function BimViewerPage() {
  const { activeFloor, setActiveFloor, setSelectedComponent } = useStore();
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [selectedIfc, setSelectedIfc] = useState('');
  const floors = ['B1', '1F', '2F', '3F', '4F', '5F', 'RF'];

  useEffect(() => {
    fetch('/api/ifc/list')
      .then((r) => r.json())
      .then((files: IfcFile[]) => {
        setIfcFiles(files);
        if (files.length > 0) setSelectedIfc(files[0].name);
      })
      .catch(console.error);
  }, []);

  const ifcUrl = selectedIfc ? `/api/ifc/download/${encodeURIComponent(selectedIfc)}` : undefined;

  const handleComponentClick = (comp: Component) => {
    setSelectedComponent(comp);
  };

  return (
    <div className="p-6 h-[calc(100vh-0px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">BIM Viewer</h1>
        <div className="flex items-center gap-3">
          {ifcFiles.length > 0 && viewMode === '3d' && (
            <select
              value={selectedIfc}
              onChange={(e) => setSelectedIfc(e.target.value)}
              className="text-sm border rounded px-2 py-1 max-w-[280px] truncate"
            >
              {ifcFiles.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.size_mb} MB)
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1 text-sm rounded ${viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            3D Model
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1 text-sm rounded ${viewMode === '2d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Floor Plan
          </button>
        </div>
      </div>

      {viewMode === '2d' && (
        <div className="flex gap-2 mb-3">
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFloor(f)}
              className={`px-3 py-1 text-xs rounded ${
                activeFloor === f ? 'bg-gray-900 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        {viewMode === '3d' ? (
          <BimViewer ifcUrl={ifcUrl} onComponentClick={(gid) => console.log('Clicked:', gid)} />
        ) : (
          <FloorPlan floor={activeFloor} onComponentClick={handleComponentClick} />
        )}
      </div>
    </div>
  );
}
