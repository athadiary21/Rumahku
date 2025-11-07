import { useSubscription } from '@/contexts/SubscriptionContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Crown, Zap, Shield, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useFamily } from '@/hooks/useFamily';

const SubscriptionSettings = () => {
  const { subscription, tierData, loading, isActive } = useSubscription();
  const { data: familyData } = useFamily();

  const { data: usage } = useQuery({
    queryKey: ['subscription-usage', familyData?.family_id],
    queryFn: async () => {
      if (!familyData?.family_id) return null;

      const [accountsCount, categoriesCount] = await Promise.all([
        supabase
          .from('accounts')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyData.family_id),
        supabase
          .from('budget_categories')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', familyData.family_id),
      ]);

      return {
        accounts: accountsCount.count || 0,
        categories: categoriesCount.count || 0,
      };
    },
    enabled: !!familyData?.family_id,
  });

  const { data: allTiers = [] } = useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .order('price_monthly');
      if (error) throw error;
      return data;
    },
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!subscription || !tierData) {
    return <div>No subscription data</div>;
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium':
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 'family':
        return <Zap className="h-6 w-6 text-blue-500" />;
      default:
        return <Shield className="h-6 w-6 text-gray-500" />;
    }
  };

  const getUsagePercentage = (current: number, max: number | null) => {
    if (max === null) return 0; // unlimited
    return Math.min((current / max) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTierIcon(subscription.tier)}
            Subscription Anda: {tierData.name}
          </CardTitle>
          <CardDescription>
            Status: <Badge className={isActive ? 'bg-green-500' : 'bg-red-500'}>
              {isActive ? 'Active' : 'Expired'}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Harga</p>
              <p className="text-2xl font-bold">
                Rp {tierData.price_monthly.toLocaleString('id-ID')}/bulan
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Berlaku hingga</p>
              <p className="text-lg font-semibold">
                {subscription.expires_at 
                  ? format(new Date(subscription.expires_at), 'dd MMM yyyy')
                  : 'Lifetime'}
              </p>
            </div>
          </div>

          {usage && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold">Penggunaan</h4>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Akun Bank/Wallet</span>
                  <span>
                    {usage.accounts} / {tierData.max_accounts || '∞'}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.accounts, tierData.max_accounts)} 
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Kategori Budget</span>
                  <span>
                    {usage.categories} / {tierData.max_budget_categories || '∞'}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.categories, tierData.max_budget_categories)} 
                  className="h-2"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-xl font-bold mb-4">Paket Tersedia</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {allTiers.map((tier) => {
            const features = Array.isArray(tier.features) ? tier.features : [];
            const isCurrent = tier.tier === subscription.tier;
            
            return (
              <Card 
                key={tier.id}
                className={isCurrent ? 'border-primary shadow-lg' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getTierIcon(tier.tier)}
                      {tier.name}
                    </CardTitle>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <CardDescription>
                    <span className="text-2xl font-bold">
                      Rp {tier.price_monthly.toLocaleString('id-ID')}
                    </span>
                    <span className="text-sm">/bulan</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {!isCurrent && (
                    <Button className="w-full" variant={tier.tier === 'premium' ? 'default' : 'outline'}>
                      {tier.price_monthly > tierData.price_monthly ? 'Upgrade' : 'Downgrade'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Catatan:</strong> Untuk mengubah paket subscription Anda, silakan hubungi admin atau 
            gunakan fitur upgrade yang tersedia. Perubahan akan berlaku segera setelah pembayaran dikonfirmasi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSettings;
