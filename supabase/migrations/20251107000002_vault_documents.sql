-- Create vault_documents table
CREATE TABLE IF NOT EXISTS vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('properti', 'pendidikan', 'kesehatan', 'asuransi', 'lainnya')),
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_vault_documents_family_id ON vault_documents(family_id);
CREATE INDEX idx_vault_documents_category ON vault_documents(category);
CREATE INDEX idx_vault_documents_uploaded_by ON vault_documents(uploaded_by);

-- Enable RLS
ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view documents in their family"
  ON vault_documents FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to their family"
  ON vault_documents FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their family"
  ON vault_documents FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their family"
  ON vault_documents FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Create storage bucket for vault documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-documents', 'vault-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload documents to their family folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vault-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view documents in their family folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vault-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their family folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vault-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vault_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER vault_documents_updated_at
  BEFORE UPDATE ON vault_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_documents_updated_at();
