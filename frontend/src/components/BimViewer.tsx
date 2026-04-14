import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import fragmentsWorkerUrl from '@thatopen/fragments/dist/Worker/worker.mjs?url';

interface BimViewerProps {
  ifcUrl?: string;
  onComponentClick?: (globalId: string) => void;
  highlightIds?: string[];
}

export default function BimViewer({ ifcUrl, onComponentClick, highlightIds = [] }: BimViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OBC.Components | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    const container = containerRef.current;
    const components = new OBC.Components();
    engineRef.current = components;

    // Set up scene
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBC.SimpleRenderer
    >();
    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);

    components.init();

    world.scene.setup();
    world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);

    // Grid
    const grids = components.get(OBC.Grids);
    grids.create(world);

    // Initialize FragmentsManager (required before IFC loading)
    const fragments = components.get(OBC.FragmentsManager);
    fragments.init(fragmentsWorkerUrl);

    // Load IFC if URL provided
    if (ifcUrl) {
      setLoading(true);
      setError('');

      const loadIfc = async () => {
        try {
          const ifcLoader = components.get(OBC.IfcLoader);
          await ifcLoader.setup();

          const response = await fetch(ifcUrl);
          if (!response.ok) throw new Error(`Failed to fetch IFC: ${response.status}`);
          const buffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(buffer);
          const model = await ifcLoader.load(uint8, true, 'model');
          if (disposed) return;
          world.scene.three.add(model.object);

          // Fit camera to model
          const box = new THREE.Box3().setFromObject(model.object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          world.camera.controls.setLookAt(
            center.x + maxDim,
            center.y + maxDim,
            center.z + maxDim,
            center.x,
            center.y,
            center.z,
          );
        } catch (e) {
          if (!disposed) {
            setError(e instanceof Error ? e.message : 'Failed to load IFC');
          }
        } finally {
          if (!disposed) {
            setLoading(false);
          }
        }
      };

      loadIfc();
    }

    return () => {
      disposed = true;
      components.dispose();
    };
  }, [ifcUrl]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-white px-4 py-2 rounded shadow text-sm">Loading IFC model...</div>
        </div>
      )}
      {error && (
        <div className="absolute top-2 left-2 bg-red-50 text-red-600 text-sm px-3 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
