import { createMockDataStore, MockSupabaseClient } from './test-utils.js';
import { ReceiptService } from '../src/modules/receipts/receipt.service.js';
import { DeliveryService } from '../src/modules/deliveries/delivery.service.js';
import { TransferService } from '../src/modules/transfers/transfer.service.js';
import { AdjustmentService } from '../src/modules/adjustments/adjustment.service.js';
import { LedgerService } from '../src/modules/ledger/ledger.service.js';
import { requirePermission } from '../src/middleware/requirePermission.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`✅ ${message}`);
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING PHASE 5 COMPREHENSIVE INVENTORY ENGINE TEST SUITE');
  console.log('================================================================\n');

  const store = createMockDataStore();
  const mockClient = new MockSupabaseClient(store) as any;

  const receiptService = new ReceiptService(mockClient);
  const deliveryService = new DeliveryService(mockClient);
  const transferService = new TransferService(mockClient);
  const adjustmentService = new AdjustmentService(mockClient);
  const ledgerService = new LedgerService(mockClient);

  // Setup test products and stock for Phase 5
  store.products.push({
    id: 'prod-a2',
    organization_id: 'org-a',
    sku: 'SKU-002',
    name: 'Mechanical Keyboard',
    category_id: 'cat-a1',
    unit_of_measure: 'pcs',
    reorder_level: 5,
    status: 'active',
    image_path: null,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  });
  store.stock.push({
    id: 'stock-a2',
    organization_id: 'org-a',
    product_id: 'prod-a2',
    warehouse_id: 'wh-a1',
    location_id: 'loc-a1',
    quantity: 10,
  });

  // Initial stock check
  // prod-a1 in wh-a1, loc-a1 = 25
  // prod-a2 in wh-a1, loc-a1 = 10
  // prod-b1 in wh-b1, loc-b1 = 2

  // =========================================================================
  // 1. RECEIPTS TESTS
  // =========================================================================
  console.log('--- 1. Receipts Tests ---');

  // 1.1 Create Receipt (Draft)
  const receipt1 = await receiptService.createReceipt(
    'org-a',
    'user-a-admin',
    {
      warehouse_id: 'wh-a1',
      supplier_info: 'Acme Electronics (PO-9912)',
      notes: 'Initial restock batch',
      items: [
        { product_id: 'prod-a1', location_id: 'loc-a1', quantity: 15 },
        { product_id: 'prod-a2', location_id: 'loc-a1', quantity: 5 },
      ],
    }
  );

  assert(receipt1 && receipt1.status === 'draft', 'Receipt created with draft status');
  assert(receipt1.receipt_number.startsWith('REC-'), 'Receipt number formatted correctly');
  assert(receipt1.receipt_items.length === 2, 'Receipt created with 2 line items');

  // 1.2 Verify Draft does NOT change stock or create ledger
  const stockBeforeValidate = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1');
  assert(stockBeforeValidate?.quantity === 25, 'Draft receipt does NOT mutate stock (stock remains 25)');
  assert(store.stock_ledger.length === 0, 'Draft receipt does NOT create any ledger entries');

  // 1.3 Validate Receipt -> Stock increases & Ledger created
  const validatedReceipt = await receiptService.validateReceipt('org-a', receipt1.id, 'user-a-admin');
  assert(validatedReceipt.status === 'completed', 'Receipt validated and marked completed');

  const stockAfterReceipt1 = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1');
  const stockAfterReceipt2 = store.stock.find((s) => s.product_id === 'prod-a2' && s.location_id === 'loc-a1');
  assert(stockAfterReceipt1?.quantity === 40, 'Stock prod-a1 increased from 25 to 40 (+15)');
  assert(stockAfterReceipt2?.quantity === 15, 'Stock prod-a2 increased from 10 to 15 (+5)');

  // Verify Ledger entries
  const receiptLedgers = store.stock_ledger.filter((l) => l.reference_id === receipt1.id);
  assert(receiptLedgers.length === 2, 'Two stock ledger entries created for receipt');
  assert(
    receiptLedgers[0]?.transaction_type === 'receipt' &&
      receiptLedgers[0]?.quantity_change === 15 &&
      receiptLedgers[0]?.previous_quantity === 25 &&
      receiptLedgers[0]?.new_quantity === 40,
    'Ledger entry 1 has correct quantities and type (prev: 25, change: +15, new: 40)'
  );
  assert(
    receiptLedgers[1]?.transaction_type === 'receipt' &&
      receiptLedgers[1]?.quantity_change === 5 &&
      receiptLedgers[1]?.previous_quantity === 10 &&
      receiptLedgers[1]?.new_quantity === 15,
    'Ledger entry 2 has correct quantities and type (prev: 10, change: +5, new: 15)'
  );

  // 1.4 Duplicate validation rejection (Idempotency)
  let dupReceiptError = false;
  try {
    await receiptService.validateReceipt('org-a', receipt1.id, 'user-a-admin');
  } catch (err: any) {
    dupReceiptError = err.status === 400 && err.message.toLowerCase().includes('already');
  }
  assert(dupReceiptError, 'Duplicate receipt validation rejected (cannot validate completed receipt)');
  assert(stockAfterReceipt1?.quantity === 40, 'Stock remained 40 after duplicate validation attempt');

  // 1.5 Validation with invalid product (not in org)
  let invalidProdReceiptError = false;
  try {
    await receiptService.createReceipt(
      'org-a',
      'user-a-admin',
      {
        warehouse_id: 'wh-a1',
        items: [{ product_id: 'prod-b1', location_id: 'loc-a1', quantity: 10 }],
      }
    );
  } catch (err: any) {
    invalidProdReceiptError = err.status === 400 && err.message.includes('Invalid product');
  }
  assert(invalidProdReceiptError, 'Creating receipt with foreign product rejected with 400');

  // 1.6 Validation with invalid location (location not in warehouse)
  let invalidLocReceiptError = false;
  try {
    await receiptService.createReceipt(
      'org-a',
      'user-a-admin',
      {
        warehouse_id: 'wh-a1',
        items: [{ product_id: 'prod-a1', location_id: 'loc-a3', quantity: 10 }], // loc-a3 is in wh-a2
      }
    );
  } catch (err: any) {
    invalidLocReceiptError = err.status === 400 && err.message.includes('Invalid location');
  }
  assert(invalidLocReceiptError, 'Creating receipt with location not belonging to warehouse rejected');

  // 1.7 Organization isolation for receipts
  const bReceipt = await receiptService.getReceiptById('org-b', receipt1.id);
  assert(bReceipt === null, 'Org B cannot view Org A receipt (returns null / isolated)');


  // =========================================================================
  // 2. DELIVERIES TESTS
  // =========================================================================
  console.log('\n--- 2. Deliveries Tests ---');

  // Current stock: prod-a1 @ loc-a1 = 40
  // 2.1 Create Delivery (Draft)
  const delivery1 = await deliveryService.createDelivery(
    'org-a',
    'user-a-admin',
    {
      warehouse_id: 'wh-a1',
      customer_info: 'Big Retail Corp (SO-1001)',
      items: [{ product_id: 'prod-a1', location_id: 'loc-a1', quantity: 10 }],
    }
  );
  assert(delivery1 && delivery1.status === 'draft', 'Delivery created in draft status');
  assert(delivery1.delivery_number.startsWith('DEL-'), 'Delivery number formatted correctly');

  // 2.2 Verify Draft does NOT change stock
  const stockBeforeDelValidate = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1');
  assert(stockBeforeDelValidate?.quantity === 40, 'Draft delivery does NOT change stock (remains 40)');

  // 2.3 Validate Delivery -> Stock decreases & Ledger created
  const validatedDelivery = await deliveryService.validateDelivery('org-a', delivery1.id, 'user-a-admin');
  assert(validatedDelivery.status === 'completed', 'Delivery validated successfully');

  const stockAfterDelivery1 = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1');
  assert(stockAfterDelivery1?.quantity === 30, 'Stock prod-a1 decreased from 40 to 30 (-10)');

  const deliveryLedger = store.stock_ledger.find((l) => l.reference_id === delivery1.id);
  assert(
    deliveryLedger?.transaction_type === 'delivery' &&
      deliveryLedger.quantity_change === -10 &&
      deliveryLedger.previous_quantity === 40 &&
      deliveryLedger.new_quantity === 30,
    'Delivery ledger created correctly (prev: 40, change: -10, new: 30)'
  );

  // 2.4 Insufficient stock rejection
  // Attempt to deliver 50 when stock is 30
  const deliveryExcess = await deliveryService.createDelivery(
    'org-a',
    'user-a-admin',
    {
      warehouse_id: 'wh-a1',
      items: [{ product_id: 'prod-a1', location_id: 'loc-a1', quantity: 50 }],
    }
  );

  let insufficientStockError = false;
  try {
    await deliveryService.validateDelivery('org-a', deliveryExcess.id, 'user-a-admin');
  } catch (err: any) {
    insufficientStockError = err.status === 400 && err.message.includes('Insufficient stock');
  }
  assert(insufficientStockError, 'Validation rejected when delivery exceeds available stock');

  const stockAfterExcessAttempt = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1');
  assert(stockAfterExcessAttempt?.quantity === 30, 'Stock remained 30 after failed delivery validation');

  // 2.5 Duplicate delivery validation rejection
  let dupDeliveryError = false;
  try {
    await deliveryService.validateDelivery('org-a', delivery1.id, 'user-a-admin');
  } catch (err: any) {
    dupDeliveryError = err.status === 400 && err.message.toLowerCase().includes('already');
  }
  assert(dupDeliveryError, 'Duplicate delivery validation rejected');

  // 2.6 Org isolation on delivery
  const bDelivery = await deliveryService.getDeliveryById('org-b', delivery1.id);
  assert(bDelivery === null, 'Org B cannot access Org A delivery (returns null / isolated)');


  // =========================================================================
  // 3. TRANSFERS TESTS
  // =========================================================================
  console.log('\n--- 3. Transfers Tests ---');

  // prod-a1 @ loc-a1 = 30. Transfer 8 from loc-a1 to loc-a2 (both in wh-a1)
  // 3.1 Create Transfer (Draft)
  const transfer1 = await transferService.createTransfer(
    'org-a',
    'user-a-admin',
    {
      source_warehouse_id: 'wh-a1',
      destination_warehouse_id: 'wh-a1',
      items: [{ product_id: 'prod-a1', source_location_id: 'loc-a1', destination_location_id: 'loc-a2', quantity: 8 }],
    }
  );
  assert(transfer1 && transfer1.status === 'draft', 'Transfer created in draft status');
  assert(transfer1.transfer_number.startsWith('TRF-'), 'Transfer number formatted correctly');

  // 3.2 Same source and destination location rejection
  let sameLocTransferError = false;
  try {
    await transferService.createTransfer(
      'org-a',
      'user-a-admin',
      {
        source_warehouse_id: 'wh-a1',
        destination_warehouse_id: 'wh-a1',
        items: [{ product_id: 'prod-a1', source_location_id: 'loc-a1', destination_location_id: 'loc-a1', quantity: 5 }],
      }
    );
  } catch (err: any) {
    sameLocTransferError = err.status === 400 && err.message.includes('identical');
  }
  assert(sameLocTransferError, 'Transfer with identical source and destination location rejected');

  // 3.3 Complete Transfer -> Source decreases & Destination increases atomically
  const completedTransfer = await transferService.completeTransfer('org-a', transfer1.id, 'user-a-admin');
  assert(completedTransfer.status === 'completed', 'Transfer completed successfully');

  const srcStock = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1');
  const dstStock = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a2');
  assert(srcStock?.quantity === 22, 'Source stock prod-a1 at loc-a1 decreased from 30 to 22 (-8)');
  assert(dstStock?.quantity === 8, 'Destination stock prod-a1 at loc-a2 created/increased to 8 (+8)');

  // Verify 2 ledger entries for transfer
  const transferLedgers = store.stock_ledger.filter((l) => l.reference_id === transfer1.id);
  assert(transferLedgers.length === 2, 'Two stock ledger entries created for transfer (source and dest)');
  const srcLedger = transferLedgers.find((l) => l.location_id === 'loc-a1');
  const dstLedger = transferLedgers.find((l) => l.location_id === 'loc-a2');
  assert(
    srcLedger?.quantity_change === -8 && srcLedger.previous_quantity === 30 && srcLedger.new_quantity === 22,
    'Source ledger correct (prev: 30, change: -8, new: 22)'
  );
  assert(
    dstLedger?.quantity_change === 8 && dstLedger.previous_quantity === 0 && dstLedger.new_quantity === 8,
    'Destination ledger correct (prev: 0, change: +8, new: 8)'
  );

  // 3.4 Insufficient stock on transfer rollback
  const excessTransfer = await transferService.createTransfer(
    'org-a',
    'user-a-admin',
    {
      source_warehouse_id: 'wh-a1',
      destination_warehouse_id: 'wh-a1',
      items: [{ product_id: 'prod-a1', source_location_id: 'loc-a1', destination_location_id: 'loc-a2', quantity: 100 }],
    }
  );
  let excessTransferError = false;
  try {
    await transferService.completeTransfer('org-a', excessTransfer.id, 'user-a-admin');
  } catch (err: any) {
    excessTransferError = err.status === 400 && err.message.includes('Insufficient stock');
  }
  assert(excessTransferError, 'Transfer rejected when quantity exceeds source stock');
  assert(srcStock?.quantity === 22 && dstStock?.quantity === 8, 'Stocks untouched after failed transfer');

  // 3.5 Duplicate transfer completion rejection
  let dupTransferError = false;
  try {
    await transferService.completeTransfer('org-a', transfer1.id, 'user-a-admin');
  } catch (err: any) {
    dupTransferError = err.status === 400 && err.message.toLowerCase().includes('already');
  }
  assert(dupTransferError, 'Duplicate transfer completion rejected');


  // =========================================================================
  // 4. ADJUSTMENTS TESTS
  // =========================================================================
  console.log('\n--- 4. Adjustments Tests ---');

  // Current stock: prod-a2 @ loc-a1 = 15 (initial 10 + 5 from receipt1).
  // Physical count found 12. Difference should be 12 - 15 = -3.
  // 4.1 Create Adjustment (Draft)
  const adj1 = await adjustmentService.createAdjustment(
    'org-a',
    'user-a-admin',
    {
      warehouse_id: 'wh-a1',
      reason: 'Physical inventory audit variance',
      items: [{ product_id: 'prod-a2', location_id: 'loc-a1', physical_quantity: 12 }],
    }
  );
  assert(adj1 && adj1.status === 'draft', 'Adjustment created in draft status');
  assert(adj1.adjustment_number.startsWith('ADJ-'), 'Adjustment number formatted correctly');
  assert(
    adj1.adjustment_items[0]?.system_quantity === 15 &&
      adj1.adjustment_items[0]?.physical_quantity === 12 &&
      adj1.adjustment_items[0]?.difference === -3,
    'Server computed system_quantity (15) and difference (-3) accurately'
  );

  // Stock untouched in draft
  const stockBeforeAdjApprove = store.stock.find((s) => s.product_id === 'prod-a2' && s.location_id === 'loc-a1');
  assert(stockBeforeAdjApprove?.quantity === 15, 'Stock remains 15 while adjustment is draft');

  // 4.2 Approve Adjustment -> Stock corrected & Ledger created
  const approvedAdj = await adjustmentService.approveAdjustment('org-a', adj1.id, 'user-a-admin');
  assert(approvedAdj.status === 'completed', 'Adjustment approved and completed');

  const stockAfterAdj = store.stock.find((s) => s.product_id === 'prod-a2' && s.location_id === 'loc-a1');
  assert(stockAfterAdj?.quantity === 12, 'Stock prod-a2 adjusted to 12');

  const adjLedger = store.stock_ledger.find((l) => l.reference_id === adj1.id);
  assert(
    adjLedger?.transaction_type === 'adjustment' &&
      adjLedger.quantity_change === -3 &&
      adjLedger.previous_quantity === 15 &&
      adjLedger.new_quantity === 12,
    'Adjustment ledger recorded (prev: 15, change: -3, new: 12)'
  );

  // 4.3 Duplicate adjustment approval rejection
  let dupAdjError = false;
  try {
    await adjustmentService.approveAdjustment('org-a', adj1.id, 'user-a-admin');
  } catch (err: any) {
    dupAdjError = err.status === 400 && err.message.toLowerCase().includes('already');
  }
  assert(dupAdjError, 'Duplicate adjustment approval rejected');


  // =========================================================================
  // 5. ATOMICITY & MULTI-ITEM ROLLBACK TESTS
  // =========================================================================
  console.log('\n--- 5. Atomicity & Multi-Item Rollback Tests ---');

  // Current stock:
  // prod-a1 @ loc-a1 = 22
  // prod-a2 @ loc-a1 = 12
  const initialStockA1 = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1')!.quantity;
  const initialStockA2 = store.stock.find((s) => s.product_id === 'prod-a2' && s.location_id === 'loc-a1')!.quantity;
  const ledgerCountBefore = store.stock_ledger.length;

  // Create delivery with Item 1 valid (5 units), Item 2 invalid (excess: 50 units)
  const multiItemDelivery = await deliveryService.createDelivery(
    'org-a',
    'user-a-admin',
    {
      warehouse_id: 'wh-a1',
      items: [
        { product_id: 'prod-a1', location_id: 'loc-a1', quantity: 5 }, // Valid (22 available)
        { product_id: 'prod-a2', location_id: 'loc-a1', quantity: 50 }, // Invalid (only 12 available!)
      ],
    }
  );

  let atomicDeliveryError = false;
  try {
    await deliveryService.validateDelivery('org-a', multiItemDelivery.id, 'user-a-admin');
  } catch (err: any) {
    atomicDeliveryError = err.status === 400 && err.message.includes('Insufficient stock');
  }
  assert(atomicDeliveryError, 'Multi-item delivery failed when one item had insufficient stock');

  // Verify Item 1 was NOT deducted (complete rollback)
  const currentStockA1 = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1')!.quantity;
  const currentStockA2 = store.stock.find((s) => s.product_id === 'prod-a2' && s.location_id === 'loc-a1')!.quantity;
  assert(currentStockA1 === initialStockA1, 'Item 1 stock NOT changed (rolled back to 22)');
  assert(currentStockA2 === initialStockA2, 'Item 2 stock NOT changed (rolled back to 12)');
  assert(store.stock_ledger.length === ledgerCountBefore, 'Zero partial ledger entries created (clean rollback)');


  // =========================================================================
  // 6. STOCK LEDGER TESTS
  // =========================================================================
  console.log('\n--- 6. Stock Ledger Tests ---');

  // 6.1 Read Ledger
  const ledgerResult = await ledgerService.listLedger('org-a', { pageSize: 10, page: 1 });
  assert(ledgerResult.total > 0 && ledgerResult.items.length > 0, 'Ledger returns records with pagination');
  assert(
    ledgerResult.items.every((l) => l.organization_id === 'org-a'),
    'All ledger entries belong strictly to Org A'
  );

  // 6.2 Filter by Transaction Type
  const receiptOnlyLedgers = await ledgerService.listLedger('org-a', { transactionType: 'receipt' });
  assert(
    receiptOnlyLedgers.items.every((l) => l.transaction_type === 'receipt'),
    'Ledger filters correctly by transaction_type=receipt'
  );

  // 6.3 Filter by Product
  const prodA1Ledgers = await ledgerService.listLedger('org-a', { productId: 'prod-a1' });
  assert(
    prodA1Ledgers.items.every((l) => l.product_id === 'prod-a1'),
    'Ledger filters correctly by product_id'
  );

  // 6.4 Organization Isolation: Org B cannot see Org A ledger entries
  const orgBLedgers = await ledgerService.listLedger('org-b', {});
  assert(orgBLedgers.items.length === 0, 'Org B cannot view Org A ledger entries (0 entries returned)');


  // =========================================================================
  // 7. RBAC PERMISSION TESTS
  // =========================================================================
  console.log('\n--- 7. RBAC Permission Tests ---');

  // Warehouse Staff permissions:
  // receipts.read, receipts.create, deliveries.read, deliveries.create, transfers.read, transfers.create, adjustments.read, ledger.read
  // Warehouse Staff CANNOT: receipts.validate, deliveries.validate, transfers.complete (or transfers.update), adjustments.approve

  const staffReqValidateReceipt: any = {
    user: { id: 'user-a-staff' },
    membership: {
      role: 'Warehouse Staff',
      permissions: [
        'receipts.read',
        'receipts.create',
        'deliveries.read',
        'deliveries.create',
        'transfers.read',
        'transfers.create',
        'adjustments.read',
        'ledger.read',
      ],
    },
  };

  let staffBlockedFromReceiptValidate = false;
  const mockRes: any = {
    status: (code: number) => ({
      json: (data: any) => {
        if (code === 403) staffBlockedFromReceiptValidate = true;
      },
    }),
  };
  const mockNext = () => {};

  const checkReceiptValidate = requirePermission('receipts.validate');
  await checkReceiptValidate(staffReqValidateReceipt, mockRes, mockNext);
  assert(staffBlockedFromReceiptValidate, 'Warehouse Staff blocked from receipts.validate (403)');

  let staffBlockedFromDeliveryValidate = false;
  const mockResDel: any = {
    status: (code: number) => ({
      json: () => {
        if (code === 403) staffBlockedFromDeliveryValidate = true;
      },
    }),
  };
  const checkDeliveryValidate = requirePermission('deliveries.validate');
  await checkDeliveryValidate(staffReqValidateReceipt, mockResDel, mockNext);
  assert(staffBlockedFromDeliveryValidate, 'Warehouse Staff blocked from deliveries.validate (403)');

  let staffBlockedFromAdjApprove = false;
  const mockResAdj: any = {
    status: (code: number) => ({
      json: () => {
        if (code === 403) staffBlockedFromAdjApprove = true;
      },
    }),
  };
  const checkAdjApprove = requirePermission('adjustments.approve');
  await checkAdjApprove(staffReqValidateReceipt, mockResAdj, mockNext);
  assert(staffBlockedFromAdjApprove, 'Warehouse Staff blocked from adjustments.approve (403)');

  // Admin allowed
  const adminReq: any = {
    user: { id: 'user-a-admin' },
    membership: {
      role: 'Organization Admin',
      permissions: [
        'receipts.read',
        'receipts.create',
        'receipts.update',
        'receipts.validate',
        'deliveries.read',
        'deliveries.create',
        'deliveries.update',
        'deliveries.validate',
        'transfers.read',
        'transfers.create',
        'transfers.update',
        'adjustments.read',
        'adjustments.create',
        'adjustments.approve',
        'ledger.read',
      ],
    },
  };
  let adminNextCalled = false;
  await checkReceiptValidate(adminReq, mockRes, () => {
    adminNextCalled = true;
  });
  assert(adminNextCalled, 'Organization Admin permitted to validate receipts');


  // =========================================================================
  // 8. CONCURRENCY & PRE-CHECK SIMULATION TEST
  // =========================================================================
  console.log('\n--- 8. Concurrency Simulation Test ---');
  // Current stock for prod-a1 @ loc-a1 is 22.
  // Delivery A attempts to deliver 15.
  // Delivery B attempts to deliver 12 simultaneously.
  // 15 + 12 = 27 > 22. Only one can succeed without negative stock.
  const delA = await deliveryService.createDelivery(
    'org-a',
    'user-a-admin',
    {
      warehouse_id: 'wh-a1',
      items: [{ product_id: 'prod-a1', location_id: 'loc-a1', quantity: 15 }],
    }
  );
  const delB = await deliveryService.createDelivery(
    'org-a',
    'user-a-admin',
    {
      warehouse_id: 'wh-a1',
      items: [{ product_id: 'prod-a1', location_id: 'loc-a1', quantity: 12 }],
    }
  );

  // First executes
  const resA = await deliveryService.validateDelivery('org-a', delA.id, 'user-a-admin');
  assert(resA.status === 'completed', 'Delivery A (15 units) validated successfully');

  // Second attempts when stock is now 7
  let delBError = false;
  try {
    await deliveryService.validateDelivery('org-a', delB.id, 'user-a-admin');
  } catch (err: any) {
    delBError = err.status === 400 && err.message.includes('Insufficient stock');
  }
  assert(delBError, 'Delivery B (12 units) safely rejected due to insufficient stock (7 available)');

  const finalStockA1 = store.stock.find((s) => s.product_id === 'prod-a1' && s.location_id === 'loc-a1')!.quantity;
  assert(finalStockA1 === 7, 'Final stock is exactly 7 (never negative)');


  console.log('\n================================================================');
  console.log(`PHASE 5 TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
