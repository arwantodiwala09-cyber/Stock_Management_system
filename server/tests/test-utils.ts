export interface TestDataStore {
  organizations: any[];
  roles: any[];
  permissions: any[];
  role_permissions: any[];
  organization_members: any[];
  categories: any[];
  products: any[];
  warehouses: any[];
  locations: any[];
  stock: any[];
  receipts: any[];
  receipt_items: any[];
  deliveries: any[];
  delivery_items: any[];
  transfers: any[];
  transfer_items: any[];
  adjustments: any[];
  adjustment_items: any[];
  stock_ledger: any[];
}

export const createMockDataStore = (): TestDataStore => ({
  organizations: [
    { id: 'org-a', name: 'Org A', slug: 'org-a', status: 'active' },
    { id: 'org-b', name: 'Org B', slug: 'org-b', status: 'active' },
  ],
  roles: [
    { id: 'role-admin', name: 'Organization Admin' },
    { id: 'role-manager', name: 'Inventory Manager' },
    { id: 'role-staff', name: 'Warehouse Staff' },
  ],
  permissions: [
    { id: 'perm-p-read', name: 'products.read' },
    { id: 'perm-p-create', name: 'products.create' },
    { id: 'perm-p-update', name: 'products.update' },
    { id: 'perm-c-read', name: 'categories.read' },
    { id: 'perm-c-create', name: 'categories.create' },
    { id: 'perm-c-update', name: 'categories.update' },
    { id: 'perm-w-read', name: 'warehouses.read' },
    { id: 'perm-w-create', name: 'warehouses.create' },
    { id: 'perm-w-update', name: 'warehouses.update' },
    { id: 'perm-i-read', name: 'inventory.read' },
    // Phase 5 permissions
    { id: 'perm-rec-read', name: 'receipts.read' },
    { id: 'perm-rec-create', name: 'receipts.create' },
    { id: 'perm-rec-update', name: 'receipts.update' },
    { id: 'perm-rec-validate', name: 'receipts.validate' },
    { id: 'perm-del-read', name: 'deliveries.read' },
    { id: 'perm-del-create', name: 'deliveries.create' },
    { id: 'perm-del-update', name: 'deliveries.update' },
    { id: 'perm-del-validate', name: 'deliveries.validate' },
    { id: 'perm-trf-read', name: 'transfers.read' },
    { id: 'perm-trf-create', name: 'transfers.create' },
    { id: 'perm-trf-update', name: 'transfers.update' },
    { id: 'perm-trf-complete', name: 'transfers.complete' },
    { id: 'perm-adj-read', name: 'adjustments.read' },
    { id: 'perm-adj-create', name: 'adjustments.create' },
    { id: 'perm-adj-update', name: 'adjustments.update' },
    { id: 'perm-adj-approve', name: 'adjustments.approve' },
    { id: 'perm-led-read', name: 'ledger.read' },
  ],
  role_permissions: [
    // Admin has all
    { role_id: 'role-admin', permission_id: 'perm-p-read' },
    { role_id: 'role-admin', permission_id: 'perm-p-create' },
    { role_id: 'role-admin', permission_id: 'perm-p-update' },
    { role_id: 'role-admin', permission_id: 'perm-c-read' },
    { role_id: 'role-admin', permission_id: 'perm-c-create' },
    { role_id: 'role-admin', permission_id: 'perm-c-update' },
    { role_id: 'role-admin', permission_id: 'perm-w-read' },
    { role_id: 'role-admin', permission_id: 'perm-w-create' },
    { role_id: 'role-admin', permission_id: 'perm-w-update' },
    { role_id: 'role-admin', permission_id: 'perm-i-read' },
    { role_id: 'role-admin', permission_id: 'perm-rec-read' },
    { role_id: 'role-admin', permission_id: 'perm-rec-create' },
    { role_id: 'role-admin', permission_id: 'perm-rec-update' },
    { role_id: 'role-admin', permission_id: 'perm-rec-validate' },
    { role_id: 'role-admin', permission_id: 'perm-del-read' },
    { role_id: 'role-admin', permission_id: 'perm-del-create' },
    { role_id: 'role-admin', permission_id: 'perm-del-update' },
    { role_id: 'role-admin', permission_id: 'perm-del-validate' },
    { role_id: 'role-admin', permission_id: 'perm-trf-read' },
    { role_id: 'role-admin', permission_id: 'perm-trf-create' },
    { role_id: 'role-admin', permission_id: 'perm-trf-update' },
    { role_id: 'role-admin', permission_id: 'perm-trf-complete' },
    { role_id: 'role-admin', permission_id: 'perm-adj-read' },
    { role_id: 'role-admin', permission_id: 'perm-adj-create' },
    { role_id: 'role-admin', permission_id: 'perm-adj-update' },
    { role_id: 'role-admin', permission_id: 'perm-adj-approve' },
    { role_id: 'role-admin', permission_id: 'perm-led-read' },
    // Staff has only read/create (NO validate/approve/complete permissions)
    { role_id: 'role-staff', permission_id: 'perm-p-read' },
    { role_id: 'role-staff', permission_id: 'perm-c-read' },
    { role_id: 'role-staff', permission_id: 'perm-w-read' },
    { role_id: 'role-staff', permission_id: 'perm-i-read' },
    { role_id: 'role-staff', permission_id: 'perm-rec-read' },
    { role_id: 'role-staff', permission_id: 'perm-rec-create' },
    { role_id: 'role-staff', permission_id: 'perm-del-read' },
    { role_id: 'role-staff', permission_id: 'perm-del-create' },
    { role_id: 'role-staff', permission_id: 'perm-trf-read' },
    { role_id: 'role-staff', permission_id: 'perm-trf-create' },
    { role_id: 'role-staff', permission_id: 'perm-adj-read' },
    { role_id: 'role-staff', permission_id: 'perm-led-read' },
  ],
  organization_members: [
    { organization_id: 'org-a', user_id: 'user-a-admin', role_id: 'role-admin', status: 'active' },
    { organization_id: 'org-a', user_id: 'user-a-staff', role_id: 'role-staff', status: 'active' },
    { organization_id: 'org-b', user_id: 'user-b-admin', role_id: 'role-admin', status: 'active' },
  ],
  categories: [
    { id: 'cat-a1', organization_id: 'org-a', name: 'Electronics', description: 'Tech gadgets', status: 'active' },
    { id: 'cat-b1', organization_id: 'org-b', name: 'Clothing', description: 'Apparel', status: 'active' },
  ],
  products: [
    {
      id: 'prod-a1',
      organization_id: 'org-a',
      sku: 'SKU-001',
      name: 'Wireless Mouse',
      category_id: 'cat-a1',
      unit_of_measure: 'pcs',
      reorder_level: 10,
      status: 'active',
      image_path: null,
      created_at: new Date('2026-01-01').toISOString(),
      updated_at: new Date('2026-01-01').toISOString(),
    },
    {
      id: 'prod-b1',
      organization_id: 'org-b',
      sku: 'SKU-001',
      name: 'Denim Jacket',
      category_id: 'cat-b1',
      unit_of_measure: 'pcs',
      reorder_level: 5,
      status: 'active',
      image_path: null,
      created_at: new Date('2026-01-01').toISOString(),
      updated_at: new Date('2026-01-01').toISOString(),
    },
  ],
  warehouses: [
    { id: 'wh-a1', organization_id: 'org-a', name: 'Main Hub', code: 'WH-MAIN', address: '123 Tech Ave', status: 'active' },
    { id: 'wh-a2', organization_id: 'org-a', name: 'North Annex', code: 'WH-NORTH', address: '999 Pine St', status: 'active' },
    { id: 'wh-b1', organization_id: 'org-b', name: 'East Coast Hub', code: 'WH-EAST', address: '456 Fashion Blvd', status: 'active' },
  ],
  locations: [
    { id: 'loc-a1', organization_id: 'org-a', warehouse_id: 'wh-a1', name: 'Shelf 1', code: 'S1', type: 'storage', status: 'active' },
    { id: 'loc-a2', organization_id: 'org-a', warehouse_id: 'wh-a1', name: 'Shelf 2', code: 'S2', type: 'storage', status: 'active' },
    { id: 'loc-a3', organization_id: 'org-a', warehouse_id: 'wh-a2', name: 'Bin N1', code: 'N1', type: 'storage', status: 'active' },
    { id: 'loc-b1', organization_id: 'org-b', warehouse_id: 'wh-b1', name: 'Rack 1', code: 'R1', type: 'storage', status: 'active' },
  ],
  stock: [
    { id: 'stock-a1', organization_id: 'org-a', product_id: 'prod-a1', warehouse_id: 'wh-a1', location_id: 'loc-a1', quantity: 25 },
    { id: 'stock-b1', organization_id: 'org-b', product_id: 'prod-b1', warehouse_id: 'wh-b1', location_id: 'loc-b1', quantity: 2 },
  ],
  receipts: [],
  receipt_items: [],
  deliveries: [],
  delivery_items: [],
  transfers: [],
  transfer_items: [],
  adjustments: [],
  adjustment_items: [],
  stock_ledger: [],
});

