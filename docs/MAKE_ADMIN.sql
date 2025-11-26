-- ============================================
-- MANUAL SCRIPT: Make User Admin
-- ============================================
-- Run this script in Supabase Dashboard > SQL Editor
-- to give admin access to your user account
-- ============================================

-- Step 1: Check current admins
SELECT 
  au.email,
  ur.role,
  ur.created_at as admin_since
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.role = 'admin';

-- If no results, proceed to Step 2

-- ============================================
-- Step 2: Make yourself admin
-- ============================================
-- Replace 'your-email@example.com' with your actual email

-- Option A: Using the helper function (recommended)
SELECT make_user_admin('athadiary21@gmail.com');

-- Option B: Direct insert (if function doesn't work)
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin'::app_role
-- FROM auth.users
-- WHERE email = 'athadiary21@gmail.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- Step 3: Verify admin access
-- ============================================
SELECT 
  au.email,
  ur.role,
  ur.created_at as admin_since
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.role = 'admin';

-- You should see your email in the results

-- ============================================
-- Step 4: Test get_admin_users function
-- ============================================
-- This should return all users
-- SELECT * FROM get_admin_users();

-- ============================================
-- Troubleshooting
-- ============================================

-- Check if user_roles table exists
SELECT * FROM public.user_roles LIMIT 5;

-- Check if your user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'athadiary21@gmail.com';

-- Check all users
SELECT 
  au.id,
  au.email,
  au.created_at,
  ur.role
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
ORDER BY au.created_at DESC;

-- If you see your email but no role, run Option B above

-- ============================================
-- Make Multiple Users Admin (if needed)
-- ============================================

-- SELECT make_user_admin('user1@example.com');
-- SELECT make_user_admin('user2@example.com');
-- SELECT make_user_admin('user3@example.com');
