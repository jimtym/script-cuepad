# CuePad

**Professional script annotation for theatre directors**

Official domain: [cuepad.app](https://cuepad.app)

A cloud-based web application for theatre directors to upload PDF scripts and add blocking notes, lighting cues, sound cues, and other production cues with professional prompt-book styling.

## Features

- **User Authentication**: Secure email/password login
- **Cloud Storage**: All data stored in Supabase (PostgreSQL database + object storage)
- **PDF Upload**: Upload script files with automatic page detection
- **Lasso Selection**: Drag to select text and create cues
- **Visual Cue Markers**: Colored circles in margins connected to trigger text by lines
- **9 Cue Types**: Blocking, Music, Lighting, Sound/Audio, Projection/Media, Prop, Costume, Set/Scenic, Director Notes
- **Indexed Cues**: Each page has its own index numbering (1-N) for cue entries
- **Collapsible Panel**: Maximize script viewing space
- **Resizable Panels**: Drag splitter to adjust panel widths
- **Slide-Out Preview**: Access cues when panel is collapsed
- **Freeform Highlighting**: Draw highlights with customizable colors, thickness, and opacity
- **Cloud Persistence**: All data synced across devices and sessions
- **Edit & Delete**: Modify or remove cues at any time
- **PDF Zoom**: Zoom in/out with perfect alignment of cues and highlights
- **Keyboard Shortcuts**: Zoom controls (Ctrl/Cmd +/-/0)
- **Fully Stateless**: Works across devices, no local data dependencies

## Architecture

**Cloud-First Design:**
- **Authentication**: Clerk (email, Google, GitHub, etc.)
- **Database**: Supabase (PostgreSQL) for all structured data
- **Object Storage**: Supabase Storage for PDF files
- **Authorization**: Row Level Security (RLS) using Clerk user IDs
- **Environment**: Fully stateless - no browser storage dependencies
- **Credentials**: All secrets in environment variables

**Data Layer:**
- User profiles
- Script metadata
- Cue entries (blocking notes)
- Highlight marks
- User preferences
- PDF files (cloud storage)

## Setup & Installation

### 1. Install Dependencies
```bash
bun install
```

### 2. Set Up Clerk Authentication

1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Get your API keys (Publishable and Secret)
4. See [CLERK_SETUP.md](./CLERK_SETUP.md) for detailed instructions

### 3. Set Up Environment Variables

Create a `.env.local` file:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase Database & Storage
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

The Supabase project includes:
- PostgreSQL tables with Row Level Security
- Storage bucket for PDFs
- Uses Clerk user IDs for data isolation

See SPECIFICATION.md for complete database schema.

### 4. Start Development Server
```bash
bun run dev
```

### 5. Open in Browser
Navigate to `http://localhost:3000`

## Usage Guide

### 1. Upload a Script

1. Click "New Script" on the home page
2. Select a PDF file from your computer
3. Enter a title for the script
4. Click "Create Script"

### 2. Add Cues

1. On the script page, click and drag to select text in the PDF
2. A dialog will appear with:
   - The trigger text you selected
   - An auto-suggested index number
   - A cue type selector (9 types)
   - A field for cue details
3. Select the cue type (Blocking, Lighting, Sound, etc.)
4. Enter your cue details (e.g., "Hamlet crosses downstage center")
5. Click "Save Cue"

### 3. View & Edit Cues

- The left panel shows "Script Cues" for the current page
- Collapse the panel to maximize script viewing space
- Each cue displays with a color-coded circle showing its index number
- The PDF shows visual lines connecting trigger text to margin index markers
- Click any cue circle:
  - **Panel expanded**: Scrolls to and highlights the cue card
  - **Panel collapsed**: Opens slide-out preview with Edit/Delete actions
- Click "Edit" to modify the index, type, or text
- Click "Delete" to remove a cue (with confirmation)

### 4. Highlight Text

1. Click "Draw" mode in the toolbar
2. Choose a highlight color (6 presets available)
3. Adjust thickness and opacity as needed
4. Draw freeform highlights on the script
5. Click "Erase" mode to remove highlights
6. Use "Undo" to reverse recent highlight actions

### 5. Zoom Controls

- Click **+** to zoom in
- Click **−** to zoom out
- Click **Reset** to return to 100%
- Use keyboard shortcuts: Ctrl/Cmd +, -, or 0
- Zoom level persists across pages and sessions

### 6. Navigate Pages

- Use "Previous" and "Next" buttons to move between pages
- Use the page dropdown to jump to a specific page
- You can add cues and highlights on any page

### 7. Manage Scripts

- Click "Exit" to return to the home page
- All changes are automatically saved
- Open saved scripts from the script list
- Delete scripts that are no longer needed

## Data Models

### Script
```typescript
{
  script_id: string;
  title: string;
  pdf_blob: Blob;
  total_pages: number;
  created_at: string;
}
```

### Cue Entry (BlockingEntry)
```typescript
{
  entry_id: string;
  script_id: string;
  page_number: number;
  index_number: number;
  selection_type: 'text';
  selection_text: string | null;
  selection_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  blocking_text: string;
  annotation_type: AnnotationType;  // 9 types
  color: string;  // Hex color based on type
  created_at: string;
  updated_at: string;
}
```

### Highlight Mark
```typescript
{
  mark_id: string;
  script_id: string;
  page_number: number;
  path_data: string;  // SVG path
  color: string;
  thickness: number;
  opacity: number;
  created_at: string;
}
```

## Technical Details

- **Framework**: Next.js 15 with TypeScript
- **UI Components**: Custom components using Tailwind CSS and shadcn/ui
- **PDF Rendering**: PDF.js with native rotation support
- **Visual Cues**: SVG for drawing lines and index circles
- **Highlighting**: Canvas-based freeform drawing
- **Storage**: Supabase (cloud-based)
- **Package Manager**: Bun

## Key Features Implementation

- **Cue Terminology**: All user-facing text uses "cue" instead of "annotation"
- **Collapsible Panel**: Script Cues panel can collapse to 48px width
- **Slide-Out Preview**: Access cue info when panel is collapsed
- **Index Numbering**: Unique per page, manually adjustable, prevents duplicates
- **Visual Cues**: SVG lines connect trigger text to margin index markers
- **Margin Selection**: Lines automatically extend to the nearest margin (left or right)
- **9 Cue Types**: Color-coded for quick visual identification
- **Persistent Data**: Supabase stores PDFs, cues, and highlights
- **Lasso Selection**: Drag to select text with normalized coordinates
- **Perfect Zoom Alignment**: Cues and highlights scale perfectly at all zoom levels
- **Native PDF Orientation**: Respects document rotation metadata
- **Error Handling**: Prevents duplicate indices, confirms deletions

## Browser Compatibility

Works best in modern browsers (Chrome, Firefox, Safari, Edge) with Supabase support.

## Notes

- All data is stored in the cloud (Supabase)
- No local browser storage required
- All data is automatically synced across devices
- Large PDF files may take a moment to load
- No server or internet connection required after initial page load

---

**CuePad** - Professional script annotation for theatre directors
[cuepad.app](https://cuepad.app)
