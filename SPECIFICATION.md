# CuePad - Complete Technical Specification

## 1. Product Overview

### 1.1 Purpose
CuePad is a professional web-based application designed for theatre directors to annotate PDF scripts with blocking notes, lighting cues, sound cues, and other production cues. The app provides a professional prompt-book experience with visual cue markers, freeform highlighting, and persistent storage.

**Product Name:** CuePad
**Domain:** cuepad.app

### 1.2 Core User Workflows
1. Upload a PDF script
2. Navigate through pages
3. Create annotations by selecting text with lasso rectangle
4. Add indexed blocking notes with type classification
5. Highlight important sections with translucent markers
6. Click annotation circles to view corresponding notes
7. Edit and delete annotations
8. All data persists automatically across sessions

---

## 2. Technical Stack

### 2.1 Framework & Libraries
- **Framework**: Next.js 15 with TypeScript
- **UI Components**: Custom components using Tailwind CSS and Radix UI primitives
- **PDF Rendering**: PDF.js (pdfjs-dist)
- **Storage**: IndexedDB (client-side)
- **Package Manager**: Bun
- **Dev Server**: Next.js with Turbopack

### 2.2 Browser Requirements
- Modern browsers with IndexedDB support (Chrome, Firefox, Safari, Edge)
- No server required after initial page load
- All data stored locally in browser

---

## 3. Data Models

### 3.1 Script
```typescript
interface Script {
  script_id: string;          // Unique identifier
  title: string;              // User-defined title
  pdf_blob: Blob;            // PDF file as Blob
  total_pages: number;       // Number of pages in PDF
  created_at: string;        // ISO timestamp
}
```

### 3.2 BlockingEntry (Annotation)
```typescript
interface BlockingEntry {
  entry_id: string;          // Unique identifier
  script_id: string;         // Foreign key to Script
  page_number: number;       // Page this annotation appears on
  index_number: number;      // Sequential index (1, 2, 3...)
  selection_type: 'text';    // Always 'text' (legacy field)
  selection_text: string | null;  // Extracted text from selection
  selection_box: SelectionBox;    // Normalized coordinates
  blocking_text: string;     // The annotation content
  annotation_type: AnnotationType; // Type classification
  color: string;             // Hex color (deprecated, use annotation_type)
  created_at: string;        // ISO timestamp
  updated_at: string;        // ISO timestamp
}

interface SelectionBox {
  x: number;                 // Normalized 0-1 (left)
  y: number;                 // Normalized 0-1 (top)
  width: number;             // Normalized 0-1
  height: number;            // Normalized 0-1
}
```

### 3.3 AnnotationType
```typescript
type AnnotationType =
  | 'Blocking'
  | 'Music Cue'
  | 'Lighting Cue'
  | 'Sound / Audio Cue'
  | 'Projection / Media'
  | 'Prop Note'
  | 'Costume Note'
  | 'Set / Scenic Note'
  | 'Director Note';
```

**Color Mapping:**
```typescript
const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  'Blocking': '#DAA520',           // Goldenrod
  'Music Cue': '#9C27B0',          // Purple
  'Lighting Cue': '#FFC107',       // Amber
  'Sound / Audio Cue': '#2196F3',  // Blue
  'Projection / Media': '#00BCD4', // Cyan
  'Prop Note': '#4CAF50',          // Green
  'Costume Note': '#E91E63',       // Pink
  'Set / Scenic Note': '#795548',  // Brown
  'Director Note': '#F44336',      // Red
};
```

### 3.4 HighlightMark
```typescript
interface HighlightMark {
  mark_id: string;           // Unique identifier
  script_id: string;         // Foreign key to Script
  page_number: number;       // Page this highlight appears on
  path_data: string;         // SVG path string (normalized coordinates)
  color: string;             // Hex color
  thickness: number;         // Stroke thickness (2, 3, 5, 8)
  opacity: number;           // 0.1 to 1.0
  created_at: string;        // ISO timestamp
}
```

