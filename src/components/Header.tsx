import React from 'react';
import {
  Boxes,
  Flame,
  History,
  LogOut,
  Receipt,
  Settings,
  ShoppingCart,
  User,
} from 'lucide-react';
import { AdminAccount } from '../types';

export type AppNavView = 'billing' | 'history' | 'inventory' | 'settings';

interface HeaderProps {
  activeView: AppNavView;
  setActiveView: (view: AppNavView) => void;
  cartCount: number;
  billsCount: number;
  onOpenCartMobile: () => void;
  currentAdmin: AdminAccount | null;
  onLogout: () => void;
  pendingSyncCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  cartCount,
  billsCount,
  onOpenCartMobile,
  currentAdmin,
  onLogout,
  pendingSyncCount,
}) => {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-300 px-4 sm:px-6 py-3 no-print ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-md shadow-slate-200/40'
          : 'bg-white/95 backdrop-blur-sm border-b border-slate-200'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div
          onClick={() => setActiveView('billing')}
          className="flex items-center gap-3 shrink-0 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white shrink-0">
            <Flame className="w-6 h-6 fill-amber-200 stroke-red-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 font-display uppercase">
                TULJAI PHATAKA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Premium Festive Crackers & Fireworks Billing
            </p>
          </div>
        </div>

        {/* Navigation & Controls Zone */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Main Navigation Segmented Control */}
          <nav className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveView('billing')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'billing'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Billing</span>
            </button>

            <button
              onClick={() => setActiveView('history')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'history'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Order History</span>
              {billsCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    activeView === 'history'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {billsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveView('inventory')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'inventory'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Catalogue</span>
              <span className="md:hidden">Stock</span>
            </button>

            <button
              onClick={() => setActiveView('settings')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'settings'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Google Sheet Settings & Profile"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </nav>

          {/* Sync indicator if pending */}
          {pendingSyncCount > 0 && (
            <button
              onClick={() => setActiveView('history')}
              title={`${pendingSyncCount} bill(s) queued for Google Sheets sync. Click to view.`}
              className="hidden lg:flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-semibold">{pendingSyncCount} Pending Sync</span>
            </button>
          )}

          {/* Mobile Cart Button */}
          {activeView === 'billing' && (
            <button
              onClick={onOpenCartMobile}
              className="lg:hidden relative p-2 bg-slate-100 text-orange-600 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors"
              aria-label="View Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Admin User Badge & Logout */}
          {currentAdmin && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div
                onClick={() => setActiveView('settings')}
                className="hidden md:flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-orange-600 transition-colors"
                title="Click to view owner profile"
              >
                <div className="w-6 h-6 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold max-w-[120px] truncate">
                  {currentAdmin.displayName}
                </span>
              </div>

              <button
                onClick={onLogout}
                title="Logout from Admin"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
