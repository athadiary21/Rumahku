-- Add expiry_date column to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add index for efficient expiry date queries
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;