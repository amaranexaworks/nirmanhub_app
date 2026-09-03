/**
 * The 20 user roles collapse into 5 behavioral archetypes.
 * See docs/01-product-strategy.md §3 and docs/03-sitemap-navigation.md.
 * Roles are *attributes* of a user; the archetype drives the UX (tabs + dashboard + features).
 */

// Curated local photos for the core trades — bundled so they always resolve to the
// right image (remote stock IDs drifted and showed mismatched photos in the picker).
import masonImg from '@assets/roles/mason.png';
import labourImg from '@assets/roles/labour.png';
import carpenterImg from '@assets/roles/carpenter.png';
import painterImg from '@assets/roles/painter.png';
import electricianImg from '@assets/roles/electrician.png';
import plumberImg from '@assets/roles/plumber.png';
import tileWorkerImg from '@assets/roles/tile_worker.png';
import steelFixerImg from '@assets/roles/steel_fixer.png';

export type Role =
  // Archetype A — Seeker (demand)
  | 'home_owner'
  | 'tenant'
  | 'property_buyer'
  // Archetype B — Pro / Worker (individual supply)
  | 'mason'
  | 'labour'
  | 'carpenter'
  | 'painter'
  | 'electrician'
  | 'plumber'
  | 'tile_worker'
  | 'steel_fixer'
  | 'welder'
  | 'fabricator'
  | 'plasterer'
  | 'pop_ceiling'
  | 'waterproofing'
  | 'flooring_polisher'
  | 'glass_aluminium'
  | 'borewell'
  | 'equipment_operator'
  | 'driver'
  | 'hvac'
  | 'lift_technician'
  | 'solar_installer'
  | 'cctv_installer'
  | 'gardener'
  | 'housekeeping'
  | 'pest_control'
  | 'demolition'
  | 'roofer'
  | 'stone_mason'
  | 'paviour'
  | 'concrete_finisher'
  | 'rigger'
  | 'shuttering_carpenter'
  | 'fire_fighting_installer'
  // Archetype C — Expert (credentialed supply)
  | 'architect'
  | 'structural_engineer'
  | 'interior_designer'
  | 'surveyor'
  | 'civil_engineer'
  | 'mep_engineer'
  | 'vastu_consultant'
  | 'safety_officer'
  | 'valuer'
  | 'legal_advisor'
  | 'draughtsman'
  | 'quantity_surveyor'
  | 'billing_engineer'
  | 'liaison_consultant'
  | 'rera_consultant'
  | 'real_estate_ca'
  | 'fire_noc_consultant'
  | 'facility_manager'
  // Archetype D — Orchestrator (demand + supply)
  | 'builder'
  | 'contractor'
  | 'project_manager'
  | 'site_supervisor'
  | 'labour_contractor'
  | 'sub_contractor'
  | 'property_manager'
  | 'channel_partner'
  // Archetype E — Vendor (goods & logistics supply)
  | 'material_supplier'
  | 'equipment_rental'
  | 'transport_provider'
  | 'scaffolding_provider'
  | 'property_seller'
  | 'real_estate_agent'
  | 'rmc_supplier'
  | 'hardware_supplier'
  | 'sanitaryware_supplier'
  | 'water_tanker'
  | 'precast_manufacturer'
  // Archetype F — Financier (capital supply: serves every other role)
  | 'banker'
  | 'insurance_provider'
  | 'loan_agent'
  | 'developer_financier'
  | 'nbfc'
  | 'private_lender'
  | 'project_finance_advisor'
  // Archetype G — Admin (platform operator; never shown in customer onboarding)
  | 'platform_admin';

export type Archetype = 'seeker' | 'worker' | 'expert' | 'orchestrator' | 'vendor' | 'financier' | 'admin';

