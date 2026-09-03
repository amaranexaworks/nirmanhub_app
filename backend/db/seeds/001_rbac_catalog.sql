-- ════════════════════════════════════════════════════════════════════════
-- SEED 001 — Archetypes, Roles, Capabilities  (replaces src/types/roles.ts)
-- Idempotent: ON CONFLICT DO UPDATE keeps codes stable across re-seeds.
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- ── Archetypes ──────────────────────────────────────────────────────────────
INSERT INTO nirmaan.archtyp_lst_t (archtyp_cd, archtyp_nm, dscn_tx, icn_tx, sqnce_id) VALUES
  ('seeker',       'Seeker',               'Home owners, tenants and buyers who hire and buy',       'home-outline',       1),
  ('worker',       'Pro / Worker',         'Skilled and unskilled construction workers',             'construct-outline',  2),
  ('expert',       'Expert',               'Architects, engineers and consultants',                  'ribbon-outline',     3),
  ('orchestrator', 'Builder / Contractor', 'Builders and contractors who run sites and teams',       'business-outline',   4),
  ('vendor',       'Vendor',               'Material, equipment, property and transport suppliers',  'storefront-outline', 5),
  ('financier',    'Banker / Lender',      'Banks, lenders and insurance providers',                 'cash-outline',       6)
ON CONFLICT (archtyp_cd) DO UPDATE
  SET archtyp_nm = EXCLUDED.archtyp_nm, dscn_tx = EXCLUDED.dscn_tx,
      icn_tx = EXCLUDED.icn_tx, sqnce_id = EXCLUDED.sqnce_id;

-- ── Roles ───────────────────────────────────────────────────────────────────
-- archtyp_id resolved by code so serial values need not be known.
INSERT INTO nirmaan.rle_lst_t (rle_cd, rle_nm, archtyp_id, emoji_tx, sqnce_id)
SELECT v.rle_cd, v.rle_nm, a.archtyp_id, v.emoji_tx, v.sqnce_id
FROM (VALUES
  -- seeker
  ('home_owner',        'Home Owner',           'seeker',        '🏠', 1),
  ('tenant',            'Tenant',               'seeker',        '🔑', 2),
  ('property_buyer',    'Property Buyer',       'seeker',        '🏡', 3),
  -- worker
  ('mason',             'Mason',                'worker',        '🧱', 1),
  ('labour',            'Labour',               'worker',        '💪', 2),
  ('carpenter',         'Carpenter',            'worker',        '🪚', 3),
  ('painter',           'Painter',              'worker',        '🎨', 4),
  ('electrician',       'Electrician',          'worker',        '⚡', 5),
  ('plumber',           'Plumber',              'worker',        '🔧', 6),
  ('tile_worker',       'Tile Worker',          'worker',        '◻️', 7),
  ('steel_fixer',       'Steel Fixer',          'worker',        '🔩', 8),
  ('welder',            'Welder',               'worker',        '🔥', 9),
  ('fabricator',        'Fabricator',           'worker',        '🛠️', 10),
  ('plasterer',         'Plasterer',            'worker',        '🧰', 11),
  ('pop_ceiling',       'POP / False Ceiling',  'worker',        '🏗️', 12),
  ('waterproofing',     'Waterproofing',        'worker',        '💧', 13),
  ('flooring_polisher', 'Flooring / Polisher',  'worker',        '✨', 14),
  ('glass_aluminium',   'Glass & Aluminium',    'worker',        '🪟', 15),
  ('borewell',          'Borewell',             'worker',        '🕳️', 16),
  ('equipment_operator','Equipment Operator',   'worker',        '🚜', 17),
  ('driver',            'Driver',               'worker',        '🚚', 18),
  ('hvac',              'HVAC Technician',      'worker',        '❄️', 19),
  ('lift_technician',   'Lift Technician',      'worker',        '🛗', 20),
  ('solar_installer',   'Solar Installer',      'worker',        '☀️', 21),
  ('cctv_installer',    'CCTV Installer',       'worker',        '📹', 22),
  ('gardener',          'Gardener',             'worker',        '🌿', 23),
  ('housekeeping',      'Housekeeping',         'worker',        '🧹', 24),
  ('pest_control',      'Pest Control',         'worker',        '🐜', 25),
  ('demolition',        'Demolition',           'worker',        '🔨', 26),
  ('roofer',            'Roofer',               'worker',        '🏘️', 27),
  -- expert
  ('architect',            'Architect',            'expert',     '📐', 1),
  ('structural_engineer',  'Structural Engineer',  'expert',     '🏛️', 2),
  ('interior_designer',    'Interior Designer',    'expert',     '🛋️', 3),
  ('surveyor',             'Surveyor',             'expert',     '🧭', 4),
  ('civil_engineer',       'Civil Engineer',       'expert',     '👷', 5),
  ('mep_engineer',         'MEP Engineer',         'expert',     '🔌', 6),
  ('vastu_consultant',     'Vastu Consultant',     'expert',     '🧿', 7),
  ('safety_officer',       'Safety Officer',       'expert',     '🦺', 8),
  ('valuer',               'Valuer',               'expert',     '💰', 9),
  ('legal_advisor',        'Legal Advisor',        'expert',     '⚖️', 10),
  ('draughtsman',          'Draughtsman',          'expert',     '✏️', 11),
  -- orchestrator
  ('builder',           'Builder',              'orchestrator',  '🏗️', 1),
  ('contractor',        'Contractor',           'orchestrator',  '📋', 2),
  ('project_manager',   'Project Manager',      'orchestrator',  '🗂️', 3),
  ('site_supervisor',   'Site Supervisor',      'orchestrator',  '👀', 4),
  ('labour_contractor', 'Labour Contractor',    'orchestrator',  '🤝', 5),
  ('sub_contractor',    'Sub-Contractor',       'orchestrator',  '🔗', 6),
  -- vendor
  ('material_supplier',    'Material Supplier',    'vendor',     '🧱', 1),
  ('equipment_rental',     'Equipment Rental',     'vendor',     '🚧', 2),
  ('transport_provider',   'Transport Provider',   'vendor',     '🚛', 3),
  ('scaffolding_provider', 'Scaffolding Provider', 'vendor',     '🪜', 4),
  ('property_seller',      'Property Seller',      'vendor',     '🏢', 5),
  ('real_estate_agent',    'Real Estate Agent',    'vendor',     '🗝️', 6),
  ('rmc_supplier',         'RMC Supplier',         'vendor',     '🚙', 7),
  ('hardware_supplier',    'Hardware Supplier',    'vendor',     '🔩', 8),
  ('sanitaryware_supplier','Sanitaryware Supplier','vendor',     '🚿', 9),
  ('water_tanker',         'Water Tanker',         'vendor',     '🚰', 10),
  -- financier
  ('banker',             'Banker',               'financier',   '🏦', 1),
  ('insurance_provider', 'Insurance Provider',   'financier',   '🛡️', 2),
  ('loan_agent',         'Loan Agent',           'financier',   '📝', 3)
) AS v(rle_cd, rle_nm, archtyp_cd, emoji_tx, sqnce_id)
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd = v.archtyp_cd
ON CONFLICT (rle_cd) DO UPDATE
  SET rle_nm = EXCLUDED.rle_nm, archtyp_id = EXCLUDED.archtyp_id,
      emoji_tx = EXCLUDED.emoji_tx, sqnce_id = EXCLUDED.sqnce_id;

