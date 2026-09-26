import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const organizationSlug = process.env.DEMO_ORGANIZATION_SLUG;
const dryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !supabaseKey || !organizationSlug) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SECRET_KEY, and DEMO_ORGANIZATION_SLUG before seeding.');
}

const db = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type ProductDefinition = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  reorder: number;
  detail: string;
};

const productDefinitions: ProductDefinition[] = [
  { sku: 'DEMO-BEV-001', name: 'House Blend Medium Roast Coffee, 1 kg', category: 'Coffee & Tea', unit: 'bag', reorder: 18, detail: 'Whole-bean medium roast blend in a resealable 1 kg bag.' },
  { sku: 'DEMO-BEV-002', name: 'Single-Origin Espresso Beans, 1 kg', category: 'Coffee & Tea', unit: 'bag', reorder: 12, detail: 'Dark-roast espresso beans packed in a 1 kg valve bag.' },
  { sku: 'DEMO-BEV-003', name: 'Decaffeinated Ground Coffee, 500 g', category: 'Coffee & Tea', unit: 'bag', reorder: 14, detail: 'Water-process decaffeinated ground coffee, 500 g pack.' },
  { sku: 'DEMO-BEV-004', name: 'Earl Grey Tea Sachets, 100 ct', category: 'Coffee & Tea', unit: 'carton', reorder: 16, detail: 'Black tea with bergamot, individually wrapped sachets.' },
  { sku: 'DEMO-BEV-005', name: 'Green Tea Sachets, 80 ct', category: 'Coffee & Tea', unit: 'carton', reorder: 14, detail: 'Sencha-style green tea sachets in an 80-count carton.' },
  { sku: 'DEMO-BEV-006', name: 'Chamomile Herbal Tea, 40 ct', category: 'Coffee & Tea', unit: 'box', reorder: 10, detail: 'Caffeine-free chamomile infusion, 40 sachets per box.' },
  { sku: 'DEMO-BEV-007', name: 'Breakfast Tea Sachets, 100 ct', category: 'Coffee & Tea', unit: 'carton', reorder: 15, detail: 'Full-bodied breakfast tea for food-service use.' },
  { sku: 'DEMO-BEV-008', name: 'Unsweetened Cocoa Powder, 2 kg', category: 'Coffee & Tea', unit: 'bag', reorder: 8, detail: 'Unsweetened cocoa powder for beverage and bakery preparation.' },
  { sku: 'DEMO-BEV-009', name: 'Oat Beverage, 1 L', category: 'Coffee & Tea', unit: 'case', reorder: 24, detail: 'Shelf-stable oat beverage, 12 one-litre cartons per case.' },
  { sku: 'DEMO-BEV-010', name: 'Sparkling Mineral Water, 24 x 330 mL', category: 'Coffee & Tea', unit: 'case', reorder: 20, detail: 'Unsweetened sparkling mineral water in recyclable cans.' },
  { sku: 'DEMO-GRO-011', name: 'Rolled Oats, 5 kg', category: 'Dry Grocery', unit: 'bag', reorder: 10, detail: 'Food-service rolled oats in a 5 kg resealable bag.' },
  { sku: 'DEMO-GRO-012', name: 'Long-Grain Rice, 10 kg', category: 'Dry Grocery', unit: 'bag', reorder: 12, detail: 'Long-grain white rice, 10 kg food-service bag.' },
  { sku: 'DEMO-GRO-013', name: 'Penne Pasta, 5 kg', category: 'Dry Grocery', unit: 'case', reorder: 9, detail: 'Durum wheat penne, two 2.5 kg inner bags per case.' },
  { sku: 'DEMO-GRO-014', name: 'Tomato Passata, 12 x 700 g', category: 'Dry Grocery', unit: 'case', reorder: 11, detail: 'Crushed tomato passata in 700 g glass jars.' },
  { sku: 'DEMO-GRO-015', name: 'Chickpeas, 6 x 2.5 kg', category: 'Dry Grocery', unit: 'case', reorder: 8, detail: 'Ready-to-use chickpeas in six food-service tins.' },
  { sku: 'DEMO-GRO-016', name: 'Extra-Virgin Olive Oil, 5 L', category: 'Dry Grocery', unit: 'tin', reorder: 7, detail: 'Extra-virgin olive oil in a sealed 5 L food-service tin.' },
  { sku: 'DEMO-GRO-017', name: 'Sea Salt Flakes, 1 kg', category: 'Dry Grocery', unit: 'tub', reorder: 6, detail: 'Food-grade sea salt flakes in a 1 kg lidded tub.' },
  { sku: 'DEMO-GRO-018', name: 'Almond Chocolate Bars, 12 pack', category: 'Dry Grocery', unit: 'case', reorder: 13, detail: 'Individually wrapped dark-chocolate almond bars.' },
  { sku: 'DEMO-GRO-019', name: 'Roasted Mixed Nuts, 2 kg', category: 'Dry Grocery', unit: 'tub', reorder: 8, detail: 'Roasted unsalted mixed nuts in a resealable 2 kg tub.' },
  { sku: 'DEMO-GRO-020', name: 'Dried Cranberries, 1 kg', category: 'Dry Grocery', unit: 'bag', reorder: 7, detail: 'Sweetened dried cranberries in a food-grade 1 kg bag.' },
  { sku: 'DEMO-PKG-021', name: 'Kraft Shipping Carton, 400 x 300 x 250 mm', category: 'Packaging & Shipping', unit: 'bundle', reorder: 25, detail: 'Double-wall kraft carton, flat-packed in bundles of 20.' },
  { sku: 'DEMO-PKG-022', name: 'Kraft Shipping Carton, 300 x 200 x 150 mm', category: 'Packaging & Shipping', unit: 'bundle', reorder: 30, detail: 'Single-wall kraft carton, flat-packed in bundles of 25.' },
  { sku: 'DEMO-PKG-023', name: 'Padded Mailer, Size 3', category: 'Packaging & Shipping', unit: 'case', reorder: 12, detail: 'Recyclable padded mailer, 100 units per case.' },
  { sku: 'DEMO-PKG-024', name: 'Clear Packing Tape, 48 mm x 100 m', category: 'Packaging & Shipping', unit: 'carton', reorder: 18, detail: 'Clear polypropylene carton-sealing tape, 36 rolls per carton.' },
  { sku: 'DEMO-PKG-025', name: 'Stretch Film, 500 mm x 300 m', category: 'Packaging & Shipping', unit: 'roll', reorder: 16, detail: 'Clear hand-wrap stretch film for pallet stabilization.' },
  { sku: 'DEMO-PKG-026', name: 'Pallet Label, 100 x 150 mm', category: 'Packaging & Shipping', unit: 'roll', reorder: 20, detail: 'Thermal-transfer pallet labels, 500 labels per roll.' },
  { sku: 'DEMO-PKG-027', name: 'Corrugated Divider Set, 12-cell', category: 'Packaging & Shipping', unit: 'pack', reorder: 10, detail: 'Die-cut corrugated dividers for glass bottle shipments.' },
  { sku: 'DEMO-PKG-028', name: 'Paper Void Fill, 10 kg', category: 'Packaging & Shipping', unit: 'box', reorder: 8, detail: 'Recycled kraft paper void fill in a 10 kg dispenser box.' },
  { sku: 'DEMO-PKG-029', name: 'Pallet Corner Protector, 1.2 m', category: 'Packaging & Shipping', unit: 'bundle', reorder: 9, detail: 'Reusable edge protectors, 20 pieces per bundle.' },
  { sku: 'DEMO-PKG-030', name: 'Tamper-Evident Security Seal', category: 'Packaging & Shipping', unit: 'bag', reorder: 15, detail: 'Numbered pull-tight security seals, 100 per bag.' },
  { sku: 'DEMO-SAF-031', name: 'Nitrile Examination Gloves, Medium', category: 'Cleaning & Safety', unit: 'case', reorder: 18, detail: 'Powder-free nitrile gloves, 10 boxes of 100 per case.' },
  { sku: 'DEMO-SAF-032', name: 'Nitrile Examination Gloves, Large', category: 'Cleaning & Safety', unit: 'case', reorder: 18, detail: 'Powder-free nitrile gloves, 10 boxes of 100 per case.' },
  { sku: 'DEMO-SAF-033', name: 'High-Visibility Vest, Class 2', category: 'Cleaning & Safety', unit: 'each', reorder: 12, detail: 'Reflective mesh safety vest with front zipper and ID pocket.' },
  { sku: 'DEMO-SAF-034', name: 'Safety Glasses, Clear Lens', category: 'Cleaning & Safety', unit: 'box', reorder: 10, detail: 'Anti-scratch clear-lens safety glasses, 12 per box.' },
  { sku: 'DEMO-SAF-035', name: 'Foam Hand Soap, 1 L', category: 'Cleaning & Safety', unit: 'case', reorder: 8, detail: 'Mild foaming hand soap, six one-litre refills per case.' },
  { sku: 'DEMO-SAF-036', name: 'Neutral Floor Cleaner, 5 L', category: 'Cleaning & Safety', unit: 'case', reorder: 7, detail: 'Concentrated neutral floor cleaner, four 5 L containers.' },
  { sku: 'DEMO-SAF-037', name: 'Absorbent Spill Kit Refill, 20 L', category: 'Cleaning & Safety', unit: 'kit', reorder: 5, detail: 'Universal absorbent pads, socks, disposal bags, and gloves.' },
  { sku: 'DEMO-SAF-038', name: 'First Aid Refill Pack, 50 person', category: 'Cleaning & Safety', unit: 'kit', reorder: 4, detail: 'Workplace first-aid refill pack for a 50-person station.' },
  { sku: 'DEMO-SAF-039', name: 'Microfiber Cleaning Cloth, 10 pack', category: 'Cleaning & Safety', unit: 'pack', reorder: 14, detail: 'Reusable lint-free microfiber cloths in assorted colors.' },
  { sku: 'DEMO-SAF-040', name: 'Disposable Hairnet, 100 pack', category: 'Cleaning & Safety', unit: 'box', reorder: 10, detail: 'Lightweight food-safe disposable hairnets, 100 per box.' },
  { sku: 'DEMO-OFF-041', name: 'Thermal Label Roll, 100 x 150 mm', category: 'Office & Maintenance', unit: 'roll', reorder: 16, detail: 'Direct-thermal shipping labels, 500 per roll.' },
  { sku: 'DEMO-OFF-042', name: 'Warehouse Marker, Black', category: 'Office & Maintenance', unit: 'box', reorder: 8, detail: 'Chisel-tip permanent markers, 12 per box.' },
  { sku: 'DEMO-OFF-043', name: 'Clipboard, A4, Aluminum', category: 'Office & Maintenance', unit: 'each', reorder: 6, detail: 'Lightweight aluminum clipboard with low-profile clip.' },
  { sku: 'DEMO-OFF-044', name: 'Barcode Scanner Stand', category: 'Office & Maintenance', unit: 'each', reorder: 4, detail: 'Adjustable hands-free stand for compatible handheld scanners.' },
  { sku: 'DEMO-OFF-045', name: 'Thermal Printer Ribbon, 110 mm', category: 'Office & Maintenance', unit: 'roll', reorder: 10, detail: 'Wax-resin thermal-transfer ribbon for shipping labels.' },
  { sku: 'DEMO-OFF-046', name: 'Utility Knife, Retractable', category: 'Office & Maintenance', unit: 'each', reorder: 8, detail: 'Retractable safety knife with replaceable snap-off blade.' },
  { sku: 'DEMO-OFF-047', name: 'Replacement Utility Blades, 10 pack', category: 'Office & Maintenance', unit: 'pack', reorder: 10, detail: 'Carbon-steel replacement blades in a safety dispenser.' },
  { sku: 'DEMO-OFF-048', name: 'Pallet Jack Wheel Kit', category: 'Office & Maintenance', unit: 'kit', reorder: 3, detail: 'Replacement load-wheel and bearing kit for pallet jacks.' },
  { sku: 'DEMO-OFF-049', name: 'Rechargeable Scanner Battery', category: 'Office & Maintenance', unit: 'each', reorder: 5, detail: 'Spare rechargeable battery for compatible warehouse scanners.' },
  { sku: 'DEMO-OFF-050', name: 'Rack Beam Safety Pin', category: 'Office & Maintenance', unit: 'bag', reorder: 6, detail: 'Galvanized locking pins for pallet-rack beam connectors.' },
];

