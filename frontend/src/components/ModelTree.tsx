import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Landmark,
  MapPin,
  Layers,
  Box,
  Columns3,
  DoorOpen,
  RectangleHorizontal,
  Lightbulb,
  PanelTop,
  Grip,
} from 'lucide-react';

// IFC type → icon mapping
const IFC_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  IfcProject: Landmark,
  IfcSite: MapPin,
  IfcBuilding: Building2,
  IfcBuildingStorey: Layers,
  IfcWall: RectangleHorizontal,
  IfcWallStandardCase: RectangleHorizontal,
  IfcColumn: Columns3,
  IfcSlab: PanelTop,
  IfcDoor: DoorOpen,
  IfcWindow: PanelTop,
  IfcBeam: Grip,
  IfcLightFixture: Lightbulb,
  IfcBuildingElementProxy: Box,
};

export interface TreeNode {
  id: string;
  label: string;
  type: string;
  children?: TreeNode[];
  expressId?: number;
  componentId?: number;
}

interface ModelTreeProps {
  modelName: string;
  tree: TreeNode[];
  elementCount: number;
  onNodeClick?: (node: TreeNode) => void;
  selectedNodeId?: string | null;
}

function TreeItem({
  node,
  depth,
  onNodeClick,
  selectedNodeId,
}: {
  node: TreeNode;
  depth: number;
  onNodeClick?: (node: TreeNode) => void;
  selectedNodeId?: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const IconComponent = IFC_ICONS[node.type] || Box;
  const isSelected = selectedNodeId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-1 cursor-pointer hover:bg-white/10 rounded text-xs ${
          isSelected ? 'bg-blue-600/30 text-blue-300' : 'text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onNodeClick?.(node);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown size={14} className="shrink-0 text-gray-500" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-gray-500" />
          )
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <IconComponent size={14} className="shrink-0 text-gray-400" />
        <span className="truncate">{node.label}</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onNodeClick={onNodeClick}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ModelTree({
  modelName,
  tree,
  elementCount,
  onNodeClick,
  selectedNodeId,
}: ModelTreeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const term = search.toLowerCase();

    function filterNode(node: TreeNode): TreeNode | null {
      const matchesChildren = node.children
        ?.map(filterNode)
        .filter(Boolean) as TreeNode[] | undefined;
      if (node.label.toLowerCase().includes(term) || node.type.toLowerCase().includes(term)) {
        return { ...node, children: matchesChildren };
      }
      if (matchesChildren && matchesChildren.length > 0) {
        return { ...node, children: matchesChildren };
      }
      return null;
    }

    return tree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [tree, search]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-gray-700 cursor-pointer hover:bg-gray-800"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="font-semibold text-sm">Models</span>
        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      </div>

      {!collapsed && (
        <>
          {/* Element count */}
          <div className="px-3 py-1.5 border-b border-gray-700/50">
            <span className="text-xs text-gray-400">
              {elementCount.toLocaleString()} elements
            </span>
          </div>

          {/* Search */}
          <div className="px-2 py-1.5 border-b border-gray-700/50">
            <input
              type="text"
              placeholder="Search elements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 text-xs text-gray-300 rounded px-2 py-1 placeholder-gray-500 border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Model name */}
          <div className="px-3 py-1.5 text-xs text-blue-400 font-medium truncate border-b border-gray-700/50">
            {modelName}
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
            {filteredTree.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">
                {search ? 'No matching elements' : 'No model loaded'}
              </div>
            ) : (
              filteredTree.map((node) => (
                <TreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  onNodeClick={onNodeClick}
                  selectedNodeId={selectedNodeId}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
