import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi, ApiError } from '../../../services/api';
import { Badge } from '../../../components/Badge';
import { Modal } from '../../../components/Modal';
import { Pagination } from '../../../components/Pagination';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { Warehouse as WarehouseIcon, Plus, Search, Edit2, AlertCircle, Eye, Power } from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  status: 'active' | 'inactive';
  location_count: number;
  created_at: string;
}

export const WarehouseList: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', address: '', status: 'active' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);
      queryParams.set('page', page.toString());
      queryParams.set('pageSize', '15');

      const data = await fetchApi(`/api/warehouses?${queryParams.toString()}`);
      setWarehouses(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWarehouses();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadWarehouses]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedWarehouse(null);
    setFormData({ name: '', code: '', address: '', status: 'active' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wh: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('edit');
    setSelectedWarehouse(wh);
    setFormData({
      name: wh.name,
      code: wh.code,
      address: wh.address || '',
      status: wh.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Name and code are required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      if (modalMode === 'create') {
        await fetchApi('/api/warehouses', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            address: formData.address.trim() || null,
            status: formData.status,
          }),
        });
      } else if (selectedWarehouse) {
        await fetchApi(`/api/warehouses/${selectedWarehouse.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            address: formData.address.trim() || null,
            status: formData.status,
          }),
        });
      }

      setIsModalOpen(false);
      loadWarehouses();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Operation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (wh: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = wh.status === 'active' ? 'inactive' : 'active';
    try {
      await fetchApi(`/api/warehouses/${wh.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      loadWarehouses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update warehouse status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Warehouses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage physical inventory storage facilities and location trees
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-xs text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by warehouse name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-medium text-gray-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading warehouses..." />
        ) : warehouses.length === 0 ? (
          <EmptyState
            icon={<WarehouseIcon className="w-8 h-8" />}
            title="No warehouses found"
            description={search ? "No warehouses match your search query." : "Create your first warehouse to begin managing locations and stock."}
            action={!search ? { label: 'Add Warehouse', onClick: handleOpenCreate } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-3.5">Warehouse</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Address</th>
                  <th className="px-6 py-3.5 text-center">Locations</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {warehouses.map((wh) => (
                  <tr
                    key={wh.id}
                    onClick={() => navigate(`/app/warehouses/${wh.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {wh.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold border border-gray-200">
                        {wh.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                      {wh.address || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {wh.location_count} {wh.location_count === 1 ? 'location' : 'locations'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={wh.status === 'active' ? 'success' : 'neutral'}>
                        {wh.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/warehouses/${wh.id}`);
                        }}
                        className="inline-flex items-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleOpenEdit(wh, e)}
                        className="inline-flex items-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Warehouse"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleToggleStatus(wh, e)}
                        className={`inline-flex items-center p-1.5 rounded-lg transition-colors ${
                          wh.status === 'active'
                            ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={wh.status === 'active' ? 'Deactivate Warehouse' : 'Activate Warehouse'}
                      >
                        <Power className="w-4 h-4" />
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

      {/* Create / Edit Warehouse Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create New Warehouse' : 'Edit Warehouse'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Central Distribution Center"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. WH-MAIN, CDC-01"
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier within organization (alphanumeric, hyphens)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address / Details
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Physical address or facility location notes..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Warehouse' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