/** Fine-grained capabilities. Route guards check capabilities, not roles. */
export type Capability =
  | 'browse_marketplace'
  | 'hire_workers'
  | 'post_job'
  | 'apply_job'
  | 'bid_project'
  | 'post_project'
  | 'manage_sites'
  | 'manage_teams'
  | 'mark_attendance'
  | 'run_payroll'
  | 'list_material'
  | 'list_equipment'
  | 'list_property'
  | 'set_availability'
  | 'create_quotation'
  | 'manage_portfolio'
  | 'list_loan_product'
  | 'review_loan'
  | 'apply_loan'
  // Admin capabilities (gate the admin console + privileged APIs)
  | 'admin_access'
  | 'manage_users'
  | 'verify_kyc'
  | 'moderate_content'
  | 'oversee_finance'
  | 'view_analytics'
  | 'broadcast';

export interface RoleMeta {
  role: Role;
  label: string;
  archetype: Archetype;
  /** trade glyph / ionicon name used on cards and pickers */
  icon: string;
  /** emoji glyph — renders reliably as a colorful visual on tiles & chips */
  emoji: string;
}

export const ROLE_CATALOG: Record<Role, RoleMeta> = {
  home_owner: { role: 'home_owner', label: 'Home Owner', archetype: 'seeker', icon: 'home', emoji: '🏠' },
  tenant: { role: 'tenant', label: 'Tenant / Resident', archetype: 'seeker', icon: 'bed', emoji: '🛏️' },
  property_buyer: { role: 'property_buyer', label: 'Property Buyer', archetype: 'seeker', icon: 'business', emoji: '🔑' },

  mason: { role: 'mason', label: 'Mason', archetype: 'worker', icon: 'construct', emoji: '🧱' },
  labour: { role: 'labour', label: 'Labour Worker', archetype: 'worker', icon: 'barbell', emoji: '👷' },
  carpenter: { role: 'carpenter', label: 'Carpenter', archetype: 'worker', icon: 'hammer', emoji: '🔨' },
  painter: { role: 'painter', label: 'Painter', archetype: 'worker', icon: 'color-fill', emoji: '🎨' },
  electrician: { role: 'electrician', label: 'Electrician', archetype: 'worker', icon: 'flash', emoji: '⚡' },
  plumber: { role: 'plumber', label: 'Plumber', archetype: 'worker', icon: 'water', emoji: '🚰' },
  tile_worker: { role: 'tile_worker', label: 'Tile Worker', archetype: 'worker', icon: 'grid', emoji: '🟦' },
  steel_fixer: { role: 'steel_fixer', label: 'Steel Fixer', archetype: 'worker', icon: 'git-network', emoji: '🔩' },
  welder: { role: 'welder', label: 'Welder', archetype: 'worker', icon: 'flame', emoji: '🔥' },
  fabricator: { role: 'fabricator', label: 'Fabricator', archetype: 'worker', icon: 'build', emoji: '⚙️' },
  plasterer: { role: 'plasterer', label: 'Plasterer', archetype: 'worker', icon: 'brush', emoji: '🪣' },
  pop_ceiling: { role: 'pop_ceiling', label: 'POP / False Ceiling', archetype: 'worker', icon: 'grid', emoji: '⬜' },
  waterproofing: { role: 'waterproofing', label: 'Waterproofing', archetype: 'worker', icon: 'water', emoji: '💧' },
  flooring_polisher: { role: 'flooring_polisher', label: 'Flooring & Polishing', archetype: 'worker', icon: 'sparkles', emoji: '🟫' },
  glass_aluminium: { role: 'glass_aluminium', label: 'Glass & Aluminium', archetype: 'worker', icon: 'square', emoji: '🪟' },
  borewell: { role: 'borewell', label: 'Borewell Driller', archetype: 'worker', icon: 'ellipse', emoji: '🕳️' },
  equipment_operator: { role: 'equipment_operator', label: 'Machine Operator', archetype: 'worker', icon: 'cog', emoji: '🛠️' },
  driver: { role: 'driver', label: 'Driver', archetype: 'worker', icon: 'car-sport', emoji: '🚗' },
  hvac: { role: 'hvac', label: 'AC / HVAC Technician', archetype: 'worker', icon: 'snow', emoji: '❄️' },
  lift_technician: { role: 'lift_technician', label: 'Lift Technician', archetype: 'worker', icon: 'swap-vertical', emoji: '🛗' },
  solar_installer: { role: 'solar_installer', label: 'Solar Installer', archetype: 'worker', icon: 'sunny', emoji: '☀️' },
  cctv_installer: { role: 'cctv_installer', label: 'CCTV / Security', archetype: 'worker', icon: 'videocam', emoji: '📹' },
  gardener: { role: 'gardener', label: 'Gardener / Landscaper', archetype: 'worker', icon: 'leaf', emoji: '🌳' },
  housekeeping: { role: 'housekeeping', label: 'Housekeeping', archetype: 'worker', icon: 'sparkles', emoji: '🧹' },
  pest_control: { role: 'pest_control', label: 'Pest Control', archetype: 'worker', icon: 'bug', emoji: '🐜' },
  demolition: { role: 'demolition', label: 'Demolition Worker', archetype: 'worker', icon: 'hammer', emoji: '💥' },
  roofer: { role: 'roofer', label: 'Roofing Specialist', archetype: 'worker', icon: 'home', emoji: '🛖' },
  stone_mason: { role: 'stone_mason', label: 'Stone Mason', archetype: 'worker', icon: 'cube', emoji: '🪨' },
  paviour: { role: 'paviour', label: 'Paviour / Paver', archetype: 'worker', icon: 'grid', emoji: '🧱' },
  concrete_finisher: { role: 'concrete_finisher', label: 'Concrete Finisher', archetype: 'worker', icon: 'layers', emoji: '🪵' },
  rigger: { role: 'rigger', label: 'Rigger / Crane Lifter', archetype: 'worker', icon: 'git-network', emoji: '🏗️' },
  shuttering_carpenter: { role: 'shuttering_carpenter', label: 'Shuttering Carpenter', archetype: 'worker', icon: 'hammer', emoji: '🪚' },
  fire_fighting_installer: { role: 'fire_fighting_installer', label: 'Fire-Fighting Installer', archetype: 'worker', icon: 'flame', emoji: '🧯' },

  architect: { role: 'architect', label: 'Architect', archetype: 'expert', icon: 'pencil', emoji: '📐' },
  structural_engineer: { role: 'structural_engineer', label: 'Structural Engineer', archetype: 'expert', icon: 'analytics', emoji: '🏗️' },
  interior_designer: { role: 'interior_designer', label: 'Interior Designer', archetype: 'expert', icon: 'brush', emoji: '🛋️' },
  surveyor: { role: 'surveyor', label: 'Surveyor', archetype: 'expert', icon: 'map', emoji: '🗺️' },
  civil_engineer: { role: 'civil_engineer', label: 'Civil Engineer', archetype: 'expert', icon: 'business', emoji: '🏛️' },
  mep_engineer: { role: 'mep_engineer', label: 'MEP Engineer', archetype: 'expert', icon: 'git-merge', emoji: '🔌' },
  vastu_consultant: { role: 'vastu_consultant', label: 'Vastu Consultant', archetype: 'expert', icon: 'compass', emoji: '🧭' },
  safety_officer: { role: 'safety_officer', label: 'Safety Officer (HSE)', archetype: 'expert', icon: 'shield-checkmark', emoji: '⛑️' },
  valuer: { role: 'valuer', label: 'Property Valuer', archetype: 'expert', icon: 'stats-chart', emoji: '📊' },
  legal_advisor: { role: 'legal_advisor', label: 'Legal Advisor', archetype: 'expert', icon: 'document-text', emoji: '⚖️' },
  draughtsman: { role: 'draughtsman', label: 'CAD Draughtsman', archetype: 'expert', icon: 'pencil', emoji: '✏️' },
  quantity_surveyor: { role: 'quantity_surveyor', label: 'Quantity Surveyor', archetype: 'expert', icon: 'calculator', emoji: '📐' },
  billing_engineer: { role: 'billing_engineer', label: 'Billing Engineer', archetype: 'expert', icon: 'receipt', emoji: '🧾' },
  liaison_consultant: { role: 'liaison_consultant', label: 'Liaisoning Consultant', archetype: 'expert', icon: 'git-pull-request', emoji: '📝' },
  rera_consultant: { role: 'rera_consultant', label: 'RERA Consultant', archetype: 'expert', icon: 'document-lock', emoji: '📑' },
  real_estate_ca: { role: 'real_estate_ca', label: 'Real-Estate CA', archetype: 'expert', icon: 'stats-chart', emoji: '📊' },
  fire_noc_consultant: { role: 'fire_noc_consultant', label: 'Fire NOC Consultant', archetype: 'expert', icon: 'flame', emoji: '🚒' },
  facility_manager: { role: 'facility_manager', label: 'Facility Manager', archetype: 'expert', icon: 'business', emoji: '🏢' },

  builder: { role: 'builder', label: 'Builder', archetype: 'orchestrator', icon: 'business', emoji: '🏢' },
  contractor: { role: 'contractor', label: 'Contractor', archetype: 'orchestrator', icon: 'people', emoji: '🦺' },
  project_manager: { role: 'project_manager', label: 'Project Manager', archetype: 'orchestrator', icon: 'clipboard', emoji: '📋' },
  site_supervisor: { role: 'site_supervisor', label: 'Site Supervisor', archetype: 'orchestrator', icon: 'eye', emoji: '🚧' },
  labour_contractor: { role: 'labour_contractor', label: 'Labour Contractor (Maistri)', archetype: 'orchestrator', icon: 'people-circle', emoji: '🧑‍🏭' },
  sub_contractor: { role: 'sub_contractor', label: 'Sub-Contractor', archetype: 'orchestrator', icon: 'git-branch', emoji: '🔗' },
  property_manager: { role: 'property_manager', label: 'Property Manager', archetype: 'orchestrator', icon: 'business', emoji: '🏘️' },
  channel_partner: { role: 'channel_partner', label: 'Channel Partner', archetype: 'orchestrator', icon: 'people', emoji: '🤝' },

  material_supplier: { role: 'material_supplier', label: 'Material Supplier', archetype: 'vendor', icon: 'cube', emoji: '📦' },
  equipment_rental: { role: 'equipment_rental', label: 'Equipment Rental', archetype: 'vendor', icon: 'car', emoji: '🚜' },
  transport_provider: { role: 'transport_provider', label: 'Transport / Logistics', archetype: 'vendor', icon: 'bus', emoji: '🚚' },
  scaffolding_provider: { role: 'scaffolding_provider', label: 'Scaffolding / Centering', archetype: 'vendor', icon: 'git-commit', emoji: '🪜' },
  property_seller: { role: 'property_seller', label: 'Property Seller', archetype: 'vendor', icon: 'pricetag', emoji: '🏷️' },
  real_estate_agent: { role: 'real_estate_agent', label: 'Real Estate Agent', archetype: 'vendor', icon: 'home', emoji: '🏡' },
  rmc_supplier: { role: 'rmc_supplier', label: 'Ready-Mix Concrete', archetype: 'vendor', icon: 'business', emoji: '🏭' },
  hardware_supplier: { role: 'hardware_supplier', label: 'Hardware Supplier', archetype: 'vendor', icon: 'construct', emoji: '🔧' },
  sanitaryware_supplier: { role: 'sanitaryware_supplier', label: 'Sanitaryware & Fittings', archetype: 'vendor', icon: 'water', emoji: '🚽' },
  water_tanker: { role: 'water_tanker', label: 'Water Tanker', archetype: 'vendor', icon: 'water', emoji: '🛢️' },
  precast_manufacturer: { role: 'precast_manufacturer', label: 'Precast / Prefab Manufacturer', archetype: 'vendor', icon: 'cube', emoji: '🏭' },

  banker: { role: 'banker', label: 'Banker / Lender', archetype: 'financier', icon: 'cash', emoji: '🏦' },
  insurance_provider: { role: 'insurance_provider', label: 'Insurance Provider', archetype: 'financier', icon: 'shield', emoji: '🛡️' },
  loan_agent: { role: 'loan_agent', label: 'Loan Agent (DSA)', archetype: 'financier', icon: 'briefcase', emoji: '💼' },
  developer_financier: { role: 'developer_financier', label: 'Developer Financier', archetype: 'financier', icon: 'business', emoji: '🏦' },
  nbfc: { role: 'nbfc', label: 'NBFC / Infra Lender', archetype: 'financier', icon: 'cash', emoji: '💰' },
  private_lender: { role: 'private_lender', label: 'Private Lender / AIF', archetype: 'financier', icon: 'wallet', emoji: '💵' },
  project_finance_advisor: { role: 'project_finance_advisor', label: 'Project Finance Advisor', archetype: 'financier', icon: 'trending-up', emoji: '📈' },

  platform_admin: { role: 'platform_admin', label: 'Platform Admin', archetype: 'admin', icon: 'shield-checkmark', emoji: '🛡️' },
};

