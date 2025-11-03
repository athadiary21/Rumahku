import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Utensils, Wallet, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: Calendar,
      title: 'Kalender Keluarga',
      description: 'Atur jadwal & reminder keluarga',
      color: 'text-blue-500',
      path: '/dashboard/calendar'
    },
    {
      icon: Utensils,
      title: 'Dapur & Belanja',
      description: 'Rencanakan menu & belanja mingguan',
      color: 'text-green-500',
      path: '/dashboard/kitchen'
    },
    {
      icon: Wallet,
      title: 'Keuangan Cerdas',
      description: 'Kelola budget & tracking pengeluaran',
      color: 'text-orange-500',
      path: '/dashboard/finance'
    },
    {
      icon: Shield,
      title: 'Vault Digital',
      description: 'Simpan dokumen penting dengan aman',
      color: 'text-purple-500',
      path: '/dashboard/vault'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Selamat Datang! 👋</h1>
        <p className="text-muted-foreground mt-2">
          Kelola kehidupan keluarga Anda dengan lebih mudah dan terorganisir
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action) => (
          <Card 
            key={action.title} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(action.path)}
          >
            <CardHeader>
              <action.icon className={`h-8 w-8 ${action.color} mb-2`} />
              <CardTitle className="text-lg">{action.title}</CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full">
                Buka Modul
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statistik Cepat</CardTitle>
          <CardDescription>Ringkasan aktivitas keluarga Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Event Minggu Ini</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">Rp 0</p>
              <p className="text-sm text-muted-foreground">Budget Terpakai</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Dokumen Tersimpan</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
