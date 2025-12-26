# Script Blocking App - Testing Guide

## Quick Test Instructions

### Option 1: Use a Sample PDF
Download any of these public domain scripts to test:
- **Romeo & Juliet**: https://folger-main-site-assets.s3.amazonaws.com/uploads/2022/11/romeo-and-juliet_PDF_FolgerShakespeare.pdf
- **Hamlet**: https://www.folger.edu (search for free PDFs)
- **Any PDF document** with text (even a multi-page document will work)

### Option 2: Create a Simple Test PDF
1. Create a Word/Google Docs document with some script text
2. Export as PDF
3. Use that for testing

## Testing Checklist

### ✅ PDF Upload & Setup
1. Click "New Script" button
2. Select a PDF file (should show "PDF loaded: X pages")
3. Enter a title (e.g., "Romeo & Juliet - Act 1")
4. Set page range (e.g., start: 1, end: 5)
5. Click "Create Script"
6. **Expected**: Should navigate to the blocking page with PDF visible

### ✅ PDF Rendering
1. PDF should be visible on the right side
2. Text should be readable
3. Page navigation buttons should work
4. Page selector dropdown should show only pages in range
5. **Expected**: Clean PDF rendering with working navigation

### ✅ Text Selection & Adding Blocking
1. Click and drag to select text on the PDF
2. **Expected**: Blue selection highlight appears
3. Dialog should open showing:
   - Selected text
   - Suggested index number: 1
   - Empty blocking text field
4. Type blocking instruction (e.g., "Romeo enters stage left")
5. Click "Save Entry"
6. **Expected**: Dialog closes, entry appears in left panel

### ✅ Blocking Chart Display
1. Entry should appear in left panel as "1. Romeo enters stage left"
2. Click the entry
3. **Expected**: Highlight appears on PDF in orange
4. Selected text should be shown in italics
5. Updated timestamp should be displayed

### ✅ Adding Multiple Entries
1. Select different text on the same page
2. **Expected**: Suggested index should be 2
3. Add second blocking note
4. **Expected**: Both entries appear, sorted by index number

### ✅ Editing Entries
1. Click "Edit" on a blocking entry
2. Modify the blocking text
3. Change the index number
4. Click "Save"
5. **Expected**: Entry updates with new text and reorders if index changed

### ✅ Duplicate Index Prevention
1. Try to edit an entry and set its index to an existing number
2. **Expected**: Error message "Index X is already in use on this page"

### ✅ Deleting Entries
1. Click "Delete" on an entry
2. **Expected**: Confirmation dialog
3. Confirm deletion
4. **Expected**: Entry removed from chart and highlight removed from PDF

### ✅ Page Navigation
1. Click "Next" to go to next page
2. **Expected**:
   - PDF renders new page
   - Blocking chart shows entries for that page (or "No blocking entries")
   - Previous entries from old page are not shown
3. Click "Previous"
4. **Expected**: Returns to previous page with all entries intact

### ✅ Page-Specific Indexing
1. Add entry with index 1 on page 1
2. Navigate to page 2
3. Add entry with index 1 on page 2
4. **Expected**: Both entries have index 1, no conflict (page-specific)

### ✅ Data Persistence
1. Add several blocking entries across multiple pages
2. Click "Exit to Script List"
3. **Expected**: Returns to home page, script listed with page count
4. Click "Open" on the script
5. **Expected**: All blocking entries are restored exactly as saved

### ✅ Browser Reload Persistence
1. Add blocking entries
2. Refresh the browser (F5 or Cmd+R)
3. **Expected**:
   - Home page loads
   - Script still in list
   - Open script shows all entries

### ✅ Multiple Scripts
1. Exit to home
2. Create a second script with different PDF
3. Add blocking entries to second script
4. **Expected**: Each script maintains its own entries independently

## Known Behaviors

### Text Selection
- Some PDFs with scanned images may not have selectable text
- Complex formatting may affect selection accuracy
- Very small text may be hard to select precisely

### Performance
- Large PDFs (100+ pages) may take a moment to load
- Many entries (50+) on one page should still perform well

### Browser Storage
- All data stored in IndexedDB
- Clearing browser data will delete all scripts
- Each browser maintains separate storage

## Testing Notes

Record any issues:
- [ ] PDF rendering problems
- [ ] Selection accuracy issues
- [ ] Persistence failures
- [ ] UI/UX confusion
- [ ] Performance problems

## Success Criteria

The app passes testing if:
1. ✅ PDF uploads and renders correctly
2. ✅ Text selection creates blocking entries
3. ✅ Entries can be edited and deleted
4. ✅ Page navigation works smoothly
5. ✅ Data persists across reloads
6. ✅ Multiple scripts work independently
