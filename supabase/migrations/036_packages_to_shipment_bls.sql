CREATE TABLE IF NOT EXISTS public.shipment_bls (
  id BIGSERIAL,
  shipment_id TEXT NULL,
  master_bl TEXT NULL,
  house_bl TEXT NULL,
  loading_port TEXT NULL,
  vessel TEXT NULL,
  etd TIMESTAMP NULL,
  eta TIMESTAMP NULL,
  delivery_agent TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT shipment_bls_pkey PRIMARY KEY (id),
  CONSTRAINT shipment_bls_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE
);
