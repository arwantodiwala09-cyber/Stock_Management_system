import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi, ApiError } from '../../../services/api';
import { Badge } from '../../../components/Badge';
import { Modal } from '../../../components/Modal';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import {
  ArrowLeft,
  Warehouse as WarehouseIcon,
  MapPin,
  Boxes,
  Plus,
  Edit2,
  AlertCircle,
  Package,
  Layers,
  Power,
} from 'lucide-react';

interface Location {
  id: string;
  name: string;
  code: string;
  type: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface WarehouseDetailData {
  id: string;
  name: string;
  code: string;
  address: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  locations: Location[];
  stock_summary: {
    total_quantity: number;
    total_products: number;
  };
}

export const WarehouseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [warehouse, setWarehouse] = useState<WarehouseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Location modal state
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locModalMode, setLocModalMode] = useState<'create' | 'edit'>('create');
  const [selectedLoc, setSelectedLoc] = useState<Location | null>(null);
  const [locFormData, setLocFormData] = useState({
    name: '',
    code: '',
    type: 'storage',
    status: 'active',
  });
  const [locFormError, setLocFormError] = useState<string | null>(null);
  const [submittingLoc, setSubmittingLoc] = useState(false);

  const loadWarehouse = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await fetchApi(`/api/warehouses/${id}`);
      setWarehouse(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouse');
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
        const data = await fetchApi(`/api/warehouses/${id}`);
        if (!ignore) setWarehouse(data);
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load warehouse');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCurrent();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleOpenCreateLoc = () => {
    setLocModalMode('create');
    setSelectedLoc(null);
    setLocFormData({ name: '', code: '', type: 'storage', status: 'active' });
    setLocFormError(null);
    setIsLocModalOpen(true);
  };

  const handleOpenEditLoc = (loc: Location) => {
    setLocModalMode('edit');
    setSelectedLoc(loc);
    setLocFormData({
      name: loc.name,
      code: loc.code,
      type: loc.type,
      status: loc.status,
    });
    setLocFormError(null);
    setIsLocModalOpen(true);
  };

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locFormData.name.trim() || !locFormData.code.trim()) {
      setLocFormError('Location name and code are required');
      return;
    }

    try {
      setSubmittingLoc(true);
      setLocFormError(null);

      if (locModalMode === 'create') {
        await fetchApi(`/api/warehouses/${id}/locations`, {
          method: 'POST',
          body: JSON.stringify({
            name: locFormData.name.trim(),
            code: locFormData.code.trim().toUpperCase(),
            type: locFormData.type.trim() || 'storage',
            status: locFormData.status,
          }),
        });
      } else if (selectedLoc) {
        await fetchApi(`/api/locations/${selectedLoc.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: locFormData.name.trim(),
            code: locFormData.code.trim().toUpperCase(),
            type: locFormData.type.trim() || 'storage',
            status: locFormData.status,
          }),
        });
      }

      setIsLocModalOpen(false);
      loadWarehouse();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setLocFormError(err.message);
      } else if (err instanceof Error) {
        setLocFormError(err.message);
      } else {
        setLocFormError('Failed to save location');
      }
    } finally {
      setSubmittingLoc(false);
    }
  };

  const handleToggleLocStatus = async (loc: Location) => {
    const nextStatus = loc.status === 'active' ? 'inactive' : 'active';
    try {
      await fetchApi(`/api/locations/${loc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      loadWarehouse();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update location status');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading warehouse details..." />;
  }

  if (error || !warehouse) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/app/warehouses')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Warehouses
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
          <p className="font-semibold">Warehouse Error</p>
          <p className="text-sm mt-1">{error || 'Warehouse not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div>
        <button
          onClick={() => navigate('/app/warehouses')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Warehouses
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <WarehouseIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 font-bold border border-gray-200">
                {warehouse.code}
              </span>
              <Badge variant={warehouse.status === 'active' ? 'success' : 'neutral'}>
                {warehouse.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              {warehouse.address || 'No physical address recorded'}
            </p>
          </div>
        </div>

        {/* Basic Stock Summary Cards */}
        <div className="flex gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 min-w-32">
            <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-blue-500" />
              Total Items
            </div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {warehouse.stock_summary.total_quantity}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 min-w-32">
            <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              Products
            </div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {warehouse.stock_summary.total_products}
            </div>
          </div>
        </div>
      </div>

      {/* Locations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Locations</h2>
            <p className="text-xs text-gray-500">Aisles, racks, shelves, and bins in this warehouse</p>
          </div>
          <button
            onClick={handleOpenCreateLoc}
            className="inline-flex items-center justify-center px-3.5 py-1.5 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          {warehouse.locations.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-8 h-8" />}
              title="No locations configured"
              description="Create storage, receiving, or picking locations for this warehouse to assign stock."
              action={{ label: 'Add Location', onClick: handleOpenCreateLoc }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-6 py-3.5">Location Name</th>
                    <th className="px-6 py-3.5">Code</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {warehouse.locations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{loc.name}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold border border-gray-200">
                          {loc.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          {loc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={loc.status === 'active' ? 'success' : 'neutral'}>
                          {loc.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditLoc(loc)}
                          className="inline-flex items-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Location"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleLocStatus(loc)}
                          className={`inline-flex items-center p-1.5 rounded-lg transition-colors ${
                            loc.status === 'active'
                              ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={loc.status === 'active' ? 'Deactivate Location' : 'Activate Location'}
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
        </div>
      </div>

      {/* Create / Edit Location Modal */}
      <Modal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title={locModalMode === 'create' ? `Add Location to ${warehouse.name}` : 'Edit Location'}
      >
        <form onSubmit={handleLocSubmit} className="space-y-4">
          {locFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{locFormError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={locFormData.name}
              onChange={(e) => setLocFormData({ ...locFormData, name: e.target.value })}
              placeholder="e.g. Aisle 3 Shelf B, Bin 101"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={locFormData.code}
              onChange={(e) => setLocFormData({ ...locFormData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. A3-SB, BIN-101"
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Unique within this warehouse</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Type
            </label>
            <select
              value={locFormData.type}
              onChange={(e) => setLocFormData({ ...locFormData, type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="storage">Storage</option>
              <option value="receiving">Receiving</option>
              <option value="shipping">Shipping</option>
              <option value="picking">Picking</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={locFormData.status}
              onChange={(e) => setLocFormData({ ...locFormData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsLocModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingLoc}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submittingLoc ? 'Saving...' : locModalMode === 'create' ? 'Create Location' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
