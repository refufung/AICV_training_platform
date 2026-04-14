import { useState } from 'react';
import { X, MessageSquarePlus } from 'lucide-react';
import type { BcfTopicCreate } from '../types';

interface BcfTopicFormProps {
  onSubmit: (data: BcfTopicCreate) => void;
  onClose: () => void;
  viewpoint: string | null;
  elementName?: string | null;
}

export default function BcfTopicForm({ onSubmit, onClose, viewpoint, elementName }: BcfTopicFormProps) {
  const [title, setTitle] = useState(elementName ? `Issue on ${elementName}` : '');
  const [description, setDescription] = useState('');
  const [topicType, setTopicType] = useState('issue');
  const [priority, setPriority] = useState('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      topic_type: topicType,
      priority,
      viewpoint: viewpoint || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-[420px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-200">New BCF Topic</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {viewpoint && (
            <div className="text-[10px] text-green-400 bg-green-600/10 border border-green-500/30 rounded px-2 py-1">
              Current viewpoint will be captured
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe the issue…"
              className="w-full text-sm bg-gray-900 text-gray-200 border border-gray-600 rounded px-3 py-1.5 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details…"
              rows={3}
              className="w-full text-sm bg-gray-900 text-gray-200 border border-gray-600 rounded px-3 py-1.5 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={topicType}
                onChange={(e) => setTopicType(e.target.value)}
                className="w-full text-xs bg-gray-900 text-gray-300 border border-gray-600 rounded px-2 py-1.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="issue">Issue</option>
                <option value="request">Request</option>
                <option value="comment">Comment</option>
                <option value="solution">Solution</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs bg-gray-900 text-gray-300 border border-gray-600 rounded px-2 py-1.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-400 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            Create Topic
          </button>
        </div>
      </form>
    </div>
  );
}