const categoryDefinitions = [
  { name: 'Coffee & Tea', description: 'Demo catalog group for hot drinks and beverage supplies.' },
  { name: 'Dry Grocery', description: 'Demo catalog group for shelf-stable food and pantry stock.' },
  { name: 'Packaging & Shipping', description: 'Demo catalog group for packing and fulfillment materials.' },
  { name: 'Cleaning & Safety', description: 'Demo catalog group for facility, hygiene, and PPE supplies.' },
  { name: 'Office & Maintenance', description: 'Demo catalog group for warehouse tools and equipment parts.' },
];

const warehouseDefinitions = [
  { code: 'DEMO-EAST-01', name: 'Lakeshore Fulfillment Hub', address: '8800 Lakeshore Commerce Drive, Cleveland, OH 44114' },
  { code: 'DEMO-WEST-01', name: 'Westfield Reserve Warehouse', address: '4200 Meridian Industrial Way, Indianapolis, IN 46241' },
];

async function query<T>(builder: any, action: string): Promise<T> {
  const { data, error } = await builder;
  if (error) throw new Error(`${action}: ${error.message}`);
  return data as T;
}

function openingQuantity(index: number, reorder: number): number {
  if (index % 13 === 0) return 0;
  if (index % 10 === 1 || index % 10 === 2) return Math.max(1, Math.floor(reorder * 0.55));
  return reorder * 2 + 8 + (index % 7) * 3;
}

