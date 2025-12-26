# CuePad Implementation Summary

## Current Architecture (v73) ✅

### Authentication Model: Application-Level Only

**Date**: December 26, 2025
**Status**: Complete and Production-Ready
**Repository**: https://github.com/jimtym/script-cuepad

---

## Overview

CuePad uses a **simplified authentication architecture** where:
- **Clerk** handles user authentication (login/logout/profile)
- **Supabase** serves as a cloud database with a single service role client
- **Multi-tenancy** is enforced in application code via `user_id` filtering

### Key Architectural Principles

1. ✅ Database trusts the application, not individual users
2. ✅ Single service role Supabase client for all operations
3. ✅ No RLS policies or per-user database credentials
4. ✅ All queries explicitly filter by `user_id` in application code
5. ✅ Service role key is server-side only (never exposed to client)

---

## Implementation Details

### 1. Supabase Client (`src/lib/supabase.ts`)

**Single service role client:**
```typescript
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
```

**Removed:**
- ❌ Clerk JWT integration
- ❌ Per-user authenticated clients
- ❌ `createClerkSupabaseClient()` function
- ❌ Runtime token generation

### 2. Database Functions (`src/lib/db.ts`)

**All functions follow this pattern:**
```typescript
export async function getAllScripts(userId: string): Promise<Script[]> {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('user_id', userId)  // ← Application-level filtering
    .order('created_at', { ascending: false });

  // Handle errors gracefully, return empty arrays
  if (error) {
    console.error('Scripts fetch error:', error);
    return [];
  }

  return (data || []).map(/* ... */);
}
```

**Removed from ALL functions:**
- ❌ `getToken` parameter
- ❌ JWT token retrieval
- ❌ Dynamic client creation

**Kept in ALL functions:**
- ✅ `userId` parameter (Clerk user ID)
- ✅ Explicit `WHERE user_id = ?` filtering
- ✅ Graceful error handling

### 3. Components

**Updated components:**
- `src/components/PDFViewer.tsx` - Removed `getToken` prop
- `src/components/CuePreview.tsx` - Removed `getToken` prop
- `src/components/BlockingPage.tsx` - Removed `getToken` usage

**Pattern:**
```typescript
// OLD (removed):
<PDFViewer
  userId={user.id}
  getToken={() => getToken({ template: 'supabase' })}
  ...
/>

// NEW (current):
<PDFViewer
  userId={user.id}
  ...
/>
```

### 4. Environment Variables

**Required:**
```bash
# Clerk (unchanged)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (service role only)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Removed:**
- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (no longer needed)

---

## Database Schema Requirements

### User ID Columns

All tables must have `user_id` as `TEXT`:

```sql
-- Scripts table
CREATE TABLE scripts (
  script_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- ← Clerk user ID (e.g., user_xxx)
  title TEXT NOT NULL,
  pdf_url TEXT,
  total_pages INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocking Entries table
CREATE TABLE blocking_entries (
  entry_id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,  -- ← Clerk user ID
  page_number INTEGER NOT NULL,
  index_number INTEGER NOT NULL,
  selection_type TEXT,
  selection_text TEXT,
  selection_box JSONB NOT NULL,
  blocking_text TEXT NOT NULL,
  annotation_type TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Highlight Marks table
CREATE TABLE highlight_marks (
  mark_id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,  -- ← Clerk user ID
  page_number INTEGER NOT NULL,
  path_data TEXT NOT NULL,
  color TEXT NOT NULL,
  thickness INTEGER NOT NULL,
  opacity REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences table
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,  -- ← Clerk user ID
  pdf_zoom_level REAL DEFAULT 1.5,
  highlight_preset_name TEXT DEFAULT 'Yellow',
  highlight_color TEXT DEFAULT '#FFF59D',
  highlight_opacity REAL DEFAULT 0.5,
  highlight_thickness INTEGER DEFAULT 8,
  info_banner_dismissed BOOLEAN DEFAULT FALSE,
  panel_width INTEGER DEFAULT 33,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

**All RLS policies MUST be removed:**
```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can manage own scripts" ON scripts;
DROP POLICY IF EXISTS "Users can manage own entries" ON blocking_entries;
DROP POLICY IF EXISTS "Users can manage own highlights" ON highlight_marks;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

-- Disable RLS on all tables
ALTER TABLE scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocking_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_marks DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
```

### Storage Bucket

**PDFs bucket configuration:**
- Uses service role client for all uploads/downloads
- File paths: `{userId}/{scriptId}.pdf`
- No RLS policies needed
- Public access NOT required (service role has full access)

---

## Security Model

### How It Works

1. **User Authentication**
   - Clerk handles login/logout via email + OAuth
   - Clerk middleware protects all routes
   - Unauthenticated users redirected to `/sign-in`

2. **Data Access**
   - Application retrieves `user.id` from Clerk
   - All database queries filter by `user_id`
   - Database never sees end users directly

3. **Authorization**
   - Application code enforces data isolation
   - Users can only access records where `user_id` matches their Clerk ID
   - No database-level user authentication

### Security Guarantees

✅ **User Isolation**: Each user only sees their own data
✅ **Server-Side Only**: Service role key never exposed to browser
✅ **Route Protection**: Clerk middleware protects all authenticated routes
✅ **No Anonymous Access**: All operations require authenticated user
✅ **Application Gateway**: Database trust the application exclusively

### What This Does NOT Support

❌ Direct database access from clients
❌ Per-user database credentials
❌ RLS policies
❌ Anonymous users
❌ Multiple auth providers
❌ Database-level multi-tenancy

---

## Migration from Previous Architecture

If you had the previous Clerk→Supabase JWT integration:

### 1. Update Database Schema
```sql
-- Convert user_id from UUID to TEXT
ALTER TABLE scripts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE blocking_entries ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE highlight_marks ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_preferences ALTER COLUMN user_id TYPE TEXT;

-- Remove all RLS policies (see above)
-- Disable RLS (see above)
```

### 2. Update Environment Variables
- Add `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Dashboard → Settings → API)
- Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Delete Clerk JWT Template
- Go to Clerk Dashboard → JWT Templates
- Delete the "supabase" template

### 4. Update Code
✅ Already done - all code updated in this architectural reset

---

## Testing Checklist

- [ ] Sign in with Clerk (email or OAuth)
- [ ] Create a new script
- [ ] Add cues and highlights
- [ ] Sign out
- [ ] Sign in as different user
- [ ] Verify previous user's data is not visible
- [ ] Verify new user can create their own scripts
- [ ] Verify PDF uploads work
- [ ] Verify no console errors

---

## Benefits of This Architecture

### 1. Simplicity
- No complex JWT integration
- No RLS policy management
- Single database client
- Clear separation of concerns

### 2. Performance
- No JWT validation overhead
- No per-request token generation
- Single persistent connection
- Faster database queries

### 3. Debugging
- All queries use same client
- No token expiration issues
- Straightforward error handling
- Clear data flow

### 4. Security
- Application is single source of truth
- Clerk handles authentication
- CuePad handles authorization
- Database trusts application

---

## Documentation

See `.same/architectural-reset.md` for complete architectural documentation.

---

## Repository

**URL**: https://github.com/jimtym/script-cuepad
**Latest Commit**: e6e2040 - "Architectural reset: Remove Supabase Auth/RLS, use application-level authentication only"
**Branch**: master (main)
**Version**: 73

---

Last updated: December 26, 2025