### 3.5 HighlightPreset
```typescript
interface HighlightPreset {
  name: string;              // Display name
  color: string;             // Hex color
  opacity: number;           // Default opacity
  thickness: number;         // Default thickness
  description: string;       // Usage description
}

const HIGHLIGHT_PRESETS: HighlightPreset[] = [
  { name: 'Yellow', color: '#FFF59D', opacity: 0.5, thickness: 8, description: 'General emphasis' },
  { name: 'Light Blue', color: '#B3E5FC', opacity: 0.5, thickness: 8, description: 'Technical awareness' },
  { name: 'Light Green', color: '#C8E6C9', opacity: 0.5, thickness: 8, description: 'Blocking that works' },
  { name: 'Pink', color: '#F8BBD0', opacity: 0.5, thickness: 8, description: 'Emotional beats' },
  { name: 'Orange', color: '#FFE0B2', opacity: 0.5, thickness: 8, description: 'Needs attention' },
  { name: 'Lavender', color: '#E1BEE7', opacity: 0.5, thickness: 8, description: 'Director notes' },
];
```

---

## 4. IndexedDB Schema

### 4.1 Database Configuration
```typescript
const DB_NAME = 'ScriptBlockingDB';
const DB_VERSION = 2;

// Object Stores
const SCRIPTS_STORE = 'scripts';
const ENTRIES_STORE = 'blocking_entries';
const HIGHLIGHTS_STORE = 'highlight_marks';
```

### 4.2 Indexes
**scripts**: `script_id` (primary key)

**blocking_entries**:
- `entry_id` (primary key)
- `script_id` (index)
- `page_number` (index)
- `['script_id', 'page_number']` (compound index)

**highlight_marks**:
- `mark_id` (primary key)
- `script_id` (index)
- `['script_id', 'page_number']` (compound index)

### 4.3 Operations
- `saveScript(script)` - Create or update script
- `getScript(scriptId)` - Retrieve single script
- `getAllScripts()` - Retrieve all scripts
- `deleteScript(scriptId)` - Delete script and all associated entries/highlights
- `saveBlockingEntry(entry)` - Create or update annotation
- `getEntriesForScript(scriptId)` - Get all annotations for script
- `getEntriesForPage(scriptId, pageNumber)` - Get annotations for specific page
- `deleteBlockingEntry(entryId)` - Delete single annotation
- `saveHighlightMark(mark)` - Create or update highlight
- `getHighlightsForPage(scriptId, pageNumber)` - Get highlights for specific page
- `deleteHighlightMark(markId)` - Delete single highlight

---

## 5. Features & Functionality

### 5.1 Script Upload & Management

#### Upload Flow
1. User clicks "New Script" or "Upload Script"
2. File input accepts `.pdf` files only
3. PDF.js loads the PDF and counts total pages
4. User enters script title (defaults to filename without extension)
5. Script saved to IndexedDB with generated UUID
6. User redirected to annotation view

#### Script List
- Display all uploaded scripts
- Show: title, page count, created date
- Actions: Open, Delete
- Delete confirmation required
- Deletes cascade to all annotations and highlights

### 5.2 PDF Viewer

#### Rendering
- PDF.js renders each page to canvas at 1.5x base scale (configurable via zoom)
- **Native Orientation**: PDF rotation is NEVER overridden - pages display exactly as authored
- Portrait PDFs display portrait, landscape PDFs display landscape
- Each page respects its own native rotation metadata
- Text layer overlaid for text detection and selection
- Pages render on demand (current page only)
- Canvas size matches viewport dimensions scaled by zoom level
- **Render Lifecycle**: Overlays (annotations, highlights) render AFTER PDF canvas completes to ensure perfect alignment

#### Page Navigation
- Previous/Next buttons (← →)
- Page dropdown selector showing "1 / 10" format
- Buttons disabled at boundaries (page 1, last page)

