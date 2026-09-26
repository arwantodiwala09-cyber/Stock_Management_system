import { createMockDataStore, MockSupabaseClient } from './test-utils.js';
import { CategoryService } from '../src/modules/categories/category.service.js';
import { ProductService } from '../src/modules/products/product.service.js';
import { WarehouseService } from '../src/modules/warehouses/warehouse.service.js';
import { LocationService } from '../src/modules/locations/location.service.js';
import { StockService } from '../src/modules/stock/stock.service.js';
import { requirePermission } from '../src/middleware/requirePermission.js';
let passed = 0;
let failed = 0;
function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`✅ ${message}`);
    }
    else {
        failed++;
        console.error(`❌ FAIL: ${message}`);
    }
}
async function runTests() {
    console.log('====================================================');
    console.log('RUNNING PHASE 4 COMPREHENSIVE MASTER DATA TEST SUITE');
    console.log('====================================================\n');
    const store = createMockDataStore();
    const mockClient = new MockSupabaseClient(store);
    // 1. CATEGORIES TESTS
    console.log('--- 1. Categories Tests ---');
    const catService = new CategoryService(mockClient);
    // 1.1 Create Category
    const catNew = await catService.createCategory('org-a', {
        name: 'Hardware',
        description: 'Hardware tools',
    });
    assert(catNew && catNew.name === 'Hardware', 'Category created successfully for Org A');
    // 1.2 Duplicate name rejection in same org
    let dupCatError = false;
    try {
        await catService.createCategory('org-a', { name: 'Hardware' });
    }
    catch (err) {
        dupCatError = err.status === 409;
    }
    assert(dupCatError, 'Duplicate category name in same org rejected with 409');
    // 1.3 Read & Org Isolation
    const orgACats = await catService.listCategories('org-a', {});
    const orgBCats = await catService.listCategories('org-b', {});
    assert(orgACats.items.every((c) => c.organization_id === 'org-a') &&
        !orgACats.items.some((c) => c.name === 'Clothing'), 'Org A category list isolated from Org B');
    assert(orgBCats.items.every((c) => c.organization_id === 'org-b'), 'Org B category list isolated from Org A');
    // 1.4 Update Category
    const updatedCat = await catService.updateCategory('org-a', catNew.id, {
        description: 'Updated Hardware tools',
        status: 'inactive',
    });
    assert(updatedCat.description === 'Updated Hardware tools' && updatedCat.status === 'inactive', 'Category updated and deactivated successfully');
    // 1.5 Org A cannot update Org B category
    let crossCatError = false;
    try {
        await catService.updateCategory('org-a', 'cat-b1', { name: 'Hacked' });
    }
    catch (err) {
        crossCatError = err.status === 404;
    }
    assert(crossCatError, 'Attempt to update Org B category by Org A rejected with 404');
    // 2. WAREHOUSES TESTS
    console.log('\n--- 2. Warehouses Tests ---');
    const whService = new WarehouseService(mockClient);
    // 2.1 Create Warehouse
    const whNew = await whService.createWarehouse('org-a', {
        name: 'Secondary Hub',
        code: 'WH-SEC',
        address: '789 Logistics Way',
    });
    assert(whNew && whNew.code === 'WH-SEC', 'Warehouse created successfully for Org A');
    // 2.2 Duplicate code rejection
    let dupWhError = false;
    try {
        await whService.createWarehouse('org-a', { name: 'Other', code: 'WH-SEC' });
    }
    catch (err) {
        dupWhError = err.status === 409;
    }
    assert(dupWhError, 'Duplicate warehouse code in same org rejected with 409');
    // 2.3 Read warehouses with location count
    const orgAWhs = await whService.listWarehouses('org-a', {});
    assert(orgAWhs.items.length >= 2 && orgAWhs.items.some((w) => w.code === 'WH-MAIN'), 'Warehouses listed with location counts');
    // 2.4 Warehouse isolation
    assert(!orgAWhs.items.some((w) => w.code === 'WH-EAST'), 'Org A warehouses isolated from Org B');
    // 2.5 Update Warehouse
    const updatedWh = await whService.updateWarehouse('org-a', whNew.id, {
        name: 'Secondary Hub North',
    });
    assert(updatedWh.name === 'Secondary Hub North', 'Warehouse updated successfully');
    // 3. LOCATIONS TESTS
    console.log('\n--- 3. Locations Tests ---');
    const locService = new LocationService(mockClient);
    // 3.1 Create Location
    const locNew = await locService.createLocation('org-a', {
        warehouse_id: 'wh-a1',
        name: 'Bin 42',
        code: 'B42',
        type: 'picking',
    });
    assert(locNew && locNew.code === 'B42', 'Location created successfully for warehouse');
    // 3.2 Cross-organization warehouse rejection
    let crossWhError = false;
    try {
        // Attempting to create location in Org B warehouse under Org A
        await locService.createLocation('org-a', {
            warehouse_id: 'wh-b1', // Belongs to Org B!
            name: 'Illegal Bin',
            code: 'ILL1',
        });
    }
    catch (err) {
        crossWhError = err.status === 400;
    }
    assert(crossWhError, 'Cross-organization warehouse attachment rejected with 400');
    // 3.3 Duplicate code in same warehouse rejection
    let dupLocError = false;
    try {
        await locService.createLocation('org-a', {
            warehouse_id: 'wh-a1',
            name: 'Another Bin 42',
            code: 'B42',
        });
    }
    catch (err) {
        dupLocError = err.status === 409;
    }
    assert(dupLocError, 'Duplicate location code within same warehouse rejected with 409');
    // 4. PRODUCTS TESTS
    console.log('\n--- 4. Products Tests ---');
    const prodService = new ProductService(mockClient);
    // 4.1 Create Product
    const prodNew = await prodService.createProduct('org-a', {
        sku: 'SKU-002',
        name: 'Mechanical Keyboard',
        category_id: 'cat-a1',
        reorder_level: 15,
    });
    assert(prodNew && prodNew.sku === 'SKU-002', 'Product created successfully with category');
    // 4.2 Duplicate SKU rejection in same org
    let dupSkuError = false;
    try {
        await prodService.createProduct('org-a', {
            sku: 'SKU-002',
            name: 'Duplicate Keyboard',
        });
    }
    catch (err) {
        dupSkuError = err.status === 409;
    }
    assert(dupSkuError, 'Duplicate SKU within same organization rejected with 409');
    // 4.3 Same SKU in different org is ALLOWED
    const prodSameSkuOrgB = await prodService.createProduct('org-b', {
        sku: 'SKU-002',
        name: 'Organic Honey',
    });
    assert(prodSameSkuOrgB && prodSameSkuOrgB.sku === 'SKU-002', 'Same SKU in different org allowed');
    // 4.4 Category ownership validation (Org A product cannot use Org B category)
    let crossCatAssignError = false;
    try {
        await prodService.createProduct('org-a', {
            sku: 'SKU-CROSS',
            name: 'Cross Product',
            category_id: 'cat-b1', // Belongs to Org B!
        });
    }
    catch (err) {
        crossCatAssignError = err.status === 400;
    }
    assert(crossCatAssignError, 'Assigning cross-organization category rejected with 400');
    // 4.5 Product Detail with stock summary & distribution
    const prodDetail = await prodService.getProductById('org-a', 'prod-a1');
    assert(prodDetail &&
        prodDetail.stock_summary &&
        prodDetail.stock_summary.total_quantity === 25 &&
        prodDetail.stock_summary.status === 'Healthy' &&
        prodDetail.stock_distribution.length === 1, 'Product detail aggregates stock summary and location distribution');
    // 4.6 Product list with search and pagination
    const searchResult = await prodService.listProducts('org-a', { search: 'Keyboard' });
    assert(searchResult.items.length === 1 && searchResult.items[0]?.name === 'Mechanical Keyboard', 'Product server-side search filters by name');
    // 5. STOCK TESTS
    console.log('\n--- 5. Stock Tests ---');
    const stockService = new StockService(mockClient);
    // 5.1 Read Stock
    const orgAStock = await stockService.listStock('org-a', {});
    assert(orgAStock.items.length >= 1, 'Stock records listed for organization');
    // 5.2 Stock Status derivation
    const stockItemA = orgAStock.items[0];
    assert(stockItemA.quantity === 25 && stockItemA.status === 'Healthy', 'Stock status correctly derived as Healthy (qty > reorder_level)');
    // 5.3 Low Stock derivation in Org B
    const orgBStock = await stockService.listStock('org-b', {});
    const stockItemB = orgBStock.items[0];
    assert(stockItemB.quantity === 2 && stockItemB.status === 'Low Stock', 'Stock status correctly derived as Low Stock (qty <= reorder_level)');
    // 5.4 Organization Isolation in Stock
    assert(!orgAStock.items.some((s) => s.product.name === 'Denim Jacket'), 'Org A stock view does not leak Org B items');
    // 6. SECURITY & RBAC ENFORCEMENT
    console.log('\n--- 6. RBAC & Security Tests ---');
    // Mock response helper
    const mockRes = () => {
        const res = {};
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };
        res.json = (data) => {
            res.body = data;
            return res;
        };
        return res;
    };
    // 6.1 Warehouse Staff cannot create product
    const staffReq = {
        membership: {
            role_id: 'role-staff',
            permissions: ['products.read', 'categories.read', 'warehouses.read', 'inventory.read'],
        },
    };
    const staffRes = mockRes();
    requirePermission('products.create')(staffReq, staffRes, () => { });
    assert(staffRes.statusCode === 403, 'Warehouse Staff blocked from products.create (403)');
    // 6.2 Warehouse Staff cannot create category
    const staffRes2 = mockRes();
    requirePermission('categories.create')(staffReq, staffRes2, () => { });
    assert(staffRes2.statusCode === 403, 'Warehouse Staff blocked from categories.create (403)');
    // 6.3 Warehouse Staff can read products and stock
    let staffCanReadProd = false;
    requirePermission('products.read')(staffReq, mockRes(), () => { staffCanReadProd = true; });
    let staffCanReadStock = false;
    requirePermission(['inventory.read', 'products.read'])(staffReq, mockRes(), () => { staffCanReadStock = true; });
    assert(staffCanReadProd && staffCanReadStock, 'Warehouse Staff permitted to read products and stock');
    // 6.4 Admin has full permissions
    const adminReq = {
        membership: {
            role_id: 'role-admin',
            permissions: store.permissions.map((p) => p.name),
        },
    };
    let adminCanCreateProd = false;
    requirePermission('products.create')(adminReq, mockRes(), () => { adminCanCreateProd = true; });
    assert(adminCanCreateProd, 'Admin permitted to create products');
    console.log(`\n====================================================`);
    console.log(`ALL TESTS FINISHED: ${passed} passed, ${failed} failed`);
    console.log(`====================================================`);
    if (failed > 0)
        process.exit(1);
}
runTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
//# sourceMappingURL=phase4_master_data.test.js.map