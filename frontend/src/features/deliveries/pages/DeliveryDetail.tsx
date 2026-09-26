import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { Modal } from '../../../components/Modal';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Ban,
  Warehouse as WarehouseIcon,
  Package,
  AlertCircle,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';

interface DeliveryDetailData {
  id: string;
  delivery_number: string;
  warehouse_id: string;
  customer_info: string | null;
  notes: string | null;
  status: 'draft' | 'completed' | 'cancelled';
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
  created_by: string;
  warehouses: { id: string; name: string; code: string } | null;
  items: Array<{
    id: string;
    product_id: string;
    location_id: string;
    quantity: number;
    products: { id: string; name: string; sku: string; unit_of_measure: string } | null;
    locations: { id: string; name: string; code: string; type: string } | null;
  }>;
}

export const DeliveryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeOrganization } = useAuthStore();

  const [delivery, setDelivery] = useState<DeliveryDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchDelivery = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi(`/api/deliveries/${id}`);
      setDelivery(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;
    const fetchCurrent = async () => {
      if (!id) return;
      try {
        setError(null);
        const data = await fetchApi(`/api/deliveries/${id}`);
        if (!ignore) setDelivery(data);
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load delivery');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCurrent();
    return () => {
      ignore = true;
    };
  }, [id]);

  const canValidate = activeOrganization?.role === 'Organization Admin' || activeOrganization?.role === 'Inventory Manager';

  const handleValidate = async () => {
    if (!id) return;
    try {
      setValidating(true);
      setValidationError(null);
      await fetchApi(`/api/deliveries/${id}/validate`, {
        method: 'POST',
      });
      setIsModalOpen(false);
      await fetchDelivery();
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 flex justify-center shadow-xs">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/app/deliveries')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deliveries
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error || 'Delivery not found'}</span>
        </div>
      </div>
    );
  }

  const totalQuantity = (delivery.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/deliveries')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-gray-900">{delivery.delivery_number}</h1>
              {delivery.status === 'completed' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Validated & Dispatched
                </span>
              )}
              {delivery.status === 'draft' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  Draft (Pending Validation)
                </span>
              )}
              {delivery.status === 'cancelled' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  <Ban className="w-3.5 h-3.5" />
                  Cancelled
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Outbound Dispatch • Created on {new Date(delivery.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {delivery.status === 'completed' && (
            <button
              onClick={() => navigate('/app/ledger')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              View Stock Ledger
            </button>
          )}

          {delivery.status === 'draft' && (
            <>
              {canValidate ? (
                <button
                  onClick={() => {
                    setValidationError(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Validate & Dispatch
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Validation requires Inventory Manager role</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Origin Warehouse</span>
          <div className="mt-2 flex items-center gap-2 text-gray-900 font-medium">
            <WarehouseIcon className="w-4 h-4 text-indigo-600" />
            <span>{delivery.warehouses ? `${delivery.warehouses.name} (${delivery.warehouses.code})` : '—'}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Customer / Order Reference</span>
          <div className="mt-2 text-gray-900 font-medium">
            {delivery.customer_info || <span className="text-gray-400 italic">No reference specified</span>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Dispatch State</span>
          <div className="mt-2 text-sm text-gray-700">
            {delivery.validated_at ? (
              <span className="text-emerald-700 font-medium">
                Dispatched on {new Date(delivery.validated_at).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-amber-700 font-medium">Draft (Requires Manager Approval)</span>
            )}
          </div>
        </div>
      </div>

      {/* Notes if available */}
      {delivery.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Notes / Shipping Instructions</span>
          <p className="mt-1 text-sm text-gray-700">{delivery.notes}</p>
        </div>
      )}

      {/* Items Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            Line Items to Dispatch ({delivery.items?.length || 0} lines)
          </h2>
          <span className="text-sm font-bold text-gray-900">
            Total Units: -{totalQuantity}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Product SKU</th>
                <th className="px-6 py-3.5">Product Name</th>
                <th className="px-6 py-3.5">Source Location</th>
                <th className="px-6 py-3.5 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {delivery.items?.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">{index + 1}</td>
                  <td className="px-6 py-4 font-mono font-medium text-gray-900">
                    {item.products?.sku || '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {item.products?.name || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-mono">
                      {item.locations ? `${item.locations.name} (${item.locations.code})` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-rose-600">
                    -{item.quantity} {item.products?.unit_of_measure || 'pcs'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !validating && setIsModalOpen(false)}
        title="Confirm Outbound Delivery"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to validate and dispatch Delivery <strong className="text-gray-900">{delivery.delivery_number}</strong>?
          </p>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Stock Deduction Pre-Check
            </div>
            <p>
              • Physical inventory will be deducted by <strong className="text-rose-900">-{totalQuantity} units</strong>.
            </p>
            <p>• The database engine will enforce strict availability checks. If any item has insufficient stock, the entire transaction will roll back safely.</p>
            <p>• Permanent Stock Ledger audit records will be created immediately.</p>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={validating}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validating}
              onClick={handleValidate}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              {validating ? <LoadingSpinner /> : 'Yes, Dispatch Delivery'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
