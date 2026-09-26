import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { Badge } from '../../../components/Badge';
import { Pagination } from '../../../components/Pagination';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import {
  Send,
  Plus,
  Search,
  Eye,
  AlertCircle,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react';

interface DeliveryItem {
  id: string;
  delivery_number: string;
  warehouse_id: string;
  customer_info: string | null;
  notes: string | null;
  status: 'draft' | 'completed' | 'cancelled';
  validated_at: string | null;
  created_at: string;
  warehouses: { id: string; name: string; code: string } | null;
  item_count: number;
  total_quantity: number;
}

export const DeliveryList: React.FC = () => {
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        search: search.trim(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const res = await fetchApi(`/api/deliveries?${params.toString()}`);
      setDeliveries(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeliveries();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDeliveries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDeliveries();
  };

  const getStatusBadge = (status: DeliveryItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Validated / Dispatched
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Ban className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Send className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Outbound stock dispatches to clients, sales orders, or partner hubs
          </p>
        </div>

        <button
          onClick={() => navigate('/app/deliveries/new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Delivery
        </button>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search delivery #, customer, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </form>

          <div className="flex items-center gap-3">
            <div className="w-40">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table & Content */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 flex justify-center shadow-xs">
          <LoadingSpinner />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-xs">
          <EmptyState
            title="No deliveries found"
            description="Create your first outbound delivery order to dispatch items from inventory."
            icon={<Send className="w-8 h-8 text-indigo-600" />}
            action={{
              label: 'Create Delivery',
              onClick: () => navigate('/app/deliveries/new'),
            }}
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Delivery #</th>
                  <th className="px-6 py-3.5">Warehouse</th>
                  <th className="px-6 py-3.5">Customer / Ref</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5">Total Qty</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/app/deliveries/${d.id}`)}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-blue-600">
                      {d.delivery_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        <WarehouseIcon className="w-3.5 h-3.5 text-gray-400" />
                        {d.warehouses ? `${d.warehouses.name} (${d.warehouses.code})` : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {d.customer_info || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {d.item_count} lines
                    </td>
                    <td className="px-6 py-4 font-bold text-rose-600">
                      -{d.total_quantity}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(d.status)}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/app/deliveries/${d.id}`)}
                        className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-blue-600 rounded-lg transition-colors"
                        title="View Delivery"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-6 py-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={10}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
