'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Script, BlockingEntry, SelectionBox } from '@/lib/types';
import {
  getEntriesForPage,
  saveBlockingEntry,
  deleteBlockingEntry as dbDeleteBlockingEntry,
} from '@/actions/entries';

// Client-side ID generation
function generateId(): string {
  return crypto.randomUUID();
}
import { PDFViewer } from './PDFViewer';
import { BlockingChart } from './BlockingChart';
import { AddBlockingDialog } from './AddBlockingDialog';
import { CuePreview } from './CuePreview';
import { Button } from '@/components/ui/button';
import { DEFAULT_ANNOTATION_TYPE, getAnnotationColor, type AnnotationType } from '@/lib/annotation-types';
import { useUser } from '@clerk/nextjs';

interface BlockingPageProps {
  script: Script;
  onExit: () => void;
}

export function BlockingPage({ script, onExit }: BlockingPageProps) {
  const { user, isLoaded } = useUser();
  const [currentPage, setCurrentPage] = useState(1);
  const [entries, setEntries] = useState<BlockingEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    pageNumber: number;
    selectionBox: SelectionBox;
    selectionText: string | null;
    selectionType: 'text';
  } | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [previewEntryId, setPreviewEntryId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(33); // Percentage (default 33%)
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track if we're on desktop for responsive splitter
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load entries for current page
  const loadEntries = useCallback(async () => {
    if (!user?.id) {
      setEntries([]);
      return;
    }

    const pageEntries = await getEntriesForPage(script.script_id, currentPage, user.id);
    setEntries(pageEntries);
  }, [script.script_id, currentPage, user?.id]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Handle splitter drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain between 20% and 60%
    const constrainedWidth = Math.min(Math.max(newWidth, 20), 60);
    setPanelWidth(constrainedWidth);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClickComplete = (selection: {
    pageNumber: number;
    selectionBox: SelectionBox;
    selectionText: string | null;
    selectionType: 'text';
  }) => {
    setPendingSelection(selection);
    setShowAddDialog(true);
  };

  const handleSaveNewEntry = async (blockingText: string, indexNumber: number, annotationType: AnnotationType) => {
    if (!pendingSelection || !user) return;

    const newEntry: BlockingEntry = {
      entry_id: generateId(),
      script_id: script.script_id,
      page_number: pendingSelection.pageNumber,
      index_number: indexNumber,
      selection_type: pendingSelection.selectionType,
      selection_text: pendingSelection.selectionText,
      selection_box: pendingSelection.selectionBox,
      blocking_text: blockingText,
      annotation_type: annotationType,
      color: getAnnotationColor(annotationType),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveBlockingEntry(newEntry, user.id);
    setPendingSelection(null);
    await loadEntries();
  };

  const handleUpdateEntry = async (entry: BlockingEntry) => {
    await loadEntries();
  };

  const handleDeleteEntry = async (entryId: string) => {
    await loadEntries();
  };

  // Handle cue circle click
  const handleCueCircleClick = (entryId: string) => {
    if (isPanelCollapsed) {
      // Show slide-out preview
      setPreviewEntryId(entryId);
    } else {
      // Scroll to and highlight card in panel
      setSelectedEntryId(entryId);
    }
  };

  const handleClosePreview = () => {
    setPreviewEntryId(null);
  };

  const handlePreviewUpdate = async () => {
    await loadEntries();
  };

  const suggestedIndex = entries.length > 0
    ? Math.max(...entries.map(e => e.index_number)) + 1
    : 1;

  const existingIndices = entries.map(e => e.index_number);

  const handleExit = () => {
    onExit();
  };

  const previewEntry = previewEntryId ? entries.find(e => e.entry_id === previewEntryId) : null;

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-xl font-bold truncate">{script.title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {script.total_pages} pages
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExit} className="w-full sm:w-auto">
          Exit
        </Button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex flex-col md:flex-row overflow-hidden"
      >
        {/* Left Panel - Cue Cards */}
        <div
          className="border-b md:border-b-0 md:border-r bg-white overflow-hidden max-h-[40vh] md:max-h-none w-full"
          style={
            isPanelCollapsed
              ? { width: '48px', minWidth: '48px', maxWidth: '48px', flexShrink: 0 }
              : isDesktop
              ? { width: `${panelWidth}%`, minWidth: '20%', maxWidth: '60%', flexShrink: 0 }
              : undefined
          }
        >
          <BlockingChart
            entries={entries}
            currentPage={currentPage}
            selectedEntryId={selectedEntryId}
            onSelectEntry={setSelectedEntryId}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            isCollapsed={isPanelCollapsed}
            onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
          />
        </div>

        {/* Splitter - Desktop Only */}
        {!isPanelCollapsed && isDesktop && (
          <div
            className="hidden md:block w-1.5 bg-gray-300 hover:bg-blue-400 active:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors"
            onMouseDown={handleMouseDown}
            style={{
              zIndex: 10,
              minWidth: '6px',
              maxWidth: '6px',
            }}
            title="Drag to resize panels"
          />
        )}

        {/* Right Panel - PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          <PDFViewer
            scriptId={script.script_id}
            pdfBlob={script.pdf_blob}
            totalPages={script.total_pages}
            currentPage={currentPage}
            entries={entries}
            selectedEntryId={selectedEntryId}
            userId={user?.id || ''}
            onPageChange={setCurrentPage}
            onSelectEntry={setSelectedEntryId}
            onClickComplete={handleClickComplete}
            onCueCircleClick={handleCueCircleClick}
          />
        </div>
      </div>

      <AddBlockingDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        selectedText={pendingSelection?.selectionText || null}
        suggestedIndex={suggestedIndex}
        existingIndices={existingIndices}
        onSave={handleSaveNewEntry}
      />

      {previewEntry && user && (
        <CuePreview
          entry={previewEntry}
          userId={user.id}
          onClose={handleClosePreview}
          onUpdate={handlePreviewUpdate}
          existingIndices={existingIndices}
        />
      )}
    </div>
  );
}
