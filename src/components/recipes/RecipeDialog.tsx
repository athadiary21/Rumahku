import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamily } from '@/hooks/useFamily';

interface RecipeDialogProps {
  recipe?: any;
  trigger: React.ReactNode;
}

export const RecipeDialog = ({ recipe, trigger }: RecipeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(recipe?.name || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [ingredients, setIngredients] = useState(recipe?.ingredients?.join('\n') || '');
  const [instructions, setInstructions] = useState(recipe?.instructions || '');
  const [prepTime, setPrepTime] = useState(recipe?.prep_time || '');
  const [cookTime, setCookTime] = useState(recipe?.cook_time || '');
  const [servings, setServings] = useState(recipe?.servings || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: familyData } = useFamily();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (recipe) {
        const { error } = await supabase
          .from('recipes')
          .update(data)
          .eq('id', recipe.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recipes')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({
        title: recipe ? 'Resep diupdate' : 'Resep ditambahkan',
        description: 'Resep berhasil disimpan',
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
    if (!recipe) {
      setName('');
      setDescription('');
      setIngredients('');
      setInstructions('');
      setPrepTime('');
      setCookTime('');
      setServings('');
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

    const ingredientsArray = ingredients.split('\n').filter(i => i.trim());

    mutation.mutate({
      name,
      description: description || null,
      ingredients: ingredientsArray,
      instructions: instructions || null,
      prep_time: prepTime ? parseInt(prepTime) : null,
      cook_time: cookTime ? parseInt(cookTime) : null,
      servings: servings ? parseInt(servings) : null,
      family_id: familyData.family_id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Edit Resep' : 'Tambah Resep Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Resep</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nasi Goreng, Rendang, dll"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat resep..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prepTime">Waktu Persiapan (menit)</Label>
              <Input
                id="prepTime"
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="30"
              />
            </div>
            <div>
              <Label htmlFor="cookTime">Waktu Memasak (menit)</Label>
              <Input
                id="cookTime"
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                placeholder="45"
              />
            </div>
            <div>
              <Label htmlFor="servings">Porsi</Label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="4"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ingredients">Bahan-bahan (satu baris per bahan)</Label>
            <Textarea
              id="ingredients"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="500g daging sapi&#10;2 sdm kecap manis&#10;3 siung bawang putih"
              rows={6}
              required
            />
          </div>

          <div>
            <Label htmlFor="instructions">Cara Membuat</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Langkah-langkah memasak..."
              rows={6}
            />
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