async function ensureWarehouse(organizationId: string, definition: { code: string; name: string; address: string }) {
  const existing = await query<any>(
    db.from('warehouses').select('*').eq('organization_id', organizationId).eq('code', definition.code).maybeSingle(),
    `Find warehouse ${definition.code}`,
  );
  if (existing) return existing;
  return query<any>(
    db.from('warehouses').insert({ organization_id: organizationId, ...definition }).select('*').single(),
    `Create warehouse ${definition.code}`,
  );
}

async function ensureLocation(
  organizationId: string,
  warehouseId: string,
  definition: { code: string; name: string; type: string },
) {
  const existing = await query<any>(
    db.from('locations').select('*').eq('organization_id', organizationId).eq('warehouse_id', warehouseId).eq('code', definition.code).maybeSingle(),
    `Find location ${definition.code}`,
  );
  if (existing) return existing;
  return query<any>(
    db.from('locations').insert({ organization_id: organizationId, warehouse_id: warehouseId, ...definition }).select('*').single(),
    `Create location ${definition.code}`,
  );
}

async function ensureReceipt(
  organizationId: string,
  userId: string,
  warehouse: any,
  number: string,
  notes: string,
  items: Array<{ product_id: string; location_id: string; quantity: number; unit_info: string }>,
  validate: boolean,
) {
  let receipt = await query<any>(
    db.from('receipts').select('*').eq('organization_id', organizationId).eq('receipt_number', number).maybeSingle(),
    `Find receipt ${number}`,
  );
  if (receipt?.status === 'completed' || receipt?.status === 'validated') return receipt.id;
  if (!receipt) {
    receipt = await query<any>(
      db.from('receipts').insert({
        organization_id: organizationId,
        receipt_number: number,
        supplier_info: 'DEMO Supplier Cooperative - Sample PO',
        warehouse_id: warehouse.id,
        notes,
        status: 'draft',
        created_by: userId,
      }).select('*').single(),
      `Create receipt ${number}`,
    );
  } else {
    await query<any>(db.from('receipt_items').delete().eq('receipt_id', receipt.id), `Reset receipt items ${number}`);
  }
  if (items.length > 0) {
    await query<any>(
      db.from('receipt_items').insert(items.map((item) => ({ receipt_id: receipt.id, ...item }))),
      `Add receipt items ${number}`,
    );
  }
  if (validate) {
    await query<any>(db.rpc('rpc_validate_receipt', {
      p_org_id: organizationId,
      p_receipt_id: receipt.id,
      p_user_id: userId,
    }), `Validate receipt ${number}`);
  }
  return receipt.id;
}

