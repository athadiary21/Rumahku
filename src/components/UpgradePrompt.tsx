import { useSubscription } from '@/contexts/SubscriptionContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature?: string;
  message?: string;
}

const UpgradePrompt = ({ feature, message }: UpgradePromptProps) => {
  const { subscription, tierData } = useSubscription();
  const navigate = useNavigate();

  if (!subscription || subscription.tier === 'premium') {
    return null;
  }

  const defaultMessage = feature 
    ? `Fitur ${feature} hanya tersedia untuk paket ${subscription.tier === 'free' ? 'Family atau Premium' : 'Premium'}.`
    : 'Upgrade paket Anda untuk mendapatkan akses ke lebih banyak fitur.';

  return (
    <Alert className="border-primary/50 bg-primary/5">
      <Crown className="h-4 w-4 text-primary" />
      <AlertTitle>Upgrade Paket Anda</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{message || defaultMessage}</p>
        <Button 
          onClick={() => navigate('/dashboard/settings?tab=subscription')}
          className="mt-2"
          size="sm"
        >
          Lihat Paket <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default UpgradePrompt;
