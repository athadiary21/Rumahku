import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, DollarSign, Tag } from 'lucide-react';

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  amountFilter: string;
  onAmountFilterChange: (value: string) => void;
  categories: Array<{ id: string; name: string; icon?: string }>;
}

export const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  categoryFilter,
  onCategoryFilterChange,
  typeFilter,
  onTypeFilterChange,
  amountFilter,
  onAmountFilterChange,
  categories,
}: TransactionFiltersProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search" className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4" />
              Cari Deskripsi
            </Label>
            <Input
              id="search"
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Date Range */}
          <div>
            <Label htmlFor="dateRange" className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              Periode
            </Label>
            <Select value={dateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger id="dateRange">
                <SelectValue placeholder="Semua waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="3months">3 Bulan Terakhir</SelectItem>
                <SelectItem value="6months">6 Bulan Terakhir</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <Label htmlFor="category" className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4" />
              Kategori
            </Label>
            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="none">Tanpa Kategori</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div>
            <Label htmlFor="type" className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4" />
              Tipe
            </Label>
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Range */}
          <div>
            <Label htmlFor="amount" className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4" />
              Jumlah
            </Label>
            <Select value={amountFilter} onValueChange={onAmountFilterChange}>
              <SelectTrigger id="amount">
                <SelectValue placeholder="Semua jumlah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jumlah</SelectItem>
                <SelectItem value="0-100000">&lt; Rp 100.000</SelectItem>
                <SelectItem value="100000-500000">Rp 100.000 - 500.000</SelectItem>
                <SelectItem value="500000-1000000">Rp 500.000 - 1 Juta</SelectItem>
                <SelectItem value="1000000-5000000">Rp 1 Juta - 5 Juta</SelectItem>
                <SelectItem value="5000000-999999999">&gt; Rp 5 Juta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