async function ensureDelivery(
  organizationId: string,
  userId: string,
  warehouse: any,
  number: string,
  notes: string,
  items: Array<{ product_id: string; location_id: string; quantity: number }>,
  validate: boolean,
) {
  let delivery = await query<any>(
    db.from('deliveries').select('*').eq('organization_id', organizationId).eq('delivery_number', number).maybeSingle(),
    `Find delivery ${number}`,
  );
  if (delivery?.status === 'completed' || delivery?.status === 'validated') return delivery.id;
  if (!delivery) {
    delivery = await query<any>(
      db.from('deliveries').insert({
        organization_id: organizationId,
        delivery_number: number,
        customer_info: 'DEMO Customer - Sample Order',
        warehouse_id: warehouse.id,
        notes,
        status: 'draft',
        created_by: userId,
      }).select('*').single(),
      `Create delivery ${number}`,
    );
  } else {
    await query<any>(db.from('delivery_items').delete().eq('delivery_id', delivery.id), `Reset delivery items ${number}`);
  }
  if (items.length > 0) {
    await query<any>(
      db.from('delivery_items').insert(items.map((item) => ({ delivery_id: delivery.id, ...item }))),
      `Add delivery items ${number}`,
    );
  }
  if (validate) {
    await query<any>(db.rpc('rpc_validate_delivery', {
      p_org_id: organizationId,
      p_delivery_id: delivery.id,
      p_user_id: userId,
    }), `Complete delivery ${number}`);
  }
  return delivery.id;
}

async function ensureTransfer(
  organizationId: string,
  userId: string,
  sourceWarehouse: any,
  destinationWarehouse: any,
  number: string,
  notes: string,
  item: { product_id: string; source_location_id: string; destination_location_id: string; quantity: number },
  complete: boolean,
) {
  let transfer = await query<any>(
    db.from('transfers').select('*').eq('organization_id', organizationId).eq('transfer_number', number).maybeSingle(),
    `Find transfer ${number}`,
  );
  if (transfer?.status === 'completed') return transfer.id;
  if (!transfer) {
    transfer = await query<any>(
      db.from('transfers').insert({
        organization_id: organizationId,
        transfer_number: number,
        source_warehouse_id: sourceWarehouse.id,
        destination_warehouse_id: destinationWarehouse.id,
        notes,
        status: 'draft',
        created_by: userId,
      }).select('*').single(),
      `Create transfer ${number}`,
    );
  } else {
    await query<any>(db.from('transfer_items').delete().eq('transfer_id', transfer.id), `Reset transfer items ${number}`);
  }
  await query<any>(db.from('transfer_items').insert({ transfer_id: transfer.id, ...item }), `Add transfer item ${number}`);
  if (complete) {
    await query<any>(db.rpc('rpc_complete_transfer', {
      p_org_id: organizationId,
      p_transfer_id: transfer.id,
      p_user_id: userId,
    }), `Complete transfer ${number}`);
  }
  return transfer.id;
}

