# Vault Digital & Admin Panel Integration - RumahKu

## Overview

Dokumen ini menjelaskan implementasi lengkap fitur Vault Digital untuk upload dokumen dan integrasi Admin Panel dengan konten website.

---

## 1. Vault Digital - Document Management

### Features

**Document Upload**
- Support multiple file formats: PDF, DOC, DOCX, JPG, PNG, GIF
- File size validation (maximum 10MB)
- Category-based organization
- Description and metadata
- Secure storage with Supabase Storage

**Document Management**
- View all uploaded documents
- Download documents
- Delete documents
- Real-time count by category
- Search and filter (ready for implementation)

**Categories**
- Properti (Property documents)
- Pendidikan (Education documents)
- Kesehatan (Health documents)
- Asuransi (Insurance documents)
- Lainnya (Others)

### Database Schema

**Table: `vault_documents`**

```sql
CREATE TABLE vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family_groups(id),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Storage Bucket: `vault-documents`**
- Private bucket (not publicly accessible)
- Organized by family_id
- File path format: `{family_id}/{filename}`

### Security

**Row Level Security (RLS)**
- Users can only view documents from their family
- Users can only upload to their family
- Users can only delete documents from their family

**Storage Policies**
- Upload restricted to family folder
- Download restricted to family folder
- Delete restricted to family folder

### Usage

**Upload Document:**

1. Click "Upload Dokumen" button
2. Select file (max 10MB)
3. Fill in document name
4. Select category
5. Add description (optional)
6. Click "Upload"

**Download Document:**

1. Find document in list
2. Click download icon
3. File will be downloaded to browser

**Delete Document:**

1. Find document in list
2. Click delete icon (trash)
3. Document will be removed from storage and database

### File Size Limits

- **Maximum file size:** 10MB per file
- **Supported formats:** PDF, DOC, DOCX, JPG, JPEG, PNG, GIF
- **Storage quota:** Depends on Supabase plan

### Implementation Details

**Upload Flow:**

1. User selects file → File validation (size, type)
2. File uploaded to Supabase Storage → Path: `{family_id}/{unique_filename}`
3. Document record created in database → Links to storage path
4. UI updates with new document → Real-time count updated

**Download Flow:**

1. User clicks download → Fetch file from storage
2. Create blob URL → Trigger browser download
3. Clean up blob URL

**Delete Flow:**

1. User confirms delete → Delete from storage
2. Delete from database → UI updates
3. Category count decremented

---

## 2. Admin Panel Integration

### Overview

Admin panel sekarang **fully integrated** dengan website. Semua perubahan yang dilakukan di admin panel langsung terlihat di website.

### Integrated Features

#### A. Website Content Management

**Table:** `website_content`

**Features:**
- Edit hero section text
- Edit feature descriptions
- Edit pricing information
- Edit footer content

**How it works:**
- Admin edits content in admin panel
- Changes saved to database
- Website fetches content from database
- Real-time updates (with cache invalidation)

**Status:** ✅ Already implemented

---

#### B. Testimonials Management

**Table:** `testimonials_admin`

**Features:**
- Create new testimonials
- Edit existing testimonials
- Delete testimonials
- Toggle active/inactive status
- Star rating (1-5)

**Admin Panel:**
- Full CRUD operations
- Table view with all testimonials
- Active/inactive badge (click to toggle)
- Edit and delete buttons

**Website Integration:**
- Fetches only active testimonials
- Displays latest 3 testimonials
- Auto-generates initials from name
- Shows rating stars
- Loading state while fetching

**How it works:**

1. Admin creates testimonial in `/admin/testimonials`
2. Testimonial saved to `testimonials_admin` table
3. Website component fetches active testimonials
4. Displays on homepage testimonials section

**Status:** ✅ Fully implemented and integrated

---

#### C. FAQs Management

**Table:** `faqs_admin`

**Features:**
- Create new FAQs
- Edit existing FAQs
- Delete FAQs
- Toggle active/inactive status
- Reorder FAQs (up/down arrows)
- Order index for sorting

**Admin Panel:**
- Full CRUD operations
- Table view with all FAQs
- Active/inactive badge (click to toggle)
- Up/down arrows for reordering
- Edit and delete buttons

**Website Integration:**
- Fetches only active FAQs
- Displays in order (by order_index)
- Accordion UI for expand/collapse
- Loading state while fetching
- Hides section if no FAQs

**How it works:**

1. Admin creates FAQ in `/admin/faqs`
2. FAQ saved to `faqs_admin` table with order_index
3. Website component fetches active FAQs
4. Displays on homepage FAQ section in order

**Reordering:**
- Click up arrow → Swap order with previous FAQ
- Click down arrow → Swap order with next FAQ
- Order persisted in database

**Status:** ✅ Fully implemented and integrated

---

#### D. Pricing Management

**Table:** `subscription_tiers`

**Features:**
- Edit tier names
- Edit pricing (monthly/yearly)
- Edit features list
- Edit tier descriptions

**Admin Panel:**
- Located at `/admin/pricing`
- Edit pricing information
- Manage tier features

**Website Integration:**
- Pricing component fetches from database
- Displays current pricing
- Updates automatically

**Status:** ✅ Already implemented (via PricingAdmin)

---

### Admin Panel Features Summary

| Feature | Admin CRUD | Website Integration | Status |
|---------|-----------|-------------------|--------|
| Website Content | ✅ | ✅ | Complete |
| Testimonials | ✅ | ✅ | Complete |
| FAQs | ✅ | ✅ | Complete |
| Pricing | ✅ | ✅ | Complete |
| Users | ✅ | N/A | Complete |
| Subscriptions | ✅ | N/A | Complete |
| Promo Codes | ✅ | ✅ | Complete |

---

## 3. Database Migrations

### Migration Files

**1. Vault Documents**
- File: `20251107000002_vault_documents.sql`
- Creates: `vault_documents` table
- Creates: `vault-documents` storage bucket
- Implements: RLS policies
- Implements: Storage policies

**2. Subscription Features**
- File: `20251107000001_advanced_subscription_features.sql`
- Creates: Payment, promo codes, email tables
- Already includes: testimonials_admin, faqs_admin

### Running Migrations

**Option 1: Supabase CLI**

```bash
supabase db push
```

**Option 2: Supabase Dashboard**

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy-paste migration SQL
4. Run query

---

## 4. Testing Guide

### Vault Digital Testing

**Upload Test:**

1. Login to dashboard
2. Navigate to Vault Digital
3. Click "Upload Dokumen"
4. Select a PDF file (< 10MB)
5. Fill in name: "Test Document"
6. Select category: "Properti"
7. Add description: "Testing upload"
8. Click "Upload"
9. ✅ Document should appear in list
10. ✅ Properti count should increase

**Download Test:**

1. Find uploaded document
2. Click download icon
3. ✅ File should download to browser

**Delete Test:**

1. Find uploaded document
2. Click delete icon
3. ✅ Document should disappear
4. ✅ Category count should decrease

**File Validation Test:**

1. Try to upload file > 10MB
2. ✅ Should show error message
3. Try to upload unsupported format (.exe)
4. ✅ Should be rejected by file input

---

### Admin Panel Testing

**Testimonials Test:**

1. Login as admin
2. Go to `/admin/testimonials`
3. Click "Tambah Testimoni"
4. Fill in:
   - Name: "John Doe"
   - Role: "Software Engineer, Jakarta"
   - Content: "Great app!"
   - Rating: 5 stars
5. Click "Simpan"
6. ✅ Should appear in admin table
7. Go to homepage (/)
8. Scroll to testimonials section
9. ✅ Should see "John Doe" testimonial

**Toggle Active Test:**

1. In admin testimonials table
2. Click "Active" badge on a testimonial
3. ✅ Should change to "Inactive"
4. Go to homepage
5. ✅ Testimonial should disappear
6. Toggle back to "Active"
7. ✅ Should reappear on homepage

**FAQs Test:**

1. Go to `/admin/faqs`
2. Click "Tambah FAQ"
3. Fill in:
   - Question: "How to use?"
   - Answer: "It's easy!"
4. Click "Simpan"
5. ✅ Should appear in admin table
6. Go to homepage
7. Scroll to FAQ section
8. ✅ Should see new FAQ

**Reorder Test:**

1. In admin FAQs table
2. Click up arrow on second FAQ
3. ✅ Should swap with first FAQ
4. Go to homepage
5. ✅ Order should match admin panel

---

## 5. API Reference

### Vault Documents

**Fetch Documents:**

```typescript
const { data, error } = await supabase
  .from('vault_documents')
  .select('*')
  .eq('family_id', familyId)
  .order('created_at', { ascending: false });
