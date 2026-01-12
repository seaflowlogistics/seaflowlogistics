ALTER TABLE shipment_documents 
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
