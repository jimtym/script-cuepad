'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';

// Dynamic import for PDF.js to avoid SSR issues
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
import type { BlockingEntry, SelectionBox, HighlightMark } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { getAnnotationColor } from '@/lib/annotation-types';
import { getHighlightsForPage, saveHighlightMark, deleteHighlightMark } from '@/actions/highlights';
import { HIGHLIGHT_PRESETS, DEFAULT_PRESET, getPresetByName, type HighlightPreset } from '@/lib/highlight-presets';

// Client-side ID generation
function generateId(): string {
  return crypto.randomUUID();
}

// Initialize PDF.js on client side only
if (typeof window !== 'undefined' && !pdfjsLib) {
  import('pdfjs-dist').then((pdfjs) => {
    pdfjsLib = pdfjs;
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  });
}

interface PDFViewerProps {
  scriptId: string;
  pdfBlob: Blob;
  totalPages: number;
  currentPage: number;
  entries: BlockingEntry[];
  selectedEntryId: string | null;
  userId: string;
  onPageChange: (page: number) => void;
  onSelectEntry: (entryId: string | null) => void;
  onClickComplete: (selection: {
    pageNumber: number;
    selectionBox: SelectionBox;
    selectionText: string | null;
    selectionType: 'text';
  }) => void;
  onCueCircleClick: (entryId: string) => void;
}

