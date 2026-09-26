import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import {
  Plus,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Warehouse as WarehouseIcon,
  Package,
  Info,
} from 'lucide-react';

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface LocationOption {
  id: string;
  name: string;
  code: string;
  warehouse_id: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit_of_measure: string;
}

interface TransferLineItem {
  id: string;
  product_id: string;
  source_location_id: string;
  destination_location_id: string;
  quantity: number;
}

export const TransferForm: React.FC = () => {
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [srcLocations, setSrcLocations] = useState<LocationOption[]>([]);
  const [dstLocations, setDstLocations] = useState<LocationOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form State
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferLineItem[]>([
    { id: '1', product_id: '', source_location_id: '', destination_location_id: '', quantity: 1 },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const loadMetadata = async () => {
      try {
        setLoadingMeta(true);
        const [whRes, prodRes] = await Promise.all([
          fetchApi('/api/warehouses?pageSize=100'),
          fetchApi('/api/products?pageSize=100'),
        ]);

        if (!ignore) {
          const whList = whRes.items || [];
          setWarehouses(whList);
          setProducts(prodRes.items || []);

          if (whList.length > 0) {
            const firstWh = whList[0];
            if (firstWh) {
              setSourceWarehouseId(firstWh.id);
              setDestinationWarehouseId(firstWh.id);
              const locRes = await fetchApi(`/api/locations?warehouseId=${firstWh.id}&pageSize=100`);
              setSrcLocations(locRes.items || []);
              setDstLocations(locRes.items || []);
            }
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load form prerequisites');
        }
      } finally {
        if (!ignore) {
          setLoadingMeta(false);
        }
      }
    };

    loadMetadata();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSourceWarehouseChange = async (whId: string) => {
    setSourceWarehouseId(whId);
    try {
      const locRes = await fetchApi(`/api/locations?warehouseId=${whId}&pageSize=100`);
      setSrcLocations(locRes.items || []);
      setItems((prev) => prev.map((item) => ({ ...item, source_location_id: '' })));
    } catch {
      setSrcLocations([]);
    }
  };

  const handleDestinationWarehouseChange = async (whId: string) => {
    setDestinationWarehouseId(whId);
    try {
      const locRes = await fetchApi(`/api/locations?warehouseId=${whId}&pageSize=100`);
      setDstLocations(locRes.items || []);
      setItems((prev) => prev.map((item) => ({ ...item, destination_location_id: '' })));
    } catch {
      setDstLocations([]);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        product_id: '',
        source_location_id: '',
        destination_location_id: '',
        quantity: 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof TransferLineItem, value: string | number) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = copy[index];
      if (current) {
        copy[index] = { ...current, [field]: value };
      }
      return copy;
    });
  };

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sourceWarehouseId || !destinationWarehouseId) {
      setError('Please select both source and destination warehouses');
      return;
    }

    if (items.length === 0) {
      setError('Transfer must contain at least one line item');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || !item.product_id) {
        setError(`Item #${i + 1} has no product selected`);
        return;
      }
      if (!item.source_location_id) {
        setError(`Item #${i + 1} has no source location selected`);
        return;
      }
      if (!item.destination_location_id) {
        setError(`Item #${i + 1} has no destination location selected`);
        return;
      }
      if (item.source_location_id === item.destination_location_id) {
        setError(`Item #${i + 1}: Source and destination locations cannot be identical`);
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        setError(`Item #${i + 1} quantity must be greater than zero`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        source_warehouse_id: sourceWarehouseId,
        destination_warehouse_id: destinationWarehouseId,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          product_id: it.product_id,
          source_location_id: it.source_location_id,
          destination_location_id: it.destination_location_id,
          quantity: Number(it.quantity),
        })),
      };

      const result = await fetchApi('/api/transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      navigate(`/app/transfers/${result.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer');
      setSaving(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 flex justify-center shadow-xs">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/transfers')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Stock Transfer</h1>
            <p className="text-sm text-gray-500">Plan internal movement between bins or facilities</p>
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 text-sm">
        <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Draft Transaction Rule:</span> Saving this transfer sets it to{' '}
          <span className="font-semibold">Draft</span> status. Neither source deduction nor destination addition will take place until the transfer is executed.
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Header Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-emerald-600" />
            Transfer Route
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Source Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => handleSourceWarehouseChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Destination Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={destinationWarehouseId}
                onChange={(e) => handleDestinationWarehouseChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Transfer Reason / Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Reason for transfer (e.g. Bin replenishment, inter-warehouse transit)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Line Items Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Transfer Items ({items.length} lines, {totalQuantity} units)
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 bg-gray-50/60 border border-gray-200 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                {/* Product Select */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Product <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={item.product_id}
                    onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Location */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    From Location <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={item.source_location_id}
                    onChange={(e) => handleItemChange(idx, 'source_location_id', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Source bin...</option>
                    {srcLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Location */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    To Location <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={item.destination_location_id}
                    onChange={(e) => handleItemChange(idx, 'destination_location_id', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Destination bin...</option>
                    {dstLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Qty <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 0))}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Delete button */}
                <div className="md:col-span-1 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/transfers')}
            className="px-5 py-2.5 border border-gray-200 text-gray-700 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            {saving ? <LoadingSpinner /> : 'Save Draft Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
};
