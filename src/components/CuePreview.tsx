'use client';

import { useState } from 'react';
import type { BlockingEntry } from '@/lib/types';
import { getAnnotationColor, ANNOTATION_TYPES, type AnnotationType } from '@/lib/annotation-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveBlockingEntry, deleteBlockingEntry } from '@/actions/entries';

interface CuePreviewProps {
  entry: BlockingEntry;
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
  existingIndices: number[];
}

export function CuePreview({ entry, userId, onClose, onUpdate, existingIndices }: CuePreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(entry.index_number);
  const [editType, setEditType] = useState(entry.annotation_type);
  const [editText, setEditText] = useState(entry.blocking_text);

  const handleSave = async () => {
    // Validate unique index (excluding current entry's current index)
    if (editIndex !== entry.index_number && existingIndices.includes(editIndex)) {
      alert(`Index ${editIndex} is already in use on this page.`);
      return;
    }

    if (editIndex < 1) {
      alert('Index must be at least 1.');
      return;
    }

    if (!editText.trim()) {
      alert('Cue text is required.');
      return;
    }

    const updated: BlockingEntry = {
      ...entry,
      index_number: editIndex,
      annotation_type: editType,
      blocking_text: editText,
      color: getAnnotationColor(editType),
      updated_at: new Date().toISOString(),
    };

    await saveBlockingEntry(updated, userId);
    setIsEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (! !confirm(`Delete cue #${entry.index_number}?`)) return;
    await deleteBlockingEntry(entry.entry_id, userId);
    onClose();
    onUpdate();
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={handleClickOutside}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-lg">Cue #{entry.index_number}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {!isEditing ? (
            <>
              {/* View Mode */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">TYPE</div>
                  <div
                    className="inline-block px-2 py-1 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: getAnnotationColor(entry.annotation_type) }}
                  >
                    {entry.annotation_type.toUpperCase()}
                  </div>
                </div>

                {entry.selection_text && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">TRIGGER TEXT</div>
                    <div className="text-sm text-gray-700 italic">"{entry.selection_text}"</div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">CUE TEXT</div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">{entry.blocking_text}</div>
                </div>

                <div className="text-xs text-gray-400">
                  Updated {new Date(entry.updated_at).toLocaleString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1">
                  Edit
                </Button>
                <Button onClick={handleDelete} variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                  Delete
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Edit Mode */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">INDEX</label>
                  <Input
                    type="number"
                    min="1"
                    value={editIndex}
                    onChange={(e) => setEditIndex(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">TYPE</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as AnnotationType)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {ANNOTATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">CUE TEXT</label>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    placeholder="Enter cue details..."
                  />
                </div>
              </div>

              {/* Edit Actions */}
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSave} className="flex-1">
                  Save
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
