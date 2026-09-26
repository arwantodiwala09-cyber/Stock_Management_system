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

interface AdjustmentDetailData {
  id: string;
  adjustment_number: string;
  warehouse_id: string;
  reason: string;
  status: 'draft' | 'completed' | 'cancelled';
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  created_by: string;
  warehouses: { id: string; name: string; code: string } | null;
  items: Array<{
    id: string;
    product_id: string;
    location_id: string;
    system_quantity: number;
    physical_quantity: number;
    difference: number;
    products: { id: string; name: string; sku: string; unit_of_measure: string } | null;
    locations: { id: string; name: string; code: string; type: string } | null;
  }>;
}

export const AdjustmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeOrganization } = useAuthStore();

  const [adjustment, setAdjustment] = useState<AdjustmentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const fetchAdjustment = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi(`/api/adjustments/${id}`);
      setAdjustment(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch adjustment details');
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
        const data = await fetchApi(`/api/adjustments/${id}`);
        if (!ignore) setAdjustment(data);
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load adjustment');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCurrent();
    return () => {
      ignore = true;
    };
  }, [id]);

  const canApprove = activeOrganization?.role === 'Organization Admin' || activeOrganization?.role === 'Inventory Manager';

  const handleApprove = async () => {
    if (!id) return;
    try {
      setApproving(true);
      setApprovalError(null);
      await fetchApi(`/api/adjustments/${id}/approve`, {
        method: 'POST',
      });
      setIsModalOpen(false);
      await fetchAdjustment();
    } catch (err: unknown) {
      setApprovalError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 flex justify-center shadow-xs">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !adjustment) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/app/adjustments')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Adjustments
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error || 'Adjustment not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/adjustments')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-gray-900">{adjustment.adjustment_number}</h1>
              {adjustment.status === 'completed' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approved & Applied
                </span>
              )}
              {adjustment.status === 'draft' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  Draft (Pending Approval)
                </span>
              )}
              {adjustment.status === 'cancelled' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  <Ban className="w-3.5 h-3.5" />
                  Cancelled
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Stock Reconciliation • Created on {new Date(adjustment.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {adjustment.status === 'completed' && (
            <button
              onClick={() => navigate('/app/ledger')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium rounded-xl shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              View Stock Ledger
            </button>
          )}

          {adjustment.status === 'draft' && (
            <>
              {canApprove ? (
                <button
                  onClick={() => {
                    setApprovalError(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Adjustment
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Approval requires Inventory Manager role</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Audited Warehouse</span>
          <div className="mt-2 flex items-center gap-2 text-gray-900 font-medium">
            <WarehouseIcon className="w-4 h-4 text-amber-600" />
            <span>{adjustment.warehouses ? `${adjustment.warehouses.name} (${adjustment.warehouses.code})` : '—'}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Audit Reason</span>
          <div className="mt-2 text-gray-900 font-medium">
            {adjustment.reason}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Approval State</span>
          <div className="mt-2 text-sm text-gray-700">
            {adjustment.approved_at ? (
              <span className="text-emerald-700 font-medium">
                Approved on {new Date(adjustment.approved_at).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-amber-700 font-medium">Pending Manager Authorization</span>
            )}
          </div>
        </div>
      </div>

      {/* Items Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            Reconciled Line Items ({adjustment.items?.length || 0} lines)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5 text-center">System Qty</th>
                <th className="px-6 py-3.5 text-center">Physical Qty</th>
                <th className="px-6 py-3.5 text-right">Variance / Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adjustment.items?.map((item, index) => {
                const diff = Number(item.difference);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.products?.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{item.products?.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-mono">
                        {item.locations ? `${item.locations.name} (${item.locations.code})` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-medium text-gray-700">
                      {item.system_quantity}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-gray-900">
                      {item.physical_quantity}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {diff > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                          +{diff}
                        </span>
                      )}
                      {diff < 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 font-mono">
                          {diff}
                        </span>
                      )}
                      {diff === 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 font-mono">
                          0
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !approving && setIsModalOpen(false)}
        title="Approve Stock Adjustment"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to approve Adjustment <strong className="text-gray-900">{adjustment.adjustment_number}</strong>?
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              Stock Correction Application
            </div>
            <p>• The system stock will be atomically updated to match the physical count audited.</p>
            <p>• Permanent Stock Ledger adjustment entries reflecting the variance will be created.</p>
            <p>• This action is permanent and cannot be re-applied or edited.</p>
          </div>

          {approvalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{approvalError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={approving}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={approving}
              onClick={handleApprove}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              {approving ? <LoadingSpinner /> : 'Yes, Approve Adjustment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
