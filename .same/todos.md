# CuePad Todos

## ✅ Completed

### Architectural Reset (Dec 26, 2025)
- ✅ Removed all Clerk → Supabase JWT integration
- ✅ Removed all `auth.uid()` and RLS usage
- ✅ Created single service role Supabase client
- ✅ Removed `getToken` parameter from all database functions
- ✅ Removed `getToken` prop from all components (PDFViewer, CuePreview, BlockingPage)
- ✅ Updated all database operations to use service role client
- ✅ Documented architectural changes in `.same/architectural-reset.md`
- ✅ Committed and force-pushed to script-cuepad repository
- ✅ Created version 73

## 🔴 Required User Actions

### Database Configuration (CRITICAL)
1. **Update Supabase Schema**
   ```sql
   -- Change user_id from UUID to TEXT in all tables
   ALTER TABLE scripts ALTER COLUMN user_id TYPE TEXT;
   ALTER TABLE blocking_entries ALTER COLUMN user_id TYPE TEXT;
   ALTER TABLE highlight_marks ALTER COLUMN user_id TYPE TEXT;
   ALTER TABLE user_preferences ALTER COLUMN user_id TYPE TEXT;

   -- Remove all RLS policies
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

2. **Update Environment Variables**
   - Get service role key from Supabase Dashboard → Settings → API
   - Update `.env.local`:
     ```bash
     SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
     ```
   - Remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` (no longer needed)

3. **Delete Clerk JWT Template**
   - Go to Clerk Dashboard → JWT Templates
   - Delete the "supabase" template (no longer needed)

### Testing
1. Sign in to CuePad
2. Create a new script
3. Add cues and highlights
4. Sign out and sign in as different user
5. Verify data isolation (each user only sees their own data)

## 📋 Future Enhancements

### Features to Consider
- [ ] Export script with cues to PDF
- [ ] Import cues from CSV
- [ ] Share scripts with collaborators
- [ ] Version history for scripts
- [ ] Mobile app version

### Performance
- [ ] Add database indexes for user_id columns
- [ ] Implement pagination for script list
- [ ] Cache PDF blobs in memory
- [ ] Optimize highlight rendering

### UX Improvements
- [ ] Keyboard shortcuts reference
- [ ] Undo/redo for cue edits
- [ ] Bulk cue operations
- [ ] Custom annotation colors
- [ ] Print-friendly view

## 📝 Notes

### Security Model
- **Authentication**: Clerk handles user login/logout/profile
- **Route Protection**: Clerk middleware protects all routes
- **Authorization**: Application code enforces data isolation
- **Database Access**: Single service role client (server-side only)
- **Multi-Tenancy**: All queries filter by `user_id` in application code

### Architecture Principles
1. Database trusts the application, not individual users
2. No direct client access to database
3. All database operations use service role key
4. User ID (from Clerk) used for filtering in all queries
5. No RLS policies or per-user database credentials

### Repository
- **URL**: https://github.com/jimtym/script-cuepad
- **Latest Commit**: e6e2040 - "Architectural reset: Remove Supabase Auth/RLS, use application-level authentication only"
- **Branch**: master (main)

---

Last updated: December 26, 2025
Version: 73
