import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFamily } from '@/hooks/useFamily';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Plus, FileText, Download, Trash2, Loader2, File, FileImage, FileType, Search, Eye, X, CalendarIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const VaultPage = () => {
  const { data: familyData } = useFamily();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    name: '',
    category: 'lainnya',
    description: '',
    expiryDate: undefined as Date | undefined,
  });
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'expiry-asc' | 'expiry-desc'>('newest');
  
  // Preview states
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['vault-documents', familyData?.family_id],
    queryFn: async () => {
      if (!familyData?.family_id) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('family_id', familyData.family_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!familyData?.family_id,
  });

  // Get expiry status helper
  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Kedaluwarsa', variant: 'destructive' as const, days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring-soon', label: 'Segera Kedaluwarsa', variant: 'default' as const, days: daysUntilExpiry };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'valid', label: 'Valid', variant: 'secondary' as const, days: daysUntilExpiry };
    }
    
    return null;
  };

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    
    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(d => d.category === filterCategory);
    }
    
    // Search by name
    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'expiry-asc') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      } else if (sortBy === 'expiry-desc') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime();
      }
      return 0;
    });
    
    return filtered;
  }, [documents, searchQuery, filterCategory, sortBy]);

  // Get expiring documents
  const expiringDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc) => {
      if (!doc.expiry_date) return false;
      const status = getExpiryStatus(doc.expiry_date);
      return status && (status.status === 'expired' || status.status === 'expiring-soon');
    });
  }, [documents]);

  // Count by category
  const categoryCounts = {
    properti: documents.filter(d => d.category === 'properti').length,
    pendidikan: documents.filter(d => d.category === 'pendidikan').length,
    kesehatan: documents.filter(d => d.category === 'kesehatan').length,
    asuransi: documents.filter(d => d.category === 'asuransi').length,
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !familyData?.family_id) {
        throw new Error('File atau family ID tidak tersedia');
      }

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${familyData.family_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vault-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          family_id: familyData.family_id,
          user_id: (await supabase.auth.getUser()).data.user?.id!,
          name: uploadData.name || selectedFile.name,
          category: uploadData.category,
          file_path: filePath,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          description: uploadData.description || null,
          expiry_date: uploadData.expiryDate ? uploadData.expiryDate.toISOString().split('T')[0] : null,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-documents'] });
      toast({
        title: 'Berhasil!',
        description: 'Dokumen berhasil diupload',
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadData({ name: '', category: 'lainnya', description: '', expiryDate: undefined });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal upload dokumen',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('vault-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-documents'] });
      toast({
        title: 'Berhasil!',
        description: 'Dokumen berhasil dihapus',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus dokumen',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Ukuran file maksimal 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      if (!uploadData.name) {
        setUploadData({ ...uploadData, name: file.name });
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Pilih file terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }
    uploadMutation.mutate();
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('vault-documents')
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal download dokumen',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('vault-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
      setPreviewDocument(doc);
      setPreviewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal membuka preview',
        variant: 'destructive',
      });
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewDocument(null);
    setPreviewDialogOpen(false);
  };

  const isPreviewable = (fileType: string) => {
    return fileType?.startsWith('image/') || fileType === 'application/pdf';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileImage;
    if (fileType === 'application/pdf') return FileType;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      properti: 'Properti',
      pendidikan: 'Pendidikan',
      kesehatan: 'Kesehatan',
      asuransi: 'Asuransi',
      lainnya: 'Lainnya',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      properti: 'bg-blue-100 text-blue-800',
      pendidikan: 'bg-green-100 text-green-800',
      kesehatan: 'bg-red-100 text-red-800',
      asuransi: 'bg-yellow-100 text-yellow-800',
      lainnya: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.lainnya;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Vault Digital
          </h1>
          <p className="text-muted-foreground mt-2">
            Simpan dan kelola dokumen penting keluarga dengan aman
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Dokumen
        </Button>
      </div>

      {expiringDocuments.length > 0 && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-foreground">
            <strong>{expiringDocuments.length}</strong> dokumen Anda akan segera kedaluwarsa atau sudah kedaluwarsa. Segera perpanjang!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { key: 'properti', label: 'Properti' },
          { key: 'pendidikan', label: 'Pendidikan' },
          { key: 'kesehatan', label: 'Kesehatan' },
          { key: 'asuransi', label: 'Asuransi' },
        ].map((category) => (
          <Card 
            key={category.key}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setFilterCategory(filterCategory === category.key ? 'all' : category.key)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{category.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categoryCounts[category.key as keyof typeof categoryCounts]}
              </div>
              <p className="text-xs text-muted-foreground mt-1">dokumen</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="properti">Properti</SelectItem>
                <SelectItem value="pendidikan">Pendidikan</SelectItem>
                <SelectItem value="kesehatan">Kesehatan</SelectItem>
                <SelectItem value="asuransi">Asuransi</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="oldest">Terlama</SelectItem>
                <SelectItem value="name">Nama A-Z</SelectItem>
                <SelectItem value="expiry-asc">Expiry Terdekat</SelectItem>
                <SelectItem value="expiry-desc">Expiry Terjauh</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumen Tersimpan</CardTitle>
          <CardDescription>
            {filteredDocuments.length} dari {documents.length} dokumen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada dokumen tersimpan</p>
              <p className="text-sm mt-2">Upload dokumen penting keluarga dengan aman</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada dokumen yang sesuai</p>
              <p className="text-sm mt-2">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate">{doc.name}</h3>
                          <Badge className={getCategoryColor(doc.category)}>
                            {getCategoryLabel(doc.category)}
                          </Badge>
                          {doc.expiry_date && (() => {
                            const status = getExpiryStatus(doc.expiry_date);
                            if (status) {
                              return (
                                <Badge variant={status.variant} className="text-xs">
                                  {status.status === 'expired' 
                                    ? `Expired ${status.days} hari lalu`
                                    : `${status.days} hari lagi`}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{new Date(doc.created_at).toLocaleDateString('id-ID')}</span>
                          {doc.expiry_date && (
                            <span>• Expiry: {format(new Date(doc.expiry_date), "dd MMM yyyy")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPreviewable(doc.file_type) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(doc)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Dokumen</DialogTitle>
            <DialogDescription>
              Upload dokumen penting keluarga dengan aman
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: PDF, DOC, DOCX, JPG, PNG, GIF. Maksimal 10MB
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Dokumen</Label>
              <Input
                id="name"
                value={uploadData.name}
                onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                placeholder="Nama dokumen"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={uploadData.category}
                onValueChange={(value) => setUploadData({ ...uploadData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="properti">Properti</SelectItem>
                  <SelectItem value="pendidikan">Pendidikan</SelectItem>
                  <SelectItem value="kesehatan">Kesehatan</SelectItem>
                  <SelectItem value="asuransi">Asuransi</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Deskripsi dokumen"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Kedaluwarsa (Opsional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !uploadData.expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {uploadData.expiryDate ? format(uploadData.expiryDate, "PPP") : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={uploadData.expiryDate}
                    onSelect={(date) => setUploadData({ ...uploadData, expiryDate: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Untuk dokumen seperti passport, asuransi, atau sertifikat
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending || !selectedFile}>
              {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{previewDocument?.name}</DialogTitle>
                <DialogDescription>
                  {previewDocument && getCategoryLabel(previewDocument.category)} • {' '}
                  {previewDocument && new Date(previewDocument.created_at).toLocaleDateString('id-ID')}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={closePreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto max-h-[calc(90vh-200px)]">
            {previewDocument?.file_type?.startsWith('image/') ? (
              <img 
                src={previewUrl} 
                alt={previewDocument?.name}
                className="w-full h-auto rounded-lg"
              />
            ) : previewDocument?.file_type === 'application/pdf' ? (
              <iframe
                src={previewUrl}
                className="w-full h-[600px] rounded-lg border"
                title={previewDocument?.name}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Preview tidak tersedia untuk tipe file ini</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => previewDocument && handleDownload(previewDocument)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={closePreview}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VaultPage;