export class MockSupabaseClient {
  constructor(private store: TestDataStore) {}

  rpc(funcName: string, args: any) {
    // Return error indicating RPC not mounted so TypeScript engine executes in test environment
    return Promise.resolve({ data: null, error: { message: `function ${funcName} not found` } });
  }

  from(table: keyof TestDataStore) {
    const store = this.store;
    if (!store[table]) store[table] = [];
    let data = [...(store[table] || [])];
    const filters: Array<(row: any) => boolean> = [];
    let isCountExact = false;
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;
    let sortColumn: string | null = null;
    let sortAsc = true;
    let isSingle = false;
    let isMaybeSingle = false;

    const builder: any = {
      select: (columns?: string, options?: { count?: string }) => {
        if (options?.count === 'exact') isCountExact = true;
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      neq: (col: string, val: any) => {
        filters.push((row) => row[col] !== val);
        return builder;
      },
      gte: (col: string, val: any) => {
        filters.push((row) => row[col] >= val);
        return builder;
      },
      lte: (col: string, val: any) => {
        filters.push((row) => row[col] <= val);
        return builder;
      },
      ilike: (col: string, pattern: string) => {
        const regexStr = pattern.replace(/%/g, '.*');
        const regex = new RegExp(regexStr, 'i');
        filters.push((row) => regex.test(String(row[col] || '')));
        return builder;
      },
      or: (clause: string) => {
        const parts = clause.split(',');
        filters.push((row) => {
          return parts.some((p) => {
            const [field, op, val] = p.split('.');
            if (field && op === 'ilike' && val) {
              const cleaned = val.replace(/%/g, '.*');
              return new RegExp(cleaned, 'i').test(String(row[field] || ''));
            }
            return false;
          });
        });
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        sortColumn = col;
        sortAsc = opts?.ascending !== false;
        return builder;
      },
      range: (start: number, end: number) => {
        rangeStart = start;
        rangeEnd = end;
        return builder;
      },
      single: async () => {
        isSingle = true;
        return builder.then();
      },
      maybeSingle: async () => {
        isMaybeSingle = true;
        return builder.then();
      },
      delete: () => {
        return {
          eq: (col: string, val: any) => {
            store[table] = (store[table] as any[]).filter((r) => r[col] !== val);
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
      insert: (values: any) => {
        const insertItems = Array.isArray(values) ? values : [values];
        const newRecords = insertItems.map((val) => ({
          id: val.id || `id-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...val,
        }));
        (store[table] as any[]).push(...newRecords);

        return {
          select: () => ({
            single: async () => ({ data: newRecords[0], error: null }),
            maybeSingle: async () => ({ data: newRecords[0], error: null }),
          }),
          then: async (resolve?: (val: any) => any) => {
            const res = { data: newRecords, error: null };
            return resolve ? resolve(res) : res;
          },
        };
      },
      update: (values: any) => {
        return {
          eq: (col: string, val: any) => {
            const applyUpdate = () => {
              const rows = (store[table] as any[]).filter((r) => r[col] === val);
              rows.forEach((r) => Object.assign(r, values));
              return { data: rows[0] || null, error: null };
            };
            return {
              eq: (col2: string, val2: any) => {
                const applyUpdate2 = () => {
                  const rows = (store[table] as any[]).filter((r) => r[col] === val && r[col2] === val2);
                  rows.forEach((r) => Object.assign(r, values));
                  return { data: rows[0] || null, error: null };
                };
                return {
                  select: () => ({
                    single: async () => applyUpdate2(),
                  }),
                  then: async (resolve?: any) => {
                    const res = applyUpdate2();
                    return resolve ? resolve(res) : res;
                  },
                };
              },
              select: () => ({
                single: async () => applyUpdate(),
              }),
              then: async (resolve?: any) => {
                const res = applyUpdate();
                return resolve ? resolve(res) : res;
              },
            };
          },
        };
      },
      then: async (resolve?: (val: any) => any) => {
        let result = data.filter((row) => filters.every((fn) => fn(row)));
        const count = result.length;

        // Relation joins
        if (table === 'products') {
          result = result.map((p) => {
            const cat = store.categories.find((c) => c.id === p.category_id);
            return { ...p, categories: cat ? { id: cat.id, name: cat.name } : null };
          });
        } else if (table === 'locations') {
          result = result.map((l) => {
            const wh = store.warehouses.find((w) => w.id === l.warehouse_id);
            return { ...l, warehouses: wh ? { id: wh.id, name: wh.name, code: wh.code } : null };
          });
        } else if (table === 'warehouses') {
          result = result.map((w) => {
            const locs = store.locations.filter((l) => l.warehouse_id === w.id);
            return { ...w, locations: [{ count: locs.length }] };
          });
        } else if (table === 'stock') {
          result = result.map((s) => {
            const p = store.products.find((prod) => prod.id === s.product_id);
            const w = store.warehouses.find((wh) => wh.id === s.warehouse_id);
            const l = store.locations.find((loc) => loc.id === s.location_id);
            return { ...s, products: p, warehouses: w, locations: l };
          });
        } else if (table === 'receipts') {
          result = result.map((r) => {
            const w = store.warehouses.find((wh) => wh.id === r.warehouse_id);
            const items = store.receipt_items.filter((ri) => ri.receipt_id === r.id);
            return { ...r, warehouses: w, receipt_items: items };
          });
        } else if (table === 'receipt_items') {
          result = result.map((ri) => {
            const p = store.products.find((prod) => prod.id === ri.product_id);
            const l = store.locations.find((loc) => loc.id === ri.location_id);
            return { ...ri, products: p, locations: l };
          });
        } else if (table === 'deliveries') {
          result = result.map((d) => {
            const w = store.warehouses.find((wh) => wh.id === d.warehouse_id);
            const items = store.delivery_items.filter((di) => di.delivery_id === d.id);
            return { ...d, warehouses: w, delivery_items: items };
          });
        } else if (table === 'delivery_items') {
          result = result.map((di) => {
            const p = store.products.find((prod) => prod.id === di.product_id);
            const l = store.locations.find((loc) => loc.id === di.location_id);
            return { ...di, products: p, locations: l };
          });
        } else if (table === 'transfers') {
          result = result.map((t) => {
            const srcW = store.warehouses.find((wh) => wh.id === t.source_warehouse_id);
            const dstW = store.warehouses.find((wh) => wh.id === t.destination_warehouse_id);
            const items = store.transfer_items.filter((ti) => ti.transfer_id === t.id);
            return {
              ...t,
              source_warehouse: srcW,
              destination_warehouse: dstW,
              transfer_items: items,
            };
          });
        } else if (table === 'transfer_items') {
          result = result.map((ti) => {
            const p = store.products.find((prod) => prod.id === ti.product_id);
            const srcL = store.locations.find((loc) => loc.id === ti.source_location_id);
            const dstL = store.locations.find((loc) => loc.id === ti.destination_location_id);
            return {
              ...ti,
              products: p,
              source_location: srcL,
              destination_location: dstL,
            };
          });
        } else if (table === 'adjustments') {
          result = result.map((a) => {
            const w = store.warehouses.find((wh) => wh.id === a.warehouse_id);
            const items = store.adjustment_items.filter((ai) => ai.adjustment_id === a.id);
            return { ...a, warehouses: w, adjustment_items: items };
          });
        } else if (table === 'adjustment_items') {
          result = result.map((ai) => {
            const p = store.products.find((prod) => prod.id === ai.product_id);
            const l = store.locations.find((loc) => loc.id === ai.location_id);
            return { ...ai, products: p, locations: l };
          });
        } else if (table === 'stock_ledger') {
          result = result.map((led) => {
            const p = store.products.find((prod) => prod.id === led.product_id);
            const w = store.warehouses.find((wh) => wh.id === led.warehouse_id);
            const l = store.locations.find((loc) => loc.id === led.location_id);
            return { ...led, products: p, warehouses: w, locations: l };
          });
        }

        if (sortColumn) {
          result.sort((a, b) => {
            if (a[sortColumn!] < b[sortColumn!]) return sortAsc ? -1 : 1;
            if (a[sortColumn!] > b[sortColumn!]) return sortAsc ? 1 : -1;
            return 0;
          });
        }

        if (rangeStart !== null && rangeEnd !== null) {
          result = result.slice(rangeStart, rangeEnd + 1);
        }

        if (isSingle) {
          if (result.length === 0) return resolve ? resolve({ data: null, error: { message: 'Not found' } }) : { data: null, error: { message: 'Not found' } };
          const res = { data: result[0], error: null };
          return resolve ? resolve(res) : res;
        }

        if (isMaybeSingle) {
          const res = { data: result[0] || null, error: null };
          return resolve ? resolve(res) : res;
        }

        const res = { data: result, count, error: null };
        return resolve ? resolve(res) : res;
      },
    };

    return builder;
  }
}
