# Testing Checklist - Sistem Subscription RumahKu

## Subscription Context & State Management

### ✅ Subscription Context
- [ ] Context provider terpasang di App.tsx
- [ ] Subscription data ter-fetch otomatis saat user login
- [ ] Subscription refresh saat user logout
- [ ] Error handling untuk fetch subscription

### ✅ Subscription Limits Check
- [ ] `canAddAccount()` berfungsi sesuai tier
- [ ] `canAddBudgetCategory()` berfungsi sesuai tier
- [ ] `canAddWallet()` berfungsi sesuai tier
- [ ] `hasFeature()` return correct value
- [ ] `isActive` check expiry date dengan benar

## UI Components

### ✅ SubscriptionBadge
- [ ] Badge muncul di sidebar dashboard
- [ ] Warna badge sesuai tier (gray=free, blue=family, yellow=premium)
- [ ] Icon sesuai tier (Shield, Zap, Crown)
- [ ] Status "Expired" muncul jika subscription tidak aktif

### ✅ UpgradePrompt
- [ ] Alert muncul dengan styling yang benar
- [ ] Custom message ditampilkan
- [ ] Button redirect ke settings subscription
- [ ] Tidak muncul untuk user premium

### ✅ SubscriptionSettings
- [ ] Menampilkan tier saat ini dengan benar
- [ ] Harga dan expiry date akurat
- [ ] Progress bar usage accounts dan categories
- [ ] Daftar semua paket tersedia
- [ ] Button upgrade/downgrade (UI only, payment belum)
- [ ] Responsive di mobile dan desktop

## Feature Restrictions

### ✅ AccountDialog
- [ ] Validasi limit saat create account baru
- [ ] Error message muncul jika limit tercapai
- [ ] Edit account existing tidak terblokir
- [ ] Free tier: max 1 account
- [ ] Family/Premium: unlimited

### ✅ BudgetCategoryDialog
- [ ] Validasi limit saat create category baru
- [ ] Error message muncul jika limit tercapai
- [ ] Edit category existing tidak terblokir
- [ ] Free tier: max 3 categories
- [ ] Family/Premium: unlimited

## Admin Panel

### ✅ Admin Access Control
- [ ] Non-admin tidak bisa akses /admin routes
- [ ] Admin role check berfungsi
- [ ] Redirect ke dashboard jika bukan admin

### ✅ UsersManagement
- [ ] List semua users dengan data lengkap
- [ ] Search by email, name, family berfungsi
- [ ] Filter by tier berfungsi
- [ ] Edit dialog muncul dengan data user
- [ ] Update subscription tier berhasil
- [ ] Update status berhasil
- [ ] Update expiry date berhasil
- [ ] Toast notification muncul setelah update
- [ ] Data refresh setelah update

### ✅ SubscriptionsManagement
- [ ] Stats cards menampilkan data akurat (Total, MRR, breakdown)
- [ ] MRR calculation benar
- [ ] Filter by tier berfungsi
- [ ] Filter by status berfungsi
- [ ] Table menampilkan semua subscriptions
- [ ] Data sorting berfungsi
- [ ] Responsive layout

### ✅ AdminLayout
- [ ] Menu Users muncul
- [ ] Menu Subscriptions muncul
- [ ] Navigation berfungsi
- [ ] Sidebar responsive

## Database & Migrations

### ✅ Subscription Tables
- [ ] subscription_tiers table ada dan terisi
- [ ] subscriptions table ada dan terisi
- [ ] RLS policies berfungsi
- [ ] Foreign keys valid

### ✅ Pricing Migration
- [ ] Migration file dibuat
- [ ] Harga Family: 20,000/bulan
- [ ] Harga Premium: 100,000/bulan
- [ ] Konsisten dengan frontend

## Integration Testing

### ✅ User Flow - Free Tier
1. [ ] User baru signup → auto dapat free tier
2. [ ] Bisa create 1 account
3. [ ] Bisa create 3 budget categories
4. [ ] Tidak bisa create lebih dari limit
5. [ ] Error message muncul saat limit tercapai
6. [ ] Dapat melihat subscription di settings

### ✅ User Flow - Upgrade
1. [ ] User free tier buka settings → subscription
2. [ ] Lihat paket Family dan Premium
3. [ ] Klik upgrade (UI ready, payment pending)

### ✅ Admin Flow - Manage Users
1. [ ] Admin login
2. [ ] Akses /admin/users
3. [ ] Search user by email
4. [ ] Filter by tier
5. [ ] Edit user subscription
6. [ ] Update tier dari free → family
7. [ ] Set expiry date
8. [ ] Save changes
9. [ ] Verify changes di user account

### ✅ Admin Flow - Monitor Subscriptions
1. [ ] Admin akses /admin/subscriptions
2. [ ] Lihat stats (total, MRR, breakdown)
3. [ ] Filter by tier
4. [ ] Filter by status
5. [ ] Verify data accuracy

## Edge Cases

### ✅ Expired Subscription
- [ ] User dengan expired subscription tidak bisa add new items
- [ ] Badge menunjukkan status expired
- [ ] Prompt untuk renew subscription

### ✅ Downgrade Scenario
- [ ] User downgrade dari family ke free
- [ ] Existing data tetap ada (tidak dihapus)
- [ ] Tidak bisa create new items melebihi limit free

### ✅ Multiple Family Members
- [ ] Semua member dalam 1 family share subscription yang sama
- [ ] Subscription limit berlaku untuk family, bukan per user
- [ ] Admin family bisa manage subscription

## Performance

### ✅ Loading States
- [ ] Loading indicator saat fetch subscription
- [ ] Skeleton/placeholder untuk data loading
- [ ] No blocking UI saat fetch

### ✅ Caching
- [ ] Subscription data di-cache dengan React Query
- [ ] Invalidate cache setelah update
- [ ] Stale time configured properly

## Security

### ✅ RLS Policies
- [ ] User hanya bisa lihat subscription family sendiri
- [ ] Admin bisa lihat semua subscriptions
- [ ] Update subscription hanya oleh admin atau family admin

### ✅ API Security
- [ ] Supabase client configured dengan RLS
- [ ] No direct database access dari frontend
- [ ] Auth check sebelum API calls

## Documentation

### ✅ Code Documentation
- [ ] README.md updated
- [ ] SUBSCRIPTION_IMPLEMENTATION.md created
- [ ] TESTING_CHECKLIST.md created
- [ ] Inline comments untuk complex logic

## Deployment Readiness

### ✅ Build & Deploy
- [ ] `npm run build` berhasil tanpa error
- [ ] No TypeScript errors
- [ ] No console errors di production build
- [ ] Environment variables configured
- [ ] Supabase migrations applied

### ✅ Production Testing
- [ ] Test di staging environment
- [ ] Verify Supabase connection
- [ ] Test subscription flow end-to-end
- [ ] Monitor error logs

## Known Issues & Future Work

### Pending Features
- [ ] Payment gateway integration
- [ ] Email notifications
- [ ] Subscription history
- [ ] Invoice generation
- [ ] Trial period
- [ ] Promo codes

### Improvements
- [ ] Add unit tests
- [ ] Add E2E tests
- [ ] Improve error messages
- [ ] Add loading skeletons
- [ ] Optimize bundle size
- [ ] Add analytics tracking

## Sign-off

- [ ] Developer testing complete
- [ ] Code review done
- [ ] QA testing done
- [ ] Documentation complete
- [ ] Ready for production deployment

---

**Testing Date:** _____________

**Tested By:** _____________

**Approved By:** _____________
