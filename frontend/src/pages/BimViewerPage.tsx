import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import BimViewer, { type BimViewerHandle, type ModelInfo, type SelectedElement, type StoreyInfo, type DefectMarker, type ContextMenuInfo, type ColorFilter, type SectionPlaneInfo } from '../components/BimViewer';
import ModelTree, { type TreeNode } from '../components/ModelTree';
import ContextMenu from '../components/ContextMenu';
import FilterPanel from '../components/FilterPanel';
import BcfTopicsPanel from '../components/BcfTopicsPanel';
import BcfTopicForm from '../components/BcfTopicForm';
import ViewerToolbar from '../components/ViewerToolbar';
import PropertiesPanel from '../components/PropertiesPanel';
import SectionPlaneControl from '../components/SectionPlaneControl';
import MeasurementPanel from '../components/MeasurementPanel';
import FloorPlanPanel from '../components/FloorPlanPanel';
import DefectListSidebar from '../components/DefectListSidebar';
import type { MeasureMode, MeasureUnit, Measurement } from '../components/MeasurementPanel';
import FloorPlan from '../components/FloorPlan';
import { useStore } from '../store';
import type { Component, Defect, BcfTopic, BcfTopicCreate } from '../types';
import { getComponents, getDefects, getComponentDefects, getBcfTopics, createBcfTopic, deleteBcfTopic, exportBcfTopics, importBcfTopics } from '../api/client';
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Cuboid,
  Map as MapIcon,
  AlertTriangle,
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
  const [allDefects, setAllDefects] = useState<Defect[]>([]);
  const [componentDefects, setComponentDefects] = useState<Defect[]>([]);
  const [showDefectSidebar, setShowDefectSidebar] = useState(false);
  const [defectOverlayOn, setDefectOverlayOn] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuInfo | null>(null);
  const [hasHiddenElements, setHasHiddenElements] = useState(false);
  const [filterOn, setFilterOn] = useState(false);
  const [sectionPlanes, setSectionPlanes] = useState<SectionPlaneInfo[]>([]);
  const [bcfPanelOn, setBcfPanelOn] = useState(false);
  const [bcfTopics, setBcfTopics] = useState<BcfTopic[]>([]);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicViewpoint, setTopicViewpoint] = useState<string | null>(null);
  const [topicElementName, setTopicElementName] = useState<string | null>(null);

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

  // Fetch all defects for overlay markers
  useEffect(() => {
    getDefects()
      .then(setAllDefects)
      .catch(() => {});
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

  // Compute defect markers for the 3D viewer
  const defectMarkers: DefectMarker[] = useMemo(() => {
    if (!defectOverlayOn) return [];
    return allDefects
      .filter((d) => d.component_id != null)
      .map((d) => {
        // Find the component to get its 3D position
        const comp = components.find((c) => c.id === d.component_id);
        if (!comp) return null;
        return {
          id: d.id,
          x: comp.x,
          y: comp.y,
          z: comp.z,
          severity: d.severity,
          label: `#${d.id} ${d.defect_class}`,
        };
      })
      .filter((m): m is DefectMarker => m !== null);
  }, [allDefects, components, defectOverlayOn]);

  // Compute defect counts per componentId for model tree badges
  const defectCountsMap = useMemo(() => {
    const severityRank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    const map = new Map<number, { count: number; maxSeverity: string }>();
    for (const d of allDefects) {
      if (!d.component_id) continue;
      const existing = map.get(d.component_id);
      if (existing) {
        existing.count++;
        if ((severityRank[d.severity] ?? 0) > (severityRank[existing.maxSeverity] ?? 0)) {
          existing.maxSeverity = d.severity;
        }
      } else {
        map.set(d.component_id, { count: 1, maxSeverity: d.severity });
      }
    }
    return map;
  }, [allDefects]);

  // Color BIM elements by severity when overlay is on
  useEffect(() => {
    if (!viewerRef.current || components.length === 0) return;
    if (defectOverlayOn && allDefects.length > 0) {
      // Build severity map: component globalId/name → worst severity
      const severityRank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      const map = new Map<string, string>();
      for (const d of allDefects) {
        if (!d.component_id) continue;
        const comp = components.find((c) => c.id === d.component_id);
        if (!comp) continue;
        const existing = map.get(comp.global_id);
        if (!existing || (severityRank[d.severity] ?? 0) > (severityRank[existing] ?? 0)) {
          map.set(comp.global_id, d.severity);
        }
      }
      viewerRef.current.colorByDefects(map);
    } else {
      viewerRef.current.clearDefectColors();
    }
  }, [defectOverlayOn, allDefects, components]);

  // Handle defect marker click in 3D viewer
  const handleDefectMarkerClick = useCallback((defectId: number) => {
    const defect = allDefects.find((d) => d.id === defectId);
    if (defect && defect.component_id) {
      getComponentDefects(defect.component_id)
        .then((defs) => {
          setComponentDefects(defs);
          setShowDefectSidebar(true);
        })
        .catch(() => {});
    }
  }, [allDefects]);

  // When an element is selected, fetch its defects
  const handleElementSelected = useCallback((el: SelectedElement | null) => {
    setSelectedElement(el);
    if (el) {
      // Try to find a matching component by name/globalId
      const comp = components.find(
        (c) => c.global_id === el.globalId || c.name === el.name
      );
      if (comp && comp.defect_count && comp.defect_count > 0) {
        getComponentDefects(comp.id)
          .then((defs) => {
            setComponentDefects(defs);
            setShowDefectSidebar(true);
          })
          .catch(() => {});
      } else {
        setComponentDefects([]);
        setShowDefectSidebar(false);
      }
    } else {
      setComponentDefects([]);
      setShowDefectSidebar(false);
    }
  }, [components]);

  const handleCtxMenu = useCallback((info: ContextMenuInfo) => {
    setCtxMenu(info);
  }, []);

  const ifcClasses = useMemo(() => {
    return [...new Set(components.map(c => c.type))].sort();
  }, [components]);

  const handleFiltersChange = useCallback((filters: ColorFilter[]) => {
    if (filters.length > 0) {
      viewerRef.current?.applyColorFilters(filters);
    } else {
      viewerRef.current?.resetColorFilters();
    }
  }, []);

  // Fetch BCF topics
  const refreshBcfTopics = useCallback(() => {
    getBcfTopics().then(setBcfTopics).catch(() => {});
  }, []);

  useEffect(() => {
    refreshBcfTopics();
  }, [refreshBcfTopics]);

  const handleCreateTopic = useCallback(async (data: BcfTopicCreate) => {
    await createBcfTopic(data);
    setShowTopicForm(false);
    setTopicViewpoint(null);
    setTopicElementName(null);
    refreshBcfTopics();
  }, [refreshBcfTopics]);

  const handleDeleteTopic = useCallback(async (topicId: number) => {
    await deleteBcfTopic(topicId);
    refreshBcfTopics();
  }, [refreshBcfTopics]);

  const handleTopicClick = useCallback((topic: BcfTopic) => {
    if (topic.viewpoint) {
      viewerRef.current?.restoreViewpoint(topic.viewpoint);
    }
  }, []);

  const handleBcfExport = useCallback(async () => {
    const blob = await exportBcfTopics();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topics.bcf';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleBcfImport = useCallback(async (file: File) => {
    await importBcfTopics(file);
    refreshBcfTopics();
  }, [refreshBcfTopics]);

  const handleAddTopicFromCtx = useCallback(() => {
    const vp = viewerRef.current?.captureViewpoint() ?? null;
    setTopicViewpoint(vp);
    setTopicElementName(ctxMenu?.meshName || null);
    setCtxMenu(null);
    setShowTopicForm(true);
  }, [ctxMenu]);

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
          {/* Defect count & overlay toggle */}
          {viewMode === '3d' && allDefects.length > 0 && (
            <button
              onClick={() => setDefectOverlayOn(!defectOverlayOn)}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
                defectOverlayOn
                  ? 'bg-red-600/20 text-red-400 border border-red-600/40'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
              title={defectOverlayOn ? 'Hide defect markers' : 'Show defect markers'}
            >
              <AlertTriangle size={12} />
              {allDefects.filter((d) => d.component_id != null).length} defects
            </button>
          )}

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
            filterOn={filterOn}
            onToggleFilter={() => {
              const next = !filterOn;
              setFilterOn(next);
              if (!next) {
                viewerRef.current?.resetColorFilters();
              }
            }}
            bcfOn={bcfPanelOn}
            onToggleBcf={() => setBcfPanelOn(!bcfPanelOn)}
          />
        )}

        {/* Left sidebar (Model tree or Floor plan) */}
        {sidebarOpen && viewMode === '3d' && !floorPlanOn && !filterOn && (
          <div className="w-72 shrink-0 border-r border-gray-700 relative">
            <ModelTree
              modelName={modelInfo?.name || selectedIfc || 'No model loaded'}
              tree={tree}
              elementCount={modelInfo?.elementCount || components.length}
              onNodeClick={handleTreeNodeClick}
              selectedNodeId={selectedNodeId}
              defectCounts={defectCountsMap}
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

        {/* Filter panel (replaces model tree when active) */}
        {sidebarOpen && viewMode === '3d' && filterOn && !floorPlanOn && (
          <FilterPanel
            ifcClasses={ifcClasses}
            storeys={storeys}
            onFiltersChange={handleFiltersChange}
            onClose={() => {
              setFilterOn(false);
              viewerRef.current?.resetColorFilters();
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
              defectMarkers={defectMarkers}
              onDefectMarkerClick={handleDefectMarkerClick}
              onContextMenu={handleCtxMenu}
              onSectionPlanesChanged={setSectionPlanes}
              onMeasurement={(m) => {
                setMeasurements((prev) => [
                  ...prev,
                  { ...m, mode: measureMode },
                ]);
              }}
              onElementSelected={handleElementSelected}
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
              sectionPlanes={sectionPlanes}
              onRemovePlane={(id) => viewerRef.current?.removeSectionPlane(id)}
              onClearPlanes={() => viewerRef.current?.clearSectionPlanes()}
            />
          )}
        </div>

        {/* Right properties panel */}
        {selectedElement && (
          <PropertiesPanel
            element={selectedElement}
            onClose={() => {
              setSelectedElement(null);
              setShowDefectSidebar(false);
              setComponentDefects([]);
            }}
          />
        )}

        {/* Right defect sidebar */}
        {showDefectSidebar && componentDefects.length > 0 && !selectedElement && (
          <DefectListSidebar
            defects={componentDefects}
            componentName={selectedComp?.name || null}
            onClose={() => {
              setShowDefectSidebar(false);
              setComponentDefects([]);
            }}
          />
        )}

        {/* BCF Topics panel */}
        {bcfPanelOn && viewMode === '3d' && (
          <BcfTopicsPanel
            topics={bcfTopics}
            onTopicClick={handleTopicClick}
            onDeleteTopic={handleDeleteTopic}
            onClose={() => setBcfPanelOn(false)}
            onCreateNew={() => {
              const vp = viewerRef.current?.captureViewpoint() ?? null;
              setTopicViewpoint(vp);
              setTopicElementName(null);
              setShowTopicForm(true);
            }}
            onExport={handleBcfExport}
            onImport={handleBcfImport}
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

      {/* Right-click context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.screenX}
          y={ctxMenu.screenY}
          elementName={ctxMenu.meshName || `Element #${ctxMenu.expressId}`}
          hasHidden={hasHiddenElements}
          onHide={() => {
            viewerRef.current?.hideElements([ctxMenu.meshId]);
            setHasHiddenElements(true);
          }}
          onIsolate={() => {
            viewerRef.current?.isolateElement(ctxMenu.meshId);
            setHasHiddenElements(true);
          }}
          onShowAll={() => {
            viewerRef.current?.showAllElements();
            setHasHiddenElements(false);
          }}
          onZoomTo={() => {
            viewerRef.current?.zoomToElement(ctxMenu.meshId);
          }}
          onAddTopic={handleAddTopicFromCtx}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* BCF Topic creation form modal */}
      {showTopicForm && (
        <BcfTopicForm
          onSubmit={handleCreateTopic}
          onClose={() => {
            setShowTopicForm(false);
            setTopicViewpoint(null);
            setTopicElementName(null);
          }}
          viewpoint={topicViewpoint}
          elementName={topicElementName}
        />
      )}
    </div>
  );
}