```

**Upload File:**

```typescript
const { error } = await supabase.storage
  .from('vault-documents')
  .upload(filePath, file);
```

**Download File:**

```typescript
const { data, error } = await supabase.storage
  .from('vault-documents')
  .download(filePath);
```

**Delete File:**

```typescript
const { error } = await supabase.storage
  .from('vault-documents')
  .remove([filePath]);
```

### Testimonials

**Fetch Active Testimonials:**

```typescript
const { data, error } = await supabase
  .from('testimonials_admin')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false })
  .limit(3);
```

**Create Testimonial:**

```typescript
const { error } = await supabase
  .from('testimonials_admin')
  .insert({
    name: 'John Doe',
    role: 'Engineer',
    content: 'Great!',
    rating: 5,
    is_active: true
  });
```

### FAQs

**Fetch Active FAQs:**

```typescript
const { data, error } = await supabase
  .from('faqs_admin')
  .select('*')
  .eq('is_active', true)
  .order('order_index', { ascending: true });
```

**Reorder FAQ:**

```typescript
const { error } = await supabase
  .from('faqs_admin')
  .update({ order_index: newOrder })
  .eq('id', faqId);
```

---

## 6. Troubleshooting

### Vault Upload Issues

**Problem:** Upload fails with "Permission denied"

**Solution:**
- Check if user is member of a family
- Verify RLS policies are enabled
- Check storage bucket policies

**Problem:** File size error

**Solution:**
- Ensure file is under 10MB
- Check browser console for actual size
- Compress file if needed

**Problem:** Download fails

**Solution:**
- Check if file exists in storage
- Verify user has access to family
- Check browser console for errors

### Admin Integration Issues

**Problem:** Changes not appearing on website

**Solution:**
- Check if item is set to "active"
- Clear browser cache
- Check React Query cache
- Verify database connection

**Problem:** Testimonials not showing

**Solution:**
- Ensure at least one testimonial is active
- Check testimonials_admin table
- Verify query in browser console
- Check component mounting

**Problem:** FAQs order not updating

**Solution:**
- Check order_index values in database
- Ensure reorder mutation succeeds
- Refresh page to see changes

---

## 7. Best Practices

### Vault Documents

1. **File Naming:** Use descriptive names for easy identification
2. **Categories:** Choose appropriate category for each document
3. **Descriptions:** Add descriptions for important documents
4. **Regular Cleanup:** Delete outdated documents
5. **Backup:** Keep important documents in multiple locations

### Admin Content Management

1. **Testimonials:**
   - Use real testimonials when possible
   - Keep content concise (2-3 sentences)
   - Verify names and roles
   - Use 4-5 star ratings for credibility

2. **FAQs:**
   - Write clear, concise questions
   - Provide helpful, detailed answers
   - Order by importance/frequency
   - Keep updated with common questions

3. **Content Updates:**
   - Review changes before saving
   - Test on website after updates
   - Keep backup of original content
   - Coordinate updates with team

---

## 8. Future Enhancements

### Vault Digital

- [ ] Folder organization
- [ ] Document sharing with specific family members
- [ ] Version history
- [ ] Document expiry reminders
- [ ] OCR for searchable PDFs
- [ ] Bulk upload
- [ ] Document templates
- [ ] Encrypted storage option

### Admin Panel

- [ ] Content preview before publishing
- [ ] Scheduled publishing
- [ ] Content versioning
- [ ] Bulk operations
- [ ] Analytics dashboard
- [ ] User activity logs
- [ ] Content approval workflow

---

## 9. Security Considerations

### Vault Documents

- Files stored in private bucket
- RLS policies enforce family isolation
- File type validation on upload
- File size limits prevent abuse
- Secure download URLs with expiry
- No direct public access to files

### Admin Panel

- Admin role verification required
- All mutations logged
- Input validation on all forms
- XSS protection
- CSRF protection via Supabase

---

## 10. Performance Optimization

### Implemented

- React Query caching for data
- Lazy loading for images
- Optimized database queries
- Indexed database columns
- Efficient RLS policies

### Recommended

- CDN for static assets
- Image compression before upload
- Pagination for large document lists
- Virtual scrolling for long lists
- Service worker for offline access

---

**Last Updated:** November 7, 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
