import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../features/auth/components/AuthProvider';
import { ProtectedRoute, PublicRoute } from '../features/auth/components/ProtectedRoute';
import { Login } from '../features/auth/pages/Login';
import { Register } from '../features/auth/pages/Register';
import { ForgotPassword } from '../features/auth/pages/ForgotPassword';
import { SelectOrg } from '../features/auth/pages/SelectOrg';

// Phase 4 Pages
import { CategoryList } from '../features/categories/pages/CategoryList';
import { WarehouseList } from '../features/warehouses/pages/WarehouseList';
import { WarehouseDetail } from '../features/warehouses/pages/WarehouseDetail';
import { ProductList } from '../features/products/pages/ProductList';
import { ProductForm } from '../features/products/pages/ProductForm';
import { ProductDetail } from '../features/products/pages/ProductDetail';
import { StockList } from '../features/stock/pages/StockList';

// Phase 5 Pages
import { ReceiptList } from '../features/receipts/pages/ReceiptList';
import { ReceiptForm } from '../features/receipts/pages/ReceiptForm';
import { ReceiptDetail } from '../features/receipts/pages/ReceiptDetail';

import { DeliveryList } from '../features/deliveries/pages/DeliveryList';
import { DeliveryForm } from '../features/deliveries/pages/DeliveryForm';
import { DeliveryDetail } from '../features/deliveries/pages/DeliveryDetail';

import { TransferList } from '../features/transfers/pages/TransferList';
import { TransferForm } from '../features/transfers/pages/TransferForm';
import { TransferDetail } from '../features/transfers/pages/TransferDetail';

import { AdjustmentList } from '../features/adjustments/pages/AdjustmentList';
import { AdjustmentForm } from '../features/adjustments/pages/AdjustmentForm';
import { AdjustmentDetail } from '../features/adjustments/pages/AdjustmentDetail';

import { LedgerList } from '../features/ledger/pages/LedgerList';

// Auth & Icons
import { useAuthStore } from '../features/auth/store/authStore';
import { supabase } from '../utils/supabase';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Warehouse as WarehouseIcon,
  Boxes,
  Inbox,
  Send,
  ArrowLeftRight,
  SlidersHorizontal,
  FileSpreadsheet,
  LogOut,
  Building2,
  ChevronDown,
} from 'lucide-react';

