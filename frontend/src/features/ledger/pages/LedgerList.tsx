import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../../../services/api';
import { Pagination } from '../../../components/Pagination';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import {
  FileSpreadsheet,
  Search,
  AlertCircle,
  Warehouse as WarehouseIcon,
  MapPin,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
} from 'lucide-react';

interface LedgerItem {
  id: string;
  organization_id: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  transaction_type: 'receipt' | 'delivery' | 'transfer' | 'adjustment';
  reference_type: string;
  reference_id: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  performed_by: string | null;
  created_at: string;
  products: { id: string; name: string; sku: string; unit_of_measure: string } | null;
  warehouses: { id: string; name: string; code: string } | null;
  locations: { id: string; name: string; code: string; type: string } | null;
}

interface FilterOption {
  id: string;
  name: string;
}

export const LedgerList: React.FC = () => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter options
  const [products, setProducts] = useState<FilterOption[]>([]);
  const [warehouses, setWarehouses] = useState<FilterOption[]>([]);

  // Active filters
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('all');
  const [warehouseId, setWarehouseId] = useState('all');
  const [transactionType, setTransactionType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Load filter options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [prodRes, whRes] = await Promise.all([
          fetchApi('/api/products?pageSize=100'),
          fetchApi('/api/warehouses?pageSize=100'),
        ]);
        setProducts(prodRes.items || []);
        setWarehouses(whRes.items || []);
      } catch {
        // Non-blocking
      }
    };
    loadOptions();
  }, []);

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        search: search.trim(),
      });

      if (productId !== 'all') params.append('productId', productId);
      if (warehouseId !== 'all') params.append('warehouseId', warehouseId);
      if (transactionType !== 'all') params.append('transactionType', transactionType);

      const res = await fetchApi(`/api/ledger?${params.toString()}`);
      setLedgerEntries(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock ledger entries');
    } finally {
      setLoading(false);
    }
  }, [page, search, productId, warehouseId, transactionType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLedger();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLedger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLedger();
  };

  const getTransactionBadge = (type: LedgerItem['transaction_type']) => {
    switch (type) {
      case 'receipt':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
            Receipt
          </span>
        );
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <ArrowUpFromLine className="w-3 h-3 text-rose-600" />
            Delivery
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <ArrowLeftRight className="w-3 h-3 text-blue-600" />
            Transfer
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <SlidersHorizontal className="w-3 h-3 text-amber-600" />
            Adjustment
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Ledger</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Permanent, append-only chronological journal of all inventory mutations
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-mono text-gray-600">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span>Immutable Audit Log</span>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by reason or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </form>

          {/* Transaction Type Filter */}
          <div className="w-full md:w-44">
            <select
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">All Transaction Types</option>
              <option value="receipt">Receipts</option>
              <option value="delivery">Deliveries</option>
              <option value="transfer">Transfers</option>
              <option value="adjustment">Adjustments</option>
            </select>
          </div>

          {/* Product Filter */}
          <div className="w-full md:w-48">
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div className="w-full md:w-44">
            <select
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
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
      ) : ledgerEntries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-xs">
          <EmptyState
            title="No ledger records found"
            description="The stock ledger records every validated receipt, delivery, transfer, or adjustment."
            icon={<FileSpreadsheet className="w-8 h-8 text-purple-600" />}
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">Warehouse / Location</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5 text-center">Previous</th>
                  <th className="px-6 py-3.5 text-center">Change</th>
                  <th className="px-6 py-3.5 text-center">New Qty</th>
                  <th className="px-6 py-3.5">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerEntries.map((row) => {
                  const change = Number(row.quantity_change);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{row.products?.name || '—'}</div>
                        <div className="text-xs text-gray-400 font-mono">{row.products?.sku || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-900 font-medium text-xs">
                          <WarehouseIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span>{row.warehouses?.name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{row.locations?.name || '—'} ({row.locations?.code})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTransactionBadge(row.transaction_type)}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-gray-600">
                        {row.previous_quantity}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {change > 0 && (
                          <span className="inline-flex items-center font-bold text-emerald-600 font-mono">
                            +{change}
                          </span>
                        )}
                        {change < 0 && (
                          <span className="inline-flex items-center font-bold text-rose-600 font-mono">
                            {change}
                          </span>
                        )}
                        {change === 0 && (
                          <span className="inline-flex items-center font-mono text-gray-500">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-gray-900">
                        {row.new_quantity}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                        {row.reason || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-6 py-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={20}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
