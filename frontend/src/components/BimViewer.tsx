import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import fragmentsWorkerUrl from '@thatopen/fragments/worker?url';

export interface ModelInfo {
  name: string;
  elementCount: number;
  /** Model bounding box min/max Y for section plane range */
  minY: number;
  maxY: number;
}

export interface BimViewerHandle {
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  toggleGrid: () => void;
  enableSectionPlane: () => void;
  disableSectionPlane: () => void;
  setSectionHeight: (y: number) => void;
  enableMeasure: () => void;
  disableMeasure: () => void;
  clearMeasurements: () => void;
  deleteMeasurement: (id: string) => void;
  showFloorPlan: (bottomY: number, topY: number) => void;
  exitFloorPlan: () => void;
}

export interface StoreyInfo {
  name: string;
  elevation: number;
}

export interface IfcPropertyGroup {
  name: string;
  properties: { key: string; value: string }[];
}

export interface SelectedElement {
  name: string;
  type: string;
  globalId: string;
  expressId: number;
  groups: IfcPropertyGroup[];
}

interface BimViewerProps {
  ifcUrl?: string;
  onComponentClick?: (globalId: string) => void;
  onModelLoaded?: (info: ModelInfo) => void;
  onMeasurement?: (measurement: { id: string; points: { x: number; y: number; z: number }[]; distance: number }) => void;
  onElementSelected?: (element: SelectedElement | null) => void;
  onStoreysLoaded?: (storeys: StoreyInfo[]) => void;
  measureActive?: boolean;
  highlightIds?: string[];
}

