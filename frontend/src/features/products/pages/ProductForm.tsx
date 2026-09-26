import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchApi, ApiError } from '../../../services/api';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ArrowLeft, AlertCircle, Upload, Check } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
}

export const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('pcs');
  const [reorderLevel, setReorderLevel] = useState(0);
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived'>('active');
  const [imagePath, setImagePath] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchApi('/api/categories?all=true');
        setCategories(data.items || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadProduct = async () => {
      try {
        setInitialLoading(true);
        const data = await fetchApi(`/api/products/${id}`);
        setName(data.name || '');
        setSku(data.sku || '');
        setDescription(data.description || '');
        setCategoryId(data.category_id || '');
        setUnitOfMeasure(data.unit_of_measure || 'pcs');
        setReorderLevel(Number(data.reorder_level || 0));
        setStatus(data.status || 'active');
        setImagePath(data.image_path || '');
      } catch (err: unknown) {
        setServerError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setInitialLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!sku.trim()) errs.sku = 'SKU is required';
    if (reorderLevel < 0) errs.reorderLevel = 'Reorder level must be 0 or higher';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please select a JPG, PNG, or WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image exceeds 5MB size limit');
      return;
    }

    try {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const res = await fetchApi('/api/products/upload-image', {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type,
              base64Data,
            }),
          });
          setImagePath(res.publicUrl || res.storagePath);
        } catch (uploadErr) {
          console.error('Image upload failed', uploadErr);
          // Set as object URL for preview if upload endpoint failed
          setImagePath(URL.createObjectURL(file));
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setServerError(null);
      setSuccessMsg(null);

      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        description: description.trim() || null,
        category_id: categoryId || null,
        unit_of_measure: unitOfMeasure.trim() || 'pcs',
        reorder_level: Number(reorderLevel),
        status,
        image_path: imagePath.trim() || null,
      };

      if (isEdit) {
        await fetchApi(`/api/products/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setSuccessMsg('Product updated successfully!');
      } else {
        const created = await fetchApi('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccessMsg('Product created successfully!');
        setTimeout(() => navigate(`/app/products/${created.id}`), 600);
        return;
      }

      setTimeout(() => navigate(`/app/products/${id}`), 800);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred while saving product');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner message="Loading product information..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div>
        <button
          onClick={() => navigate(isEdit ? `/app/products/${id}` : '/app/products')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEdit ? 'Back to Product Details' : 'Back to Products'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEdit ? 'Edit Product' : 'Create Product'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? 'Update catalog specifications and inventory parameters'
              : 'Add a new product to your organization catalog'}
          </p>
        </div>
      </div>

      {/* Notifications */}
      {serverError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-3">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ergonomic Office Chair"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU (Stock Keeping Unit) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. CHAIR-ERG-01"
              className={`w-full px-3 py-2 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.sku ? 'border-rose-400 bg-rose-50/20' : 'border-gray-300'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">Must be unique within your organization</p>
            {errors.sku && <p className="text-xs text-rose-600 mt-1">{errors.sku}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Category (None)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit of Measure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit of Measure <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              placeholder="e.g. pcs, kg, box, m"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reorder Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={reorderLevel}
              onChange={(e) => setReorderLevel(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.reorderLevel ? 'border-rose-400 bg-rose-50/20' : 'border-gray-300'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">Triggers low-stock status when on-hand quantity falls below or equals this</p>
            {errors.reorderLevel && <p className="text-xs text-rose-600 mt-1">{errors.reorderLevel}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'archived')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Product Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors gap-1.5">
                <Upload className="w-4 h-4 text-gray-500" />
                <span>{uploadingImage ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageFileChange}
                  disabled={uploadingImage}
                />
              </label>
              <input
                type="text"
                placeholder="Or paste image URL / storage path"
                value={imagePath}
                onChange={(e) => setImagePath(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {imagePath && (
              <div className="mt-2 flex items-center gap-2">
                <img src={imagePath} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                <span className="text-xs text-gray-500">Image attached</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed specifications, vendor codes, dimensions, or handling instructions..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/app/products/${id}` : '/app/products')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};
