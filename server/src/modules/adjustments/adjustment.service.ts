import type { SupabaseClient } from '@supabase/supabase-js';
import { generateDocumentNumber } from '../../utils/numbering.js';

export interface AdjustmentItemInput {
  product_id: string;
  location_id: string;
  physical_quantity: number;
}

export interface CreateAdjustmentDTO {
  adjustment_number?: string | undefined;
  warehouse_id: string;
  reason?: string | undefined;
  notes?: string | undefined;
  items: AdjustmentItemInput[];
}

export interface UpdateAdjustmentDTO {
  reason?: string | undefined;
  notes?: string | undefined;
  items?: AdjustmentItemInput[] | undefined;
}

export interface AdjustmentListParams {
  search?: string | undefined;
  status?: string | undefined;
  warehouseId?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export class AdjustmentService {
  constructor(private db: SupabaseClient) {}

  async listAdjustments(orgId: string, params: AdjustmentListParams) {
    let query = this.db
      .from('adjustments')
      .select('*, warehouses(id, name, code), adjustment_items(id, system_quantity, physical_quantity, difference)', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params.warehouseId && params.warehouseId !== 'all') {
      query = query.eq('warehouse_id', params.warehouseId);
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      query = query.or(`adjustment_number.ilike.%${s}%,reason.ilike.%${s}%`);
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 15));
    const offset = (page - 1) * pageSize;

    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const items = (data || []).map((a: any) => {
      const itemCount = (a.adjustment_items || []).length;
      return {
        ...a,
        item_count: itemCount,
        adjustment_items: undefined,
      };
    });

    const total = count || 0;
    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getAdjustmentById(orgId: string, id: string) {
    const { data: adjustment, error } = await this.db
      .from('adjustments')
      .select('*, warehouses(id, name, code)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw error;
    if (!adjustment) return null;

    const { data: items, error: itemsError } = await this.db
      .from('adjustment_items')
      .select('*, products(id, name, sku, unit_of_measure), locations(id, name, code, type)')
      .eq('adjustment_id', id);

    if (itemsError) throw itemsError;

    return {
      ...adjustment,
      items: items || [],
    };
  }

  async createAdjustment(orgId: string, userId: string, dto: CreateAdjustmentDTO) {
    // 1. Verify warehouse
    const { data: warehouse } = await this.db
      .from('warehouses')
      .select('id')
      .eq('id', dto.warehouse_id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!warehouse) {
      const err: any = new Error('Warehouse not found in current organization');
      err.status = 400;
      throw err;
    }

    if (!dto.items || dto.items.length === 0) {
      const err: any = new Error('Adjustment must contain at least one line item');
      err.status = 400;
      throw err;
    }

    // 2. Validate items and compute system_quantity & difference
    const preparedItems: Array<{
      product_id: string;
      location_id: string;
      system_quantity: number;
      physical_quantity: number;
      difference: number;
    }> = [];

    for (const item of dto.items) {
      if (item.physical_quantity < 0) {
        const err: any = new Error('Physical quantity cannot be negative');
        err.status = 400;
        throw err;
      }

      const { data: product } = await this.db
        .from('products')
        .select('id')
        .eq('id', item.product_id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (!product) {
        const err: any = new Error(`Product ${item.product_id} not found in current organization`);
        err.status = 400;
        throw err;
      }

      const { data: location } = await this.db
        .from('locations')
        .select('id')
        .eq('id', item.location_id)
        .eq('warehouse_id', dto.warehouse_id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (!location) {
        const err: any = new Error(`Location ${item.location_id} does not belong to the selected warehouse`);
        err.status = 400;
        throw err;
      }

      // Fetch live system quantity
      const { data: stockRow } = await this.db
        .from('stock')
        .select('quantity')
        .eq('organization_id', orgId)
        .eq('product_id', item.product_id)
        .eq('location_id', item.location_id)
        .maybeSingle();

      const systemQty = Number(stockRow?.quantity || 0);
      const diff = item.physical_quantity - systemQty;

      preparedItems.push({
        product_id: item.product_id,
        location_id: item.location_id,
        system_quantity: systemQty,
        physical_quantity: item.physical_quantity,
        difference: diff,
      });
    }

    // 3. Document number
    const adjustmentNumber = dto.adjustment_number?.trim() ||
      await generateDocumentNumber(this.db, 'adjustments', 'adjustment_number', orgId, 'ADJ');

    // 4. Insert header
    const { data: adjustment, error: aError } = await this.db
      .from('adjustments')
      .insert({
        organization_id: orgId,
        adjustment_number: adjustmentNumber,
        warehouse_id: dto.warehouse_id,
        reason: dto.reason?.trim() || null,
        notes: dto.notes?.trim() || null,
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single();

    if (aError) {
      if (aError.code === '23505') {
        const err: any = new Error(`Adjustment number '${adjustmentNumber}' already exists`);
        err.status = 409;
        throw err;
      }
      throw aError;
    }

    // 5. Insert items
    const itemsToInsert = preparedItems.map((item) => ({
      adjustment_id: adjustment.id,
      product_id: item.product_id,
      location_id: item.location_id,
      system_quantity: item.system_quantity,
      physical_quantity: item.physical_quantity,
      difference: item.difference,
    }));

    const { error: itemsError } = await this.db
      .from('adjustment_items')
      .insert(itemsToInsert);

    if (itemsError) {
      await this.db.from('adjustments').delete().eq('id', adjustment.id);
      throw itemsError;
    }

    return this.getAdjustmentById(orgId, adjustment.id);
  }

  async updateAdjustment(orgId: string, id: string, dto: UpdateAdjustmentDTO) {
    const existing = await this.getAdjustmentById(orgId, id);
    if (!existing) {
      const err: any = new Error('Adjustment not found');
      err.status = 404;
      throw err;
    }

    if (existing.status !== 'draft') {
      const err: any = new Error('Approved or completed adjustments cannot be modified');
      err.status = 400;
      throw err;
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.reason !== undefined) {
      updatePayload.reason = dto.reason ? dto.reason.trim() : null;
    }
    if (dto.notes !== undefined) {
      updatePayload.notes = dto.notes ? dto.notes.trim() : null;
    }

    const { error: aError } = await this.db
      .from('adjustments')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', orgId);

    if (aError) throw aError;

    if (dto.items) {
      if (dto.items.length === 0) {
        const err: any = new Error('Adjustment must contain at least one line item');
        err.status = 400;
        throw err;
      }

      const preparedItems = [];
      for (const item of dto.items) {
        if (item.physical_quantity < 0) {
          const err: any = new Error('Physical quantity cannot be negative');
          err.status = 400;
          throw err;
        }

        const { data: stockRow } = await this.db
          .from('stock')
          .select('quantity')
          .eq('organization_id', orgId)
          .eq('product_id', item.product_id)
          .eq('location_id', item.location_id)
          .maybeSingle();

        const systemQty = Number(stockRow?.quantity || 0);
        preparedItems.push({
          adjustment_id: id,
          product_id: item.product_id,
          location_id: item.location_id,
          system_quantity: systemQty,
          physical_quantity: item.physical_quantity,
          difference: item.physical_quantity - systemQty,
        });
      }

      await this.db.from('adjustment_items').delete().eq('adjustment_id', id);
      await this.db.from('adjustment_items').insert(preparedItems);
    }

    return this.getAdjustmentById(orgId, id);
  }

  async approveAdjustment(orgId: string, id: string, userId: string) {
    // 1. Try RPC
    try {
      const { data: rpcResult, error: rpcError } = await this.db.rpc('rpc_approve_adjustment', {
        p_org_id: orgId,
        p_adjustment_id: id,
        p_user_id: userId,
      });

      if (!rpcError && rpcResult?.success) {
        return this.getAdjustmentById(orgId, id);
      }
      if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
        const err: any = new Error(rpcError.message);
        err.status = 400;
        throw err;
      }
    } catch (e: any) {
      if (e.status) throw e;
    }

    // 2. TypeScript Atomic Fallback
    const adjustment = await this.getAdjustmentById(orgId, id);
    if (!adjustment) {
      const err: any = new Error('Adjustment not found');
      err.status = 404;
      throw err;
    }

    if (adjustment.status === 'completed' || adjustment.status === 'approved') {
      const err: any = new Error(`Adjustment ${adjustment.adjustment_number} has already been approved`);
      err.status = 400;
      throw err;
    }

    if (!adjustment.items || adjustment.items.length === 0) {
      const err: any = new Error('Cannot approve an adjustment with no items');
      err.status = 400;
      throw err;
    }

    const appliedStockChanges: Array<{ id: string; originalQty: number; isNew: boolean }> = [];
    const createdLedgerIds: string[] = [];

    try {
      for (const item of adjustment.items) {
        const physicalQty = Number(item.physical_quantity);
        if (physicalQty < 0) {
          const err: any = new Error('Physical quantity cannot be negative');
          err.status = 400;
          throw err;
        }

        // Fetch current stock
        const { data: stockRow } = await this.db
          .from('stock')
          .select('id, quantity')
          .eq('organization_id', orgId)
          .eq('product_id', item.product_id)
          .eq('location_id', item.location_id)
          .maybeSingle();

        const currentQty = Number(stockRow?.quantity || 0);
        const difference = physicalQty - currentQty;

        if (stockRow) {
          appliedStockChanges.push({ id: stockRow.id, originalQty: currentQty, isNew: false });
          const { error: updErr } = await this.db
            .from('stock')
            .update({ quantity: physicalQty, updated_at: new Date().toISOString() })
            .eq('id', stockRow.id);

          if (updErr) throw updErr;
        } else {
          appliedStockChanges.push({ id: '', originalQty: 0, isNew: true });
          const { data: newRow, error: insErr } = await this.db
            .from('stock')
            .insert({
              organization_id: orgId,
              product_id: item.product_id,
              warehouse_id: adjustment.warehouse_id,
              location_id: item.location_id,
              quantity: physicalQty,
            })
            .select()
            .single();

          if (insErr) throw insErr;
          appliedStockChanges[appliedStockChanges.length - 1]!.id = newRow.id;
        }

        // Update item difference to accurately match execution
        await this.db
          .from('adjustment_items')
          .update({
            system_quantity: currentQty,
            difference,
          })
          .eq('id', item.id);

        // Create Ledger Entry if there is any difference
        if (difference !== 0) {
          const { data: ledEntry, error: ledErr } = await this.db
            .from('stock_ledger')
            .insert({
              organization_id: orgId,
              product_id: item.product_id,
              warehouse_id: adjustment.warehouse_id,
              location_id: item.location_id,
              transaction_type: 'adjustment',
              reference_type: 'adjustment',
              reference_id: adjustment.id,
              quantity_change: difference,
              previous_quantity: currentQty,
              new_quantity: physicalQty,
              reason: adjustment.reason || `Adjustment ${adjustment.adjustment_number}`,
              performed_by: userId,
            })
            .select()
            .single();

          if (ledErr) throw ledErr;
          createdLedgerIds.push(ledEntry.id);
        }
      }

      // Mark completed
      const { error: statusErr } = await this.db
        .from('adjustments')
        .update({
          status: 'completed',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId);

      if (statusErr) throw statusErr;

      return this.getAdjustmentById(orgId, id);
    } catch (atomicError) {
      for (const change of appliedStockChanges) {
        if (change.isNew && change.id) {
          await this.db.from('stock').delete().eq('id', change.id);
        } else if (!change.isNew && change.id) {
          await this.db.from('stock').update({ quantity: change.originalQty }).eq('id', change.id);
        }
      }
      for (const ledgerId of createdLedgerIds) {
        await this.db.from('stock_ledger').delete().eq('id', ledgerId);
      }
      throw atomicError;
    }
  }
}
