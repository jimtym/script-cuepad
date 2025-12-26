'use client';

import { useState, useEffect, useRef } from 'react';
import type { BlockingEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ANNOTATION_TYPES, DEFAULT_ANNOTATION_TYPE, getAnnotationColor, type AnnotationType } from '@/lib/annotation-types';

// Helper to create light background from annotation color
function getLightBackground(color: string): string {
  // Convert hex to RGB and add opacity
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}

interface BlockingChartProps {
  entries: BlockingEntry[];
  currentPage: number;
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string | null) => void;
  onUpdateEntry: (entry: BlockingEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function BlockingChart({
  entries,
  currentPage,
  selectedEntryId,
  onSelectEntry,
  onUpdateEntry,
  onDeleteEntry,
  isCollapsed,
  onToggleCollapse,
}: BlockingChartProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editIndex, setEditIndex] = useState<number>(1);
  const [editAnnotationType, setEditAnnotationType] = useState<AnnotationType>(DEFAULT_ANNOTATION_TYPE);
  const selectedCardRef = useRef<HTMLDivElement>(null);

  const sortedEntries = [...entries].sort((a, b) => a.index_number - b.index_number);

  // Scroll to selected card when selection changes
  useEffect(() => {
    if (selectedEntryId && selectedCardRef.current && !isCollapsed) {
      selectedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEntryId, isCollapsed]);

  const handleStartEdit = (entry: BlockingEntry) => {
    setEditingId(entry.entry_id);
    setEditText(entry.blocking_text);
    setEditIndex(entry.index_number);
    setEditAnnotationType(entry.annotation_type || DEFAULT_ANNOTATION_TYPE);
  };

  const handleSaveEdit = (entry: BlockingEntry) => {
    if (editText.trim()) {
      // Check for duplicate index if it changed
      if (editIndex !== entry.index_number) {
        const duplicate = entries.find(
          (e) => e.entry_id !== entry.entry_id && e.index_number === editIndex
        );
        if (duplicate) {
          alert(`Index ${editIndex} is already in use on this page.`);
          return;
        }
      }

      onUpdateEntry({
        ...entry,
        blocking_text: editText,
        index_number: editIndex,
        annotation_type: editAnnotationType,
        color: getAnnotationColor(editAnnotationType), // Update color based on type
        updated_at: new Date().toISOString(),
      });
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (entryId: string) => {
    if (confirm('Delete this cue?')) {
      onDeleteEntry(entryId);
      if (selectedEntryId === entryId) {
        onSelectEntry(null);
      }
    }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-background border-r">
        <div className="p-2 border-b flex items-center justify-between">
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-accent rounded transition-colors"
            aria-label="Expand cue panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground text-sm">
            <div className="transform rotate-90 whitespace-nowrap">Script Cues</div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-base sm:text-lg font-semibold">Script Cues - Page {currentPage}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {sortedEntries.length} {sortedEntries.length === 1 ? 'cue' : 'cues'}
          </p>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-accent rounded transition-colors ml-2 flex-shrink-0"
          aria-label="Collapse cue panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 sm:p-4 space-y-2">
        {sortedEntries.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4 sm:py-8">
            No cues for this page.
            <br />
            Select text to add a cue.
          </p>
        ) : (
          sortedEntries.map((entry) => {
            const annotationColor = getAnnotationColor(entry.annotation_type);
            const isSelected = selectedEntryId === entry.entry_id;

            return (
              <Card
                key={entry.entry_id}
                ref={isSelected ? selectedCardRef : null}
                className={`p-2 sm:p-3 cursor-pointer transition-colors ${
                  isSelected ? 'border-2' : 'hover:bg-gray-50'
                }`}
                style={{
                  borderColor: isSelected ? annotationColor : undefined,
                  backgroundColor: isSelected ? getLightBackground(annotationColor) : undefined,
                }}
                onClick={() => onSelectEntry(entry.entry_id)}
              >
              {editingId === entry.entry_id ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Index:</label>
                    <Input
                      type="number"
                      min={1}
                      value={editIndex}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditIndex(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  {entry.selection_text && (
                    <div className="text-xs text-muted-foreground italic">
                      "{entry.selection_text}"
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="editType">TYPE</Label>
                    <select
                      id="editType"
                      value={editAnnotationType}
                      onChange={(e) => setEditAnnotationType(e.target.value as AnnotationType)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      {ANNOTATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="editText">CUE TEXT</Label>
                    <Textarea
                      id="editText"
                      value={editText}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditText(e.target.value)}
                      className="min-h-[80px]"
                      placeholder="Enter cue text..."
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(entry)}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: getAnnotationColor(entry.annotation_type) }}
                      >
                        {entry.index_number}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {entry.annotation_type || 'BLOCKING'}
                      </span>
                    </div>
                    <div className="flex gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleStartEdit(entry);
                        }}
                        className="text-xs px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleDelete(entry.entry_id);
                        }}
                        className="text-xs px-2"
                      >
                        Del
                      </Button>
                    </div>
                  </div>
                  {entry.selection_text && (
                    <div className="text-xs text-muted-foreground italic">
                      Trigger: "{entry.selection_text}"
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">{entry.blocking_text}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated: {new Date(entry.updated_at).toLocaleString()}
                  </div>
                </div>
              )}
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
