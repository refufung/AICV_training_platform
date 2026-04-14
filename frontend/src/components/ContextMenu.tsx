import { useEffect, useRef } from 'react';
import { EyeOff, Focus, Eye, Crosshair, MessageSquarePlus } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  elementName: string;
  onHide: () => void;
  onIsolate: () => void;
  onShowAll: () => void;
  onZoomTo: () => void;
  onAddTopic?: () => void;
  onClose: () => void;
  hasHidden: boolean;
}

export default function ContextMenu({
  x,
  y,
  elementName,
  onHide,
  onIsolate,
  onShowAll,
  onZoomTo,
  onAddTopic,
  onClose,
  hasHidden,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 224);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  const actions = [
    { icon: EyeOff, label: 'Hide Element', onClick: () => { onHide(); onClose(); } },
    { icon: Focus, label: 'Isolate Element', onClick: () => { onIsolate(); onClose(); } },
    { icon: Eye, label: 'Show All', onClick: () => { onShowAll(); onClose(); }, disabled: !hasHidden },
    { icon: Crosshair, label: 'Zoom To', onClick: () => { onZoomTo(); onClose(); } },
  ];

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: adjustedX, top: adjustedY, zIndex: 9999 }}
      className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl py-1 min-w-[200px] select-none"
    >
      <div className="px-3 py-1.5 text-[11px] text-gray-400 border-b border-gray-700 truncate max-w-[220px] font-medium">
        {elementName}
      </div>
      {actions.map((item) => (
        <button
          key={item.label}
          onClick={item.disabled ? undefined : item.onClick}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
            item.disabled
              ? 'text-gray-600 cursor-default'
              : 'text-gray-200 hover:bg-white/10'
          }`}
        >
          <item.icon size={15} className={item.disabled ? 'text-gray-600' : 'text-gray-400'} />
          {item.label}
        </button>
      ))}
      <div className="border-t border-gray-700 my-0.5" />
      <button
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
          onAddTopic ? 'text-gray-200 hover:bg-white/10' : 'text-gray-600 cursor-default'
        }`}
        onClick={onAddTopic ? () => { onAddTopic(); onClose(); } : undefined}
        disabled={!onAddTopic}
      >
        <MessageSquarePlus size={15} className={onAddTopic ? 'text-gray-400' : 'text-gray-600'} />
        Add BCF Topic…
      </button>
    </div>
  );
}