#### Zoom Controls
- **Zoom In** (+): Increases zoom by 25% increments
- **Zoom Out** (−): Decreases zoom by 25% increments
- **Zoom Display**: Shows current zoom percentage (relative to 100% = 1.5x base scale)
- **Reset Zoom** (Reset button): Returns to default zoom (100%)
- **Range**: 50% (0.75x) to 300% (4.5x)
- **Persistence**: Zoom level maintained across:
  - Page navigation
  - Browser sessions (localStorage)
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + +` or `Ctrl/Cmd + =`: Zoom in
  - `Ctrl/Cmd + -`: Zoom out
  - `Ctrl/Cmd + 0`: Reset zoom

**Perfect Alignment System (v42-43):**
- **Coordinates**: All positions stored as normalized 0-1 values (independent of zoom)
- **Render Cycle**: Overlays render AFTER PDF canvas completes
  - PDF canvas renders first
  - `pageRenderKey` increments when PDF render completes
  - Annotations re-render with new canvas dimensions
  - Highlights re-render with new canvas dimensions
- **Result**: Everything scales together as one unified object
- **Guarantee**: Annotations and highlights stay perfectly aligned at ALL zoom levels
  - No drift
  - No misalignment
  - No floating overlays

#### Text Layer
- PDF.js `getTextContent()` extracts text items
- Each text item rendered as positioned `<div>` with:
  - Transparent color (for selection only)
  - Correct position, font size, font family
  - Class `pdf-text-item`
- If no text found (image-based PDF), text layer empty

### 5.3 Annotation System

#### Creating Annotations

**Selection Method:**
1. User clicks and drags to draw lasso rectangle
2. Blue dashed rectangle appears during drag
3. On mouse up:
   - Find all text elements within rectangle
   - Extract text content
   - Use lasso rectangle bounds (not text bounds)
   - Normalize coordinates to 0-1 range
   - Open annotation dialog

**Annotation Dialog:**
- Display selected text (if any)
- Index number input (auto-suggested as max + 1)
- Annotation type selector (9 types)
- Color preview for selected type
- Annotation text textarea
- Validation:
  - Index must be ≥ 1
  - Index must be unique on this page
  - Annotation text required
- Save creates entry in IndexedDB

#### Visual Markers

**Line & Index Circle:**
1. **Line Position**: Bottom of lasso selection rectangle
2. **Line Direction**:
   - If trigger center-X < page midline → line goes to left margin
   - If trigger center-X ≥ page midline → line goes to right margin
3. **Line Path** (3-point polyline):
   - Start: Edge of trigger rectangle (right edge for left, left edge for right)
   - Middle: 10px horizontal offset away from text
   - End: 20px from margin
4. **Circle**:
   - Positioned 15px above line end point
   - Radius: 12px
   - Fill: Annotation type color
   - Stroke: Black (3px) if selected, none otherwise
   - Contains index number (white text, 11px, bold)

**Interaction:**
- Circles are clickable with pointer cursor
- Clicking circle highlights corresponding card in left panel
- Hovering shows pointer cursor

#### Editing Annotations
- Click "Edit" on annotation card
- Inline editing form appears:
  - Index number input
  - Type selector
  - Text textarea
- Save updates `updated_at` timestamp
- Cancel discards changes
- Index uniqueness validated on save

#### Deleting Annotations
- Click "Delete" on annotation card
- Confirmation dialog required
- Removes from IndexedDB
- Visual markers removed immediately

### 5.4 Highlight System

#### Modes
Three mutually exclusive modes:
1. **Annotate** (default): Lasso selection for annotations
2. **Draw**: Freeform highlighting
3. **Erase**: Remove highlights by clicking/dragging

**Mode Toggle:**
- Three buttons anchored to RIGHT of toolbar
- Fixed width (20px each)
- Never move or shift
- Active mode highlighted with default button style

#### Drawing Highlights

**Draw Mode Behavior:**
1. Cursor changes to pen icon
2. Click and drag draws freeform path
3. Path follows mouse continuously
4. Path rendered as SVG with:
   - Selected color
   - Selected thickness
   - Selected opacity
5. On mouse up:
   - Path converted to normalized SVG path string
   - Saved to IndexedDB
   - Added to undo history stack

**Controls (visible in Draw mode only):**
- **Color**: 6 visual swatches (Yellow, Light Blue, Light Green, Pink, Orange, Lavender)
  - Clickable color squares
  - Active color has thick black border
- **Thickness**: Dropdown (Thin=2, Med=4, Thick=8, Extra=12)
- **Visual Stroke Preview**: Live preview showing:
  - Current highlight color
  - Current thickness
  - Current opacity
  - Updates in real-time as settings change
  - Shows exactly what will be drawn
- **Opacity**: Range slider 10-100% (default 50%)
  - Displays percentage value
- **Undo**: Button (↶ Undo) - disabled if history empty

#### Erasing Highlights

**Erase Mode Behavior:**
1. Cursor changes to eraser icon
2. Click on highlight removes it
3. Drag over multiple highlights removes them
4. Detection: Check if click point within threshold of path

**Controls (visible in Erase mode only):**
- **Clear Page**: Remove all highlights on current page (confirmation required)
- **Undo**: Button (↶) - disabled if history empty

#### Undo System

**Full History Stack:**
- Array of mark IDs (`highlightHistory`)
- Each draw action appends to stack
- Undo pops last ID and deletes mark
- Supports multiple consecutive undos
- History resets when changing pages
- History cleared when "Clear Page" used

**Visual Layering (bottom to top):**
1. PDF canvas
2. Highlight marks (z-index: 5)
3. Text layer (pointer-events: none)
4. Annotation lines (z-index: 10)
5. Annotation circles (clickable)
6. Selection canvas (for lasso/drawing)

### 5.5 Persistence

**LocalStorage (User Preferences):**
- `infoBannerDismissed`: boolean - Whether info banner was dismissed
- `highlightPresetName`: string - Last selected preset name
- `highlightColor`: string - Last selected color (hex)
- `highlightOpacity`: string - Last opacity value (0.1-1.0)
- `highlightThickness`: string - Last thickness value (2, 3, 5, or 8)
- `pdfZoomLevel`: string - Last zoom level (0.5-3.0)

**Persistence Behavior:**
- User preferences (zoom, highlight settings) persist across browser sessions
- Content data (scripts, annotations, highlights) persist in IndexedDB
- Temporary UI state (undo history, open menus) does NOT persist
- When user reopens the app, preferences are restored automatically

**IndexedDB:**
- All scripts, annotations, and highlights
- Auto-save on every change
- No explicit save button needed
- Data persists across browser sessions

---

## 6. UI/UX Requirements

### 6.1 Application Title
**"CuePad"**
- Displayed on home page
- Subtitle: "Professional script annotation for theatre directors"
- Official domain: cuepad.app

### 6.2 Layout

#### Home Page
- Header with title and "New Script" button
- Script list showing all uploaded scripts
- Empty state: "No Scripts Yet" with upload prompt

#### Annotation View
- Full screen split layout:
  - **Left panel (1/3 width)**: Annotation list
  - **Right panel (2/3 width)**: PDF viewer
- Mobile: Panels stack vertically (annotations top, PDF bottom)

### 6.3 Toolbar Layout

**Multi-Row Architecture** (rebuilt v44 - production quality):

```
┌──────────────────────────────────────────────────────────────┐
│ [← Pg# →]     Page X of Y     [Annotate|Draw|Erase]         │  Main Row
├──────────────────────────────────────────────────────────────┤
│ [Tool-specific options - only when Draw/Erase active]       │  Options Row (conditional)
├──────────────────────────────────────────────────────────────┤
│                    [− 100% + Reset]                          │  Zoom Row (always visible)
└──────────────────────────────────────────────────────────────┘
```

**MAIN TOOLBAR (Row 1) - CSS Grid Layout:**
- **LEFT ZONE**: Page navigation only
  - Previous button (←)
  - Page number select dropdown
  - Next button (→)
- **CENTER ZONE**: Page info only
  - "Page X of Y" (centered text)
- **RIGHT ZONE**: Mode buttons (ANCHORED - never moves)
  - Annotate / Draw / Erase buttons
  - Fixed position using CSS Grid
  - Clicking modes does NOT shift any buttons

**TOOL OPTIONS ROW (Row 2) - Conditional:**
- Only visible when Draw or Erase mode is active
- **Draw mode**: Color swatches, thickness dropdown, visual stroke preview, opacity slider, undo button
- **Erase mode**: Clear Page button, undo button
- **Annotate mode**: Row hidden completely

**ZOOM CONTROLS ROW (Row 3) - Always Visible:**
- Zoom out (−)
- Zoom percentage display
- Zoom in (+)
- Reset button

**Design Principles:**
- Single-row main toolbar - NEVER wraps, NEVER overflows
- No horizontal scrolling on any screen size
- Mode buttons absolutely anchored to right edge
- No layout reflow when switching modes
- Clean, calm, professional appearance
- Tool options separated into dedicated row to prevent clutter

### 6.4 Annotation List Panel

**Header:**
- Title: "Annotations - Page N"
- Entry count: "X entries"

**Cards:**
- Index circle with type color + number
- Annotation type label (ALL UPPERCASE)
- Trigger text (if available)
- Annotation text content
- Updated timestamp
- Edit and Delete buttons (shortened to "Edit" and "Del" on mobile)

**Selection:**
- Clicking card highlights it (orange border, orange background)
- Corresponding circle on PDF gets thicker border

### 6.5 Info Banner
- Dismissible with × button
- Persistence via localStorage
- Mode-aware messages:
  - Annotate: "💡 Drag to select text"
  - Draw: "✏️ Draw freely to highlight"
  - Erase: "🧹 Click to erase highlights"
- Shortened messages on mobile

### 6.6 Cursors

**Mode-Specific Cursors:**
- **Annotate**: Crosshair
- **Draw**: Custom pen icon (SVG data URL)
- **Erase**: Custom eraser icon (SVG data URL)
- **Annotation circles**: Pointer

---

## 7. Responsive Design

### 7.1 Breakpoints
- **Desktop**: ≥768px (md breakpoint)
- **Mobile/Tablet**: <768px

### 7.2 Mobile Adaptations

**Toolbar:**
- Compact padding (p-3 → p-2)
- Smaller text (text-sm → text-xs)
- Compact controls (smaller swatches, narrower inputs)

**Panels:**
- Stack vertically
- Annotations panel: max-height 40vh
- PDF viewer: remaining height

**Typography:**
- Headings: text-2xl → text-base
- Body text: text-sm → text-xs
- Buttons: Full width on mobile

**Cards:**
- Reduced padding
- Truncated long text
- Compact buttons

---

## 8. Acceptance Criteria

### 8.1 Core Functionality
✅ Upload PDF and create script
✅ Navigate between pages
✅ Select text with lasso rectangle
✅ Create annotation with index and type
✅ Visual line connects trigger to margin
✅ Colored circle shows index number
✅ Edit and delete annotations
✅ Click circle to highlight card
✅ All data persists across sessions

### 8.2 Highlighting
✅ Draw mode with freeform pen tool
✅ Erase mode removes highlights
✅ Undo supports multiple consecutive actions
✅ Undo history resets on page change
✅ 6 preset colors with visual swatches
✅ Adjustable thickness and opacity
✅ Highlights are semi-transparent (default 50%)
✅ Text remains fully readable

### 8.3 UI/UX
✅ **Toolbar (v44 - Complete Rebuild)**
  - Main toolbar is single row - never wraps, never overflows
  - Mode buttons anchored to right edge - NEVER move or shift
  - Clicking Draw/Erase does NOT cause any button to move
  - Tool options appear in separate row (not inline)
  - Zoom controls in dedicated row (always visible)
  - No horizontal scrolling on desktop, tablet, or mobile
  - Clean, professional appearance - not cluttered
✅ **PDF Rendering (v40-41)**
  - Portrait PDFs display upright (not rotated)
  - Landscape PDFs display landscape (not rotated)
  - Native orientation respected - no forced rotation
  - No canvas rendering race conditions
✅ **Zoom & Alignment (v42-43)**
  - Annotations stay perfectly aligned at all zoom levels
  - Highlights stay perfectly aligned at all zoom levels
  - No drift, no misalignment, no floating overlays
  - Overlays render AFTER PDF canvas completes
  - Zoom controls functional with +/- and reset
  - Zoom persists across page navigation
  - Zoom persists across browser sessions
  - Keyboard shortcuts work (Ctrl/Cmd +/-/0)
✅ **Highlight Tools (v42-43)**
  - Visual stroke preview shows current color/thickness/opacity
  - Preview updates in real-time with setting changes
  - Highlight color persists across sessions
  - Highlight opacity persists across sessions
  - Highlight thickness persists across sessions
  - 6 preset colors with visual swatches
  - Undo supports multiple consecutive actions
✅ **General**
  - Annotation types in ALL UPPERCASE
  - Mobile/tablet fully functional
  - Exit button doesn't warn about unsaved changes

### 8.4 Visual Design
✅ Line positioned at bottom of lasso selection
✅ Line connects to nearest margin (left or right)
✅ Circle clickable with pointer cursor
✅ Highlights render below annotations
✅ Custom cursors for each mode
✅ Smooth transitions and hover effects

---

## 9. Technical Implementation Notes

### 9.1 PDF.js Configuration
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

### 9.2 Coordinate Normalization
All positions stored as normalized 0-1 values:
```typescript
const normalizedX = absoluteX / canvasWidth;
const normalizedY = absoluteY / canvasHeight;
```

Convert back for rendering:
```typescript
const absoluteX = normalizedX * canvasWidth;
const absoluteY = normalizedY * canvasHeight;
```

### 9.3 SVG Path Format
Highlight paths stored as SVG path strings with normalized coordinates:
```typescript
const pathString = points.map((point, index) =>
  `${index === 0 ? 'M' : 'L'} ${point.x / width} ${point.y / height}`
).join(' ');
```

### 9.4 ID Generation
```typescript
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
```

### 9.5 Performance Considerations
- Render only current page (not all pages)
- Debounce highlight path updates during drawing
- Use SVG for vector graphics (scalable)
- IndexedDB for large binary data (PDF Blobs)

---

## 10. Known Limitations

1. **Browser Storage**: Limited by IndexedDB quota (typically 50MB+)
2. **PDF Size**: Very large PDFs (100+ MB) may be slow to load
3. **Text Detection**: Image-based PDFs without OCR won't extract text
4. **Export**: No PDF export with annotations baked in
5. **Collaboration**: Single-user only, no sharing or sync
6. **Undo Scope**: Undo only for highlights, not annotations

---

## 11. Future Enhancements (Out of Scope)

- PDF export with annotations rendered
- Multi-user collaboration
- Cloud sync across devices
- OCR for image-based PDFs
- Keyboard shortcuts
- Annotation search/filter
- Print-friendly view
- Custom annotation types
- Undo for annotation creation/deletion
- Annotation history/versioning

---

## 12. File Structure

```
script-blocking/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home page (script list)
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── PDFViewer.tsx         # PDF rendering, selection, highlights
│   │   ├── BlockingChart.tsx     # Annotation list panel
│   │   ├── BlockingPage.tsx      # Main annotation view
│   │   ├── AddBlockingDialog.tsx # Annotation creation dialog
│   │   ├── ScriptSetup.tsx       # Upload form
│   │   └── ui/                   # Reusable UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── textarea.tsx
│   └── lib/
│       ├── types.ts              # TypeScript interfaces
│       ├── db.ts                 # IndexedDB operations
│       ├── utils.ts              # Utility functions
│       ├── annotation-types.ts   # Annotation type definitions
│       └── highlight-presets.ts  # Highlight preset definitions
├── public/
│   └── pdf.worker.min.mjs        # PDF.js worker
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 13. Development Setup

### 13.1 Installation
```bash
bun install
```

### 13.2 Development Server
```bash
bun run dev
```

### 13.3 Build
```bash
bun run build
```

### 13.4 Dependencies
```json
{
  "dependencies": {
    "next": "15.3.2",
    "react": "^19",
    "react-dom": "^19",
    "pdfjs-dist": "^4.0.0",
    "@radix-ui/react-dialog": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^19",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 14. Testing Checklist

### Functional Tests
- [x] Upload PDF successfully
- [x] Navigate all pages
- [x] Zoom in/out with buttons
- [x] Reset zoom to default (100%)
- [x] Zoom with keyboard shortcuts (Ctrl/Cmd +/-/0)
- [x] Verify zoom persists when changing pages
- [x] Verify annotations align correctly at all zoom levels
- [x] Verify PDF displays in native orientation (no forced rotation)
- [x] Create annotation with lasso selection
- [x] Edit annotation index, type, and text
- [x] Delete annotation
- [x] Click annotation circle to highlight card
- [x] Switch between Annotate/Draw/Erase modes - verify buttons don't move
- [x] Draw highlights in multiple colors
- [x] Verify visual stroke preview updates with color/thickness/opacity
- [x] Undo multiple highlight actions
- [x] Erase highlights by clicking
- [x] Clear all highlights on page
- [x] Change pages - verify undo history resets
- [x] Reload browser - verify all data persists
- [x] Reload browser - verify zoom level persists
- [x] Reload browser - verify highlight color persists
- [x] Set zoom to 150%, reload, verify still 150%
- [x] Select Pink highlight, reload, verify still Pink
- [x] Delete script - verify cascade delete

### UI/UX Tests
- [x] Mode buttons stay anchored to right
- [x] Clicking Draw/Erase does NOT move any toolbar buttons
- [x] Toolbar fits without horizontal overflow on mobile
- [x] Toolbar is single row - never wraps
- [x] Tool options appear in separate row (not inline)
- [x] Info banner dismisses and stays dismissed
- [x] Annotation type labels are uppercase
- [x] Cursors change per mode
- [x] Circles clickable with pointer cursor
- [x] Mobile layout stacks vertically
- [x] All text readable at all sizes

### Edge Cases
- [ ] Empty PDF (0 pages) - should reject
- [ ] Image-based PDF without text - annotations still work
- [ ] Duplicate index numbers - validation prevents
- [ ] Very long script title - truncates properly
- [ ] Many annotations (100+) - performance acceptable
- [ ] Large PDF (50+ MB) - loads successfully

---

**END OF SPECIFICATION**

*Version: 2.0*
*Last Updated: 2025-12-22*

**Version History:**
- v1.0 (2025-12-21): Initial specification
- v2.0 (2025-12-22): Updated for critical fixes
  - PDF orientation lock (v40-41)
  - Pen size preview & zoom alignment (v42-43)
  - Complete toolbar rebuild (v44)
