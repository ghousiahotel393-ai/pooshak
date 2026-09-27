import { useEffect, type React } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { useUsersStore } from './stores';
import { can, type Permission } from './lib/permissions';
import { POSTerminal } from './components/pos/POSTerminal';
import { lazyWithRetry } from './lib/pwa/lazyWithRetry';

// Lazy load heavy components — lazyWithRetry self-heals stale-chunk load failures after a
// deploy (one guarded reload) instead of crashing to the error screen.
const TransactionsManager = lazyWithRetry(() => import('./components/transactions/TransactionsManager').then(m => ({ default: m.TransactionsManager })));
const InventoryManager = lazyWithRetry(() => import('./components/inventory/InventoryManager').then(m => ({ default: m.InventoryManager })));
const CustomerManager = lazyWithRetry(() => import('./components/customers/CustomerManager').then(m => ({ default: m.CustomerManager })));
const ReportsManager = lazyWithRetry(() => import('./components/reports/ReportsManager').then(m => ({ default: m.ReportsManager })));
const Settings = lazyWithRetry(() => import('./components/settings/Settings').then(m => ({ default: m.Settings })));
const DiscountManager = lazyWithRetry(() => import('./components/discounts/DiscountManager').then(m => ({ default: m.DiscountManager })));
const UsersPage = lazyWithRetry(() => import('./components/users/UsersPage').then(m => ({ default: m.UsersPage })));
const ExpenseManager = lazyWithRetry(() => import('./components/expenses/ExpenseManager').then(m => ({ default: m.ExpenseManager })));
const SupplierManager = lazyWithRetry(() => import('./components/inventory/suppliers/SupplierManager').then(m => ({ default: m.SupplierManager })));
const _PurchaseOrderSystem = lazyWithRetry(() => import('./components/inventory/PurchaseOrderSystem').then(m => ({ default: m.PurchaseOrderSystem })));
const _DashboardManager = lazyWithRetry(() => import('./components/dashboard/DashboardManager').then(m => ({ default: m.DashboardManager })));
import { toast } from 'sonner';

// ── Route-based access control (real enforcement, MASTER §2.1.3) ──
// Fail-closed: unknown role or missing permission => redirect to POS, never render.
function RequireAccess({ action, children }: { action: Permission; children: React.ReactNode }) {
  const appCurrentUser = useUsersStore(s => s.currentUser);

  const user = appCurrentUser;
  const allowed = !!user && user.active !== false && can(user.role, action);
  
  useEffect(() => {
    if (user && !allowed) {
      toast.error('ACCESS DENIED', { description: 'You do not have permission to view this module.' });
    }
  }, [user, allowed]);

  if (!allowed) {
    return <Navigate to="/pos" replace />;
  }
  return <>{children}</>;
}

// ── Root redirect based on saved preference ──
function RootRedirect() {
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const currentUser = appCurrentUser;
  const navigate = useNavigate();
  useEffect(() => {
    if (!currentUser) return;
    const savedView = localStorage.getItem('pos_current_view');
    if (savedView && savedView !== 'dashboard') {
      navigate('/' + savedView, { replace: true });
    } else {
      navigate('/pos', { replace: true });
    }
  }, [currentUser, navigate]);
  return null;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/pos" element={<POSTerminal />} />
      <Route path="/transactions" element={<RequireAccess action="view_transactions"><TransactionsManager /></RequireAccess>} />
      <Route path="/expenses" element={<RequireAccess action="view_expenses"><ExpenseManager /></RequireAccess>} />
      <Route path="/inventory" element={<Navigate to="/inventory/products" replace />} />
      <Route path="/inventory/:subTab" element={<RequireAccess action="view_inventory"><InventoryManager /></RequireAccess>} />
      <Route path="/customers" element={<RequireAccess action="view_customers"><CustomerManager /></RequireAccess>} />
      <Route path="/reports" element={<Navigate to="/reports/sales" replace />} />
      <Route path="/reports/:subTab" element={<RequireAccess action="view_reports"><ReportsManager /></RequireAccess>} />
      <Route path="/discounts" element={<RequireAccess action="view_discounts"><DiscountManager /></RequireAccess>} />
      <Route path="/users" element={<RequireAccess action="view_users"><UsersPage /></RequireAccess>} />
      <Route path="/users/:subTab" element={<RequireAccess action="view_users"><UsersPage /></RequireAccess>} />
      <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
      <Route path="/settings/:subTab" element={<RequireAccess action="view_settings"><Settings /></RequireAccess>} />
      <Route path="/suppliers" element={<RequireAccess action="view_suppliers"><SupplierManager /></RequireAccess>} />
      <Route path="/dashboard" element={<Navigate to="/pos" replace />} />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
