import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, TrendingUp, PiggyBank, Pencil, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AccountDialog } from '@/components/finance/AccountDialog';
import { BudgetCategoryDialog } from '@/components/finance/BudgetCategoryDialog';
import { TransactionDialog } from '@/components/finance/TransactionDialog';
import { FinancialGoalDialog } from '@/components/finance/FinancialGoalDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFamily } from '@/hooks/useFamily';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const FinancePage = () => {
  const { data: familyData } = useFamily();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', familyData?.family_id],
    queryFn: async () => {
      if (!familyData?.family_id) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('family_id', familyData.family_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!familyData?.family_id,
  });

  const { data: budgetCategories = [] } = useQuery({
    queryKey: ['budget-categories', familyData?.family_id],
    queryFn: async () => {
      if (!familyData?.family_id) return [];
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('family_id', familyData.family_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!familyData?.family_id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', familyData?.family_id],
    queryFn: async () => {
      if (!familyData?.family_id) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name, icon),
          budget_categories(name, icon)
        `)
        .eq('family_id', familyData.family_id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!familyData?.family_id,
  });

  const { data: financialGoals = [] } = useQuery({
    queryKey: ['financial-goals', familyData?.family_id],
    queryFn: async () => {
      if (!familyData?.family_id) return [];
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('family_id', familyData.family_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!familyData?.family_id,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Akun dihapus', description: 'Akun berhasil dihapus' });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
      toast({ title: 'Kategori dihapus', description: 'Kategori berhasil dihapus' });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Transaksi dihapus', description: 'Transaksi berhasil dihapus' });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('financial_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
      toast({ title: 'Goal dihapus', description: 'Goal berhasil dihapus' });
    },
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const currentMonthExpenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalGoalsAmount = financialGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            Keuangan Cerdas
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola budget dan tracking pengeluaran keluarga
          </p>
        </div>
        <TransactionDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Transaksi
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalBalance.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Akumulasi dari {accounts.length} akun
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {currentMonthExpenses.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => t.type === 'expense').length} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tabungan & Goals</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalGoalsAmount.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {financialGoals.length} goals aktif
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="accounts">Akun</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Budget Tracker (Amplop Digital)</h3>
              <p className="text-sm text-muted-foreground">Kelola alokasi budget per kategori</p>
            </div>
            <BudgetCategoryDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Kategori Budget
                </Button>
              }
            />
          </div>

          {budgetCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada kategori budget</p>
                  <p className="text-sm mt-2">Buat kategori budget untuk mulai tracking</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {budgetCategories.map((category) => {
                const spent = transactions
                  .filter(t => t.budget_category_id === category.id && t.type === 'expense')
                  .reduce((sum, t) => sum + Number(t.amount), 0);
                const percentage = category.monthly_limit ? (spent / Number(category.monthly_limit)) * 100 : 0;

                return (
                  <Card key={category.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {category.icon && <span className="text-2xl">{category.icon}</span>}
                          <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <CardDescription>
                              Rp {spent.toLocaleString('id-ID')} / Rp {Number(category.monthly_limit || 0).toLocaleString('id-ID')}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <BudgetCategoryDialog
                            category={category}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {percentage.toFixed(1)}% terpakai
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Akun & Wallet</h3>
              <p className="text-sm text-muted-foreground">Kelola akun bank dan dompet digital</p>
            </div>
            <AccountDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Akun
                </Button>
              }
            />
          </div>

          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <p>Belum ada akun terdaftar</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {account.icon && <span className="text-2xl">{account.icon}</span>}
                        <div>
                          <CardTitle className="text-lg">{account.name}</CardTitle>
                          <CardDescription>{account.type}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <AccountDialog
                          account={account}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAccountMutation.mutate(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      Rp {Number(account.balance).toLocaleString('id-ID')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Riwayat Transaksi</h3>
              <p className="text-sm text-muted-foreground">Semua transaksi keuangan keluarga</p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <p>Belum ada transaksi tercatat</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}>
                            {transaction.type === 'income' ? '↑' : '↓'}
                          </span>
                          <div>
                            <CardTitle className="text-lg">{transaction.description}</CardTitle>
                            <CardDescription>
                              {format(new Date(transaction.date), 'dd MMM yyyy')} • {transaction.accounts?.name}
                              {transaction.budget_categories && ` • ${transaction.budget_categories.name}`}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                          Rp {Number(transaction.amount).toLocaleString('id-ID')}
                        </span>
                        <div className="flex gap-1">
                          <TransactionDialog
                            transaction={transaction}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {transaction.notes && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Tujuan Keuangan</h3>
              <p className="text-sm text-muted-foreground">Target tabungan dan tujuan finansial</p>
            </div>
            <FinancialGoalDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Goal
                </Button>
              }
            />
          </div>

          {financialGoals.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada tujuan keuangan</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {financialGoals.map((goal) => {
                const percentage = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;

                return (
                  <Card key={goal.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {goal.icon && <span className="text-2xl">{goal.icon}</span>}
                          <div>
                            <CardTitle className="text-lg">{goal.name}</CardTitle>
                            <CardDescription>
                              Rp {Number(goal.current_amount).toLocaleString('id-ID')} / Rp {Number(goal.target_amount).toLocaleString('id-ID')}
                              {goal.deadline && ` • Target: ${format(new Date(goal.deadline), 'dd MMM yyyy')}`}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <FinancialGoalDialog
                            goal={goal}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteGoalMutation.mutate(goal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {percentage.toFixed(1)}% tercapai
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancePage;