async function ensureAdjustment(
  organizationId: string,
  userId: string,
  warehouse: any,
  number: string,
  reason: string,
  notes: string,
  product: any,
  location: any,
  physicalQuantity: number,
  approve: boolean,
) {
  let adjustment = await query<any>(
    db.from('adjustments').select('*').eq('organization_id', organizationId).eq('adjustment_number', number).maybeSingle(),
    `Find adjustment ${number}`,
  );
  if (adjustment?.status === 'approved' || adjustment?.status === 'completed') return adjustment.id;
  if (!adjustment) {
    adjustment = await query<any>(
      db.from('adjustments').insert({
        organization_id: organizationId,
        adjustment_number: number,
        warehouse_id: warehouse.id,
        reason,
        notes,
        status: 'draft',
        created_by: userId,
      }).select('*').single(),
      `Create adjustment ${number}`,
    );
  } else {
    await query<any>(db.from('adjustment_items').delete().eq('adjustment_id', adjustment.id), `Reset adjustment items ${number}`);
  }
  const stockRow = await query<any>(
    db.from('stock').select('quantity').eq('organization_id', organizationId).eq('product_id', product.id).eq('location_id', location.id).maybeSingle(),
    `Find current stock for ${product.sku}`,
  );
  const systemQuantity = Number(stockRow?.quantity || 0);
  await query<any>(db.from('adjustment_items').insert({
    adjustment_id: adjustment.id,
    product_id: product.id,
    location_id: location.id,
    system_quantity: systemQuantity,
    physical_quantity: physicalQuantity,
    difference: physicalQuantity - systemQuantity,
  }), `Add adjustment item ${number}`);
  if (approve) {
    await query<any>(db.rpc('rpc_approve_adjustment', {
      p_org_id: organizationId,
      p_adjustment_id: adjustment.id,
      p_user_id: userId,
    }), `Approve adjustment ${number}`);
  }
  return adjustment.id;
}

async function insertIfMissing(table: string, match: Record<string, unknown>, row: Record<string, unknown>, label: string) {
  let builder: any = db.from(table).select('id').limit(1);
  for (const [key, value] of Object.entries(match)) builder = builder.eq(key, value);
  const found = await query<any[]>(builder, `Find ${label}`);
  if (found.length > 0) return;
  await query<any>(db.from(table).insert(row), `Create ${label}`);
}

