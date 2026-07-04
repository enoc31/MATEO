-- Patch to add url_pago to public.comprobantes_gasto table
-- Run this in the Supabase SQL editor.

ALTER TABLE public.comprobantes_gasto
ADD COLUMN IF NOT EXISTS url_pago TEXT;

COMMENT ON COLUMN public.comprobantes_gasto.url_pago IS 'Link to the payment voucher (Comprobante de Pago) image or PDF in Supabase Storage';
