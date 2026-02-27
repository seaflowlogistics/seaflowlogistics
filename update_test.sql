UPDATE shipments 
SET invoice_no = COALESCE(NULL, invoice_no),
    invoice_items = COALESCE('', invoice_items),
    customs_r_form = COALESCE('AAA', customs_r_form)
WHERE id = 'A2026-0218'
RETURNING invoice_no, invoice_items, customs_r_form;
