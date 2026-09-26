import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../../../services/api';
import { Badge } from '../../../components/Badge';
import { Pagination } from '../../../components/Pagination';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import {
  Boxes,
  Search,
  Warehouse as WarehouseIcon,
  MapPin,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface StockRow {
  id: string;
  quantity: number;
  reorder_level: number;
  status: 'Healthy' | 'Low Stock' | 'Out of Stock';
  statusKey: 'healthy' | 'low_stock' | 'out_of_stock';
  product: {
    id: string;
    sku: string;
    name: string;
    unit_of_measure: string;
    status: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  location: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
  updated_at: string;
}

interface WarehouseOption {
  id: string;
  name: string;
}

interface LocationOption {
  id: string;
  name: string;
}

export const StockList: React.FC = () => {
  const [stockRecords, setStockRecords] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'low_stock' | 'out_of_stock'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Load warehouses for filter
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const data = await fetchApi('/api/warehouses?all=true');
        setWarehouses(data.items || []);
      } catch (err) {
        console.error('Failed to load warehouses for filter', err);
      }
    };
    fetchWarehouses();
  }, []);

  // Load locations when warehouse changes or on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const url = warehouseFilter !== 'all'
          ? `/api/warehouses/${warehouseFilter}/locations`
          : '/api/locations?all=true';
        const data = await fetchApi(url);
        setLocations(Array.isArray(data) ? data : data.items || []);
      } catch (err) {
        console.error('Failed to load locations for filter', err);
      }
    };
    fetchLocations();
  }, [warehouseFilter]);

  const loadStock = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (warehouseFilter !== 'all') queryParams.set('warehouseId', warehouseFilter);
      if (locationFilter !== 'all') queryParams.set('locationId', locationFilter);
      if (statusFilter !== 'all') queryParams.set('stockStatus', statusFilter);
      queryParams.set('page', page.toString());
      queryParams.set('pageSize', '15');

      const data = await fetchApi(`/api/stock?${queryParams.toString()}`);
      setStockRecords(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [search, warehouseFilter, locationFilter, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStock();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadStock]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Healthy':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Healthy
          </Badge>
        );
      case 'Low Stock':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </Badge>
        );
      case 'Out of Stock':
        return (
          <Badge variant="danger" className="gap-1">
            <XCircle className="w-3 h-3" />
            Out of Stock
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Current Stock</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time read-only inventory levels per product, warehouse, and location bin
          </p>
        </div>
        <div className="text-xs text-gray-400 italic bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
          Stock mutations are strictly governed by ledger operations (Phase 5)
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="relative w-full xl:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search product, SKU, location..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Warehouse Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Warehouse:</span>
            <select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setLocationFilter('all');
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Location:</span>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Health:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'healthy' | 'low_stock' | 'out_of_stock');
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading stock inventory..." />
        ) : stockRecords.length === 0 ? (
          <EmptyState
            icon={<Boxes className="w-8 h-8" />}
            title="No stock records are currently available"
            description={
              search || warehouseFilter !== 'all' || locationFilter !== 'all' || statusFilter !== 'all'
                ? 'No stock matches your active filter criteria.'
                : 'Stock records will appear here as inventory is received through purchase receipts or initial adjustments.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">SKU</th>
                  <th className="px-6 py-3.5">Warehouse</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5 text-right">Available Qty</th>
                  <th className="px-6 py-3.5 text-right">Reorder Level</th>
                  <th className="px-6 py-3.5">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {stockRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {row.product.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold border border-gray-200">
                        {row.product.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <WarehouseIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium text-gray-800">{row.warehouse.name}</span>
                        <span className="font-mono text-xs text-gray-400">({row.warehouse.code})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-700">{row.location.name}</span>
                        <span className="font-mono text-xs text-gray-400">({row.location.code})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                      {row.quantity} <span className="text-xs font-normal text-gray-500">{row.product.unit_of_measure}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-600">
                      {row.reorder_level} <span className="text-xs font-normal text-gray-400">{row.product.unit_of_measure}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(row.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={15}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>
    </div>
  );
};
