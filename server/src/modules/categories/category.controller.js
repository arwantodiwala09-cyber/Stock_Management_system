import { z } from 'zod';
import { CategoryService } from './category.service.js';
import { getDbClient } from '../../utils/db.js';
const createCategorySchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255, 'Name cannot exceed 255 characters'),
    description: z.string().trim().max(1000).optional().nullable(),
    status: z.enum(['active', 'inactive']).default('active'),
});
const updateCategorySchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255, 'Name cannot exceed 255 characters').optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    status: z.enum(['active', 'inactive']).optional(),
});
export const listCategories = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const db = getDbClient(req);
        const service = new CategoryService(db);
        const { search, status, page, pageSize, all } = req.query;
        const result = await service.listCategories(orgId, {
            search: typeof search === 'string' ? search : undefined,
            status: typeof status === 'string' ? status : undefined,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
            all: all === 'true',
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('listCategories error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch categories' });
    }
};
export const getCategory = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const db = getDbClient(req);
        const service = new CategoryService(db);
        const category = await service.getCategoryById(orgId, id);
        if (!category) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }
        res.status(200).json(category);
    }
    catch (error) {
        console.error('getCategory error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to fetch category' });
    }
};
export const createCategory = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const validation = createCategorySchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
            return;
        }
        const db = getDbClient(req);
        const service = new CategoryService(db);
        const category = await service.createCategory(orgId, {
            name: validation.data.name,
            description: validation.data.description ?? undefined,
            status: validation.data.status,
        });
        res.status(201).json(category);
    }
    catch (error) {
        if (error.status === 409) {
            res.status(409).json({ error: error.message });
            return;
        }
        console.error('createCategory error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to create category' });
    }
};
export const updateCategory = async (req, res) => {
    try {
        const orgId = req.organizationId;
        const id = req.params.id;
        const validation = updateCategorySchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
            return;
        }
        const db = getDbClient(req);
        const service = new CategoryService(db);
        const category = await service.updateCategory(orgId, id, {
            name: validation.data.name,
            description: validation.data.description ?? undefined,
            status: validation.data.status,
        });
        res.status(200).json(category);
    }
    catch (error) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.status === 409) {
            res.status(409).json({ error: error.message });
            return;
        }
        console.error('updateCategory error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to update category' });
    }
};
//# sourceMappingURL=category.controller.js.map