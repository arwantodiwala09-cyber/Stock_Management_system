import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { useAuthStore } from '../../auth/store/authStore';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { Modal } from '../../../components/Modal';
import {
  ArrowLeftRight,
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

interface TransferDetailData {
  id: string;
  transfer_number: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  notes: string | null;
  status: 'draft' | 'completed' | 'cancelled';
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  created_by: string;
  source_warehouse: { id: string; name: string; code: string } | null;
  destination_warehouse: { id: string; name: string; code: string } | null;
  items: Array<{
    id: string;
    product_id: string;
    source_location_id: string;
    destination_location_id: string;
    quantity: number;
    products: { id: string; name: string; sku: string; unit_of_measure: string } | null;
    source_location: { id: string; name: string; code: string } | null;
    destination_location: { id: string; name: string; code: string } | null;
  }>;
}

export const TransferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeOrganization } = useAuthStore();

  const [transfer, setTransfer] = useState<TransferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Completion modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const fetchTransfer = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi(`/api/transfers/${id}`);
      setTransfer(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transfer details');
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
        const data = await fetchApi(`/api/transfers/${id}`);
        if (!ignore) setTransfer(data);
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load transfer');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCurrent();
    return () => {
      ignore = true;
    };
  }, [id]);

  const canComplete = activeOrganization?.role === 'Organization Admin' || activeOrganization?.role === 'Inventory Manager';

  const handleComplete = async () => {
    if (!id) return;
    try {
      setCompleting(true);
      setCompletionError(null);
      await fetchApi(`/api/transfers/${id}/complete`, {
        method: 'POST',
      });
      setIsModalOpen(false);
      await fetchTransfer();
    } catch (err: unknown) {
      setCompletionError(err instanceof Error ? err.message : 'Transfer completion failed');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 flex justify-center shadow-xs">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/app/transfers')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transfers
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error || 'Transfer not found'}</span>
        </div>
      </div>
    );
  }

  const totalQuantity = (transfer.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/transfers')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-gray-900">{transfer.transfer_number}</h1>
              {transfer.status === 'completed' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              )}
              {transfer.status === 'draft' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  Draft (Pending Movement)
                </span>
              )}
              {transfer.status === 'cancelled' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  <Ban className="w-3.5 h-3.5" />
                  Cancelled
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Stock Transfer • Created on {new Date(transfer.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {transfer.status === 'completed' && (
            <button
              onClick={() => navigate('/app/ledger')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              View Stock Ledger
            </button>
          )}

          {transfer.status === 'draft' && (
            <>
              {canComplete ? (
                <button
                  onClick={() => {
                    setCompletionError(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Execute Transfer
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Execution requires Inventory Manager role</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Route Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">From Warehouse</span>
          <div className="mt-2 flex items-center gap-2 text-gray-900 font-medium">
            <WarehouseIcon className="w-4 h-4 text-rose-600" />
            <span>{transfer.source_warehouse ? `${transfer.source_warehouse.name} (${transfer.source_warehouse.code})` : '—'}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">To Warehouse</span>
          <div className="mt-2 flex items-center gap-2 text-gray-900 font-medium">
            <WarehouseIcon className="w-4 h-4 text-emerald-600" />
            <span>{transfer.destination_warehouse ? `${transfer.destination_warehouse.name} (${transfer.destination_warehouse.code})` : '—'}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Transfer Status</span>
          <div className="mt-2 text-sm text-gray-700">
            {transfer.completed_at ? (
              <span className="text-emerald-700 font-medium">
                Completed on {new Date(transfer.completed_at).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-amber-700 font-medium">Draft (Requires Execution)</span>
            )}
          </div>
        </div>
      </div>

      {/* Notes if available */}
      {transfer.notes && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Transfer Reason / Remarks</span>
          <p className="mt-1 text-sm text-gray-700">{transfer.notes}</p>
        </div>
      )}

      {/* Items Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Transfer Items ({transfer.items?.length || 0} lines)
          </h2>
          <span className="text-sm font-bold text-gray-900">
            Total Units: {totalQuantity}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Source Location</th>
                <th className="px-6 py-3.5">Destination Location</th>
                <th className="px-6 py-3.5 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfer.items?.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">{index + 1}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.products?.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{item.products?.sku}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-rose-50 text-rose-800 rounded-md text-xs font-mono">
                      {item.source_location ? `${item.source_location.name} (${item.source_location.code})` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded-md text-xs font-mono">
                      {item.destination_location ? `${item.destination_location.name} (${item.destination_location.code})` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    {item.quantity} {item.products?.unit_of_measure || 'pcs'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !completing && setIsModalOpen(false)}
        title="Execute Internal Stock Transfer"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to execute Transfer <strong className="text-gray-900">{transfer.transfer_number}</strong>?
          </p>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
              Dual-Atomic Movement
            </div>
            <p>
              • Source stock will decrease by <strong className="text-rose-700">-{totalQuantity} units</strong>.
            </p>
            <p>
              • Destination stock will increase by <strong className="text-emerald-700">+{totalQuantity} units</strong>.
            </p>
            <p>• If source location stock is insufficient, the entire transfer will be rejected safely.</p>
            <p>• Two paired Stock Ledger entries will be created atomically for full audit trail.</p>
          </div>

          {completionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{completionError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={completing}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={completing}
              onClick={handleComplete}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              {completing ? <LoadingSpinner /> : 'Yes, Complete Transfer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
