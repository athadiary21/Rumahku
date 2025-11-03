import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/hooks/useFamily';

interface BudgetCategoryDialogProps {
  category?: any;
  trigger: React.ReactNode;
}

export const BudgetCategoryDialog = ({ category, trigger }: BudgetCategoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name || '');
  const [monthlyLimit, setMonthlyLimit] = useState(category?.monthly_limit || '');
  const [icon, setIcon] = useState(category?.icon || '');
  const [color, setColor] = useState(category?.color || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: familyData } = useFamily();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (category) {
        const { error } = await supabase
          .from('budget_categories')
          .update(data)
          .eq('id', category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('budget_categories')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
      toast({
        title: category ? 'Kategori diupdate' : 'Kategori ditambahkan',
        description: 'Kategori budget berhasil disimpan',
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
    if (!category) {
      setName('');
      setMonthlyLimit('');
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

    mutation.mutate({
      name,
      monthly_limit: monthlyLimit ? parseFloat(monthlyLimit) : null,
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
          <DialogTitle>{category ? 'Edit Kategori Budget' : 'Tambah Kategori Budget'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Kategori</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Makanan, Transport, Hiburan, dll"
              required
            />
          </div>

          <div>
            <Label htmlFor="monthlyLimit">Batas Bulanan</Label>
            <Input
              id="monthlyLimit"
              type="number"
              step="0.01"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="1000000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🍔"
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