export function PDFViewer({
  scriptId,
  pdfBlob,
  totalPages,
  currentPage,
  entries,
  selectedEntryId,
  userId,
  onPageChange,
  onSelectEntry,
  onClickComplete,
  onCueCircleClick,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ promise: Promise<void>; cancel: () => void } | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasTextLayer, setHasTextLayer] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  // Highlight mode state - initialize from localStorage or defaults
  const [highlightMode, setHighlightMode] = useState<'off' | 'draw' | 'erase'>('off');
  const [selectedPreset, setSelectedPreset] = useState<HighlightPreset>(() => {
    if (typeof window !== 'undefined') {
      const savedPresetName = localStorage.getItem('highlightPresetName');
      if (savedPresetName) {
        const preset = getPresetByName(savedPresetName);
        if (preset) return preset;
      }
    }
    return DEFAULT_PRESET;
  });
  const [highlightColor, setHighlightColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('highlightColor') || selectedPreset.color;
    }
    return selectedPreset.color;
  });
  const [highlightThickness, setHighlightThickness] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('highlightThickness');
      return saved ? parseInt(saved) : selectedPreset.thickness;
    }
    return selectedPreset.thickness;
  });
  const [highlightOpacity, setHighlightOpacity] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('highlightOpacity');
      return saved ? parseFloat(saved) : selectedPreset.opacity;
    }
    return selectedPreset.opacity;
  });
  const [highlights, setHighlights] = useState<HighlightMark[]>([]);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawingHighlight, setIsDrawingHighlight] = useState(false);
  const [highlightHistory, setHighlightHistory] = useState<string[]>([]); // Full undo stack
  const [zoomLevel, setZoomLevel] = useState(() => {
    // Load zoom from localStorage or use default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pdfZoomLevel');
      return saved ? parseFloat(saved) : 1.5;
    }
    return 1.5;
  });
  const [pageRenderKey, setPageRenderKey] = useState(0); // Trigger overlay updates after page renders

  // Load banner visibility preference from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('infoBannerDismissed');
    if (dismissed === 'true') {
      setShowInfoBanner(false);
    }
  }, []);

  const handleDismissBanner = () => {
    setShowInfoBanner(false);
    localStorage.setItem('infoBannerDismissed', 'true');
  };

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3.0)); // Max 300%
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5)); // Min 50%
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1.5); // Reset to default
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleZoomReset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset]);

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: HighlightPreset) => {
    setSelectedPreset(preset);
    setHighlightColor(preset.color);
    // Keep user's custom opacity and thickness settings

    // Persist to localStorage
    localStorage.setItem('highlightPresetName', preset.name);
    localStorage.setItem('highlightColor', preset.color);
  }, []);

  // Persist opacity changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('highlightOpacity', highlightOpacity.toString());
    }
  }, [highlightOpacity]);

  // Persist thickness changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('highlightThickness', highlightThickness.toString());
    }
  }, [highlightThickness]);

  // Persist zoom level changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pdfZoomLevel', zoomLevel.toString());
    }
  }, [zoomLevel]);

  // Undo last highlight (supports multiple undos)
  const handleUndoHighlight = useCallback(async () => {
    if (highlightHistory.length === 0) return;

    // Pop the last action from history
    const lastId = highlightHistory[highlightHistory.length - 1];
    const newHistory = highlightHistory.slice(0, -1);

    await deleteHighlightMark(lastId, userId);
    const updatedHighlights = await getHighlightsForPage(scriptId, currentPage, userId);
    setHighlights(updatedHighlights);
    setHighlightHistory(newHistory);
  }, [highlightHistory, scriptId, currentPage, userId]);

  // Erase highlight at point
  const handleEraseAtPoint = useCallback(async (x: number, y: number) => {
    if (!canvasRef.current ) return;

    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;

    // Convert to normalized coordinates
    const normX = x / canvasWidth;
    const normY = y / canvasHeight;

    // Find highlights near this point
    for (const mark of highlights) {
      // Parse path data to check if point is near the path
      const pathPoints = mark.path_data.match(/[\d.]+/g);
      if (!pathPoints) continue;

      for (let i = 0; i < pathPoints.length; i += 2) {
        const px = parseFloat(pathPoints[i]);
        const py = parseFloat(pathPoints[i + 1]);

        // Check distance
        const distance = Math.sqrt(Math.pow(px - normX, 2) + Math.pow(py - normY, 2));
        const threshold = 0.02; // Normalized threshold

        if (distance < threshold) {
          await deleteHighlightMark(mark.mark_id, userId);
          const updatedHighlights = await getHighlightsForPage(scriptId, currentPage, userId);
          setHighlights(updatedHighlights);
          return;
        }
      }
    }
  }, [highlights, scriptId, currentPage, userId]);

  // Clear all highlights on current page
  const handleClearAllHighlights = useCallback(async () => {
    if (!confirm('Clear all highlights on this page?')) return;

    for (const mark of highlights) {
      await deleteHighlightMark(mark.mark_id, userId);
    }

    const updatedHighlights = await getHighlightsForPage(scriptId, currentPage, userId);
    setHighlights(updatedHighlights);
    setHighlightHistory([]); // Clear undo history
  }, [highlights, scriptId, currentPage, userId]);

  // Load highlights for current page and reset undo history
  useEffect(() => {
    const loadHighlights = async () => {
      const pageHighlights = await getHighlightsForPage(scriptId, currentPage, userId);
      setHighlights(pageHighlights);
      setHighlightHistory([]); // Reset undo history on page change
    };
    loadHighlights();
  }, [scriptId, currentPage, userId]);

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      if (!pdfjsLib) {
        // Wait for PDF.js to load
        const pdfjs = await import('pdfjs-dist');
        pdfjsLib = pdfjs;
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }

      try {
        setLoading(true);
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setLoading(false);
        alert('Failed to load PDF file. Please try uploading the script again.');
      }
    };

    loadPDF();
  }, [pdfBlob]);

  // Render page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    const page = await pdfDoc.getPage(pageNum);
    // Get viewport respecting the PDF's native rotation
    const viewport = page.getViewport({ scale: zoomLevel });

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas dimensions before clearing
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Clear previous render
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Render with explicit viewport
    renderTaskRef.current = page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    });

    try {
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;
      // Trigger overlay re-renders after PDF page is fully rendered
      setPageRenderKey(prev => prev + 1);
    } catch (error) {
      if ((error as Error)?.name !== 'RenderingCancelledException') {
        console.error('PDF rendering error:', error);
      }
    }

    // Render text layer
    const textContent = await page.getTextContent();
    const textLayer = textLayerRef.current;
    textLayer.innerHTML = '';
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;

    const textItems = textContent.items.filter((item): item is TextItem => 'str' in item);

    // Check if PDF has meaningful text content
    const hasText = textItems.length > 0 && textItems.some(item => item.str.trim().length > 0);
    setHasTextLayer(hasText);

    if (hasText) {
      for (const item of textItems) {
        const tx = pdfjsLib!.Util.transform(viewport.transform, item.transform);
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = `${tx[4]}px`;
        div.style.top = `${tx[5]}px`;
        div.style.fontSize = `${Math.abs(tx[0])}px`;
        div.style.fontFamily = item.fontName;
        div.textContent = item.str;
        div.classList.add('pdf-text-item');
        textLayer.appendChild(div);
      }
    }

    // Setup selection canvas to match PDF canvas dimensions
    if (selectionCanvasRef.current) {
      selectionCanvasRef.current.width = viewport.width;
      selectionCanvasRef.current.height = viewport.height;
    }
  }, [pdfDoc, zoomLevel]);

  // Render highlights with lines to margins
  const renderHighlights = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // Remove existing highlights
    const existingHighlights = containerRef.current.querySelectorAll('.blocking-annotation');
    for (const highlight of existingHighlights) {
      highlight.remove();
    }

    const canvas = canvasRef.current;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    for (const entry of entries) {
      if (entry.page_number !== currentPage) continue;

      const textX = entry.selection_box.x * canvasWidth;
      const textY = entry.selection_box.y * canvasHeight;
      const textWidth = entry.selection_box.width * canvasWidth;
      const textHeight = entry.selection_box.height * canvasHeight;

      // Determine which half of page the trigger is on
      const centerX = textX + (textWidth / 2);
      const pageMidline = canvasWidth / 2;
      const isLeftHalf = centerX < pageMidline;

      // Vertical position: Right at the bottom of the lasso selection
      const lineY = textY + textHeight;

      // Horizontal offset to move away from text before extending to margin
      const horizontalOffset = 10;

      // Rule A: Left half → line from right edge of trigger to left margin
      // Rule B: Right half → line from left edge of trigger to right margin
      let lineStartX: number;
      let offsetX: number;
      let lineEndX: number;

      if (isLeftHalf) {
        // Going to LEFT margin
        lineStartX = textX + textWidth; // Right edge of trigger
        offsetX = lineStartX + horizontalOffset; // Move right first
        lineEndX = 20; // Left margin anchor
      } else {
        // Going to RIGHT margin
        lineStartX = textX; // Left edge of trigger
        offsetX = lineStartX - horizontalOffset; // Move left first
        lineEndX = canvasWidth - 20; // Right margin anchor
      }

      // Create SVG for the line
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('blocking-annotation');
      svg.style.position = 'absolute';
      svg.style.left = '0';
      svg.style.top = '0';
      svg.style.width = `${canvasWidth}px`;
      svg.style.height = `${canvasHeight}px`;
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '10';

      // Draw polyline with 3 points: trigger edge → offset point → margin
      const annotationColor = getAnnotationColor(entry.annotation_type);
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      const points = `${lineStartX},${lineY} ${offsetX},${lineY} ${lineEndX},${lineY}`;
      polyline.setAttribute('points', points);
      polyline.setAttribute('stroke', annotationColor);
      polyline.setAttribute('stroke-width', entry.entry_id === selectedEntryId ? '2' : '1.5');
      polyline.setAttribute('fill', 'none');
      svg.appendChild(polyline);

      // Draw circle with index number at margin
      const circleY = lineY - 15; // Above the line

      // Create clickable group for circle and text
      const clickableGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      clickableGroup.style.cursor = 'pointer';
      clickableGroup.style.pointerEvents = 'auto';
      clickableGroup.addEventListener('click', () => {
        onCueCircleClick(entry.entry_id);
      });

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', lineEndX.toString());
      circle.setAttribute('cy', circleY.toString());
      circle.setAttribute('r', '12');
      circle.setAttribute('fill', annotationColor);
      circle.setAttribute('stroke', entry.entry_id === selectedEntryId ? '#000' : 'none');
      circle.setAttribute('stroke-width', '2');
      clickableGroup.appendChild(circle);

      // Add index number text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', lineEndX.toString());
      text.setAttribute('y', circleY.toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#fff');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', 'bold');
      text.textContent = entry.index_number.toString();
      clickableGroup.appendChild(text);

      svg.appendChild(clickableGroup);
      containerRef.current.appendChild(svg);
    }
  }, [entries, currentPage, selectedEntryId, onCueCircleClick]);

  // Draw selection rectangle
  const drawSelectionRect = useCallback(() => {
    if (!selectionCanvasRef.current || !selectionStart || !selectionEnd) return;

    const canvas = selectionCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(x, y, width, height);
  }, [selectionStart, selectionEnd]);

  useEffect(() => {
    if (isDrawing && highlightMode === 'off') {
      drawSelectionRect();
    } else if (!isDrawing && !isDrawingHighlight && selectionCanvasRef.current) {
      // Clear canvas when not in use
      const ctx = selectionCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, selectionCanvasRef.current.width, selectionCanvasRef.current.height);
      }
    }
  }, [isDrawing, isDrawingHighlight, highlightMode, drawSelectionRect]);

  // Draw current highlight path
  const drawCurrentHighlight = useCallback(() => {
    if (!selectionCanvasRef.current || currentPath.length < 2) return;

    const canvas = selectionCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply opacity to color
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    ctx.strokeStyle = hexToRgba(highlightColor, highlightOpacity);
    ctx.lineWidth = highlightThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i].x, currentPath[i].y);
    }
    ctx.stroke();
  }, [currentPath, highlightColor, highlightThickness, highlightOpacity]);

  useEffect(() => {
    if (isDrawingHighlight && highlightMode === 'draw') {
      drawCurrentHighlight();
    }
  }, [isDrawingHighlight, highlightMode, drawCurrentHighlight]);

  // Render saved highlights
  const renderSavedHighlights = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // Remove existing highlight SVGs
    const existingHighlights = containerRef.current.querySelectorAll('.highlight-mark');
    for (const highlight of existingHighlights) {
      highlight.remove();
    }

    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;

    for (const mark of highlights) {
      // Convert normalized path back to absolute coordinates
      const absolutePath = mark.path_data.replace(/([ML])\s+([\d.]+)\s+([\d.]+)/g, (match, cmd, x, y) => {
        const absX = parseFloat(x) * canvasWidth;
        const absY = parseFloat(y) * canvasHeight;
        return `${cmd} ${absX} ${absY}`;
      });

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('highlight-mark');
      svg.style.position = 'absolute';
      svg.style.left = '0';
      svg.style.top = '0';
      svg.style.width = `${canvasWidth}px`;
      svg.style.height = `${canvasHeight}px`;
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '5'; // Below annotations (10) but above PDF

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', absolutePath);
      path.setAttribute('stroke', mark.color);
      path.setAttribute('stroke-width', mark.thickness.toString());
      path.setAttribute('stroke-opacity', (mark.opacity || 0.4).toString());
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);

      containerRef.current.appendChild(svg);
    }
  }, [highlights]);

  // Handle mouse down - start selection, highlight, or erase
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    if (highlightMode === 'draw') {
      // Start highlight drawing
      setIsDrawingHighlight(true);
      setCurrentPath([{ x, y }]);
    } else if (highlightMode === 'erase') {
      // Check if clicking on a highlight to erase
      handleEraseAtPoint(x, y);
    } else {
      // Start annotation selection
      setIsDrawing(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
    }
  }, [highlightMode, handleEraseAtPoint]);

  // Handle mouse move - update selection, highlight, or erase
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    if (highlightMode === 'draw' && isDrawingHighlight) {
      // Add point to highlight path
      setCurrentPath(prev => [...prev, { x, y }]);
    } else if (highlightMode === 'erase' && e.buttons === 1) {
      // Erase while dragging
      handleEraseAtPoint(x, y);
    } else if (isDrawing) {
      // Update annotation selection
      setSelectionEnd({ x, y });
    }
  }, [highlightMode, isDrawingHighlight, isDrawing, handleEraseAtPoint]);

  // Handle mouse up - complete selection or highlight
  const handleMouseUp = useCallback(async () => {
    // Handle highlight completion
    if (highlightMode === 'draw' && isDrawingHighlight && currentPath.length > 1 && canvasRef.current) {
      const canvasWidth = canvasRef.current.width;
      const canvasHeight = canvasRef.current.height;

      // Convert path to SVG path string with normalized coordinates
      const pathString = currentPath.map((point, index) => {
        const normalizedX = point.x / canvasWidth;
        const normalizedY = point.y / canvasHeight;
        return `${index === 0 ? 'M' : 'L'} ${normalizedX} ${normalizedY}`;
      }).join(' ');

      // Save highlight mark
      const markId = generateId();
      const newMark: HighlightMark = {
        mark_id: markId,
        script_id: scriptId,
        page_number: currentPage,
        path_data: pathString,
        color: highlightColor,
        thickness: highlightThickness,
        opacity: highlightOpacity,
        created_at: new Date().toISOString(),
      };

      await saveHighlightMark(newMark, userId);
      setHighlightHistory(prev => [...prev, markId]); // Add to undo history

      // Reload highlights
      const updatedHighlights = await getHighlightsForPage(scriptId, currentPage, userId);
      setHighlights(updatedHighlights);

      setIsDrawingHighlight(false);
      setCurrentPath([]);
      return;
    }

    // Handle annotation selection
    if (!isDrawing || !selectionStart || !selectionEnd || !canvasRef.current) {
      setIsDrawing(false);
      setIsDrawingHighlight(false);
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;

    // Calculate selection rectangle
    const x1 = Math.min(selectionStart.x, selectionEnd.x);
    const y1 = Math.min(selectionStart.y, selectionEnd.y);
    const x2 = Math.max(selectionStart.x, selectionEnd.x);
    const y2 = Math.max(selectionStart.y, selectionEnd.y);

    // Find text within selection (for display only)
    let selectedText = '';

    if (hasTextLayer && textLayerRef.current) {
      const textElements = textLayerRef.current.querySelectorAll('.pdf-text-item');
      const textsInSelection: string[] = [];
      const seenPositions = new Set<string>();

      for (const element of textElements) {
        const rect = element.getBoundingClientRect();
        const elemX = rect.left - canvasRect.left;
        const elemY = rect.top - canvasRect.top;
        const elemRight = elemX + rect.width;
        const elemBottom = elemY + rect.height;

        // Check if element overlaps with selection
        if (elemRight >= x1 && elemX <= x2 && elemBottom >= y1 && elemY <= y2) {
          const text = element.textContent || '';
          // Use position as key to avoid duplicates (same text at same position)
          const posKey = `${elemX.toFixed(0)},${elemY.toFixed(0)},${text}`;

          if (text.trim() && !seenPositions.has(posKey)) {
            textsInSelection.push(text);
            seenPositions.add(posKey);
          }
        }
      }

      if (textsInSelection.length > 0) {
        selectedText = textsInSelection.join(' ');
      }
    }

    // Always use the lasso rectangle for positioning (simpler and more predictable)
    const finalX = x1;
    const finalY = y1;
    const finalWidth = x2 - x1;
    const finalHeight = y2 - y1;

    const selectionBox: SelectionBox = {
      x: finalX / canvasWidth,
      y: finalY / canvasHeight,
      width: finalWidth / canvasWidth,
      height: finalHeight / canvasHeight,
    };

    // Clear selection visual
    if (selectionCanvasRef.current) {
      const ctx = selectionCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, selectionCanvasRef.current.width, selectionCanvasRef.current.height);
      }
    }

    setIsDrawing(false);
    setSelectionStart(null);
    setSelectionEnd(null);

    onClickComplete({
      pageNumber: currentPage,
      selectionBox,
      selectionText: selectedText || null,
      selectionType: 'text',
    });
  }, [highlightMode, isDrawingHighlight, currentPath, scriptId, currentPage, highlightColor, highlightThickness, highlightOpacity, isDrawing, selectionStart, selectionEnd, onClickComplete, hasTextLayer, userId]);

  // Setup mouse event listeners
  useEffect(() => {
    const canvas = selectionCanvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (pdfDoc && currentPage >= 1 && currentPage <= totalPages) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, totalPages, zoomLevel, renderPage]);

  // Render overlays after page has fully rendered
  useEffect(() => {
    if (pageRenderKey > 0) {
      renderHighlights();
      renderSavedHighlights();
    }
  }, [pageRenderKey, entries, selectedEntryId, highlights, renderHighlights, renderSavedHighlights]);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading PDF...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* MAIN TOOLBAR - Single Row, Three Fixed Zones */}
      <div className="border-b bg-white">
        <div className="grid grid-cols-[auto_1fr_auto] items-center px-3 py-2 gap-4">
          {/* LEFT ZONE: Page Navigation Only */}
          <div className="flex items-center gap-1">
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoPrev}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              ←
            </Button>
            <select
              value={currentPage}
              onChange={(e) => onPageChange(Number(e.target.value))}
              className="border rounded h-8 px-2 text-sm min-w-[70px]"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>
            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoNext}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              →
            </Button>
          </div>

          {/* CENTER ZONE: Page Info Only */}
          <div className="text-center text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>

          {/* RIGHT ZONE: Mode Buttons (ANCHORED - Never Moves) */}
          <div className="flex items-center gap-0.5 border rounded bg-gray-50 p-0.5">
            <Button
              variant={highlightMode === 'off' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setHighlightMode('off')}
              className="h-8 px-3 text-xs font-medium"
            >
              Annotate
            </Button>
            <Button
              variant={highlightMode === 'draw' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setHighlightMode('draw')}
              className="h-8 px-3 text-xs font-medium"
            >
              Draw
            </Button>
            <Button
              variant={highlightMode === 'erase' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setHighlightMode('erase')}
              className="h-8 px-3 text-xs font-medium"
            >
              Erase
            </Button>
          </div>
        </div>

        {/* TOOL OPTIONS BAR - Separate Row, Only Visible When Needed */}
        {highlightMode !== 'off' && (
          <div className="border-t bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-3 flex-wrap">
              {highlightMode === 'draw' && (
                <>
                  {/* Color Swatches */}
                  <div className="flex items-center gap-1">
                    {HIGHLIGHT_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleSelectPreset(preset)}
                        className="w-7 h-7 rounded border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: preset.color,
                          borderColor: selectedPreset.name === preset.name ? '#000' : '#d1d5db',
                        }}
                        title={preset.name}
                        aria-label={preset.name}
                      />
                    ))}
                  </div>

                  {/* Thickness */}
                  <select
                    value={highlightThickness}
                    onChange={(e) => setHighlightThickness(Number(e.target.value))}
                    className="border rounded h-8 px-2 text-xs bg-white"
                  >
                    <option value="2">Thin</option>
                    <option value="4">Medium</option>
                    <option value="8">Thick</option>
                    <option value="12">Extra</option>
                  </select>

                  {/* Preview */}
                  <div className="flex items-center justify-center px-3 h-8 border rounded bg-white">
                    <svg width="50" height="16" viewBox="0 0 50 16">
                      <line
                        x1="0"
                        y1="8"
                        x2="50"
                        y2="8"
                        stroke={highlightColor}
                        strokeWidth={Math.min(highlightThickness / 1.5, 8)}
                        strokeOpacity={highlightOpacity}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Opacity */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Opacity:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={highlightOpacity}
                      onChange={(e) => setHighlightOpacity(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-xs text-gray-600 w-8">{Math.round(highlightOpacity * 100)}%</span>
                  </div>

                  {/* Undo */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndoHighlight}
                    disabled={highlightHistory.length === 0}
                    className="h-8 text-xs"
                  >
                    ↶ Undo
                  </Button>
                </>
              )}

              {highlightMode === 'erase' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllHighlights}
                    disabled={highlights.length === 0}
                    className="h-8 text-xs"
                  >
                    Clear Page
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndoHighlight}
                    disabled={highlightHistory.length === 0}
                    className="h-8 text-xs"
                  >
                    ↶ Undo
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ZOOM CONTROLS - Always visible in separate row */}
        <div className="border-t bg-white px-3 py-1.5 flex items-center justify-center gap-2">
          <Button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-base"
          >
            −
          </Button>
          <span className="text-xs font-medium text-gray-600 min-w-[50px] text-center">
            {Math.round((zoomLevel / 1.5) * 100)}%
          </span>
          <Button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3.0}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-base"
          >
            +
          </Button>
          <Button
            onClick={handleZoomReset}
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            title="Reset zoom"
          >
            Reset
          </Button>
        </div>
      </div>
      {showInfoBanner && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-xs sm:text-sm text-blue-800 flex items-center justify-between">
          <span className="truncate">
            {highlightMode === 'draw'
              ? '✏️ Draw freely to highlight'
              : highlightMode === 'erase'
              ? '🧹 Click to erase highlights'
              : '💡 Drag to select text'}
          </span>
          <button
            onClick={handleDismissBanner}
            className="ml-2 text-blue-600 hover:text-blue-800 font-bold text-base leading-none flex-shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        <div ref={containerRef} className="relative inline-block">
          <canvas ref={canvasRef} className="border shadow-lg bg-white" />
          <div
            ref={textLayerRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ userSelect: 'none' }}
          />
          <canvas
            ref={selectionCanvasRef}
            className="absolute top-0 left-0"
            style={{
              pointerEvents: 'auto',
              cursor: highlightMode === 'draw'
                ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\'><path fill=\'%23000\' d=\'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z\'/></svg>") 2 18, crosshair'
                : highlightMode === 'erase'
                ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\'><rect x=\'2\' y=\'8\' width=\'16\' height=\'10\' rx=\'2\' fill=\'%23f44336\' stroke=\'%23000\' stroke-width=\'1\'/><line x1=\'4\' y1=\'10\' x2=\'16\' y2=\'16\' stroke=\'%23fff\' stroke-width=\'2\'/></svg>") 10 10, pointer'
                : 'crosshair'
            }}
          />
        </div>
      </div>
    </div>
  );
}
