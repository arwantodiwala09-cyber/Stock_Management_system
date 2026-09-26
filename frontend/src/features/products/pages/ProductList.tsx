import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { Badge } from '../../../components/Badge';
import { Pagination } from '../../../components/Pagination';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit2,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  unit_of_measure: string;
  reorder_level: number;
  status: 'active' | 'inactive' | 'archived';
  image_path: string | null;
  categories: { id: string; name: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

export const ProductList: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Load category dropdown options
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await fetchApi('/api/categories?all=true');
        setCategories(data.items || []);
      } catch (e) {
        console.error('Failed to load categories for filter', e);
      }
    };
    fetchCategories();
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (categoryFilter !== 'all') queryParams.set('categoryId', categoryFilter);
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);
      queryParams.set('sortBy', sortBy);
      queryParams.set('sortOrder', sortOrder);
      queryParams.set('page', page.toString());
      queryParams.set('pageSize', '15');

      const data = await fetchApi(`/api/products?${queryParams.toString()}`);
      setProducts(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      case 'archived':
        return <Badge variant="warning">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Master catalog of all sellable, purchasable, and tracked items
          </p>
        </div>
        <button
          onClick={() => navigate('/app/products/new')}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
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
          <LoadingSpinner message="Loading products..." />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="No products found"
            description={
              search || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'No products match your active search or filter criteria.'
                : 'Create your first product to establish master inventory records.'
            }
            action={
              !search && categoryFilter === 'all' && statusFilter === 'all'
                ? { label: 'Add Product', onClick: () => navigate('/app/products/new') }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th
                    className="px-6 py-3.5 cursor-pointer hover:text-gray-900"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      Product
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3.5 cursor-pointer hover:text-gray-900"
                    onClick={() => toggleSort('sku')}
                  >
                    <div className="flex items-center gap-1.5">
                      SKU
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Unit</th>
                  <th
                    className="px-6 py-3.5 cursor-pointer hover:text-gray-900"
                    onClick={() => toggleSort('reorder_level')}
                  >
                    <div className="flex items-center gap-1.5">
                      Reorder Level
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {products.map((prod) => (
                  <tr
                    key={prod.id}
                    onClick={() => navigate(`/app/products/${prod.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {prod.image_path ? (
                          <img
                            src={prod.image_path}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover border border-gray-200 bg-gray-50"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{prod.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold border border-gray-200">
                        {prod.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {prod.categories?.name || <span className="text-gray-400 italic">Uncategorized</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {prod.unit_of_measure}
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {prod.reorder_level}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(prod.status)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/products/${prod.id}`);
                        }}
                        className="inline-flex items-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/products/${prod.id}/edit`);
                        }}
                        className="inline-flex items-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
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