const BimViewer = forwardRef<BimViewerHandle, BimViewerProps>(
  function BimViewer({ ifcUrl, onModelLoaded, onMeasurement, onElementSelected, onStoreysLoaded }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<OBC.Components | null>(null);
    const worldRef = useRef<OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer> | null>(null);
    const gridRef = useRef<OBC.Grids | null>(null);
    const modelBoxRef = useRef<THREE.Box3 | null>(null);
    const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 100));
    const clipHelperRef = useRef<THREE.PlaneHelper | null>(null);
    // Measurement state
    const measureActiveRef = useRef(false);
    const pendingPointRef = useRef<THREE.Vector3 | null>(null);
    const pendingMarkerRef = useRef<THREE.Mesh | null>(null);
    const measureGroupRef = useRef<THREE.Group>(new THREE.Group());
    const measureMapRef = useRef<Map<string, THREE.Group>>(new Map());
    const measureIdCounter = useRef(0);
    const highlightedRef = useRef<THREE.Object3D | null>(null);
    const originalMaterialsRef = useRef<Map<number, THREE.Material | THREE.Material[]>>(new Map());
    // Floor plan clipping (two planes)
    const floorClipPlanesRef = useRef<THREE.Plane[]>([
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),  // bottom: clip below
      new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), // top: clip above
    ]);
    const savedCameraRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
    const floorPlanActiveRef = useRef(false);
    const [loading, setLoading] = useState(false);
    const [loadProgress, setLoadProgress] = useState('');
    const [error, setError] = useState('');

    const fitToModel = useCallback(() => {
      const world = worldRef.current;
      const box = modelBoxRef.current;
      if (!world || !box) return;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      world.camera.controls.setLookAt(
        center.x + maxDim, center.y + maxDim, center.z + maxDim,
        center.x, center.y, center.z,
      );
    }, []);

    useImperativeHandle(ref, () => ({
      fitView: fitToModel,
      zoomIn: () => {
        worldRef.current?.camera.controls.dolly(3, true);
      },
      zoomOut: () => {
        worldRef.current?.camera.controls.dolly(-3, true);
      },
      resetView: () => {
        worldRef.current?.camera.controls.setLookAt(20, 20, 20, 0, 0, 0, true);
      },
      toggleGrid: () => {
        // Grid toggling handled by parent state
      },
      enableSectionPlane: () => {
        const world = worldRef.current;
        if (!world) return;
        if (!world.renderer) return;
        const renderer = world.renderer.three;
        const plane = clipPlaneRef.current;
        renderer.clippingPlanes = [plane];
        // Add visual helper plane
        if (!clipHelperRef.current) {
          const box = modelBoxRef.current;
          const helperSize = box ? box.getSize(new THREE.Vector3()).length() : 50;
          const helper = new THREE.PlaneHelper(plane, helperSize, 0x3b82f6);
          clipHelperRef.current = helper;
          world.scene.three.add(helper);
        }
        clipHelperRef.current.visible = true;
      },
      disableSectionPlane: () => {
        const world = worldRef.current;
        if (!world || !world.renderer) return;
        world.renderer.three.clippingPlanes = [];
        if (clipHelperRef.current) {
          clipHelperRef.current.visible = false;
        }
      },
      setSectionHeight: (y: number) => {
        // Plane normal (0, -1, 0) with constant = y means clip everything above y
        clipPlaneRef.current.constant = y;
      },
      enableMeasure: () => {
        measureActiveRef.current = true;
      },
      disableMeasure: () => {
        measureActiveRef.current = false;
        // Remove any pending point marker
        if (pendingMarkerRef.current) {
          measureGroupRef.current.remove(pendingMarkerRef.current);
          pendingMarkerRef.current.geometry.dispose();
          (pendingMarkerRef.current.material as THREE.Material).dispose();
          pendingMarkerRef.current = null;
        }
        pendingPointRef.current = null;
      },
      clearMeasurements: () => {
        measureMapRef.current.forEach((group) => {
          measureGroupRef.current.remove(group);
          group.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              (obj.material as THREE.Material).dispose();
            }
            if (obj instanceof THREE.Line) {
              obj.geometry.dispose();
              (obj.material as THREE.Material).dispose();
            }
          });
        });
        measureMapRef.current.clear();
        pendingPointRef.current = null;
        if (pendingMarkerRef.current) {
          measureGroupRef.current.remove(pendingMarkerRef.current);
          pendingMarkerRef.current.geometry.dispose();
          (pendingMarkerRef.current.material as THREE.Material).dispose();
          pendingMarkerRef.current = null;
        }
      },
      deleteMeasurement: (id: string) => {
        const group = measureMapRef.current.get(id);
        if (group) {
          measureGroupRef.current.remove(group);
          group.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              (obj.material as THREE.Material).dispose();
            }
            if (obj instanceof THREE.Line) {
              obj.geometry.dispose();
              (obj.material as THREE.Material).dispose();
            }
          });
          measureMapRef.current.delete(id);
        }
      },
      showFloorPlan: (bottomY: number, topY: number) => {
        const world = worldRef.current;
        if (!world || !world.renderer) return;
        const renderer = world.renderer.three;
        const box = modelBoxRef.current;

        // Save camera state
        if (!floorPlanActiveRef.current) {
          const cam = world.camera.three;
          savedCameraRef.current = {
            pos: cam.position.clone(),
            target: new THREE.Vector3(),
          };
          world.camera.controls.getTarget(savedCameraRef.current.target);
        }
        floorPlanActiveRef.current = true;

        // Set two clipping planes
        const [bottomPlane, topPlane] = floorClipPlanesRef.current;
        bottomPlane.set(new THREE.Vector3(0, 1, 0), -bottomY);  // clip below bottomY
        topPlane.set(new THREE.Vector3(0, -1, 0), topY);         // clip above topY
        renderer.clippingPlanes = [bottomPlane, topPlane];

        // Hide section plane helper
        if (clipHelperRef.current) clipHelperRef.current.visible = false;

        // Top-down orthographic-like camera
        if (box) {
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const midY = (bottomY + topY) / 2;
          const maxSpan = Math.max(size.x, size.z) * 1.2;
          world.camera.controls.setLookAt(
            center.x, midY + maxSpan, center.z,
            center.x, midY, center.z,
            true,
          );
        }
      },
      exitFloorPlan: () => {
        const world = worldRef.current;
        if (!world || !world.renderer) return;
        floorPlanActiveRef.current = false;
        world.renderer.three.clippingPlanes = [];

        // Restore camera
        if (savedCameraRef.current) {
          const { pos, target } = savedCameraRef.current;
          world.camera.controls.setLookAt(
            pos.x, pos.y, pos.z,
            target.x, target.y, target.z,
            true,
          );
          savedCameraRef.current = null;
        }
      },
    }), [fitToModel]);

    useEffect(() => {
      if (!containerRef.current) return;
      let disposed = false;

      const container = containerRef.current;
      const components = new OBC.Components();
      engineRef.current = components;

      const worlds = components.get(OBC.Worlds);
      const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
      world.scene = new OBC.SimpleScene(components);
      world.renderer = new OBC.SimpleRenderer(components, container);
      world.camera = new OBC.SimpleCamera(components);
      worldRef.current = world;

      components.init();
      world.scene.setup();
      world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);

      // Dark background
      world.scene.three.background = new THREE.Color(0x1a1a2e);

      // Enable local clipping on the renderer
      world.renderer.three.localClippingEnabled = true;

      // Add measurement group to scene
      world.scene.three.add(measureGroupRef.current);

      // Raycaster for measurement clicks
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onMeasureClick = (event: MouseEvent) => {
        if (!measureActiveRef.current) return;
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, world.camera.three);
        const meshes: THREE.Object3D[] = [];
        world.scene.three.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj !== pendingMarkerRef.current && !measureGroupRef.current.getObjectById(obj.id)) {
            meshes.push(obj);
          }
        });
        const intersects = raycaster.intersectObjects(meshes, false);
        if (intersects.length === 0) return;

        const point = intersects[0].point.clone();

        if (!pendingPointRef.current) {
          // First click: place start marker
          pendingPointRef.current = point;
          const markerGeo = new THREE.SphereGeometry(0.15);
          const markerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false });
          const marker = new THREE.Mesh(markerGeo, markerMat);
          marker.position.copy(point);
          marker.renderOrder = 999;
          measureGroupRef.current.add(marker);
          pendingMarkerRef.current = marker;
        } else {
          // Second click: complete measurement
          const startPt = pendingPointRef.current;
          const endPt = point;
          const distance = startPt.distanceTo(endPt);
          const id = `measure-${++measureIdCounter.current}`;

          const group = new THREE.Group();

          // Line
          const lineGeo = new THREE.BufferGeometry().setFromPoints([startPt, endPt]);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2, depthTest: false });
          const line = new THREE.Line(lineGeo, lineMat);
          line.renderOrder = 999;
          group.add(line);

          // End marker
          const endGeo = new THREE.SphereGeometry(0.15);
          const endMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false });
          const endMarker = new THREE.Mesh(endGeo, endMat);
          endMarker.position.copy(endPt);
          endMarker.renderOrder = 999;
          group.add(endMarker);

          // Move start marker into the group
          if (pendingMarkerRef.current) {
            measureGroupRef.current.remove(pendingMarkerRef.current);
            group.add(pendingMarkerRef.current);
            pendingMarkerRef.current = null;
          }

          // Label sprite
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 64;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.roundRect(0, 0, 256, 64, 8);
          ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${distance.toFixed(2)} m`, 128, 32);
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
          const sprite = new THREE.Sprite(spriteMat);
          const mid = new THREE.Vector3().lerpVectors(startPt, endPt, 0.5);
          sprite.position.copy(mid);
          sprite.position.y += 0.5;
          sprite.scale.set(3, 0.75, 1);
          sprite.renderOrder = 1000;
          group.add(sprite);

          measureGroupRef.current.add(group);
          measureMapRef.current.set(id, group);

          pendingPointRef.current = null;

          onMeasurement?.({
            id,
            points: [
              { x: startPt.x, y: startPt.y, z: startPt.z },
              { x: endPt.x, y: endPt.y, z: endPt.z },
            ],
            distance,
          });
        }
      };

      container.addEventListener('click', onMeasureClick);

      // Element selection click handler
      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.6,
        depthTest: true,
      });

      const onSelectClick = (event: MouseEvent) => {
        if (measureActiveRef.current) return;
        const rect = container.getBoundingClientRect();
        const mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2(mx, my), world.camera.three);

        const meshes: THREE.Mesh[] = [];
        world.scene.three.traverse((obj) => {
          if (
            obj instanceof THREE.Mesh &&
            !measureGroupRef.current.getObjectById(obj.id)
          ) {
            meshes.push(obj);
          }
        });
        const hits = rc.intersectObjects(meshes, false);

        // Restore previous highlight
        originalMaterialsRef.current.forEach((mat, objId) => {
          const obj = world.scene.three.getObjectById(objId) as THREE.Mesh | undefined;
          if (obj) obj.material = mat as THREE.Material;
        });
        originalMaterialsRef.current.clear();

        if (hits.length === 0) {
          highlightedRef.current = null;
          onElementSelected?.(null);
          return;
        }

        const hitObj = hits[0].object as THREE.Mesh;
        highlightedRef.current = hitObj;

        // Save original material & apply highlight
        originalMaterialsRef.current.set(hitObj.id, hitObj.material as THREE.Material);
        hitObj.material = highlightMaterial;

        // Extract properties from mesh name / userData
        const name = hitObj.name || hitObj.userData?.Name || 'Unknown';
        const type = hitObj.userData?.type || hitObj.userData?.ObjectType || hitObj.type || 'Unknown';
        const globalId = hitObj.userData?.GlobalId || hitObj.uuid.slice(0, 22);
        const expressId = hitObj.userData?.expressID ?? hitObj.id;

        // Build property groups from userData
        const groups: IfcPropertyGroup[] = [];

        // Attributes group
        const attrs: { key: string; value: string }[] = [
          { key: '_category', value: type },
          { key: '_localId', value: String(expressId) },
          { key: 'GlobalId', value: globalId },
          { key: 'Name', value: name },
          { key: 'ObjectType', value: hitObj.userData?.ObjectType || type },
          { key: 'Tag', value: hitObj.userData?.Tag || String(expressId) },
          { key: 'PredefinedType', value: hitObj.userData?.PredefinedType || 'NOTDEFINED' },
        ];
        groups.push({ name: 'Attributes', properties: attrs });

        // Scan userData for property sets (Pset_*, Qto_*, etc.)
        if (hitObj.userData) {
          const knownKeys = new Set(['Name', 'ObjectType', 'GlobalId', 'Tag', 'PredefinedType', 'expressID', 'type']);
          const otherProps: { key: string; value: string }[] = [];

          for (const [k, v] of Object.entries(hitObj.userData)) {
            if (knownKeys.has(k)) continue;
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              // Property set
              const psetProps = Object.entries(v as Record<string, unknown>).map(([pk, pv]) => ({
                key: pk,
                value: String(pv ?? ''),
              }));
              if (psetProps.length > 0) {
                groups.push({ name: k, properties: psetProps });
              }
            } else {
              otherProps.push({ key: k, value: String(v ?? '') });
            }
          }

          if (otherProps.length > 0) {
            groups.push({ name: 'Other', properties: otherProps });
          }
        }

        // Geometry dimensions group
        const bbox = new THREE.Box3().setFromObject(hitObj);
        const sz = bbox.getSize(new THREE.Vector3());
        groups.push({
          name: 'Dimensions',
          properties: [
            { key: 'Width', value: `${sz.x.toFixed(3)} m` },
            { key: 'Height', value: `${sz.y.toFixed(3)} m` },
            { key: 'Depth', value: `${sz.z.toFixed(3)} m` },
            { key: 'Volume', value: `${(sz.x * sz.y * sz.z).toFixed(4)} m³` },
          ],
        });

        // Position
        const pos = new THREE.Vector3();
        hitObj.getWorldPosition(pos);
        groups.push({
          name: 'Location',
          properties: [
            { key: 'X', value: pos.x.toFixed(3) },
            { key: 'Y', value: pos.y.toFixed(3) },
            { key: 'Z', value: pos.z.toFixed(3) },
          ],
        });

        onElementSelected?.({
          name,
          type,
          globalId,
          expressId,
          groups,
        });
      };

      container.addEventListener('dblclick', onSelectClick);

      const grids = components.get(OBC.Grids);
      grids.create(world);
      gridRef.current = grids;

      const fragments = components.get(OBC.FragmentsManager);
      fragments.init(fragmentsWorkerUrl);

      if (ifcUrl) {
        setLoading(true);
        setError('');
        setLoadProgress('Fetching IFC file...');

        const loadIfc = async () => {
          try {
            const ifcLoader = components.get(OBC.IfcLoader);
            await ifcLoader.setup({ autoSetWasm: false });
            ifcLoader.settings.wasm.path = '/';
            ifcLoader.settings.wasm.absolute = true;

            const response = await fetch(ifcUrl);
            if (!response.ok) throw new Error(`Failed to fetch IFC: ${response.status}`);

            setLoadProgress('Parsing IFC model...');
            const buffer = await response.arrayBuffer();
            const uint8 = new Uint8Array(buffer);
            const model = await ifcLoader.load(uint8, true, 'model');
            if (disposed) return;

            world.scene.three.add(model.object);

            // Count elements
            let elementCount = 0;
            model.object.traverse(() => { elementCount++; });

            // Fit camera
            const box = new THREE.Box3().setFromObject(model.object);
            modelBoxRef.current = box;
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            world.camera.controls.setLookAt(
              center.x + maxDim, center.y + maxDim, center.z + maxDim,
              center.x, center.y, center.z,
            );

            // Extract model name from URL
            const urlParts = ifcUrl.split('/');
            const modelName = decodeURIComponent(urlParts[urlParts.length - 1] || 'Model');

            onModelLoaded?.({
              name: modelName,
              elementCount,
              minY: box.min.y,
              maxY: box.max.y,
            });

            // Extract storey data from mesh hierarchy
            const storeyMap = new Map<string, number>();
            model.object.traverse((obj: THREE.Object3D) => {
              const ud = (obj as THREE.Mesh).userData;
              if (!ud) return;
              // Try multiple approaches to find storey info
              const tp = ud.type as string | undefined;
              if (tp === 'IFCBUILDINGSTOREY' || tp === 'IfcBuildingStorey') {
                const sName = (ud.Name as string) || obj.name || 'Unknown';
                const elev = typeof ud.Elevation === 'number' ? ud.Elevation : obj.position.y;
                storeyMap.set(sName, elev);
              }
              // Also check if object's storey info is embedded differently
              if (ud.storey && typeof ud.storey === 'string') {
                if (!storeyMap.has(ud.storey)) {
                  storeyMap.set(ud.storey, obj.position.y);
                }
              }
            });

            // If no storeys found, generate synthetic ones from model height
            if (storeyMap.size === 0) {
              const height = box.max.y - box.min.y;
              const floorHeight = 3.5; // typical storey height
              const numFloors = Math.max(1, Math.round(height / floorHeight));
              for (let i = 0; i < numFloors; i++) {
                const elev = box.min.y + i * floorHeight;
                const label = i === 0 ? 'G/F' : `${i}F`;
                storeyMap.set(`${label} (${elev.toFixed(2)}m)`, elev);
              }
            }

            const storeys: StoreyInfo[] = Array.from(storeyMap.entries())
              .map(([name, elevation]) => ({ name, elevation }))
              .sort((a, b) => a.elevation - b.elevation);

            onStoreysLoaded?.(storeys);
          } catch (e) {
            if (!disposed) {
              setError(e instanceof Error ? e.message : 'Failed to load IFC');
            }
          } finally {
            if (!disposed) {
              setLoading(false);
              setLoadProgress('');
            }
          }
        };

        loadIfc();
      }

      return () => {
        disposed = true;
        container.removeEventListener('click', onMeasureClick);
        container.removeEventListener('dblclick', onSelectClick);
        highlightMaterial.dispose();
        components.dispose();
      };
    }, [ifcUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div className="relative w-full h-full bg-[#1a1a2e]">
        <div ref={containerRef} className="w-full h-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 text-gray-200 px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm">{loadProgress || 'Loading...'}</div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute top-3 left-3 bg-red-900/80 text-red-200 text-sm px-3 py-2 rounded-lg border border-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }
);

export default BimViewer;
