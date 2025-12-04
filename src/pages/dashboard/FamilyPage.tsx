import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserPlus, Crown, Trash2, Mail } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFamily } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { InviteFamilyDialog } from '@/components/family/InviteFamilyDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

const FamilyPage = () => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const { data: familyData } = useFamily();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch family members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['family-members', familyData?.family_id],
    queryFn: async () => {
      if (!familyData?.family_id) return [];
      
      const { data, error } = await supabase
        .from('family_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('family_id', familyData.family_id)
        .order('joined_at');

      if (error) throw error;
      return data as FamilyMember[];
    },
    enabled: !!familyData?.family_id,
  });

  // Get current user's role
  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isAdmin = currentUserMember?.role === 'admin';

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast({
        title: 'Berhasil',
        description: 'Anggota berhasil dihapus dari keluarga',
      });
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus anggota',
        variant: 'destructive',
      });
    },
  });

  const handleRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.id);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge variant="default" className="gap-1">
          <Crown className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    return <Badge variant="secondary">Member</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Keluarga
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola anggota keluarga dan kolaborasi
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Undang Anggota
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Family Members List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Anggota Keluarga</CardTitle>
            <CardDescription>
              {members.length} anggota dalam keluarga Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-48 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Belum Ada Anggota</p>
                <p className="text-sm mb-4">
                  Undang anggota keluarga untuk mulai berkolaborasi
                </p>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Undang Anggota Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(member.profiles.full_name, member.profiles.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {member.profiles.full_name || member.profiles.email}
                        </p>
                        {getRoleBadge(member.role)}
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">Anda</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <p className="truncate">{member.profiles.email}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bergabung {new Date(member.joined_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {isAdmin && member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemberToRemove(member)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Family Info & Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Info Keluarga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nama Keluarga</p>
                <p className="font-medium">{familyData?.family_name || 'Keluarga Saya'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Anggota</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Role Anda</p>
                {getRoleBadge(currentUserMember?.role || 'member')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips Kolaborasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="text-primary">•</span>
                <p>Undang anggota keluarga untuk berbagi kalender dan keuangan</p>
              </div>
              <div className="flex gap-2">
                <span className="text-primary">•</span>
                <p>Admin dapat mengelola anggota dan pengaturan keluarga</p>
              </div>
              <div className="flex gap-2">
                <span className="text-primary">•</span>
                <p>Semua anggota dapat melihat dan mengedit data keluarga</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Dialog */}
      <InviteFamilyDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) {
            // Refresh members list when dialog closes
            queryClient.invalidateQueries({ queryKey: ['family-members'] });
          }
        }}
      />

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggota Keluarga?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus{' '}
              <strong>{memberToRemove?.profiles.email}</strong> dari keluarga?
              Mereka akan kehilangan akses ke semua data keluarga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FamilyPage;