async function main() {
  const organization = await query<any>(
    db.from('organizations').select('id,name,slug').eq('slug', organizationSlug).single(),
    `Find organization ${organizationSlug}`,
  );
  const member = await query<any>(
    db.from('organization_members').select('user_id,roles(name)').eq('organization_id', organization.id).eq('status', 'active').limit(1).single(),
    `Find active member for ${organization.name}`,
  );
  const userId = member.user_id as string;

  if (productDefinitions.length !== 50) throw new Error(`Expected 50 product definitions, got ${productDefinitions.length}.`);
  const existingDemoProducts = await query<any[]>(
    db.from('products').select('sku').eq('organization_id', organization.id).like('sku', 'DEMO-%'),
    'Check existing demo products',
  );
  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      organization: organization.name,
      newProductsPlanned: 50 - existingDemoProducts.length,
      existingDemoProducts: existingDemoProducts.length,
      warehouseAdditionsPlanned: warehouseDefinitions.length,
      operationalAreas: ['categories', 'stock', 'receipts', 'deliveries', 'transfers', 'adjustments', 'ledger', 'comments', 'attachments', 'notifications', 'activity', 'audit', 'saved views'],
    }, null, 2));
    return;
  }

  const currentCategories = await query<any[]>(
    db.from('categories').select('id,name').eq('organization_id', organization.id),
    'Load categories',
  );
  const categories = new Map<string, string>(currentCategories.map((category) => [category.name, category.id]));
  for (const definition of categoryDefinitions) {
    if (categories.has(definition.name)) continue;
    const category = await query<any>(
      db.from('categories').insert({ organization_id: organization.id, ...definition }).select('id,name').single(),
      `Create category ${definition.name}`,
    );
    categories.set(category.name, category.id);
  }

  const northWarehouse = await ensureWarehouse(organization.id, {
    code: 'WH-NORTH-01',
    name: 'Northside Distribution Center',
    address: '2450 Commerce Parkway, Columbus, OH 43228',
  });
  const eastWarehouse = await ensureWarehouse(organization.id, warehouseDefinitions[0]!);
  const westWarehouse = await ensureWarehouse(organization.id, warehouseDefinitions[1]!);
  const warehouses = [northWarehouse, eastWarehouse, westWarehouse];
  const locations = await Promise.all(warehouses.map(async (warehouse, index) => {
    const prefix = index === 0 ? 'DEMO-N' : index === 1 ? 'DEMO-E' : 'DEMO-W';
    const definitions = [
      { code: `${prefix}-RCV`, name: 'Receiving Dock', type: 'receiving' },
      { code: `${prefix}-STO`, name: 'Bulk Storage Aisle 01', type: 'storage' },
      { code: `${prefix}-PCK`, name: 'Pick Face A-01', type: 'picking' },
      { code: `${prefix}-SHP`, name: 'Outbound Shipping Dock', type: 'shipping' },
    ];
    const result: Record<string, any> = {};
    for (const definition of definitions) result[definition.type] = await ensureLocation(organization.id, warehouse.id, definition);
    return result;
  }));

  const productRows = productDefinitions.map((definition, index) => ({
    organization_id: organization.id,
    category_id: categories.get(definition.category),
    sku: definition.sku,
    name: definition.name,
    description: `DEMO RECORD: ${definition.detail}`,
    unit_of_measure: definition.unit,
    reorder_level: definition.reorder,
    status: index === 47 || index === 49 ? 'inactive' : index === 48 ? 'archived' : 'active',
  }));
  const savedProducts = await query<any[]>(
    db.from('products').upsert(productRows, { onConflict: 'organization_id,sku' }).select('id,sku,name,unit_of_measure,reorder_level,status'),
    'Upsert 50 demo products',
  );
  const productBySku = new Map(savedProducts.map((product) => [product.sku, product]));
  const plannedStock = productDefinitions.map((definition, index) => ({
    definition,
    product: productBySku.get(definition.sku)!,
    warehouse: warehouses[index % warehouses.length]!,
    location: locations[index % warehouses.length]!.storage,
    quantity: openingQuantity(index, definition.reorder),
  }));

  const openingReceiptIds: string[] = [];
  for (let index = 0; index < warehouses.length; index++) {
    const warehouse = warehouses[index]!;
    const items = plannedStock
      .filter((entry) => entry.warehouse.id === warehouse.id && entry.quantity > 0)
      .map((entry) => ({
        product_id: entry.product.id,
        location_id: entry.location.id,
        quantity: entry.quantity,
        unit_info: entry.definition.unit,
      }));
    openingReceiptIds.push(await ensureReceipt(
      organization.id,
      userId,
      warehouse,
      `DEMO-OPEN-${index + 1}`,
      'DEMO DATA: opening stock for inventory feature testing.',
      items,
      true,
    ));
  }

  const draftReceiptEntry = plannedStock.find((entry) => entry.warehouse.id === northWarehouse.id && entry.quantity > 0)!;
  const draftReceiptId = await ensureReceipt(
    organization.id,
    userId,
    northWarehouse,
    'DEMO-RECEIPT-DRAFT-01',
    'DEMO DATA: pending sample supplier receipt; validation intentionally deferred.',
    [{ product_id: draftReceiptEntry.product.id, location_id: locations[0]!.receiving.id, quantity: 6, unit_info: draftReceiptEntry.definition.unit }],
    false,
  );

  const completedDeliveryIds: string[] = [];
  for (let index = 0; index < warehouses.length; index++) {
    const warehouse = warehouses[index]!;
    const eligible = plannedStock.filter((entry) => entry.warehouse.id === warehouse.id && entry.quantity >= 15).slice(0, 3);
    const items = eligible.map((entry) => ({
      product_id: entry.product.id,
      location_id: entry.location.id,
      quantity: Math.max(1, Math.min(4, Math.floor(entry.quantity / 8))),
    }));
    completedDeliveryIds.push(await ensureDelivery(
      organization.id,
      userId,
      warehouse,
      `DEMO-DELIVERY-${index + 1}`,
      'DEMO DATA: sample customer fulfillment for outbound workflow testing.',
      items,
      true,
    ));
  }
  const draftDeliveryEntry = plannedStock.find((entry) => entry.warehouse.id === northWarehouse.id && entry.quantity >= 15)!;
  const draftDeliveryId = await ensureDelivery(
    organization.id,
    userId,
    northWarehouse,
    'DEMO-DELIVERY-DRAFT-01',
    'DEMO DATA: pending sample outbound order; dispatch intentionally deferred.',
    [{ product_id: draftDeliveryEntry.product.id, location_id: draftDeliveryEntry.location.id, quantity: 1 }],
    false,
  );

  const transferSource = plannedStock.find((entry) => entry.warehouse.id === northWarehouse.id && entry.quantity >= 20)!;
  const completedTransferId = await ensureTransfer(
    organization.id,
    userId,
    northWarehouse,
    eastWarehouse,
    'DEMO-TRANSFER-01',
    'DEMO DATA: replenishment transfer from Northside to Lakeshore.',
    { product_id: transferSource.product.id, source_location_id: transferSource.location.id, destination_location_id: locations[1]!.storage.id, quantity: 2 },
    true,
  );
  const draftTransferId = await ensureTransfer(
    organization.id,
    userId,
    eastWarehouse,
    westWarehouse,
    'DEMO-TRANSFER-DRAFT-01',
    'DEMO DATA: pending inter-warehouse replenishment; completion intentionally deferred.',
    { product_id: plannedStock.find((entry) => entry.warehouse.id === eastWarehouse.id && entry.quantity > 0)!.product.id,
      source_location_id: locations[1]!.storage.id, destination_location_id: locations[2]!.storage.id, quantity: 1 },
    false,
  );

  const adjustmentProduct = plannedStock.find((entry) => entry.warehouse.id === westWarehouse.id && entry.quantity >= 15)!;
  const adjustmentStock = await query<any>(
    db.from('stock').select('quantity').eq('organization_id', organization.id).eq('product_id', adjustmentProduct.product.id).eq('location_id', adjustmentProduct.location.id).single(),
    'Read stock for demo adjustment',
  );
  const completedAdjustmentId = await ensureAdjustment(
    organization.id,
    userId,
    westWarehouse,
    'DEMO-ADJUSTMENT-01',
    'Cycle count variance',
    'DEMO DATA: physical count found two additional units during a sample cycle count.',
    adjustmentProduct.product,
    adjustmentProduct.location,
    Number(adjustmentStock.quantity) + 2,
    true,
  );
  const draftAdjustmentProduct = plannedStock.find((entry) => entry.warehouse.id === eastWarehouse.id && entry.quantity >= 15)!;
  const draftAdjustmentId = await ensureAdjustment(
    organization.id,
    userId,
    eastWarehouse,
    'DEMO-ADJUSTMENT-DRAFT-01',
    'Pending spot count',
    'DEMO DATA: sample physical count awaiting manager approval.',
    draftAdjustmentProduct.product,
    draftAdjustmentProduct.location,
    Math.max(0, draftAdjustmentProduct.quantity - 1),
    false,
  );

  const comments = [
    { entity_type: 'product', entity_id: savedProducts[0]!.id, content: 'DEMO NOTE: Verify the next supplier lot against the 1 kg net-weight specification.' },
    { entity_type: 'receipt', entity_id: openingReceiptIds[0]!, content: 'DEMO NOTE: Sample receiving check completed; carton labels matched the packing list.' },
    { entity_type: 'delivery', entity_id: completedDeliveryIds[0]!, content: 'DEMO NOTE: Sample order staged at the outbound dock for carrier collection.' },
    { entity_type: 'transfer', entity_id: completedTransferId, content: 'DEMO NOTE: Replenishment transfer received into Lakeshore bulk storage.' },
    { entity_type: 'adjustment', entity_id: completedAdjustmentId, content: 'DEMO NOTE: Cycle-count difference documented for training.' },
  ];
  for (const comment of comments) {
    await insertIfMissing('comments', { organization_id: organization.id, entity_id: comment.entity_id, content: comment.content }, {
      organization_id: organization.id, user_id: userId, ...comment,
    }, `comment for ${comment.entity_type}`);
  }

  const activityItems = [
    { action: 'receipt.validated', entity_type: 'receipt', entity_id: openingReceiptIds[0]! },
    { action: 'delivery.validated', entity_type: 'delivery', entity_id: completedDeliveryIds[0]! },
    { action: 'transfer.completed', entity_type: 'transfer', entity_id: completedTransferId },
    { action: 'adjustment.approved', entity_type: 'adjustment', entity_id: completedAdjustmentId },
  ];
  for (const event of activityItems) {
    const metadata = { demo: true, source: 'demo-seed' };
    await insertIfMissing('activity_events', { organization_id: organization.id, action: event.action, entity_id: event.entity_id }, {
      organization_id: organization.id, user_id: userId, ...event, metadata,
    }, `activity event ${event.action}`);
    await insertIfMissing('audit_logs', { organization_id: organization.id, action: event.action, entity_id: event.entity_id }, {
      organization_id: organization.id, user_id: userId, ...event, metadata,
    }, `audit log ${event.action}`);
  }

  const productWithNoStock = plannedStock.find((entry) => entry.quantity === 0)!;
  const productWithLowStock = plannedStock.find((entry) => entry.quantity > 0 && entry.quantity <= entry.definition.reorder)!;
  const notificationRows = [
    { type: 'OUT_OF_STOCK', title: `Out of stock: ${productWithNoStock.product.name}`, message: `DEMO ALERT: ${productWithNoStock.product.sku} has no on-hand stock.`, resource_type: 'product', resource_id: productWithNoStock.product.id, dedup_key: `demo-out:${productWithNoStock.product.id}` },
    { type: 'LOW_STOCK', title: `Low stock: ${productWithLowStock.product.name}`, message: `DEMO ALERT: replenish ${productWithLowStock.product.sku}; quantity is at or below its reorder point.`, resource_type: 'product', resource_id: productWithLowStock.product.id, dedup_key: `demo-low:${productWithLowStock.product.id}` },
    { type: 'RECEIPT_COMPLETED', title: 'Demo receipt validated', message: 'DEMO EVENT: opening inventory was received into Northside.', resource_type: 'receipt', resource_id: openingReceiptIds[0]!, dedup_key: 'demo-receipt-completed' },
    { type: 'DELIVERY_COMPLETED', title: 'Demo delivery dispatched', message: 'DEMO EVENT: sample customer order was dispatched.', resource_type: 'delivery', resource_id: completedDeliveryIds[0]!, dedup_key: 'demo-delivery-completed' },
    { type: 'SYSTEM_ALERT', title: 'Demo data loaded', message: 'Sample inventory and workflow records are available for testing.', resource_type: 'organization', resource_id: organization.id, dedup_key: 'demo-seed-complete' },
  ];
  for (const notification of notificationRows) {
    await insertIfMissing('notifications', { organization_id: organization.id, user_id: userId, dedup_key: notification.dedup_key }, {
      organization_id: organization.id, user_id: userId, ...notification, data: { demo: true }, read_at: null,
    }, `notification ${notification.type}`);
  }

  const savedViews = [
    { name: 'Demo - Low Stock Replenishment', resource_type: 'products', filter_config: { status: 'active', stockHealth: 'low' }, sort_config: { field: 'sku', direction: 'asc' } },
    { name: 'Demo - Pending Receipts', resource_type: 'receipts', filter_config: { status: 'draft' }, sort_config: { field: 'created_at', direction: 'desc' } },
    { name: 'Demo - Open Adjustments', resource_type: 'adjustments', filter_config: { status: 'draft' }, sort_config: { field: 'created_at', direction: 'desc' } },
    { name: 'Demo - Recent Stock Movements', resource_type: 'ledger', filter_config: { transaction_type: 'all' }, sort_config: { field: 'created_at', direction: 'desc' } },
  ];
  for (const view of savedViews) {
    await insertIfMissing('saved_views', { organization_id: organization.id, user_id: userId, name: view.name }, {
      organization_id: organization.id, user_id: userId, ...view,
    }, `saved view ${view.name}`);
  }

  const preferences = await query<any>(db.from('notification_preferences').select('id').eq('user_id', userId).maybeSingle(), 'Check notification preferences');
  if (!preferences) {
    await query<any>(db.from('notification_preferences').insert({
      user_id: userId,
      email_enabled: true,
      push_enabled: false,
      in_app_enabled: true,
      low_stock_enabled: true,
      out_of_stock_enabled: true,
      transactions_enabled: true,
      system_alerts_enabled: true,
    }), 'Create demo notification preferences');
  }

  const documentBucket = await query<any[]>(db.storage.listBuckets(), 'List storage buckets');
  if (!documentBucket.some((bucket) => bucket.name === 'documents')) {
    const { error } = await db.storage.createBucket('documents', {
      public: false,
      fileSizeLimit: '10MB',
      allowedMimeTypes: ['text/plain'],
    });
    if (error && !error.message.toLowerCase().includes('already exists')) throw error;
  }
  const slipPath = `${organization.id}/receipt/${openingReceiptIds[0]}/demo-packing-slip.txt`;
  const existingSlip = await query<any>(db.from('attachments').select('id').eq('organization_id', organization.id).eq('storage_path', slipPath).maybeSingle(), 'Find demo packing slip');
  if (!existingSlip) {
    const slip = Buffer.from([
      'DEMO PACKING SLIP',
      'Sample Vendor Cooperative',
      'Purchase order: DEMO-OPEN-1',
      'Warehouse: Northside Distribution Center',
      'Purpose: fictional attachment for StockSense feature testing.',
      '',
    ].join('\n'));
    const { error: uploadError } = await db.storage.from('documents').upload(slipPath, slip, { contentType: 'text/plain', upsert: true });
    if (uploadError) throw new Error(`Upload demo packing slip: ${uploadError.message}`);
    await query<any>(db.from('attachments').insert({
      organization_id: organization.id,
      uploaded_by: userId,
      entity_type: 'receipt',
      entity_id: openingReceiptIds[0],
      storage_path: slipPath,
      original_filename: 'demo-packing-slip.txt',
      mime_type: 'text/plain',
      file_size: slip.byteLength,
    }), 'Create demo packing slip metadata');
  }

  const productCount = await query<any[]>(db.from('products').select('id').eq('organization_id', organization.id), 'Verify products');
  const stockRows = await query<any[]>(db.from('stock').select('quantity').eq('organization_id', organization.id), 'Verify stock');
  const totalUnits = stockRows.reduce((sum, row) => sum + Number(row.quantity), 0);
  const counts = await Promise.all([
    db.from('receipts').select('id,status').eq('organization_id', organization.id),
    db.from('deliveries').select('id,status').eq('organization_id', organization.id),
    db.from('transfers').select('id,status').eq('organization_id', organization.id),
    db.from('adjustments').select('id,status').eq('organization_id', organization.id),
    db.from('stock_ledger').select('id').eq('organization_id', organization.id),
    db.from('notifications').select('id').eq('organization_id', organization.id).eq('user_id', userId),
    db.from('comments').select('id').eq('organization_id', organization.id),
    db.from('attachments').select('id').eq('organization_id', organization.id),
    db.from('saved_views').select('id').eq('organization_id', organization.id).eq('user_id', userId),
  ]);
  for (const result of counts) if (result.error) throw result.error;
  console.log(JSON.stringify({
    organization: organization.name,
    demoProductsAdded: savedProducts.length,
    totalProducts: productCount.length,
    warehouses: warehouses.length,
    locationsAdded: locations.reduce((sum, set) => sum + Object.keys(set).length, 0),
    stockLines: stockRows.length,
    totalStockUnits: totalUnits,
    receipts: counts[0].data?.length ?? 0,
    deliveries: counts[1].data?.length ?? 0,
    transfers: counts[2].data?.length ?? 0,
    adjustments: counts[3].data?.length ?? 0,
    stockLedgerEntries: counts[4].data?.length ?? 0,
    notifications: counts[5].data?.length ?? 0,
    comments: counts[6].data?.length ?? 0,
    attachments: counts[7].data?.length ?? 0,
    savedViews: counts[8].data?.length ?? 0,
    draftExamples: [draftReceiptId, draftDeliveryId, draftTransferId, draftAdjustmentId],
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});