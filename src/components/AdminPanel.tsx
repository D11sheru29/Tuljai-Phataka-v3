import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Edit2,
  ExternalLink,
  Eye,
  Flame,
  KeyRound,
  Lock,
  PackagePlus,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  Table,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  AdminAccount,
  AdminUsername,
  AppSettings,
  Bill,
  ComboOffer,
  CrackerCategory,
  CrackerItem,
} from '../types';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/googleAppsScriptCode';
import {
  processRetryQueue,
  testAppsScriptConnection,
  testAppsScriptPostSync,
} from '../services/sheetsSync';
import {
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_PROJECT_ID,
  DEFAULT_SUPABASE_URL,
  SUPABASE_SCHEMA_SQL,
} from '../services/supabaseClient';
import {
  syncAllPendingSupabaseBills,
  testSupabaseConnection,
} from '../services/supabaseSync';
import { deleteStoredBill } from '../utils/storage';


interface AdminPanelProps {
  currentAdmin: AdminAccount | null;
  admins: AdminAccount[];
  items: CrackerItem[];
  combos: ComboOffer[];
  bills: Bill[];
  settings: AppSettings;
  onLogin: (username: AdminUsername, password: string) => boolean;
  onUpdateAdminProfile: (username: AdminUsername, displayName: string, newPassword?: string) => void;
  onAddItem: (item: Omit<CrackerItem, 'id'>) => void;
  onUpdateItem: (item: CrackerItem) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateCombos: (combos: ComboOffer[]) => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onViewBill: (bill: Bill) => void;
  onSyncBillsRefresh: () => void;
  onDeleteBill?: (billNo: string) => void;
  initialTab?: AdminTab;
}