// Dashboard Overview
const Dashboard = () => {
  const { activeOrganization } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-xs">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Welcome to <span className="font-semibold text-gray-800">{activeOrganization?.name || 'StockSense'}</span>. Phase 5 Inventory Engine & Stock Mutations are active.
        </p>

        {/* Master Data Section */}
        <div className="mt-6">
          <h2 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">Inventory Master Data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => navigate('/app/products')}
              className="p-5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 text-blue-700 font-semibold">
                <Package className="w-5 h-5" />
                Products
              </div>
              <p className="text-xs text-blue-600/80 mt-1">Catalog, SKUs, and reorder levels</p>
            </div>

            <div
              onClick={() => navigate('/app/categories')}
              className="p-5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 text-indigo-700 font-semibold">
                <FolderTree className="w-5 h-5" />
                Categories
              </div>
              <p className="text-xs text-indigo-600/80 mt-1">Inventory taxonomy hierarchy</p>
            </div>

            <div
              onClick={() => navigate('/app/warehouses')}
              className="p-5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 text-emerald-700 font-semibold">
                <WarehouseIcon className="w-5 h-5" />
                Warehouses
              </div>
              <p className="text-xs text-emerald-600/80 mt-1">Physical locations and storage bins</p>
            </div>

            <div
              onClick={() => navigate('/app/stock')}
              className="p-5 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 text-amber-700 font-semibold">
                <Boxes className="w-5 h-5" />
                Current Stock
              </div>
              <p className="text-xs text-amber-600/80 mt-1">Real-time stock view by warehouse</p>
            </div>
          </div>
        </div>

        {/* Phase 5 Inventory Engine Operations */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h2 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">Controlled Inventory Transactions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div
              onClick={() => navigate('/app/receipts')}
              className="p-5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5 text-emerald-800 font-semibold">
                <Inbox className="w-5 h-5 text-emerald-600" />
                Receipts
              </div>
              <p className="text-xs text-emerald-700/80 mt-1">Inbound stock receiving</p>
            </div>

            <div
              onClick={() => navigate('/app/deliveries')}
              className="p-5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5 text-rose-800 font-semibold">
                <Send className="w-5 h-5 text-rose-600" />
                Deliveries
              </div>
              <p className="text-xs text-rose-700/80 mt-1">Outbound customer dispatches</p>
            </div>

            <div
              onClick={() => navigate('/app/transfers')}
              className="p-5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5 text-blue-800 font-semibold">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                Transfers
              </div>
              <p className="text-xs text-blue-700/80 mt-1">Internal bin & hub movements</p>
            </div>

            <div
              onClick={() => navigate('/app/adjustments')}
              className="p-5 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5 text-amber-800 font-semibold">
                <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                Adjustments
              </div>
              <p className="text-xs text-amber-700/80 mt-1">Cycle counts & variances</p>
            </div>

            <div
              onClick={() => navigate('/app/ledger')}
              className="p-5 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5 text-purple-800 font-semibold">
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                Stock Ledger
              </div>
              <p className="text-xs text-purple-700/80 mt-1">Append-only audit journal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Application Main Layout
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { activeOrganization, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navLinks = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/products', label: 'Products', icon: Package },
    { to: '/app/categories', label: 'Categories', icon: FolderTree },
    { to: '/app/warehouses', label: 'Warehouses', icon: WarehouseIcon },
    { to: '/app/stock', label: 'Stock', icon: Boxes },
    { to: '/app/receipts', label: 'Receipts', icon: Inbox },
    { to: '/app/deliveries', label: 'Deliveries', icon: Send },
    { to: '/app/transfers', label: 'Transfers', icon: ArrowLeftRight },
    { to: '/app/adjustments', label: 'Adjustments', icon: SlidersHorizontal },
    { to: '/app/ledger', label: 'Stock Ledger', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Header / Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/app/dashboard')}>
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  S
                </div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  StockSense
                </span>
              </div>

              {/* Navigation Items */}
              <nav className="hidden xl:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {link.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Right Side: Org Selector & User Profile */}
            <div className="flex items-center gap-3 sm:gap-4">
              {activeOrganization && (
                <button
                  onClick={() => navigate('/app/select-org')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-xs font-medium text-gray-700 transition-colors"
                  title="Switch Organization"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold">{activeOrganization.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-gray-800 truncate max-w-40">
                  {user?.email}
                </span>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                  {activeOrganization?.role || 'Member'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-bar for medium screens & mobile */}
        <div className="xl:hidden border-t border-gray-100 px-4 py-2 flex items-center space-x-1 overflow-x-auto scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          {/* Public Auth Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app/select-org" element={<SelectOrg />} />
            <Route
              path="/app/*"
              element={
                <AppLayout>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />

                    {/* Phase 4: Master Data */}
                    <Route path="products" element={<ProductList />} />
                    <Route path="products/new" element={<ProductForm />} />
                    <Route path="products/:id" element={<ProductDetail />} />
                    <Route path="products/:id/edit" element={<ProductForm />} />

                    <Route path="categories" element={<CategoryList />} />

                    <Route path="warehouses" element={<WarehouseList />} />
                    <Route path="warehouses/:id" element={<WarehouseDetail />} />

                    <Route path="stock" element={<StockList />} />

                    {/* Phase 5: Receipts */}
                    <Route path="receipts" element={<ReceiptList />} />
                    <Route path="receipts/new" element={<ReceiptForm />} />
                    <Route path="receipts/:id" element={<ReceiptDetail />} />

                    {/* Phase 5: Deliveries */}
                    <Route path="deliveries" element={<DeliveryList />} />
                    <Route path="deliveries/new" element={<DeliveryForm />} />
                    <Route path="deliveries/:id" element={<DeliveryDetail />} />

                    {/* Phase 5: Transfers */}
                    <Route path="transfers" element={<TransferList />} />
                    <Route path="transfers/new" element={<TransferForm />} />
                    <Route path="transfers/:id" element={<TransferDetail />} />

                    {/* Phase 5: Adjustments */}
                    <Route path="adjustments" element={<AdjustmentList />} />
                    <Route path="adjustments/new" element={<AdjustmentForm />} />
                    <Route path="adjustments/:id" element={<AdjustmentDetail />} />

                    {/* Phase 5: Stock Ledger */}
                    <Route path="ledger" element={<LedgerList />} />

                    <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
