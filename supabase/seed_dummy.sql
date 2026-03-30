DO $$
DECLARE
  v_user_id UUID;
  v_company_1 UUID;
  v_company_2 UUID;
  v_company_3 UUID;
  v_customer_1 UUID;
  v_customer_2 UUID;
  v_supplier_1 UUID;
  v_product_1 UUID;
  v_product_2 UUID;
  v_warehouse_1 UUID;
  v_quote_1 UUID;
  v_po_1 UUID;
BEGIN
  -- Récupérer le premier utilisateur (celui que tu viens de créer)
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé. Tu dois impérativement créer ton compte sur l''application web (S''inscrire) avant d''exécuter ce script !';
  END IF;

  -- 1. CRÉATION DES ENTREPRISES FICTIVES
  INSERT INTO public.companies (raison_sociale, forme_juridique, city, address, is_active)
  VALUES 
    ('Tech Solutions Maroc', 'SARL', 'Casablanca', '10 Boulevard Anfa', true),
    ('Agri Pro Distribution', 'S.A.', 'Agadir', 'Zone Industrielle Tassila', true),
    ('Retail Express', 'Auto-entrepreneur', 'Rabat', 'Avenue Mohammed V', true)
  RETURNING id INTO v_company_1;

  -- Obtenir les IDs des autres compagnies créées (simplifié en récupérant par tri)
  SELECT id INTO v_company_1 FROM public.companies WHERE raison_sociale = 'Tech Solutions Maroc';
  SELECT id INTO v_company_2 FROM public.companies WHERE raison_sociale = 'Agri Pro Distribution';
  SELECT id INTO v_company_3 FROM public.companies WHERE raison_sociale = 'Retail Express';

  -- 2. ASSIGNER CES ENTREPRISES À TON UTILISATEUR
  INSERT INTO public.user_companies (user_id, company_id, is_default)
  VALUES 
    (v_user_id, v_company_1, true),
    (v_user_id, v_company_2, false),
    (v_user_id, v_company_3, false)
  ON CONFLICT (user_id, company_id) DO NOTHING;

  -- 3. CRÉER UN ENTREPÔT POUR LA COMPAGNIE 1
  INSERT INTO public.warehouses (company_id, code, name, location)
  VALUES (v_company_1, 'W-001', 'Dépôt Central Casa', 'Casablanca, Route d''El Jadida')
  RETURNING id INTO v_warehouse_1;

  -- 4. CRÉER DES PRODUITS
  INSERT INTO public.products (company_id, code, name, description, barcode, sale_price, purchase_price, category)
  VALUES 
    (v_company_1, 'P-001', 'MacBook Pro M3', 'Apple MacBook Pro 2024', 'MBP-2024-001', 25000, 21000, 'Informatique'),
    (v_company_1, 'P-002', 'iPhone 15 Pro', 'Apple iPhone 15 Pro Titane', 'IP15-2024-002', 12000, 10500, 'Téléphonie')
  RETURNING id INTO v_product_1;

  SELECT id INTO v_product_2 FROM public.products WHERE code = 'P-002' AND company_id = v_company_1;

  -- Injecter du stock
  INSERT INTO public.stock_levels (company_id, warehouse_id, product_id, current_stock)
  VALUES 
    (v_company_1, v_warehouse_1, v_product_1, 50),
    (v_company_1, v_warehouse_1, v_product_2, 120);

  -- 5. CRÉER DES CLIENTS & FOURNISSEURS
  INSERT INTO public.customers (company_id, code, name, email, phone, city)
  VALUES 
    (v_company_1, 'C-001', 'Maroc Telecom SA', 'achats@iam.ma', '+212500000001', 'Rabat'),
    (v_company_1, 'C-002', 'Startup Hub Tech', 'contact@hub.ma', '+212600000002', 'Casablanca')
  RETURNING id INTO v_customer_1;

  SELECT id INTO v_customer_2 FROM public.customers WHERE code = 'C-002' AND company_id = v_company_1;

  INSERT INTO public.suppliers (company_id, code, name, email, phone, city)
  VALUES (v_company_1, 'S-001', 'Apple Distribution', 'wholesale@apple.com', '+18005551234', 'Cupertino')
  RETURNING id INTO v_supplier_1;

  -- 6. CRÉER UN DEVIS (QUOTATION)
  INSERT INTO public.quotations (company_id, customer_id, quotation_number, status, total_expected, date, valid_until)
  VALUES (v_company_1, v_customer_1, 'DEV-2026-0001', 'draft', 37000, CURRENT_DATE, CURRENT_DATE + interval '30 days')
  RETURNING id INTO v_quote_1;

  INSERT INTO public.quotation_lines (company_id, quotation_id, product_id, quantity, unit_price)
  VALUES 
    (v_company_1, v_quote_1, v_product_1, 1, 25000),
    (v_company_1, v_quote_1, v_product_2, 1, 12000);

  -- 7. CRÉER UN BON DE COMMANDE FOURNISSEUR (PURCHASE ORDER)
  INSERT INTO public.purchase_orders (company_id, supplier_id, order_number, status, total_amount, date, expected_date)
  VALUES (v_company_1, v_supplier_1, 'BC-F-2026-0001', 'draft', 210000, CURRENT_DATE, CURRENT_DATE + interval '14 days')
  RETURNING id INTO v_po_1;

  INSERT INTO public.purchase_order_lines (company_id, order_id, product_id, quantity, unit_price)
  VALUES (v_company_1, v_po_1, v_product_1, 10, 21000);

END $$;
