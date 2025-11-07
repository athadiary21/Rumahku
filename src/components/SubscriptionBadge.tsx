import { useSubscription } from '@/contexts/SubscriptionContext';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Shield } from 'lucide-react';

const SubscriptionBadge = () => {
  const { subscription, tierData, loading, isActive } = useSubscription();

  if (loading || !subscription || !tierData) {
    return null;
  }

  const getTierIcon = () => {
    switch (subscription.tier) {
      case 'premium':
        return <Crown className="h-3 w-3" />;
      case 'family':
        return <Zap className="h-3 w-3" />;
      default:
        return <Shield className="h-3 w-3" />;
    }
  };

  const getTierColor = () => {
    switch (subscription.tier) {
      case 'premium':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'family':
        return 'bg-gradient-to-r from-blue-500 to-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Badge className={`${getTierColor()} flex items-center gap-1`}>
      {getTierIcon()}
      <span className="capitalize">{tierData.name}</span>
      {!isActive && <span className="ml-1">(Expired)</span>}
    </Badge>
  );
};

export default SubscriptionBadge;
