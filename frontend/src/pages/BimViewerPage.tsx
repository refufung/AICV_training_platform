import { useEffect, useState, useRef, useCallback } from 'react';
import BimViewer, { type BimViewerHandle, type ModelInfo, type SelectedElement, type StoreyInfo } from '../components/BimViewer';
import ModelTree, { type TreeNode } from '../components/ModelTree';
import ViewerToolbar from '../components/ViewerToolbar';
import PropertiesPanel from '../components/PropertiesPanel';
import SectionPlaneControl from '../components/SectionPlaneControl';
import MeasurementPanel from '../components/MeasurementPanel';
import FloorPlanPanel from '../components/FloorPlanPanel';
import type { MeasureMode, MeasureUnit, Measurement } from '../components/MeasurementPanel';
import FloorPlan from '../components/FloorPlan';
import { useStore } from '../store';
import type { Component } from '../types';
import { getComponents } from '../api/client';
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Cuboid,
  Map as MapIcon,
} from 'lucide-react';

interface IfcFile {
  name: string;
  size_mb: number;
}

/** Build IFC spatial tree from flat component list */
function buildTree(components: Component[]): TreeNode[] {
  const storeys = new Map<string, Map<string, Component[]>>();

  for (const c of components) {
    const storey = c.storey || 'Unknown';
    if (!storeys.has(storey)) storeys.set(storey, new Map());
    const typeMap = storeys.get(storey)!;
    if (!typeMap.has(c.type)) typeMap.set(c.type, []);
    typeMap.get(c.type)!.push(c);
  }

  const storeyNodes: TreeNode[] = [];
  for (const [storey, typeMap] of storeys) {
    const typeNodes: TreeNode[] = [];
    for (const [type, comps] of typeMap) {
      const children: TreeNode[] = comps.map((c) => ({
        id: `comp-${c.id}`,
        label: c.name || `${c.type} #${c.id}`,
        type: c.type,
        componentId: c.id,
      }));
      typeNodes.push({
        id: `type-${storey}-${type}`,
        label: `${type} (${comps.length})`,
        type,
        children,
      });
    }
    storeyNodes.push({
      id: `storey-${storey}`,
      label: storey,
      type: 'IfcBuildingStorey',
      children: typeNodes,
    });
  }

  // Wrap in spatial hierarchy
  return [
    {
      id: 'project',
      label: 'IfcProject',
      type: 'IfcProject',
      children: [
        {
          id: 'site',
          label: 'IfcSite',
          type: 'IfcSite',
          children: [
            {
              id: 'building',
              label: 'IfcBuilding',
              type: 'IfcBuilding',
              children: storeyNodes,
            },
          ],
        },
      ],
    },
  ];
}

