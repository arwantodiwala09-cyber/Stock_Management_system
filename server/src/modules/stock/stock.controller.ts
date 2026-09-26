import type { Request, Response } from 'express';
import { StockService } from './stock.service.js';
import { getDbClient } from '../../utils/db.js';

export const listStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const db = getDbClient(req);
    const service = new StockService(db);

    const {
      search,
      productId,
      warehouseId,
      locationId,
      stockStatus,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    const result = await service.listStock(orgId, {
      search: typeof search === 'string' ? search : undefined,
      productId: typeof productId === 'string' ? productId : undefined,
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      locationId: typeof locationId === 'string' ? locationId : undefined,
      stockStatus: typeof stockStatus === 'string' && ['out_of_stock', 'low_stock', 'healthy', 'all'].includes(stockStatus)
        ? (stockStatus as any)
        : undefined,
      sortBy: typeof sortBy === 'string' ? sortBy : undefined,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('listStock error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch stock records' });
  }
};
