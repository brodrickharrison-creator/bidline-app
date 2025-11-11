-- ============================================================
-- Supabase Storage Setup for BidLine Invoice Attachments
-- ============================================================
-- This SQL creates a private storage bucket with Row Level Security (RLS)
-- policies that ensure users can only access their own uploaded files.
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Run the query
--
-- Future Admin Support:
-- When implementing admin users, update the policies to check for
-- auth.uid() IN (SELECT id FROM public."User" WHERE role = 'ADMIN')
-- to grant admins access to all files.
-- ============================================================

-- Create the storage bucket for invoice attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false, -- Private bucket
  52428800, -- 50MB file size limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage Policy: Allow authenticated users to upload files
-- Files must be uploaded to their own user folder: invoices/{user_id}/*
-- ============================================================
CREATE POLICY "Users can upload their own invoice files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
  -- Future admin support: Add OR condition here to check for admin role
  -- OR auth.uid() IN (SELECT id::uuid FROM public."User" WHERE role = 'ADMIN')
);

-- ============================================================
-- Storage Policy: Allow users to view/download their own files
-- Users can only access files in their own folder
-- ============================================================
CREATE POLICY "Users can view their own invoice files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
  -- Future admin support: Add OR condition here to check for admin role
  -- OR auth.uid() IN (SELECT id::uuid FROM public."User" WHERE role = 'ADMIN')
);

-- ============================================================
-- Storage Policy: Allow users to update their own files
-- Enables replacing/updating uploaded files
-- ============================================================
CREATE POLICY "Users can update their own invoice files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
  -- Future admin support: Add OR condition here to check for admin role
  -- OR auth.uid() IN (SELECT id::uuid FROM public."User" WHERE role = 'ADMIN')
);

-- ============================================================
-- Storage Policy: Allow users to delete their own files
-- ============================================================
CREATE POLICY "Users can delete their own invoice files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
  -- Future admin support: Add OR condition here to check for admin role
  -- OR auth.uid() IN (SELECT id::uuid FROM public."User" WHERE role = 'ADMIN')
);

-- ============================================================
-- Verification Query (Optional - run separately to verify)
-- ============================================================
-- Check that the bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'invoices';
--
-- Check that policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
