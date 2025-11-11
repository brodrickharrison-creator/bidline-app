# Supabase Storage Setup Instructions

This guide will help you set up secure file storage for invoice attachments in BidLine.

## 📋 Overview

BidLine stores invoice attachments (PDFs, images, Excel files) in Supabase Storage with Row Level Security (RLS) policies that ensure:
- ✅ Users can only upload files to their own folder
- ✅ Users can only view/download their own files
- ✅ Files are organized by user and invoice: `invoices/{userId}/{invoiceId}/{filename}`
- ✅ Future-proofed for admin role support

---

## 🚀 Setup Steps

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Select your BidLine project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run Storage Setup SQL

1. Open the file: `supabase/storage-setup.sql`
2. Copy the entire contents of the file
3. Paste into the SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

You should see success messages indicating:
- ✅ Bucket created: `invoices`
- ✅ Policies created: 4 storage policies (INSERT, SELECT, UPDATE, DELETE)

### Step 3: Verify Setup

Run this verification query in the SQL Editor:

```sql
-- Check bucket
SELECT * FROM storage.buckets WHERE id = 'invoices';

-- Check policies
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%invoice%';
```

You should see:
- 1 bucket named `invoices` (public = false, file_size_limit = 52428800)
- 4 policies for user access control

---

## 🔐 Security Features

### Current User-Scoped Access

All storage policies enforce that:
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

This means files are stored as:
```
invoices/
  ├── {user1_id}/
  │   ├── {invoice1_id}/
  │   │   └── timestamp-filename.pdf
  │   └── {invoice2_id}/
  │       └── timestamp-document.pdf
  └── {user2_id}/
      └── ...
```

### Future Admin Support

The SQL file includes commented sections for admin access. When you're ready to implement admin users:

1. Uncomment the admin check in each policy:
```sql
-- Change FROM:
AND (storage.foldername(name))[1] = auth.uid()::text

-- Change TO:
AND (
  (storage.foldername(name))[1] = auth.uid()::text
  OR auth.uid() IN (SELECT id::uuid FROM public."User" WHERE role = 'ADMIN')
)
```

2. The `User` table already has a `role` field (USER | ADMIN) ready for this

---

## 📁 Allowed File Types

The storage bucket accepts:
- **PDFs**: `application/pdf`
- **Images**: `image/jpeg`, `image/png`, `image/webp`
- **Excel**: `application/vnd.ms-excel`, `.xlsx`

Maximum file size: **50MB**

---

## 🧪 Testing

After setup, test file uploads:

1. Log in to your BidLine app
2. Navigate to **Invoices** → **Upload Invoice**
3. Try uploading a PDF or image
4. Verify the file appears in your Supabase Storage dashboard
5. Check that the file path follows the structure: `invoices/{your_user_id}/...`

---

## 🐛 Troubleshooting

### Error: "new row violates row-level security policy"

**Cause**: RLS policies are not correctly set up or user is not authenticated

**Fix**:
1. Verify you're logged in (check `auth.uid()` is not null)
2. Re-run the storage setup SQL
3. Check that policies were created successfully

### Error: "File type not allowed"

**Cause**: File MIME type not in allowed list

**Fix**:
- Only upload PDFs, images, or Excel files
- If you need to add more types, update the `allowed_mime_types` array in the SQL

### Files not appearing in dashboard

**Cause**: Bucket is private, so files won't appear in public listings

**Fix**:
- Use the signed URL functionality (`getInvoiceFileUrl()`) to generate temporary download links
- Check Supabase Storage dashboard to verify files were uploaded

---

## 🔄 Updating Policies

If you need to modify policies later:

1. Drop existing policies:
```sql
DROP POLICY IF EXISTS "Users can upload their own invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own invoice files" ON storage.objects;
```

2. Re-run the policy creation section from `storage-setup.sql`

---

## ✅ Completion Checklist

- [ ] Ran `supabase/storage-setup.sql` in Supabase SQL Editor
- [ ] Verified bucket exists with correct settings
- [ ] Verified 4 storage policies were created
- [ ] Tested file upload through the app
- [ ] Confirmed files are stored in user-specific folders
- [ ] Database schema updated with file fields (automatic via Prisma)

---

## 📚 Additional Resources

- **Supabase Storage Docs**: https://supabase.com/docs/guides/storage
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Storage Policies**: https://supabase.com/docs/guides/storage/security/access-control

---

Need help? Check the BidLine documentation or open an issue on GitHub.
