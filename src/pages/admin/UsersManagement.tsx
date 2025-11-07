import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, Crown, Search, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserWithSubscription {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  family_id: string;
  family_name: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  role: string;
}

const UsersManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<UserWithSubscription | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newTier, setNewTier] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [newExpiresAt, setNewExpiresAt] = useState<string>('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get all profiles with their family and subscription info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get auth users
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Combine data
      const usersData: UserWithSubscription[] = [];
      
      for (const profile of profiles) {
        const authUser = authUsers.find(u => u.id === profile.id);
        if (!authUser) continue;

        // Get family membership
        const { data: familyMember } = await supabase
          .from('family_members')
          .select('family_id, role, family_groups(name)')
          .eq('user_id', profile.id)
          .single();

        if (!familyMember) continue;

        // Get subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('tier, status, expires_at')
          .eq('family_id', familyMember.family_id)
          .single();

        usersData.push({
          id: profile.id,
          email: authUser.email || '',
          full_name: profile.full_name || '',
          created_at: authUser.created_at,
          family_id: familyMember.family_id,
          family_name: (familyMember.family_groups as any)?.name || '',
          subscription_tier: subscription?.tier || 'free',
          subscription_status: subscription?.status || 'active',
          subscription_expires_at: subscription?.expires_at || null,
          role: familyMember.role,
        });
      }

      return usersData;
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ familyId, tier, status, expiresAt }: { 
      familyId: string; 
      tier: string; 
      status: string;
      expiresAt: string | null;
    }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          tier, 
          status,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('family_id', familyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Berhasil',
        description: 'Subscription berhasil diupdate',
      });
      setEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEditUser = (user: UserWithSubscription) => {
    setEditingUser(user);
    setNewTier(user.subscription_tier);
    setNewStatus(user.subscription_status);
    setNewExpiresAt(user.subscription_expires_at || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    
    updateSubscriptionMutation.mutate({
      familyId: editingUser.family_id,
      tier: newTier,
      status: newStatus,
      expiresAt: newExpiresAt || null,
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.family_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = filterTier === 'all' || user.subscription_tier === filterTier;
    
    return matchesSearch && matchesTier;
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
          <Users className="h-8 w-8 text-primary" />
          Users Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Kelola semua users dan subscription mereka
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter & Search</CardTitle>
          <CardDescription>Cari dan filter users berdasarkan kriteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari berdasarkan email, nama, atau family..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users List ({filteredUsers.length})</CardTitle>
          <CardDescription>Daftar semua users terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.family_name}</TableCell>
                    <TableCell>{getTierBadge(user.subscription_tier)}</TableCell>
                    <TableCell>{getStatusBadge(user.subscription_status)}</TableCell>
                    <TableCell>
                      {user.subscription_expires_at 
                        ? format(new Date(user.subscription_expires_at), 'dd MMM yyyy')
                        : 'Lifetime'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Subscription</DialogTitle>
            <DialogDescription>
              Update subscription untuk {editingUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expires At (kosongkan untuk lifetime)</Label>
              <Input
                type="datetime-local"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateSubscriptionMutation.isPending}>
              {updateSubscriptionMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
