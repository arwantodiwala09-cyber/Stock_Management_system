import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { EmptyState } from '../../../components/EmptyState';
import {
  ArrowLeft,
  Package,
  Edit2,
  Warehouse as WarehouseIcon,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface StockDistributionItem {
  id: string;
  quantity: number;
  warehouse: {
    id: string;
    name: string;
    code: string;
  } | null;
  location: {
    id: string;
    name: string;
    code: string;
    type: string;
  } | null;
}

interface ProductDetailData {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit_of_measure: string;
  reorder_level: number;
  status: 'active' | 'inactive' | 'archived';
  image_path: string | null;
  created_at: string;
  updated_at: string;
  categories: { id: string; name: string } | null;
  stock_summary: {
    total_quantity: number;
    reorder_level: number;
    status: 'Healthy' | 'Low Stock' | 'Out of Stock';
  };
  stock_distribution: StockDistributionItem[];
}

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    let ignore = false;
    const fetchCurrent = async () => {
      if (!id) return;
      try {
        setError(null);
        const data = await fetchApi(`/api/products/${id}`);
        if (!ignore) setProduct(data);
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCurrent();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading product information..." />;
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/app/products')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
          <p className="font-semibold">Product Not Found</p>
          <p className="text-sm mt-1">{error || 'Unable to retrieve product details.'}</p>
        </div>
      </div>
    );
  }

  const getStockHealthBadge = (status: string) => {
    switch (status) {
      case 'Healthy':
        return (
          <Badge variant="success" className="gap-1 py-1 px-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy
          </Badge>
        );
      case 'Low Stock':
        return (
          <Badge variant="warning" className="gap-1 py-1 px-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock
          </Badge>
        );
      case 'Out of Stock':
        return (
          <Badge variant="danger" className="gap-1 py-1 px-3">
            <XCircle className="w-3.5 h-3.5" />
            Out of Stock
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/products')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </button>
        <button
          onClick={() => navigate(`/app/products/${product.id}/edit`)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors gap-2 shadow-xs"
        >
          <Edit2 className="w-4 h-4" />
          Edit Product
        </button>
      </div>

      {/* Main Product Info Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {product.image_path ? (
            <img
              src={product.image_path}
              alt={product.name}
              className="w-28 h-28 rounded-xl object-cover border border-gray-200 shadow-xs"
            />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
              <Package className="w-12 h-12" />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold border border-gray-200">
                {product.sku}
              </span>
              <Badge variant={product.status === 'active' ? 'success' : 'neutral'}>
                {product.status.toUpperCase()}
              </Badge>
            </div>

            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
              {product.description || <span className="text-gray-400 italic">No description provided.</span>}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100 text-sm">
              <div>
                <span className="text-xs text-gray-400 block font-medium">Category</span>
                <span className="font-semibold text-gray-800">
                  {product.categories?.name || 'Uncategorized'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Unit of Measure</span>
                <span className="font-semibold text-gray-800 font-mono">
                  {product.unit_of_measure}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Reorder Level</span>
                <span className="font-semibold text-gray-800">
                  {product.reorder_level} {product.unit_of_measure}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium">Master ID</span>
                <span className="font-mono text-xs text-gray-500 truncate block" title={product.id}>
                  {product.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total On Hand Quantity
          </div>
          <div className="text-3xl font-extrabold text-gray-900 mt-2">
            {product.stock_summary.total_quantity}{' '}
            <span className="text-base font-medium text-gray-500">{product.unit_of_measure}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Aggregated across all warehouses</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Threshold Reorder Level
          </div>
          <div className="text-3xl font-extrabold text-gray-900 mt-2">
            {product.stock_summary.reorder_level}{' '}
            <span className="text-base font-medium text-gray-500">{product.unit_of_measure}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimum safety inventory target</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Inventory Health Status
          </div>
          <div className="mt-2">
            {getStockHealthBadge(product.stock_summary.status)}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {product.stock_summary.status === 'Healthy'
              ? 'Stock is currently above reorder threshold.'
              : product.stock_summary.status === 'Low Stock'
              ? 'Quantity is at or below the reorder level!'
              : 'Product is completely depleted from inventory!'}
          </p>
        </div>
      </div>

      {/* Stock Distribution by Location */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Current Stock Distribution</h2>
          <p className="text-xs text-gray-500">Live storage breakdown by warehouse and location bin</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          {product.stock_distribution.length === 0 ? (
            <EmptyState
              icon={<WarehouseIcon className="w-8 h-8" />}
              title="No live stock records"
              description="No stock has been placed in any location for this product yet. Stock will be recorded through receipts and transfers in Phase 5."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium">
                  <tr>
                    <th className="px-6 py-3.5">Warehouse</th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5">Location Type</th>
                    <th className="px-6 py-3.5 text-right">Available Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {product.stock_distribution.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{item.warehouse?.name || 'Unknown'}</span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {item.warehouse?.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-800">{item.location?.name || 'Unknown'}</span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {item.location?.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          {item.location?.type || 'storage'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                        {item.quantity} {product.unit_of_measure}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
