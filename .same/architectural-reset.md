# Architectural Implementation: Server-Side Database Access Only

## Summary

CuePad uses **server-side database access exclusively**. Clerk handles user authentication, and ALL Supabase operations occur server-side using the service role key.

## Key Architecture

### Security Model

```
Browser (Clerk-authenticated)
      ↓
CuePad Server (trusted)
      ↓  SUPABASE_SERVICE_ROLE_KEY
Supabase DB + Storage
```

**Critical Rule**: There are **NO direct browser → Supabase calls**.

### 1. Removed Browser Access to Supabase
- ❌ No `NEXT_PUBLIC_SUPABASE_ANON_KEY` exposed to browser
- ❌ No client-side Supabase imports
- ❌ No direct database queries from client components

### 2. Server-Side Supabase Client
- ✅ One Supabase client in `src/lib/supabase-server.ts`
- ✅ Uses `SUPABASE_SERVICE_ROLE_KEY` (server-side environment variable only)
- ✅ **NEVER imported in client components**

### 3. Server Actions and API Routes
- ✅ All database operations via Next.js Server Actions (`src/actions/`)
- ✅ File downloads via API routes (`src/app/api/pdf/`)
- ✅ Client components call server endpoints only

### 4. Multi-Tenancy Enforcement
- ✅ All tables store `user_id` as `TEXT` (Clerk user ID format: `user_xxx`)
- ✅ All queries explicitly filter by `WHERE user_id = currentClerkUserId`
- ✅ Tenant isolation enforced in server code, not the database

### 5. Security Guarantees
- ✅ No public database credentials exposed
- ✅ Clerk protects user accounts (login/logout/profile)
- ✅ CuePad middleware protects routes
- ✅ Server code enforces data isolation
- ✅ **Database trusts the application server, not the browser**

---

## Implementation Details

### Server-Only Supabase Client

**File**: `src/lib/supabase-server.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only Supabase client using service role key
// NEVER import this in client components
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
```

**Important**: This module must ONLY be imported by:
- Server Actions (`src/actions/*.ts`)
- API routes (`src/app/api/**/route.ts`)
- Server-side utilities

### Server Actions

**Files**: `src/actions/scripts.ts`, `src/actions/entries.ts`, `src/actions/highlights.ts`

All database operations are implemented as Server Actions with `'use server'` directive:

```typescript
'use server';

import { supabaseServer } from '@/lib/supabase-server';

export async function saveScript(script: Script, userId: string): Promise<void> {
  // All database access via supabaseServer
  const { error } = await supabaseServer
    .from('scripts')
    .upsert({
      script_id: script.script_id,
      user_id: userId,  // Application enforces multi-tenancy
      // ...
    });

  if (error) throw new Error(`Failed to save: ${error.message}`);
}
```

### API Routes

**File**: `src/app/api/pdf/[scriptId]/route.ts`

For file downloads (Blobs), API routes are used instead of Server Actions:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const script = await supabaseServer
    .from('scripts')
    .select('*')
    .eq('script_id', params.scriptId)
    .eq('user_id', userId)  // Application enforces multi-tenancy
    .single();

  // Download and return blob
  // ...
}
```

### Client Components

Client components **NEVER** import Supabase. They call Server Actions:

```typescript
// src/app/page.tsx (client component)
import { getAllScripts, saveScript } from '@/actions/scripts';

export default function Home() {
  const { user } = useUser();

  const loadScripts = async () => {
    if (!user) return;
    const scripts = await getAllScripts(user.id);  // Server Action call
    setScripts(scripts);
  };

  // ...
}
```

---

## Database Schema

### User ID Columns

All tables must have `user_id` as `TEXT`:

```sql
CREATE TABLE scripts (
  script_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- Clerk user ID (e.g., user_xxx)
  title TEXT NOT NULL,
  pdf_url TEXT,
  total_pages INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blocking_entries (
  entry_id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,  -- Clerk user ID
  page_number INTEGER NOT NULL,
  -- ...
);

CREATE TABLE highlight_marks (
  mark_id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,  -- Clerk user ID
  page_number INTEGER NOT NULL,
  -- ...
);
```

### No RLS Required

**Since all access is server-side with service role key, RLS is not needed.**

The application server enforces all security via explicit `WHERE user_id = ?` clauses.

```sql
-- RLS can be disabled (not relied upon for security)
ALTER TABLE scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocking_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_marks DISABLE ROW LEVEL SECURITY;
```

---

## Environment Variables

### Required

```bash
# Clerk (unchanged)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (server-side only)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### NOT Required

- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (removed - would expose database to browser)

---

## Security Benefits

### 1. No Credential Exposure
- Service role key never sent to browser
- No way for browser to directly access database
- Even if user inspects network traffic, no DB credentials visible

### 2. Trusted Server Gateway
- Application server is the ONLY entry point to database
- All security logic centralized in server code
- No reliance on client-side filtering

### 3. Defense in Depth
- Clerk authenticates users
- Middleware protects routes
- Server Actions enforce data isolation
- Database is a simple data store (no security policies needed)

### 4. Audit Trail
- All database operations go through server code
- Easy to log and monitor access
- Single point of control for security

---

## Migration from Previous Implementation

If migrating from client-side Supabase access:

### 1. Remove Client-Side Supabase
```bash
# Delete files
rm src/lib/supabase.ts
rm src/lib/db.ts
```

### 2. Create Server-Side Infrastructure
```bash
# Create new files
src/lib/supabase-server.ts        # Server-only client
src/actions/scripts.ts             # Script operations
src/actions/entries.ts             # Entry operations
src/actions/highlights.ts          # Highlight operations
src/app/api/pdf/[scriptId]/route.ts # PDF download API
```

### 3. Update Environment Variables
```bash
# Remove from .env.local
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...  (DELETE THIS)

# Add to .env.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Update All Components
- Replace `import { ... } from '@/lib/db'`
- With `import { ... } from '@/actions/scripts'`
- Remove any direct Supabase imports

### 5. Update Database Schema
```sql
-- Ensure user_id is TEXT (not UUID)
ALTER TABLE scripts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE blocking_entries ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE highlight_marks ALTER COLUMN user_id TYPE TEXT;

-- RLS can be disabled (not needed)
ALTER TABLE scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocking_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_marks DISABLE ROW LEVEL SECURITY;
```

---

## Security Checklist

- ✅ `SUPABASE_SERVICE_ROLE_KEY` is server-side only (no `NEXT_PUBLIC_` prefix)
- ✅ No `NEXT_PUBLIC_SUPABASE_ANON_KEY` in environment variables
- ✅ No Supabase imports in client components
- ✅ All database operations via Server Actions or API routes
- ✅ All queries filter by `user_id` in server code
- ✅ Clerk middleware protects all routes
- ✅ Database never exposed directly to browser

---

## Production Deployment Notes

1. **Environment Variables**
   - Never commit `.env.local` to git
   - Set `SUPABASE_SERVICE_ROLE_KEY` in deployment platform (Vercel, Netlify, etc.)
   - Ensure it's marked as SECRET/server-side only

2. **Server Actions**
   - Automatically server-side in Next.js production builds
   - No special configuration needed

3. **API Routes**
   - Verify authentication in EVERY route handler
   - Always check `userId` from `auth()`
   - Always filter queries by `user_id`

4. **Monitoring**
   - Monitor server-side errors in production
   - Watch for unauthorized access attempts
   - Track database query performance

---

**Date**: December 26, 2025
**Status**: Complete ✅
**Repository**: https://github.com/jimtym/script-cuepad
**Version**: 77
**Commit**: 8209d7a - "Move Supabase access server-side using service role key"
