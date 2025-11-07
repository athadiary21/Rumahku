import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/hooks/useFamily';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useQuery } from '@tanstack/react-query';

interface AccountDialogProps {
  account?: any;
  trigger: React.ReactNode;
}

export const AccountDialog = ({ account, trigger }: AccountDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState(account?.type || 'bank');
  const [balance, setBalance] = useState(account?.balance || '0');
  const [currency, setCurrency] = useState(account?.currency || 'IDR');
  const [icon, setIcon] = useState(account?.icon || '');
  const [color, setColor] = useState(account?.color || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: familyData } = useFamily();
  const { canAddAccount, tierData } = useSubscription();

  const { data: accountsCount = 0 } = useQuery({
    queryKey: ['accounts-count', familyData?.family_id],
    queryFn: async () => {
      if (!familyData?.family_id) return 0;
      const { count, error } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyData.family_id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!familyData?.family_id,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (account) {
        const { error } = await supabase
          .from('accounts')
          .update(data)
          .eq('id', account.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: account ? 'Akun diupdate' : 'Akun ditambahkan',
        description: 'Akun berhasil disimpan',
      });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    if (!account) {
      setName('');
      setType('bank');
      setBalance('0');
      setCurrency('IDR');
      setIcon('');
      setColor('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyData?.family_id) {
      toast({
        title: 'Error',
        description: 'Family ID tidak ditemukan',
        variant: 'destructive',
      });
      return;
    }

    // Check subscription limit for new accounts
    if (!account && !canAddAccount(accountsCount)) {
      toast({
        title: 'Limit Tercapai',
        description: `Paket ${tierData?.name} hanya dapat membuat ${tierData?.max_accounts} akun. Upgrade paket untuk menambah lebih banyak akun.`,
        variant: 'destructive',
      });
      return;
    }

    mutation.mutate({
      name,
      type,
      balance: parseFloat(balance),
      currency,
      icon: icon || null,
      color: color || null,
      family_id: familyData.family_id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Akun' : 'Tambah Akun Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Akun</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="BCA, Gopay, Cash, dll"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Tipe Akun</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe akun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="e_wallet">E-Wallet</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="investment">Investasi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="balance">Saldo Awal</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div>
            <Label htmlFor="currency">Mata Uang</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih mata uang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                <SelectItem value="USD">USD (Dollar)</SelectItem>
                <SelectItem value="EUR">EUR (Euro)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🏦"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="color">Warna</Label>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
