import { LedgerService } from './ledger.service.js';
import { getDbClient } from '../../utils/db.js';
export const listLedger = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const db = getDbClient(req);
        const service = new LedgerService(db);
        const { productId, warehouseId, locationId, transactionType, startDate, endDate, search, page, pageSize, } = req.query;
        const result = await service.listLedger(orgId, {
            productId: typeof productId === 'string' ? productId : undefined,
            warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
            locationId: typeof locationId === 'string' ? locationId : undefined,
            transactionType: typeof transactionType === 'string' ? transactionType : undefined,
            startDate: typeof startDate === 'string' ? startDate : undefined,
            endDate: typeof endDate === 'string' ? endDate : undefined,
            search: typeof search === 'string' ? search : undefined,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('listLedger error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch ledger records' });
    }
};
export const getLedger = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const db = getDbClient(req);
        const service = new LedgerService(db);
        const record = await service.getLedgerById(orgId, id);
        if (!record) {
            res.status(404).json({ error: 'Ledger entry not found' });
            return;
        }
        res.status(200).json(record);
    }
    catch (error) {
        console.error('getLedger error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch ledger entry' });
    }
};
//# sourceMappingURL=ledger.controller.js.map