-- ── Capabilities ────────────────────────────────────────────────────────────
INSERT INTO nirmaan.cpblty_lst_t (cpblty_cd, cpblty_nm, dscn_tx) VALUES
  ('browse_marketplace', 'Browse Marketplace',   'View listings across the marketplace'),
  ('hire_workers',       'Hire Workers',         'Search and hire workers'),
  ('post_job',           'Post Job',             'Post a job for workers to apply'),
  ('apply_job',          'Apply to Jobs',        'Apply to posted jobs'),
  ('bid_project',        'Bid on Projects',      'Submit bids/quotes on projects'),
  ('post_project',       'Post Project',         'Post a project or requirement'),
  ('manage_sites',       'Manage Sites',         'Create and manage construction sites'),
  ('manage_teams',       'Manage Teams',         'Manage workforce teams'),
  ('mark_attendance',    'Mark Attendance',      'Record daily site attendance'),
  ('run_payroll',        'Run Payroll',          'Process wages and payouts'),
  ('list_material',      'List Materials',       'List materials for sale'),
  ('list_equipment',     'List Equipment',       'List equipment for rent'),
  ('list_property',      'List Property',        'List property for sale/rent'),
  ('set_availability',   'Set Availability',     'Publish availability calendar'),
  ('create_quotation',   'Create Quotation',     'Create and send quotations'),
  ('manage_portfolio',   'Manage Portfolio',     'Maintain a professional portfolio'),
  ('list_loan_product',  'List Loan Products',   'Publish loan/credit products'),
  ('review_loan',        'Review Loan',          'Review and decide loan applications'),
  ('apply_loan',         'Apply for Loan',       'Apply for a loan or credit')
ON CONFLICT (cpblty_cd) DO UPDATE SET cpblty_nm = EXCLUDED.cpblty_nm, dscn_tx = EXCLUDED.dscn_tx;

-- ── Archetype → Capability grants ───────────────────────────────────────────
INSERT INTO nirmaan.archtyp_cpblty_rel_t (archtyp_id, cpblty_id)
SELECT a.archtyp_id, c.cpblty_id
FROM (VALUES
  ('seeker','browse_marketplace'), ('seeker','hire_workers'), ('seeker','post_job'),
    ('seeker','post_project'), ('seeker','apply_loan'),
  ('worker','browse_marketplace'), ('worker','apply_job'), ('worker','set_availability'),
    ('worker','apply_loan'),
  ('expert','browse_marketplace'), ('expert','bid_project'), ('expert','create_quotation'),
    ('expert','manage_portfolio'), ('expert','apply_loan'),
  ('orchestrator','browse_marketplace'), ('orchestrator','hire_workers'), ('orchestrator','post_job'),
    ('orchestrator','post_project'), ('orchestrator','bid_project'), ('orchestrator','manage_sites'),
    ('orchestrator','manage_teams'), ('orchestrator','mark_attendance'), ('orchestrator','run_payroll'),
    ('orchestrator','create_quotation'), ('orchestrator','apply_loan'),
  ('vendor','browse_marketplace'), ('vendor','list_material'), ('vendor','list_equipment'),
    ('vendor','list_property'), ('vendor','create_quotation'), ('vendor','apply_loan'),
  ('financier','browse_marketplace'), ('financier','list_loan_product'), ('financier','review_loan')
) AS v(archtyp_cd, cpblty_cd)
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_cd = v.archtyp_cd
JOIN nirmaan.cpblty_lst_t  c ON c.cpblty_cd  = v.cpblty_cd
ON CONFLICT (archtyp_id, cpblty_id) DO NOTHING;
