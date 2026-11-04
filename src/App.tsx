import React, { useEffect, useState } from 'react';
import { AdminAccount, AdminUsername, AppSettings, Bill, CartItem, ComboOffer, CrackerItem } from './types';
import {
  deductStockForBill,
  deleteStoredBill,
  generateNextBillNo,
  getStoredAdmins,
  getStoredAuth,
  getStoredBills,
  getStoredCombos,
  getStoredItems,
  getStoredSettings,
  saveNewBill,
  saveStoredAdmins,
  saveStoredCombos,
  saveStoredItems,
  saveStoredSettings,
  setStoredAuth,
  updateComboStock,
} from './utils/storage';
import { processRetryQueue, sendBillToAppsScript } from './services/sheetsSync';
import { saveBillToSupabase, syncAllPendingSupabaseBills } from './services/supabaseSync';
import { AppNavView, Header } from './components/Header';
import { Footer } from './components/Footer';
import { BillingScreen } from './components/BillingScreen';
import { OrderHistory } from './components/OrderHistory';
import { AdminPanel } from './components/AdminPanel';
import { InvoiceView } from './components/InvoiceView';
import { AdminLogin } from './components/AdminLogin';

export default function App() {
  // Authentication & Shop Owners state
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);

  // Main view state
  const [activeView, setActiveView] = useState<AppNavView>('billing');
  const [items, setItems] = useState<CrackerItem[]>([]);
  const [combos, setCombos] = useState<ComboOffer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());

  // Invoice modal state
  const [activeInvoiceBill, setActiveInvoiceBill] = useState<Bill | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Initialize data from localStorage
  useEffect(() => {
    const loadedItems = getStoredItems();
    const loadedCombos = getStoredCombos();
    const loadedBills = getStoredBills();
    const loadedAdmins = getStoredAdmins();
    const loadedAuth = getStoredAuth();
    const loadedSettings = getStoredSettings();

    setItems(loadedItems);
    setCombos(loadedCombos);
    setBills(loadedBills);
    setAdmins(loadedAdmins);
    setCurrentAdmin(loadedAuth);
    setSettings(loadedSettings);

    // Initial background sync check for Google Sheets & Supabase
    Promise.allSettled([
      processRetryQueue(),
      syncAllPendingSupabaseBills(),
    ]).then(() => {
      setBills(getStoredBills());
    });
  }, []);

  // Periodic Auto-Sync (Every 30 seconds and on window online event)
  useEffect(() => {
    const runSync = async () => {
      const [sheetRes, supaRes] = await Promise.allSettled([
        processRetryQueue(),
        syncAllPendingSupabaseBills(),
      ]);

      const sheetChanged =
        sheetRes.status === 'fulfilled' && (sheetRes.value.synced > 0 || sheetRes.value.failed > 0);
      const supaChanged =
        supaRes.status === 'fulfilled' && (supaRes.value.synced > 0 || supaRes.value.failed > 0);

      if (sheetChanged || supaChanged) {
        setBills(getStoredBills());
      }
    };

    const intervalId = setInterval(runSync, 30000);

    const handleOnline = () => {
      runSync();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
    };
  }, []);


  // Admin Login Handler (Authorized 4 admins only)
  const handleAdminLogin = (username: AdminUsername, password: string): boolean => {
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = password.trim();
    const admin = admins.find(
      (a) => a.username.toLowerCase() === cleanUsername
    );
    if (admin && admin.password === cleanPassword) {
      setCurrentAdmin(admin);
      setStoredAuth(admin);
      return true;
    }
    return false;
  };

  // Admin Logout Handler
  const handleAdminLogout = () => {
    setCurrentAdmin(null);
    setStoredAuth(null);
  };

  // Update Admin Profile (display name or password)
  const handleUpdateAdminProfile = (
    username: AdminUsername,
    displayName: string,
    newPassword?: string
  ) => {
    const updated = admins.map((adm) => {
      if (adm.username === username) {
        return {
          ...adm,
          displayName,
          password: newPassword ? newPassword : adm.password,
        };
      }
      return adm;
    });

    setAdmins(updated);
    saveStoredAdmins(updated);

    if (currentAdmin && currentAdmin.username === username) {
      const updatedCurr = updated.find((a) => a.username === username) || null;
      setCurrentAdmin(updatedCurr);
      setStoredAuth(updatedCurr);
    }
  };

  // Cart operations
  const handleAddToCart = (item: CrackerItem, quantity: number) => {
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.item.id === item.id);
      if (existing) {
        const newQty = Math.min(item.stock, existing.quantity + quantity);
        return prevCart.map((c) =>
          c.item.id === item.id
            ? { ...c, quantity: newQty, lineTotal: Number((newQty * c.unitPrice).toFixed(2)) }
            : c
        );
      } else {
        const validQty = Math.min(item.stock, Math.max(1, quantity));
        return [
          ...prevCart,
          {
            item,
            quantity: validQty,
            unitPrice: item.price,
            lineTotal: Number((validQty * item.price).toFixed(2)),
          },
        ];
      }
    });
  };

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(itemId);
      return;
    }
    const invItem = items.find((i) => i.id === itemId);
    const comboItem = combos.find((c) => c.id === itemId);
    const maxStock = invItem ? invItem.stock : comboItem ? comboItem.stock : 999;
    const cappedQty = Math.min(maxStock, newQty);

    setCart((prev) =>
      prev.map((c) =>
        c.item.id === itemId
          ? {
              ...c,
              quantity: cappedQty,
              lineTotal: Number((cappedQty * c.unitPrice).toFixed(2)),
            }
          : c
      )
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Combo Offer Handlers
  const handleUpdateComboStock = (comboId: string, newStock: number) => {
    updateComboStock(comboId, newStock);
    setCombos(getStoredCombos());
  };

  const handleUpdateCombos = (updatedCombos: ComboOffer[]) => {
    setCombos(updatedCombos);
    saveStoredCombos(updatedCombos);
  };

  // Delete Bill Handler
  const handleDeleteBill = (billNo: string) => {
    deleteStoredBill(billNo);
    const refreshed = getStoredBills();
    setBills(refreshed);
    if (activeInvoiceBill?.billNo === billNo) {
      setActiveInvoiceBill(null);
    }
  };

  // Checkout and Generate Bill
  const handleCheckout = async (details: {
    customerName: string;
    customerPhone: string;
    discountPercent: number;
    taxPercent: number;
    billedBy: string;
  }) => {
    if (cart.length === 0) return;

    // 1. Calculate financial totals
    const subtotal = Number(
      cart.reduce((acc, it) => acc + it.lineTotal, 0).toFixed(2)
    );
    const discountAmount = Number(
      ((subtotal * details.discountPercent) / 100).toFixed(2)
    );
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number(
      ((taxableAmount * details.taxPercent) / 100).toFixed(2)
    );
    const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

    // 2. Format timestamps
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // 3. Generate sequential Bill No
    const billNo = generateNextBillNo();

    // 4. Create new bill object
    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      billNo,
      date: dateStr,
      time: timeStr,
      timestamp: now.getTime(),
      customerName: details.customerName,
      customerPhone: details.customerPhone,
      items: cart.map((c) => ({
        name: c.item.name,
        category: c.item.category,
        qty: c.quantity,
        unitPrice: c.unitPrice,
        lineTotal: c.lineTotal,
      })),
      subtotal,
      discountPercent: details.discountPercent,
      discountAmount,
      taxPercent: details.taxPercent,
      taxAmount,
      grandTotal,
      billedBy: currentAdmin?.displayName || details.billedBy || 'Shop Admin',
      syncStatus: 'Pending',
    };

    // 5. Deduct inventory & combo stock
    deductStockForBill(
      cart.map((c) => ({
        name: c.item.name,
        qty: c.quantity,
      }))
    );
    // Reload items & combos state
    setItems(getStoredItems());
    setCombos(getStoredCombos());

    // 6. Save Bill locally in history immediately (new bill will appear at top of history!)
    saveNewBill(newBill);
    const updatedBills = getStoredBills();
    setBills(updatedBills);

    // 7. Open Invoice View & close mobile drawer
    setActiveInvoiceBill(newBill);
    setIsMobileCartOpen(false);

    // 8. Auto-send to Supabase backend tables and Google Sheet in parallel
    Promise.allSettled([
      saveBillToSupabase(newBill),
      sendBillToAppsScript(newBill),
    ]).then(() => {
      const refreshedBills = getStoredBills();
      setBills(refreshedBills);
      const freshlyUpdated = refreshedBills.find((b) => b.billNo === newBill.billNo);
      if (freshlyUpdated) {
        setActiveInvoiceBill((prev) =>
          prev?.billNo === newBill.billNo ? freshlyUpdated : prev
        );
      }
    });
  };


  // Catalogue CRUD
  const handleAddItem = (itemData: Omit<CrackerItem, 'id'>) => {
    const newItem: CrackerItem = {
      ...itemData,
      id: `item-${Date.now()}`,
    };
    const updated = [newItem, ...items];
    setItems(updated);
    saveStoredItems(updated);
  };

  const handleUpdateItem = (updatedItem: CrackerItem) => {
    const updated = items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    setItems(updated);
    saveStoredItems(updated);
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    saveStoredItems(updated);
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  // Settings update
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  // -------------------------------------------------------------
  // ADMIN ACCESS GATE:
  // If no admin is authenticated, restrict website to login page
  // -------------------------------------------------------------
  if (!currentAdmin) {
    return <AdminLogin admins={admins} onLogin={handleAdminLogin} />;
  }

  const pendingSyncCount = bills.filter((b) => b.syncStatus !== 'Synced').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Header with Navigation */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        cartCount={cart.reduce((acc, it) => acc + it.quantity, 0)}
        billsCount={bills.length}
        onOpenCartMobile={() => setIsMobileCartOpen(true)}
        currentAdmin={currentAdmin}
        onLogout={handleAdminLogout}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* 1. Billing Screen */}
        {activeView === 'billing' && (
          <BillingScreen
            items={items}
            combos={combos}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveCartItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onCheckout={handleCheckout}
            onUpdateComboStock={handleUpdateComboStock}
            scriptUrlConfigured={Boolean(settings.scriptUrl && settings.scriptUrl.trim())}
            onNavigateToSettings={() => setActiveView('settings')}
            defaultTaxPercent={settings.defaultTaxPercent}
            currentAdminName={currentAdmin?.displayName}
            isMobileCartOpen={isMobileCartOpen}
            setIsMobileCartOpen={setIsMobileCartOpen}
            isAdmin={Boolean(currentAdmin)}
          />
        )}

        {/* 2. Order History Screen */}
        {activeView === 'history' && (
          <OrderHistory
            bills={bills}
            onViewBill={(bill) => setActiveInvoiceBill(bill)}
            onRefreshBills={() => setBills(getStoredBills())}
            onNavigateToBilling={() => setActiveView('billing')}
            onDeleteBill={handleDeleteBill}
          />
        )}

        {/* 3. Inventory / Catalogue Screen */}
        {activeView === 'inventory' && (
          <AdminPanel
            initialTab="items"
            currentAdmin={currentAdmin}
            admins={admins}
            items={items}
            combos={combos}
            bills={bills}
            settings={settings}
            onLogin={handleAdminLogin}
            onUpdateAdminProfile={handleUpdateAdminProfile}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onUpdateCombos={handleUpdateCombos}
            onUpdateSettings={handleUpdateSettings}
            onViewBill={(bill) => setActiveInvoiceBill(bill)}
            onSyncBillsRefresh={() => setBills(getStoredBills())}
          />
        )}

        {/* 4. Settings & Owner Profile Screen */}
        {activeView === 'settings' && (
          <AdminPanel
            initialTab="settings"
            currentAdmin={currentAdmin}
            admins={admins}
            items={items}
            combos={combos}
            bills={bills}
            settings={settings}
            onLogin={handleAdminLogin}
            onUpdateAdminProfile={handleUpdateAdminProfile}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onUpdateCombos={handleUpdateCombos}
            onUpdateSettings={handleUpdateSettings}
            onViewBill={(bill) => setActiveInvoiceBill(bill)}
            onSyncBillsRefresh={() => setBills(getStoredBills())}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Invoice View Modal */}
      {activeInvoiceBill && (
        <InvoiceView
          bill={activeInvoiceBill}
          onClose={() => setActiveInvoiceBill(null)}
          onNewBill={() => {
            setActiveInvoiceBill(null);
            setCart([]);
            setActiveView('billing');
          }}
          onNavigateToHistory={() => {
            setActiveInvoiceBill(null);
            setCart([]);
            setActiveView('history');
          }}
          onBillUpdated={(updated) => {
            setBills(getStoredBills());
            setActiveInvoiceBill(updated);
          }}
        />
      )}
    </div>
  );
}
