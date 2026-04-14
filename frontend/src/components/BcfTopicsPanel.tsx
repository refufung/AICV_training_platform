import { useState, useRef } from 'react';
import { MessageSquare, Plus, Download, Upload, X, Trash2, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import type { BcfTopic } from '../types';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-green-600/20 text-green-400',
  normal: 'bg-blue-600/20 text-blue-400',
  high: 'bg-orange-600/20 text-orange-400',
  critical: 'bg-red-600/20 text-red-400',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-600/20 text-yellow-400',
  in_progress: 'bg-blue-600/20 text-blue-400',
  resolved: 'bg-green-600/20 text-green-400',
  closed: 'bg-gray-600/20 text-gray-400',
};

interface BcfTopicsPanelProps {
  topics: BcfTopic[];
  onTopicClick: (topic: BcfTopic) => void;
  onDeleteTopic: (id: number) => void;
  onClose: () => void;
  onCreateNew: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function BcfTopicsPanel({
  topics,
  onTopicClick,
  onDeleteTopic,
  onClose,
  onCreateNew,
  onExport,
  onImport,
}: BcfTopicsPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-80 shrink-0 border-l border-gray-700 bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-blue-400" />
          <span className="text-sm font-semibold text-gray-200">BCF Topics</span>
          <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
            {topics.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateNew}
            className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-white/10"
            title="Create new topic"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={onExport}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-white/10"
            title="Export BCF"
          >
            <Download size={13} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-white/10"
            title="Import BCF"
          >
            <Upload size={13} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".bcf,.bcfzip,.zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                onImport(f);
                e.target.value = '';
              }
            }}
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-white/10"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Topics list */}
      <div className="flex-1 overflow-y-auto">
        {topics.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-8 px-4">
            No BCF topics yet. Click + to create one, or import a .bcf file.
          </div>
        )}
        {topics.map((topic) => (
          <div key={topic.id} className="border-b border-gray-800">
            <div
              className="flex items-start gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer"
              onClick={() => setExpandedId(expandedId === topic.id ? null : topic.id)}
            >
              <div className="mt-0.5 shrink-0 text-gray-500">
                {expandedId === topic.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate">{topic.title}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[topic.priority] || PRIORITY_COLORS.normal}`}>
                    {topic.priority}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${STATUS_COLORS[topic.status] || STATUS_COLORS.open}`}>
                    {topic.status.replace('_', ' ')}
                  </span>
                  {topic.comments.length > 0 && (
                    <span className="text-[9px] text-gray-500">{topic.comments.length} comment{topic.comments.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded detail */}
            {expandedId === topic.id && (
              <div className="px-3 pb-2 space-y-2">
                {topic.description && (
                  <p className="text-[11px] text-gray-400 leading-relaxed">{topic.description}</p>
                )}

                <div className="flex items-center gap-1.5">
                  {topic.viewpoint && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onTopicClick(topic); }}
                      className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-600/10 border border-blue-500/30 rounded px-2 py-0.5 hover:bg-blue-600/20"
                    >
                      <Eye size={11} />
                      Restore View
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTopic(topic.id); }}
                    className="flex items-center gap-1 text-[10px] text-red-400 bg-red-600/10 border border-red-500/30 rounded px-2 py-0.5 hover:bg-red-600/20"
                  >
                    <Trash2 size={11} />
                    Delete
                  </button>
                </div>

                {/* Comments */}
                {topic.comments.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {topic.comments.map((c) => (
                      <div key={c.id} className="text-[10px] text-gray-400 bg-gray-800/60 rounded px-2 py-1">
                        {c.author && <span className="text-gray-300 font-medium">{c.author}: </span>}
                        {c.text}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[9px] text-gray-600">
                  {topic.created_at && new Date(topic.created_at).toLocaleDateString()}
                  {topic.assigned_to && ` · ${topic.assigned_to}`}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
