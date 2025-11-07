import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const SubscriptionsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          family_groups(name),
          subscription_tiers(name, price_monthly)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-subscription-stats'],
    queryFn: async () => {
      const { data: allSubs } = await supabase
        .from('subscriptions')
        .select('tier, status');

      const totalActive = allSubs?.filter(s => s.status === 'active').length || 0;
      const totalFree = allSubs?.filter(s => s.tier === 'free').length || 0;
      const totalFamily = allSubs?.filter(s => s.tier === 'family').length || 0;
      const totalPremium = allSubs?.filter(s => s.tier === 'premium').length || 0;

      // Calculate MRR (Monthly Recurring Revenue)
      const { data: tierData } = await supabase
        .from('subscription_tiers')
        .select('tier, price_monthly');

      const tierPrices = tierData?.reduce((acc, t) => {
        acc[t.tier] = t.price_monthly;
        return acc;
      }, {} as Record<string, number>) || {};

      const mrr = allSubs?.reduce((sum, sub) => {
        if (sub.status === 'active' && sub.tier !== 'free') {
          return sum + (tierPrices[sub.tier] || 0);
        }
        return sum;
      }, 0) || 0;

      return {
        totalActive,
        totalFree,
        totalFamily,
        totalPremium,
        mrr,
        total: allSubs?.length || 0,
      };
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: any }) => {
      const promises = ids.map(id =>
        supabase
          .from('subscriptions')
          .update(updates)
          .eq('id', id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-stats'] });
      toast({
        title: 'Berhasil',
        description: 'Subscriptions berhasil diupdate',
      });
    },
  });

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesTier = filterTier === 'all' || sub.tier === filterTier;
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    return matchesTier && matchesStatus;
  });

  const getTierBadge = (tier: string) => {
    const colors = {
      free: 'bg-gray-500',
      family: 'bg-blue-500',
      premium: 'bg-yellow-500',
    };
    return <Badge className={colors[tier as keyof typeof colors] || 'bg-gray-500'}>{tier}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-500',
      expired: 'bg-red-500',
      cancelled: 'bg-orange-500',
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-primary" />
          Subscriptions Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Kelola semua subscriptions dan lihat statistik
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalActive || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {(stats?.mrr || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly Recurring Revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Tier</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFamily || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total ? Math.round((stats.totalFamily / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Tier</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPremium || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total ? Math.round((stats.totalPremium / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Subscriptions</CardTitle>
          <CardDescription>Filter berdasarkan tier dan status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tier</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions List ({filteredSubscriptions.length})</CardTitle>
          <CardDescription>Daftar semua subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.family_groups?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{getTierBadge(sub.tier)}</TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      {format(new Date(sub.started_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      {sub.expires_at 
                        ? format(new Date(sub.expires_at), 'dd MMM yyyy')
                        : 'Lifetime'}
                    </TableCell>
                    <TableCell>
                      Rp {(sub.subscription_tiers?.price_monthly || 0).toLocaleString('id-ID')}/bulan
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsManagement;
