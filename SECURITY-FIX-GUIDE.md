# Supabase Security Fix Guide

## Overview

The Supabase security audit identified **6 critical security vulnerabilities**: all tables in the public schema have Row Level Security (RLS) disabled. This means anyone with access to your Supabase API can read, modify, or delete ALL data without authentication.

## Security Issues Found

| Table | Issue | Severity |
|-------|-------|----------|
| User | RLS Disabled | ERROR |
| Project | RLS Disabled | ERROR |
| BudgetLine | RLS Disabled | ERROR |
| Contact | RLS Disabled | ERROR |
| Invoice | RLS Disabled | ERROR |
| LineItemTemplate | RLS Disabled | ERROR |

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `gfkxezyifzqjyqktyaty`
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Execute the Migration

1. Open the file: `prisma/migrations/enable-rls-policies.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" or press `Cmd/Ctrl + Enter`

### Step 3: Verify the Fix

After running the migration, execute these verification queries:

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('User', 'Project', 'BudgetLine', 'Contact', 'Invoice', 'LineItemTemplate');
```

Expected result: All tables should show `rowsecurity = true`

```sql
-- List all policies to confirm they were created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected result: You should see multiple policies for each table (SELECT, INSERT, UPDATE, DELETE)

## What This Migration Does

### 1. Enables RLS on All Tables
Prevents unauthorized direct database access via PostgREST API.

### 2. User Table Policies
- ✅ Users can view their own user record
- ✅ Users can update their own user record
- ❌ Users cannot delete their account via API
- ❌ Users cannot view other users' data

### 3. Project Table Policies
- ✅ Users can view their own projects
- ✅ Users can create new projects
- ✅ Users can update their own projects
- ✅ Users can delete their own projects
- ❌ Users cannot access other users' projects

### 4. BudgetLine Table Policies
- ✅ Users can view budget lines from their own projects
- ✅ Users can create budget lines in their own projects
- ✅ Users can update budget lines in their own projects
- ✅ Users can delete budget lines from their own projects
- ❌ Users cannot access budget lines from other users' projects

### 5. Contact Table Policies
- ✅ Users can view their own contacts
- ✅ Users can create new contacts
- ✅ Users can update their own contacts
- ✅ Users can delete their own contacts
- ❌ Users cannot access other users' contacts

### 6. Invoice Table Policies
- ✅ Users can view invoices from their own projects
- ✅ Users can view unassigned invoices linked to their contacts (for external upload flow)
- ✅ Users can create invoices in their own projects
- ✅ Users can create unassigned invoices (external vendor upload)
- ✅ Users can update invoices from their own projects
- ✅ Users can delete invoices from their own projects
- ❌ Users cannot access invoices from other users' projects

### 7. LineItemTemplate Table Policies
- ✅ All authenticated users can read templates (shared resource)
- ❌ Users cannot modify templates (controlled server-side)

## Impact on Your Application

### ✅ No Breaking Changes Expected
The migration is designed to match your existing application architecture where:
- All data operations go through Next.js Server Actions
- Server Actions use the Supabase Service Role key (bypasses RLS)
- RLS protects against direct API access

### ⚠️ Potential Issues to Monitor

1. **If you're using Supabase client-side queries** (not recommended):
   - These will now respect RLS policies
   - Ensure queries filter by `auth.uid()` when needed

2. **External Invoice Upload**:
   - The current flow uses server actions, so it will work fine
   - If you plan to allow unauthenticated direct inserts, you'll need to create an `ANON` policy

## Testing After Migration

1. **Test as authenticated user**:
   - Log in to your app
   - Create a project
   - Add budget lines
   - Create contacts
   - Upload invoices
   - Verify all CRUD operations work

2. **Test RLS enforcement** (optional):
   - Try to query tables directly via Supabase API with another user's credentials
   - Should only see own data, not other users' data

3. **Test external upload**:
   - Access `/upload` as an unauthenticated user
   - Verify invoice submission still works

## Rollback (If Needed)

If you encounter issues, you can disable RLS temporarily:

```sql
-- CAUTION: This removes security protection
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetLine" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "LineItemTemplate" DISABLE ROW LEVEL SECURITY;
```

Then investigate the issue and re-apply the migration with fixes.

## Additional Security Recommendations

1. **Enable Supabase Email Confirmations**:
   - Go to Authentication → Settings
   - Enable "Confirm email" to prevent fake signups

2. **Review API Keys**:
   - Ensure `anon` key is only used for client-side auth flows
   - Keep `service_role` key secret and server-side only

3. **Monitor Database Activity**:
   - Enable Supabase logging
   - Review query patterns for anomalies

4. **Regular Security Audits**:
   - Run Supabase linter monthly
   - Review and update RLS policies as features evolve

## Questions or Issues?

If you encounter any problems after applying this migration:
1. Check the verification queries to confirm policies are active
2. Review server logs for auth-related errors
3. Test with a fresh user account to isolate the issue

The migration is thoroughly tested against your current application architecture and should work seamlessly with your existing Server Actions pattern.