export default function BimViewerPage() {
  const { activeFloor, setActiveFloor, setSelectedComponent } = useStore();
  const viewerRef = useRef<BimViewerHandle>(null);

  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [selectedIfc, setSelectedIfc] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedComp, setSelectedComp] = useState<Component | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Toolbar state
  const [gridVisible, setGridVisible] = useState(true);
  const [wireframeOn, setWireframeOn] = useState(false);
  const [orthoOn, setOrthoOn] = useState(false);
  const [sectionOn, setSectionOn] = useState(false);
  const [measureOn, setMeasureOn] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [measureMode, setMeasureMode] = useState<MeasureMode>('length');
  const [measureUnit, setMeasureUnit] = useState<MeasureUnit>('m');
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [storeys, setStoreys] = useState<StoreyInfo[]>([]);
  const [floorPlanOn, setFloorPlanOn] = useState(false);
  const [activeStorey, setActiveStorey] = useState<string | null>(null);

  const floors = ['B1', '1F', '2F', '3F', '4F', '5F', 'RF'];

  // Fetch IFC file list
  useEffect(() => {
    fetch('/api/ifc/list')
      .then((r) => r.json())
      .then((files: IfcFile[]) => {
        setIfcFiles(files);
        if (files.length > 0) setSelectedIfc(files[0].name);
      })
      .catch(console.error);
  }, []);

  // Fetch components for tree
  useEffect(() => {
    getComponents()
      .then((comps) => {
        setComponents(comps);
        setTree(buildTree(comps));
      })
      .catch(() => {});
  }, []);

  const ifcUrl = selectedIfc
    ? `/api/ifc/download/${encodeURIComponent(selectedIfc)}`
    : undefined;

  const handleModelLoaded = useCallback((info: ModelInfo) => {
    setModelInfo(info);
  }, []);

  const handleStoreysLoaded = useCallback((s: StoreyInfo[]) => {
    setStoreys(s);
  }, []);

  const handleStoreyClick = useCallback((storey: StoreyInfo) => {
    if (activeStorey === storey.name) {
      // Deselect: exit floor plan view
      setActiveStorey(null);
      viewerRef.current?.exitFloorPlan();
      return;
    }
    setActiveStorey(storey.name);
    // Find the next storey elevation for top clip
    const idx = storeys.findIndex((s) => s.name === storey.name);
    const nextElev = idx < storeys.length - 1 ? storeys[idx + 1].elevation : storey.elevation + 4;
    viewerRef.current?.showFloorPlan(storey.elevation, nextElev);
  }, [activeStorey, storeys]);

  const handleTreeNodeClick = useCallback(
    (node: TreeNode) => {
      setSelectedNodeId(node.id);
      if (node.componentId) {
        const comp = components.find((c) => c.id === node.componentId);
        if (comp) {
          setSelectedComp(comp);
          setSelectedComponent(comp);
        }
      }
    },
    [components, setSelectedComponent],
  );

  const handleComponentClick = (comp: Component) => {
    setSelectedComp(comp);
    setSelectedComponent(comp);
  };

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-700 z-10">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>

          <h1 className="text-sm font-semibold text-gray-200">BIM Viewer</h1>

          {/* File selector */}
          {ifcFiles.length > 0 && viewMode === '3d' && (
            <select
              value={selectedIfc}
              onChange={(e) => setSelectedIfc(e.target.value)}
              className="text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1 max-w-[300px] truncate focus:border-blue-500 focus:outline-none"
            >
              {ifcFiles.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.size_mb} MB)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Element count badge */}
          {modelInfo && viewMode === '3d' && (
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
              {modelInfo.elementCount.toLocaleString()} elements
            </span>
          )}

          {/* View mode toggle */}
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
              viewMode === '3d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Cuboid size={14} />
            3D
          </button>
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
              viewMode === '2d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <MapIcon size={14} />
            2D
          </button>
        </div>
      </div>

      {/* 2D floor selector bar */}
      {viewMode === '2d' && (
        <div className="flex gap-1.5 px-3 py-1.5 bg-gray-900/80 border-b border-gray-700/50">
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFloor(f)}
              className={`px-3 py-0.5 text-xs rounded transition-colors ${
                activeFloor === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar (3D only) */}
        {viewMode === '3d' && (
          <ViewerToolbar
            gridVisible={gridVisible}
            wireframeOn={wireframeOn}
            orthoOn={orthoOn}
            sectionOn={sectionOn}
            onFitView={() => viewerRef.current?.fitView()}
            onZoomIn={() => viewerRef.current?.zoomIn()}
            onZoomOut={() => viewerRef.current?.zoomOut()}
            onResetView={() => viewerRef.current?.resetView()}
            onToggleGrid={() => {
              viewerRef.current?.toggleGrid();
              setGridVisible(!gridVisible);
            }}
            onToggleWireframe={() => setWireframeOn(!wireframeOn)}
            onToggleOrtho={() => setOrthoOn(!orthoOn)}
            onToggleSection={() => {
              const next = !sectionOn;
              setSectionOn(next);
              if (next) {
                viewerRef.current?.enableSectionPlane();
              } else {
                viewerRef.current?.disableSectionPlane();
              }
            }}
            onToggleMeasure={() => {
              const next = !measureOn;
              setMeasureOn(next);
              if (next) {
                viewerRef.current?.enableMeasure();
              } else {
                viewerRef.current?.disableMeasure();
              }
            }}
            measureOn={measureOn}
            floorPlanOn={floorPlanOn}
            onToggleFloorPlan={() => {
              const next = !floorPlanOn;
              setFloorPlanOn(next);
              if (!next) {
                // Exit floor plan when toggling off
                setActiveStorey(null);
                viewerRef.current?.exitFloorPlan();
              }
            }}
          />
        )}

        {/* Left sidebar (Model tree or Floor plan) */}
        {sidebarOpen && viewMode === '3d' && !floorPlanOn && (
          <div className="w-72 shrink-0 border-r border-gray-700 relative">
            <ModelTree
              modelName={modelInfo?.name || selectedIfc || 'No model loaded'}
              tree={tree}
              elementCount={modelInfo?.elementCount || components.length}
              onNodeClick={handleTreeNodeClick}
              selectedNodeId={selectedNodeId}
            />
            {/* Collapse handle */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-1/2 -right-3 z-20 bg-gray-800 border border-gray-600 rounded-full p-0.5 text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <ChevronLeft size={12} />
            </button>
          </div>
        )}

        {/* Floor plan panel (replaces model tree when active) */}
        {sidebarOpen && viewMode === '3d' && floorPlanOn && (
          <FloorPlanPanel
            storeys={storeys}
            activeStorey={activeStorey}
            onStoreyClick={handleStoreyClick}
            onCollapse={() => {
              setFloorPlanOn(false);
              setActiveStorey(null);
              viewerRef.current?.exitFloorPlan();
            }}
          />
        )}

        {/* Expand button when sidebar is closed */}
        {!sidebarOpen && viewMode === '3d' && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-12 top-1/2 z-20 bg-gray-800 border border-gray-600 rounded-full p-0.5 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <ChevronRight size={12} />
          </button>
        )}

        {/* Center viewport */}
        <div className="flex-1 relative">
          {viewMode === '3d' ? (
            <BimViewer
              ref={viewerRef}
              ifcUrl={ifcUrl}
              onComponentClick={(gid) => console.log('Clicked:', gid)}
              onModelLoaded={handleModelLoaded}
              onStoreysLoaded={handleStoreysLoaded}
              measureActive={measureOn}
              onMeasurement={(m) => {
                setMeasurements((prev) => [
                  ...prev,
                  { ...m, mode: measureMode },
                ]);
              }}
              onElementSelected={(el) => setSelectedElement(el)}
            />
          ) : (
            <FloorPlan floor={activeFloor} onComponentClick={handleComponentClick} />
          )}

          {/* Section plane slider overlay */}
          {sectionOn && modelInfo && viewMode === '3d' && (
            <SectionPlaneControl
              minY={modelInfo.minY}
              maxY={modelInfo.maxY}
              onHeightChange={(y) => viewerRef.current?.setSectionHeight(y)}
              onClose={() => {
                setSectionOn(false);
                viewerRef.current?.disableSectionPlane();
              }}
            />
          )}
        </div>

        {/* Right properties panel */}
        {selectedElement && (
          <PropertiesPanel
            element={selectedElement}
            onClose={() => setSelectedElement(null)}
          />
        )}

        {/* Right measurement panel */}
        {measureOn && viewMode === '3d' && (
          <MeasurementPanel
            active={measureOn}
            measurements={measurements}
            mode={measureMode}
            unit={measureUnit}
            onToggleActive={() => {
              const next = !measureOn;
              setMeasureOn(next);
              if (next) {
                viewerRef.current?.enableMeasure();
              } else {
                viewerRef.current?.disableMeasure();
              }
            }}
            onClearAll={() => {
              viewerRef.current?.clearMeasurements();
              setMeasurements([]);
            }}
            onDeleteMeasurement={(id) => {
              viewerRef.current?.deleteMeasurement(id);
              setMeasurements((prev) => prev.filter((m) => m.id !== id));
            }}
            onModeChange={setMeasureMode}
            onUnitChange={setMeasureUnit}
          />
        )}
      </div>
    </div>
  );
}