type AdminTab = 'items' | 'combos' | 'bills' | 'settings' | 'profile';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentAdmin,
  admins,
  items,
  combos,
  bills,
  settings,
  onLogin,
  onUpdateAdminProfile,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onUpdateCombos,
  onUpdateSettings,
  onViewBill,
  onSyncBillsRefresh,
  onDeleteBill,
  initialTab = 'items',
}) => {
  // If not logged in, show Login Form
  const [loginUsername, setLoginUsername] = useState<AdminUsername>('Shreyashbhut');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Items tab state
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('All');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CrackerItem | null>(null);
  const [itemFormName, setItemFormName] = useState('');
  const [itemFormCategory, setItemFormCategory] = useState<CrackerCategory>('Sparklers');
  const [itemFormPrice, setItemFormPrice] = useState<string>('');
  const [itemFormStock, setItemFormStock] = useState<string>('');
  const [itemFormUnit, setItemFormUnit] = useState('Box');
  const [itemFormDesc, setItemFormDesc] = useState('');
  const [itemFormAvailable, setItemFormAvailable] = useState(true);
  const [itemFormError, setItemFormError] = useState<string | null>(null);

  // Delete item confirmation modal
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Settings tab state
  const [scriptUrlInput, setScriptUrlInput] = useState(settings.scriptUrl);
  const [taxPercentInput, setTaxPercentInput] = useState(String(settings.defaultTaxPercent));
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testUrlResult, setTestUrlResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTestingPostSync, setIsTestingPostSync] = useState(false);
  const [testPostSyncResult, setTestPostSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Supabase Backend state
  const [supabaseProjectIdInput, setSupabaseProjectIdInput] = useState(
    settings.supabaseProjectId || DEFAULT_SUPABASE_PROJECT_ID
  );
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(
    settings.supabaseUrl || DEFAULT_SUPABASE_URL
  );
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState(
    settings.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY
  );
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [testSupabaseResult, setTestSupabaseResult] = useState<{
    success: boolean;
    message: string;
    tablesExist: boolean;
    error?: string;
  } | null>(null);
  const [isSyncingSupabaseBills, setIsSyncingSupabaseBills] = useState(false);
  const [supabaseSyncSummary, setSupabaseSyncSummary] = useState<string | null>(null);
  const [copiedSupabaseSql, setCopiedSupabaseSql] = useState(false);

  // Retry sync state
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);


  // Combos tab state
  const [comboList, setComboList] = useState<ComboOffer[]>(combos);
  const [comboSuccessMsg, setComboSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setComboList(combos);
  }, [combos]);

  const handleUpdateSingleComboStock = (comboId: string, delta: number) => {
    const updated = comboList.map((c) =>
      c.id === comboId ? { ...c, stock: Math.max(0, c.stock + delta) } : c
    );
    setComboList(updated);
    onUpdateCombos(updated);
  };

  const handleSetSingleComboStock = (comboId: string, newStock: number) => {
    const updated = comboList.map((c) =>
      c.id === comboId ? { ...c, stock: Math.max(0, newStock) } : c
    );
    setComboList(updated);
    onUpdateCombos(updated);
  };

  const handleToggleComboAvailability = (comboId: string) => {
    const updated = comboList.map((c) =>
      c.id === comboId ? { ...c, isAvailable: !c.isAvailable } : c
    );
    setComboList(updated);
    onUpdateCombos(updated);
  };

  const handleUpdateComboItemQty = (
    comboId: string,
    itemIdx: number,
    qtyDelta: number
  ) => {
    const updated = comboList.map((c) => {
      if (c.id === comboId) {
        const newItems = c.itemsIncluded.map((ci, idx) => {
          if (idx === itemIdx) {
            const nextQty = Math.max(1, ci.qty + qtyDelta);
            return { ...ci, qty: nextQty };
          }
          return ci;
        });
        const totalCount = newItems.reduce((acc, ci) => acc + ci.qty, 0);
        return {
          ...c,
          itemCount: totalCount,
          itemsIncluded: newItems,
        };
      }
      return c;
    });
    setComboList(updated);
    onUpdateCombos(updated);
    setComboSuccessMsg('Combo items and quantity updated!');
    setTimeout(() => setComboSuccessMsg(null), 2500);
  };

  // Bill delete state in Admin Panel
  const [adminBillToDelete, setAdminBillToDelete] = useState<Bill | null>(null);
  const [adminDeleteSuccess, setAdminDeleteSuccess] = useState<string | null>(null);

  const handleConfirmDeleteBillInAdmin = () => {
    if (!adminBillToDelete) return;
    const targetNo = adminBillToDelete.billNo;
    if (onDeleteBill) {
      onDeleteBill(targetNo);
    } else {
      deleteStoredBill(targetNo);
      onSyncBillsRefresh();
    }
    setAdminBillToDelete(null);
    setAdminDeleteSuccess(`Bill ${targetNo} deleted successfully.`);
    setTimeout(() => setAdminDeleteSuccess(null), 3000);
  };

  // Profile tab state
  const [profileDisplayName, setProfileDisplayName] = useState(
    currentAdmin?.displayName || ''
  );
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const success = onLogin(loginUsername, loginPassword);
    if (!success) {
      setLoginError('Incorrect password. Please verify credentials.');
    }
  };

  // Open item form for Add
  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemFormName('');
    setItemFormCategory('Sparklers');
    setItemFormPrice('');
    setItemFormStock('');
    setItemFormUnit('Box');
    setItemFormDesc('');
    setItemFormAvailable(true);
    setItemFormError(null);
    setItemModalOpen(true);
  };

  // Open item form for Edit
  const handleOpenEdit = (item: CrackerItem) => {
    setEditingItem(item);
    setItemFormName(item.name);
    setItemFormCategory(item.category);
    setItemFormPrice(String(item.price));
    setItemFormStock(String(item.stock));
    setItemFormUnit(item.unit || 'Box');
    setItemFormDesc(item.description || '');
    setItemFormAvailable(item.isAvailable);
    setItemFormError(null);
    setItemModalOpen(true);
  };

  // Save Item form
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    setItemFormError(null);

    const name = itemFormName.trim();
    if (!name) {
      setItemFormError('Item name must not be empty.');
      return;
    }

    const price = parseFloat(itemFormPrice);
    if (isNaN(price) || price <= 0) {
      setItemFormError('Price must be greater than 0.');
      return;
    }

    const stock = parseInt(itemFormStock, 10);
    if (isNaN(stock) || stock < 0) {
      setItemFormError('Stock must be a whole number of at least 0.');
      return;
    }

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        name,
        category: itemFormCategory,
        price,
        stock,
        unit: itemFormUnit.trim() || 'Unit',
        description: itemFormDesc.trim(),
        isAvailable: itemFormAvailable,
      });
    } else {
      onAddItem({
        name,
        category: itemFormCategory,
        price,
        stock,
        unit: itemFormUnit.trim() || 'Unit',
        description: itemFormDesc.trim(),
        isAvailable: itemFormAvailable,
      });
    }

    setItemModalOpen(false);
  };

  // Delete item with confirmation
  const handleConfirmDelete = () => {
    if (deleteConfirmationId) {
      onDeleteItem(deleteConfirmationId);
      setDeleteConfirmationId(null);
    }
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultTaxPercent = Math.max(0, Math.min(100, parseFloat(taxPercentInput) || 0));
    onUpdateSettings({
      ...settings,
      scriptUrl: scriptUrlInput.trim(),
      defaultTaxPercent,
      supabaseProjectId: supabaseProjectIdInput.trim(),
      supabaseUrl: supabaseUrlInput.trim(),
      supabaseAnonKey: supabaseAnonKeyInput.trim(),
    });
    setSettingsSuccessMsg('Settings saved successfully!');
    setTimeout(() => setSettingsSuccessMsg(null), 3000);
  };

  // Test Supabase Connection & Table Check
  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setTestSupabaseResult(null);
    try {
      const result = await testSupabaseConnection();
      setTestSupabaseResult(result);
    } catch (err: any) {
      setTestSupabaseResult({
        success: false,
        tablesExist: false,
        message: err?.message || 'Failed to connect to Supabase backend',
        error: err?.message,
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  // Sync All Pending Bills to Supabase
  const handleSyncAllSupabaseBills = async () => {
    setIsSyncingSupabaseBills(true);
    setSupabaseSyncSummary(null);
    try {
      const result = await syncAllPendingSupabaseBills();
      onSyncBillsRefresh();
      if (result.tablesMissing) {
        setSupabaseSyncSummary(
          `Supabase 'bills' table does not exist yet. Please copy the SQL Schema below and run it in your Supabase SQL Editor.`
        );
      } else {
        setSupabaseSyncSummary(
          `Supabase sync completed: ${result.synced} bills saved, ${result.failed} failed out of ${result.attempted} pending.`
        );
      }
    } catch (err: any) {
      setSupabaseSyncSummary(`Supabase sync error: ${err?.message || 'Network error'}`);
    } finally {
      setIsSyncingSupabaseBills(false);
    }
  };

  // Copy Supabase SQL Schema
  const handleCopySupabaseSql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSupabaseSql(true);
    setTimeout(() => setCopiedSupabaseSql(false), 2000);
  };

  // Test URL connection (GET)
  const handleTestConnection = async () => {
    setIsTestingUrl(true);
    setTestUrlResult(null);
    const result = await testAppsScriptConnection(scriptUrlInput);
    setIsTestingUrl(false);
    setTestUrlResult(result);
  };

  // Test Real POST Bill Write to Google Sheet
  const handleTestPostSync = async () => {
    setIsTestingPostSync(true);
    setTestPostSyncResult(null);
    const result = await testAppsScriptPostSync(scriptUrlInput);
    setIsTestingPostSync(false);
    setTestPostSyncResult({
      success: result.success,
      message: result.success
        ? 'Success! Verified write access. Test bill was appended to your Google Sheet.'
        : `Write failed: ${result.error || result.message}`,
    });
    if (result.success) {
      onSyncBillsRefresh();
    }
  };

  // Copy Google Apps Script code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Retry Failed Syncs
  const handleRetryFailedSyncs = async () => {
    setIsRetryingSync(true);
    setSyncSummary(null);
    try {
      const result = await processRetryQueue();
      onSyncBillsRefresh();
      setSyncSummary(
        `Sync completed: ${result.synced} succeeded, ${result.failed} failed out of ${result.attempted} attempted.`
      );
    } catch (e: any) {
      setSyncSummary(`Error during sync: ${e?.message}`);
    } finally {
      setIsRetryingSync(false);
    }
  };


  // Save Profile / Change Password
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!currentAdmin) return;

    const displayName = profileDisplayName.trim();
    if (!displayName) {
      setProfileError('Display name cannot be empty.');
      return;
    }

    // If changing password
    if (profileNewPassword) {
      if (!profileCurrentPassword) {
        setProfileError('Please enter your current password to set a new password.');
        return;
      }
      if (profileCurrentPassword !== currentAdmin.password) {
        setProfileError('Current password does not match.');
        return;
      }
      if (profileNewPassword.length < 4) {
        setProfileError('New password should be at least 4 characters.');
        return;
      }
      if (profileNewPassword !== profileConfirmPassword) {
        setProfileError('New password and confirmation do not match.');
        return;
      }

      onUpdateAdminProfile(currentAdmin.username, displayName, profileNewPassword);
      setProfileCurrentPassword('');
      setProfileNewPassword('');
      setProfileConfirmPassword('');
      setProfileSuccess('Profile and password updated successfully!');
    } else {
      onUpdateAdminProfile(currentAdmin.username, displayName);
      setProfileSuccess('Display name updated successfully!');
    }
  };

  // Sales Summary Calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBills = bills.filter((b) => b.date === todayStr);
  const todayTotalSales = todayBills.reduce((acc, b) => acc + b.grandTotal, 0);
  const allTimeTotalSales = bills.reduce((acc, b) => acc + b.grandTotal, 0);
  const pendingSyncBills = bills.filter((b) => b.syncStatus !== 'Synced');

  // Filter items in admin view
  const filteredAdminItems = items.filter((i) => {
    const matchesCat =
      itemCategoryFilter === 'All' || i.category === itemCategoryFilter;
    const matchesQuery =
      itemSearch.trim() === '' ||
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.category.toLowerCase().includes(itemSearch.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // -------------------------------------------------------------
  // Render Login Form if not logged in
  // -------------------------------------------------------------
  if (!currentAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-md shadow-orange-500/20 text-slate-950">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 font-display">
              Admin Login
            </h2>
            <p className="text-xs text-slate-500">
              Sign in as one of the 4 shop owners of TULJAI PHATAKA to manage items, bills, and sync settings.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Owner Account
              </label>
              <select
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value as AdminUsername)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
              >
                {admins.map((adm) => (
                  <option key={adm.username} value={adm.username}>
                    {adm.displayName} ({adm.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white pr-10"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                <span>Default: <code className="text-orange-600 font-mono font-semibold">Tuljai@2626</code></span>
                <button
                  type="button"
                  onClick={() => setLoginPassword('Tuljai@2626')}
                  className="text-orange-600 font-semibold hover:underline"
                >
                  Quick Fill
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-md shadow-orange-500/20 hover:brightness-105 active:scale-95 transition-all"
            >
              Sign In to Admin
            </button>
          </form>

          {/* Owner Quick Selector Helper */}
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Authorized Owners:</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {admins.map((adm) => (
                <div
                  key={adm.username}
                  onClick={() => {
                    setLoginUsername(adm.username);
                    setLoginPassword('Tuljai@2626');
                  }}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-400 cursor-pointer transition-colors"
                >
                  <div className="font-semibold text-slate-800 truncate">{adm.displayName}</div>
                  <div className="text-slate-500 font-mono">{adm.username}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render Authenticated Admin Panel
  // -------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Admin Panel Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase">
              Admin Dashboard
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 border border-orange-200 text-orange-800 font-bold">
              {currentAdmin.displayName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage catalogue, track sales, configure Google Sheets sync & owner profiles
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'items'
                ? 'bg-white text-orange-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Items Catalogue</span>
            <span className="text-[10px] font-mono">({items.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('combos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'combos'
                ? 'bg-white text-orange-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-amber-300" />
            <span>Combos & Offers</span>
            <span className="text-[10px] font-mono">({combos.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bills'
                ? 'bg-white text-orange-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Bills & History</span>
            <span className="text-[10px] font-mono">({bills.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-white text-orange-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Google Sheet Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-white text-orange-600 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ITEMS CATALOGUE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Items Summary Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-xs font-medium text-slate-500">Total Items</span>
              <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-0.5">
                {items.length}
              </div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-amber-700">Low Stock (&lt; 10)</span>
              <div className="text-2xl font-black text-amber-700 font-mono tabular-nums mt-0.5">
                {items.filter((i) => i.stock < 10).length}
              </div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-emerald-700">In Stock</span>
              <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-0.5">
                {items.filter((i) => i.stock >= 10 && i.isAvailable).length}
              </div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-rose-700">Out of Stock / Hidden</span>
              <div className="text-2xl font-black text-rose-700 font-mono tabular-nums mt-0.5">
                {items.filter((i) => i.stock === 0 || !i.isAvailable).length}
              </div>
            </div>
          </div>

          {/* Action Row: Search & Add Item */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Filter items..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <select
                value={itemCategoryFilter}
                onChange={(e) => setItemCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium focus:outline-none focus:border-orange-500 shrink-0"
              >
                <option value="All">All Categories</option>
                <option value="Fuljhadi">Fuljhadi</option>
                <option value="Sparklers">Sparklers</option>
                <option value="Flower Pots">Flower Pots</option>
                <option value="Ground Chakkars">Ground Chakkars</option>
                <option value="Rockets">Rockets</option>
                <option value="Sound Crackers">Sound Crackers</option>
                <option value="Gift Boxes">Gift Boxes</option>
              </select>
            </div>

            <button
              onClick={handleOpenAdd}
              className="py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <th className="py-3 px-4 font-bold">Item Name</th>
                    <th className="py-3 px-4 font-bold">Category</th>
                    <th className="py-3 px-4 font-bold text-right">Price (₹)</th>
                    <th className="py-3 px-4 font-bold text-center">Stock</th>
                    <th className="py-3 px-4 font-bold text-center">Availability</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdminItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No items match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAdminItems.map((item) => {
                      const isLowStock = item.stock < 10;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isLowStock ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {item.category}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black tabular-nums text-slate-900">
                            ₹{item.price.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 font-mono">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                {item.stock} {item.unit || ''} (Low)
                              </span>
                            ) : (
                              <span className="font-mono tabular-nums font-semibold text-slate-700">
                                {item.stock} {item.unit || ''}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() =>
                                onUpdateItem({ ...item, isAvailable: !item.isAvailable })
                              }
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                                item.isAvailable
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {item.isAvailable ? 'Available' : 'Hidden'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Item"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmationId(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1.5: COMBOS & LIMITED OFFERS MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'combos' && (
        <div className="space-y-6">
          {/* Toast Notification */}
          {comboSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{comboSuccessMsg}</span>
              </div>
              <button
                onClick={() => setComboSuccessMsg(null)}
                className="text-emerald-500 hover:text-emerald-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Combos Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-xs font-medium text-slate-500">Active Combos</span>
              <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
                {comboList.filter((c) => c.isAvailable).length} / {comboList.length}
              </div>
              <span className="text-[11px] text-orange-600 font-semibold mt-1 block">
                Festival Limited Edition Offers
              </span>
            </div>

            {comboList.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Combo {c.comboNumber}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {c.itemCount} Items
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono tabular-nums mt-1">
                    {c.stock} packs left
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5">
                  <span>Price: ₹{c.price.toLocaleString('en-IN')}</span>
                  <span
                    className={`font-bold ${
                      c.stock <= 0
                        ? 'text-rose-600'
                        : c.stock < 8
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {c.stock <= 0 ? 'Out of stock' : c.isAvailable ? 'In stock' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Combo Management Cards */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Manage Limited Offer Combos & Stock
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update inventory quantities, toggle availability, or review/adjust included items inside each package.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {comboList.map((combo) => {
                const totalIncluded = combo.itemsIncluded.reduce((acc, it) => acc + it.qty, 0);

                return (
                  <div
                    key={combo.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    {/* Header */}
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-900 text-amber-300 uppercase">
                          Combo {combo.comboNumber}
                        </span>
                        <button
                          onClick={() => handleToggleComboAvailability(combo.id)}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                            combo.isAvailable
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {combo.isAvailable ? 'Active for Billing' : 'Paused / Inactive'}
                        </button>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                        {combo.name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {combo.tagline}
                      </p>

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          ₹{combo.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                          ₹{combo.originalPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md ml-auto">
                          {totalIncluded} Total Items
                        </span>
                      </div>
                    </div>

                    {/* Stock Quantity Controls */}
                    <div className="p-4 space-y-4 flex-1">
                      <div className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-3">
                        <label className="block text-xs font-bold text-orange-950 mb-1.5 flex items-center justify-between">
                          <span>Available Stock Quantity:</span>
                          <span className="text-xs font-mono font-black text-orange-800">
                            {combo.stock} packs
                          </span>
                        </label>

                        {/* Quick stock adjustment buttons */}
                        <div className="flex items-center gap-1.5 my-2">
                          <button
                            onClick={() => handleUpdateSingleComboStock(combo.id, -10)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                            title="Decrease 10"
                          >
                            -10
                          </button>
                          <button
                            onClick={() => handleUpdateSingleComboStock(combo.id, -5)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                            title="Decrease 5"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleUpdateSingleComboStock(combo.id, -1)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                            title="Decrease 1"
                          >
                            -1
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={combo.stock}
                            onChange={(e) =>
                              handleSetSingleComboStock(combo.id, parseInt(e.target.value) || 0)
                            }
                            className="flex-1 min-w-[3.5rem] py-1 px-2 bg-white border border-orange-400 rounded-lg text-center font-mono font-bold text-sm text-slate-900 focus:outline-none"
                          />

                          <button
                            onClick={() => handleUpdateSingleComboStock(combo.id, 1)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                            title="Add 1"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleUpdateSingleComboStock(combo.id, 5)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                            title="Add 5"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => handleUpdateSingleComboStock(combo.id, 10)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                            title="Add 10"
                          >
                            +10
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Automatically decrements during checkout when billed.
                        </p>
                      </div>

                      {/* Items Inside the Combo */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800">
                            Included Items ({combo.itemsIncluded.length} kinds • {totalIncluded} total)
                          </span>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                          {combo.itemsIncluded.map((ci, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="p-2 flex items-center justify-between gap-2 hover:bg-slate-50"
                            >
                              <div className="truncate flex-1">
                                <span className="font-medium text-slate-800 block truncate">
                                  {ci.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {ci.category || 'Cracker'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() =>
                                    handleUpdateComboItemQty(combo.id, itemIdx, -1)
                                  }
                                  className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
                                  title="Decrease item quantity"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center font-mono font-bold text-orange-700">
                                  {ci.qty}
                                </span>
                                <button
                                  onClick={() =>
                                    handleUpdateComboItemQty(combo.id, itemIdx, 1)
                                  }
                                  className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
                                  title="Increase item quantity"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Instant save to cache & billing
                      </span>
                      <button
                        onClick={() => {
                          setComboSuccessMsg(`Settings confirmed for ${combo.name}!`);
                          setTimeout(() => setComboSuccessMsg(null), 2500);
                        }}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Confirmed
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: BILLS & HISTORY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'bills' && (
        <div className="space-y-4">
          {/* Sales Performance & Backend Sync Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-xs font-medium text-slate-500">Today's Sales</span>
              <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
                ₹{todayTotalSales.toFixed(2)}
              </div>
              <span className="text-[11px] text-orange-600 font-semibold mt-1 block">
                {todayBills.length} bill(s) issued today
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-xs font-medium text-slate-500">All-Time Total Sales</span>
              <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
                ₹{allTimeTotalSales.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Across {bills.length} total bills
              </span>
            </div>

            {/* Google Sheet Sync Card */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500">Google Sheet Sync</span>
                <div className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <span className="font-mono tabular-nums text-emerald-700">
                    {bills.filter((b) => b.syncStatus === 'Synced').length} Synced
                  </span>
                  <span>·</span>
                  <span className="font-mono tabular-nums text-amber-700">
                    {pendingSyncBills.length} Pending
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <button
                  onClick={handleRetryFailedSyncs}
                  disabled={isRetryingSync || pendingSyncBills.length === 0}
                  className="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetryingSync ? 'animate-spin' : ''}`} />
                  <span>Retry Sheet ({pendingSyncBills.length})</span>
                </button>
              </div>
            </div>

            {/* Supabase Backend Sync Card */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Supabase Backend Sync</span>
                </span>
                <div className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <span className="font-mono tabular-nums text-emerald-700">
                    {bills.filter((b) => b.supabaseSyncStatus === 'Synced').length} Synced
                  </span>
                  <span>·</span>
                  <span className="font-mono tabular-nums text-amber-700">
                    {bills.filter((b) => b.supabaseSyncStatus !== 'Synced').length} Pending
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <button
                  onClick={handleSyncAllSupabaseBills}
                  disabled={isSyncingSupabaseBills || bills.filter((b) => b.supabaseSyncStatus !== 'Synced').length === 0}
                  className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabaseBills ? 'animate-spin' : ''}`} />
                  <span>Sync to Supabase ({bills.filter((b) => b.supabaseSyncStatus !== 'Synced').length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sync Summary Alert */}
          {(syncSummary || supabaseSyncSummary) && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-xs text-slate-800 flex items-center justify-between">
              <span>{supabaseSyncSummary || syncSummary}</span>
              <button
                onClick={() => {
                  setSyncSummary(null);
                  setSupabaseSyncSummary(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bills List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Generated Bills ({bills.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Click any row to view or reprint invoice
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <th className="py-2.5 px-4 font-bold">Bill No</th>
                    <th className="py-2.5 px-4 font-bold">Date & Time</th>
                    <th className="py-2.5 px-4 font-bold">Customer</th>
                    <th className="py-2.5 px-4 font-bold">Items Summary</th>
                    <th className="py-2.5 px-4 font-bold text-right">Grand Total (₹)</th>
                    <th className="py-2.5 px-4 font-bold text-center">Google Sheet</th>
                    <th className="py-2.5 px-4 font-bold text-center">Supabase</th>
                    <th className="py-2.5 px-4 font-bold text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No bills generated yet. Go to Billing to create your first bill.
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr
                        key={bill.billNo}
                        onClick={() => onViewBill(bill)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-orange-600">
                          {bill.billNo}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-mono tabular-nums whitespace-nowrap">
                          {bill.date} · {bill.time}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          <div className="font-semibold">{bill.customerName || 'Walk-in'}</div>
                          {bill.customerPhone && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              {bill.customerPhone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {bill.items.map((it) => `${it.name} (${it.qty}x)`).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black tabular-nums text-slate-900">
                          ₹{bill.grandTotal.toFixed(2)}
                        </td>
                        {/* Google Sheet Sync */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              bill.syncStatus === 'Synced'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : bill.syncStatus === 'Pending'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {bill.syncStatus === 'Synced' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : bill.syncStatus === 'Pending' ? (
                              <Clock className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {bill.syncStatus}
                          </span>
                        </td>
                        {/* Supabase Sync */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              bill.supabaseSyncStatus === 'Synced'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : bill.supabaseSyncStatus === 'Pending'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {bill.supabaseSyncStatus === 'Synced' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600" />
                            )}
                            {bill.supabaseSyncStatus || 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewBill(bill);
                              }}
                              className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View / Print Invoice"
                            >
                              <Eye className="w-4 h-4 text-orange-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminBillToDelete(bill);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delete Bill Confirmation Modal in Admin Panel */}
          {adminBillToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">
                      Delete Bill {adminBillToDelete.billNo}?
                    </h3>
                    <p className="text-xs text-slate-500">
                      Permanently remove this bill record.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bill Number:</span>
                    <span className="font-mono font-bold text-slate-900">{adminBillToDelete.billNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold text-slate-900">
                      {adminBillToDelete.customerName || 'Walk-in Customer'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Time:</span>
                    <span>{adminBillToDelete.date} at {adminBillToDelete.time}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                    <span className="text-slate-800">Grand Total:</span>
                    <span className="text-orange-600 font-mono text-sm">
                      ₹{adminBillToDelete.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Deleting this bill will remove it from historical sales totals and local storage records.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setAdminBillToDelete(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeleteBillInAdmin}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Bill</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BACKEND & SETTINGS (SUPABASE + GOOGLE SHEETS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* ========================================================= */}
          {/* 1. SUPABASE BACKEND DATABASE SECTION */}
          {/* ========================================================= */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 font-display">
                      Supabase Cloud Backend
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Project: {supabaseProjectIdInput}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Every generated bill and bill item line is automatically recorded in your Supabase backend tables.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://supabase.com/dashboard/project/${supabaseProjectIdInput}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Open Supabase Console</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>

            {/* 2-Column Grid: Config on Left, SQL Schema on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
              {/* Left Column: Supabase Connection Details & Test */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Connection Credentials</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supabase Project ID
                    </label>
                    <input
                      type="text"
                      value={supabaseProjectIdInput}
                      onChange={(e) => setSupabaseProjectIdInput(e.target.value)}
                      placeholder="e.g. qmkhqxgmfjuidgxqcznw"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supabase API URL
                    </label>
                    <input
                      type="url"
                      value={supabaseUrlInput}
                      onChange={(e) => setSupabaseUrlInput(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Publishable / Anon API Key
                    </label>
                    <input
                      type="text"
                      value={supabaseAnonKeyInput}
                      onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                      placeholder="sb_publishable_..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleTestSupabaseConnection}
                    disabled={isTestingSupabase}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                    <span>Test Connection & Tables</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncAllSupabaseBills}
                    disabled={isSyncingSupabaseBills}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSupabaseBills ? 'animate-spin' : ''}`} />
                    <span>Sync All Bills Now</span>
                  </button>
                </div>

                {/* Diagnostic Test Feedback Box */}
                {testSupabaseResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      testSupabaseResult.tablesExist
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : testSupabaseResult.success
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    {testSupabaseResult.tablesExist ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : testSupabaseResult.success ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {testSupabaseResult.tablesExist
                          ? 'Supabase Connection & Tables Verified!'
                          : testSupabaseResult.success
                          ? 'Action Required: Run SQL Schema in Supabase'
                          : 'Supabase Connection Error'}
                      </div>
                      <div className="text-[11px] opacity-90 mt-1 leading-relaxed">
                        {testSupabaseResult.message}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Supabase SQL Setup Script & Instructions */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Supabase SQL Schema (Tables: bills & bill_items)
                    </h4>
                  </div>

                  <button
                    onClick={handleCopySupabaseSql}
                    className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    {copiedSupabaseSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSupabaseSql ? 'Copied SQL!' : 'Copy SQL'}</span>
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 text-xs space-y-1">
                  <p className="font-bold text-emerald-700">How to create tables in Supabase in 30 seconds:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-600 text-[11px]">
                    <li>Copy the SQL script using the button above.</li>
                    <li>Go to your Supabase Dashboard &gt; <strong className="text-slate-900">SQL Editor</strong>.</li>
                    <li>Click <strong className="text-slate-900">New query</strong>, paste the script, and click <strong className="text-emerald-700 font-bold">Run</strong>.</li>
                    <li>Return here and click <strong className="text-slate-900">Test Connection & Tables</strong>.</li>
                  </ol>
                </div>

                <div className="relative">
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-200 font-mono overflow-x-auto max-h-56 scrollbar-thin">
                    {SUPABASE_SCHEMA_SQL}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. GOOGLE APPS SCRIPT & GOOGLE SHEETS SECTION */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
                  <span>Google Apps Script Configuration</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Every generated bill is also posted automatically to your connected Google Sheet.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Google Apps Script Web App URL
                  </label>
                  <input
                    type="url"
                    value={scriptUrlInput}
                    onChange={(e) => setScriptUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must be deployed as a Web App with access set to "Anyone".
                  </p>
                </div>

                {/* Action Buttons for URL */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-xl hover:brightness-105 active:scale-95 transition-all shadow-md shadow-orange-500/20"
                  >
                    Save All Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingUrl || !scriptUrlInput.trim()}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    title="Verify if Google Apps Script API is running"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                    <span>Test API (GET)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPostSync}
                    disabled={isTestingPostSync || !scriptUrlInput.trim()}
                    className="py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    title="Send a sample test row to verify that write permissions work on your Google Sheet"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingPostSync ? 'animate-spin' : ''}`} />
                    <span>Test Sheet Write (POST)</span>
                  </button>
                </div>

                {/* GET Test Result */}
                {testUrlResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      testUrlResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testUrlResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {testUrlResult.success ? 'API Connection Active' : 'API Connection Failed'}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        {testUrlResult.message}
                      </div>
                    </div>
                  </div>
                )}

                {/* POST Write Test Result */}
                {testPostSyncResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      testPostSyncResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testPostSyncResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {testPostSyncResult.success ? 'Sheet Write Verified!' : 'Sheet Write Failed'}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        {testPostSyncResult.message}
                      </div>
                    </div>
                  </div>
                )}

                {settingsSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                    {settingsSuccessMsg}
                  </div>
                )}

                {/* Store Configurations */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Store Billing Defaults
                  </h4>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Default GST / Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={taxPercentInput}
                      onChange={(e) => setTaxPercentInput(e.target.value)}
                      className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono"
                    />
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="text-slate-400">Shop: </span>
                      <span className="text-slate-900 font-bold">{settings.shopName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Address: </span>
                      <span className="text-slate-800">{settings.shopAddress}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone: </span>
                      <span className="text-slate-900 font-mono font-medium">{settings.shopPhone}</span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Apps Script Guide & Code Copy */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Google Apps Script (Code.gs)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ready-to-use Google Apps Script backend code
                  </p>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-orange-600 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Step-by-step instructions */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <p className="font-bold text-orange-600">Quick 2-Minute Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>Open a new or existing Google Sheet.</li>
                  <li>In top menu, click <strong className="text-slate-900">Extensions &gt; Apps Script</strong>.</li>
                  <li>Delete any code in <code className="text-orange-600 font-semibold">Code.gs</code> and paste the copied code below.</li>
                  <li>Click <strong className="text-slate-900">Deploy &gt; New deployment</strong>.</li>
                  <li>Select type: <strong className="text-slate-900">Web app</strong>.</li>
                  <li>Execute as: <strong className="text-slate-900">Me</strong> · Who has access: <strong className="text-orange-600 font-bold">Anyone</strong>.</li>
                  <li>Click Deploy, copy the Web app URL, and paste it into the field on the left.</li>
                </ol>
              </div>

              {/* Code Snippet Box */}
              <div className="relative">
                <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-200 font-mono overflow-x-auto max-h-64 scrollbar-thin">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ------------------------------------------------------------- */}
      {/* TAB 4: MY PROFILE & OWNER PASSWORD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 font-display">
              Owner Profile & Security
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as <strong className="text-orange-600 font-mono">{currentAdmin.username}</strong>
            </p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={profileDisplayName}
                onChange={(e) => setProfileDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                <span>Change Password</span>
              </h4>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={profileCurrentPassword}
                  onChange={(e) => setProfileCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={profileNewPassword}
                    onChange={(e) => setProfileNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={profileConfirmPassword}
                    onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-sm rounded-xl hover:brightness-105 active:scale-95 transition-all shadow-md shadow-orange-500/20"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT ITEM */}
      {/* ------------------------------------------------------------- */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 font-display">
                {editingItem ? 'Edit Cracker Item' : 'Add New Cracker Item'}
              </h3>
              <button
                onClick={() => setItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemFormName}
                  onChange={(e) => setItemFormName(e.target.value)}
                  placeholder="e.g. 10cm Electric Sparklers"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={itemFormCategory}
                    onChange={(e) => setItemFormCategory(e.target.value as CrackerCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="Fuljhadi">Fuljhadi</option>
                    <option value="Sparklers">Sparklers</option>
                    <option value="Flower Pots">Flower Pots</option>
                    <option value="Ground Chakkars">Ground Chakkars</option>
                    <option value="Rockets">Rockets</option>
                    <option value="Sound Crackers">Sound Crackers</option>
                    <option value="Gift Boxes">Gift Boxes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Type
                  </label>
                  <input
                    type="text"
                    value={itemFormUnit}
                    onChange={(e) => setItemFormUnit(e.target.value)}
                    placeholder="Box, Pkt, Roll, Piece"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price per Unit (₹) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={itemFormPrice}
                    onChange={(e) => setItemFormPrice(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={itemFormStock}
                    onChange={(e) => setItemFormStock(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={itemFormDesc}
                  onChange={(e) => setItemFormDesc(e.target.value)}
                  placeholder="Short description of safety, color or sound..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="itemFormAvailable"
                  checked={itemFormAvailable}
                  onChange={(e) => setItemFormAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-0 focus:outline-none bg-slate-50 border-slate-300"
                />
                <label htmlFor="itemFormAvailable" className="text-xs text-slate-700 cursor-pointer">
                  Available in shop catalogue (uncheck to hide from staff billing screen)
                </label>
              </div>

              {itemFormError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{itemFormError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-bold rounded-xl hover:brightness-105 active:scale-95 shadow-md shadow-orange-500/20"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Confirm Item Deletion
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete this cracker item from the catalogue?
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setDeleteConfirmationId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Yes, Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