/**
 * Real photo per role for pickers, cards & tiles (emoji glyphs read as low-quality).
 * All IDs verified to resolve; the UI still falls back to the gold icon tile on any load error.
 */
const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=120&h=120&fit=crop&q=70&auto=format`;

export const ROLE_IMAGE: Record<Role, string> = {
  home_owner: IMG('1600585152220-90363fe7e115'),
  tenant: IMG('1600607686527-6fb886090705'),
  property_buyer: IMG('1524230572899-a752b3835840'),

  mason: masonImg,
  labour: labourImg,
  carpenter: carpenterImg,
  painter: painterImg,
  electrician: electricianImg,
  plumber: plumberImg,
  tile_worker: tileWorkerImg,
  steel_fixer: steelFixerImg,
  welder: IMG('1504328345606-18bbc8c9d7d1'),
  fabricator: IMG('1516192518150-0d8fee5425e3'),
  plasterer: IMG('1517646287270-a5a9ca602e5c'),
  pop_ceiling: IMG('1571902943202-507ec2618e8f'),
  waterproofing: IMG('1590247813693-5541d1c609fd'),
  flooring_polisher: IMG('1610824352934-c10d87b700cc'),
  glass_aluminium: IMG('1513467535987-fd81bc7d62f8'),
  borewell: IMG('1589939705384-5185137a7f0f'),
  equipment_operator: IMG('1516156008625-3a9d6067fab5'),
  driver: IMG('1601584115197-04ecc0da31d7'),
  hvac: IMG('1581092160562-40aa08e78837'),
  lift_technician: IMG('1567954970774-58d6aa6c50dc'),
  solar_installer: IMG('1509391366360-2e959784a276'),
  cctv_installer: IMG('1558002038-1055907df827'),
  gardener: IMG('1416879595882-3373a0480b5b'),
  housekeeping: IMG('1600607686527-6fb886090705'),
  pest_control: IMG('1618090584176-7132b9911657'),
  demolition: IMG('1605152276897-4f618f831968'),
  roofer: IMG('1531834685032-c34bf0d84c77'),
  stone_mason: masonImg,
  paviour: tileWorkerImg,
  concrete_finisher: IMG('1590247813693-5541d1c609fd'),
  rigger: IMG('1516156008625-3a9d6067fab5'),
  shuttering_carpenter: carpenterImg,
  fire_fighting_installer: IMG('1581092160562-40aa08e78837'),

  architect: IMG('1503387762-592deb58ef4e'),
  structural_engineer: IMG('1503389152951-9f343605f61e'),
  interior_designer: IMG('1586023492125-27b2c045efd7'),
  surveyor: IMG('1524230572899-a752b3835840'),
  civil_engineer: IMG('1621905251189-08b45d6a269e'),
  mep_engineer: IMG('1581092160562-40aa08e78837'),
  vastu_consultant: IMG('1571902943202-507ec2618e8f'),
  safety_officer: IMG('1541888946425-d81bb19240f5'),
  valuer: IMG('1554224155-6726b3ff858f'),
  legal_advisor: IMG('1589829545856-d10d557cf95f'),
  draughtsman: IMG('1497366216548-37526070297c'),
  quantity_surveyor: IMG('1554224155-6726b3ff858f'),
  billing_engineer: IMG('1554224155-6726b3ff858f'),
  liaison_consultant: IMG('1589829545856-d10d557cf95f'),
  rera_consultant: IMG('1589829545856-d10d557cf95f'),
  real_estate_ca: IMG('1554224155-6726b3ff858f'),
  fire_noc_consultant: IMG('1541888946425-d81bb19240f5'),
  facility_manager: IMG('1497366811353-6870744d04b2'),

  builder: IMG('1531834685032-c34bf0d84c77'),
  contractor: IMG('1572981779307-38b8cabb2407'),
  project_manager: IMG('1497366811353-6870744d04b2'),
  site_supervisor: IMG('1516216628859-9bccecab13ca'),
  labour_contractor: IMG('1581094794329-c8112a89af12'),
  sub_contractor: IMG('1605152276897-4f618f831968'),
  property_manager: IMG('1521791136064-7986c2920216'),
  channel_partner: IMG('1560250097-0b93528c311a'),

  material_supplier: IMG('1620641788421-7a1c342ea42e'),
  equipment_rental: IMG('1516156008625-3a9d6067fab5'),
  transport_provider: IMG('1601584115197-04ecc0da31d7'),
  scaffolding_provider: IMG('1541888946425-d81bb19240f5'),
  property_seller: IMG('1600585152220-90363fe7e115'),
  real_estate_agent: IMG('1521791136064-7986c2920216'),
  rmc_supplier: IMG('1590247813693-5541d1c609fd'),
  hardware_supplier: IMG('1580901368919-7738efb0f87e'),
  sanitaryware_supplier: IMG('1607472586893-edb57bdc0e39'),
  water_tanker: IMG('1581578731548-c64695cc6952'),
  precast_manufacturer: IMG('1590247813693-5541d1c609fd'),

  banker: IMG('1554224155-6726b3ff858f'),
  insurance_provider: IMG('1521791136064-7986c2920216'),
  loan_agent: IMG('1497366216548-37526070297c'),
  developer_financier: IMG('1554224155-6726b3ff858f'),
  nbfc: IMG('1554224155-6726b3ff858f'),
  private_lender: IMG('1497366216548-37526070297c'),
  project_finance_advisor: IMG('1554224155-6726b3ff858f'),

  platform_admin: IMG('1521737604893-d14cc237f11d'),
};

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  seeker: 'Seeker',
  worker: 'Pro / Worker',
  expert: 'Expert',
  orchestrator: 'Builder / Contractor',
  vendor: 'Vendor',
  financier: 'Banker / Lender',
  admin: 'Administrator',
};

/** Capabilities granted per archetype. */
export const ARCHETYPE_CAPABILITIES: Record<Archetype, Capability[]> = {
  seeker: ['browse_marketplace', 'hire_workers', 'post_job'],
  worker: ['browse_marketplace', 'apply_job', 'set_availability', 'manage_portfolio'],
  expert: ['browse_marketplace', 'bid_project', 'create_quotation', 'manage_portfolio'],
  orchestrator: [
    'browse_marketplace',
    'hire_workers',
    'post_job',
    'post_project',
    'bid_project',
    'manage_sites',
    'manage_teams',
    'mark_attendance',
    'run_payroll',
    'create_quotation',
  ],
  vendor: ['browse_marketplace', 'list_material', 'list_equipment', 'list_property', 'create_quotation'],
  financier: ['browse_marketplace', 'list_loan_product', 'review_loan'],
  admin: [
    'browse_marketplace',
    'admin_access',
    'manage_users',
    'verify_kyc',
    'moderate_content',
    'oversee_finance',
    'view_analytics',
    'broadcast',
  ],
};

/** Every non-financier user can apply for a loan — financing serves the whole network. */
export const UNIVERSAL_CAPABILITIES: Capability[] = ['apply_loan'];

export function archetypeOf(role: Role): Archetype {
  return ROLE_CATALOG[role].archetype;
}

/** Resolve the active archetype from a user's selected role. */
export function resolveArchetype(activeRole: Role): Archetype {
  return archetypeOf(activeRole);
}
