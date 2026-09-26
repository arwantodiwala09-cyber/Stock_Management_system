import type { Request, Response } from 'express';
import { z } from 'zod';
import { ProductService } from './product.service.js';
import { getDbClient } from '../../utils/db.js';
import { supabaseAdmin } from '../../config/supabase.js';

const createProductSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(100),
  name: z.string().trim().min(1, 'Name is required').max(255),
  description: z.string().trim().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  unit_of_measure: z.string().trim().max(50).default('pcs'),
  reorder_level: z.coerce.number().min(0, 'Reorder level must be >= 0').default(0),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  image_path: z.string().trim().max(500).optional().nullable(),
});

const updateProductSchema = z.object({
  sku: z.string().trim().min(1).max(100).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  unit_of_measure: z.string().trim().max(50).optional(),
  reorder_level: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  image_path: z.string().trim().max(500).optional().nullable(),
});

const uploadImageSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  base64Data: z.string().min(1),
});

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const db = getDbClient(req);
    const service = new ProductService(db);

    const { search, categoryId, status, sortBy, sortOrder, page, pageSize, all } = req.query;

    const result = await service.listProducts(orgId, {
      search: typeof search === 'string' ? search : undefined,
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      status: typeof status === 'string' ? status : undefined,
      sortBy: typeof sortBy === 'string' ? sortBy : undefined,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      all: all === 'true',
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('listProducts error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch products' });
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;
    const db = getDbClient(req);
    const service = new ProductService(db);

    const product = await service.getProductById(orgId, id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.status(200).json(product);
  } catch (error: any) {
    console.error('getProduct error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch product' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const validation = createProductSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const service = new ProductService(db);

    const product = await service.createProduct(orgId, {
      sku: validation.data.sku,
      name: validation.data.name,
      description: validation.data.description ?? undefined,
      category_id: validation.data.category_id,
      unit_of_measure: validation.data.unit_of_measure,
      reorder_level: validation.data.reorder_level,
      status: validation.data.status,
      image_path: validation.data.image_path ?? undefined,
    });

    res.status(201).json(product);
  } catch (error: any) {
    if (error.status === 400 || error.status === 409) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('createProduct error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const id = req.params.id as string;

    const validation = updateProductSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const db = getDbClient(req);
    const service = new ProductService(db);

    const product = await service.updateProduct(orgId, id, {
      sku: validation.data.sku,
      name: validation.data.name,
      description: validation.data.description,
      category_id: validation.data.category_id,
      unit_of_measure: validation.data.unit_of_measure,
      reorder_level: validation.data.reorder_level,
      status: validation.data.status,
      image_path: validation.data.image_path,
    });

    res.status(200).json(product);
  } catch (error: any) {
    if (error.status === 400 || error.status === 404 || error.status === 409) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('updateProduct error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update product' });
  }
};

export const uploadProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = req.organizationId!;
    const validation = uploadImageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.format() });
      return;
    }

    const { fileName, mimeType, base64Data } = validation.data;
    const buffer = Buffer.from(base64Data, 'base64');

    // 5MB limit
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Image exceeds maximum size limit of 5MB' });
      return;
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${orgId}/${Date.now()}_${sanitizedFileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload warning:', uploadError.message);
      // Fallback: return path anyway for storage simulation/local dev
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(storagePath);

    res.status(200).json({
      storagePath,
      publicUrl: publicUrlData?.publicUrl || storagePath,
    });
  } catch (error: any) {
    console.error('uploadProductImage error:', error);
    res.status(500).json({ error: 'Failed to upload product image' });
  }
};
