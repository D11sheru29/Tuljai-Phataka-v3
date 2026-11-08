import { AdminAccount, AppSettings, Bill, ComboOffer, CrackerItem, SyncStatus } from '../types';
import { INITIAL_ADMINS, INITIAL_COMBOS, INITIAL_ITEMS, INITIAL_SETTINGS } from '../data/initialData';

const KEYS = {
  ITEMS: 'tp_items_v1',
  COMBOS: 'tp_combos_v1',
  BILLS: 'tp_bills_v1',
  RETRY_QUEUE: 'tp_retry_queue_v1',
  SETTINGS: 'tp_settings_v1',
  ADMINS: 'tp_admins_v1',
  AUTH: 'tp_current_admin_v1',
  BILL_SEQ: 'tp_bill_seq_v1',
};

// Safe localStorage wrapper
function getItemSafe<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultValue;
  }
}

function setItemSafe<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
}

// 1. Items
export function getStoredItems(): CrackerItem[] {
  const version = getItemSafe<string>('tp_catalog_version_34', '');
  if (version !== '34_items_v1') {
    setItemSafe(KEYS.ITEMS, INITIAL_ITEMS);
    setItemSafe('tp_catalog_version_34', '34_items_v1');
    return INITIAL_ITEMS;
  }
  const items = getItemSafe<CrackerItem[]>(KEYS.ITEMS, []);
  if (!items || items.length === 0) {
    setItemSafe(KEYS.ITEMS, INITIAL_ITEMS);
    return INITIAL_ITEMS;
  }
  return items;
}

export function resetToDefaultCatalogue(): CrackerItem[] {
  setItemSafe(KEYS.ITEMS, INITIAL_ITEMS);
  setItemSafe('tp_catalog_version_34', '34_items_v1');
  return INITIAL_ITEMS;
}

export function saveStoredItems(items: CrackerItem[]): void {
  setItemSafe(KEYS.ITEMS, items);
}

export function deductStockForBill(billItems: { name: string; qty: number }[]): void {
  const currentItems = getStoredItems();
  const updated = currentItems.map((item) => {
    const matched = billItems.find((b) => b.name === item.name);
    if (matched) {
      const newStock = Math.max(0, item.stock - matched.qty);
      return {
        ...item,
        stock: newStock,
      };
    }
    return item;
  });
  saveStoredItems(updated);
  // Also deduct stock for any combo packs in the bill
  deductComboStockForBill(billItems);
}

// 1.5 Combos Management
export function getStoredCombos(): ComboOffer[] {
  const combos = getItemSafe<ComboOffer[]>(KEYS.COMBOS, []);
  if (!combos || combos.length === 0) {
    setItemSafe(KEYS.COMBOS, INITIAL_COMBOS);
    return INITIAL_COMBOS;
  }
  // Ensure all 3 requested combos exist
  const hasAll3 = [1, 2, 3].every((num) => combos.some((c) => c.comboNumber === num));
  if (!hasAll3) {
    // Merge or reset to ensure standard 3 combos
    const merged = INITIAL_COMBOS.map((initCombo) => {
      const existing = combos.find((c) => c.comboNumber === initCombo.comboNumber);
      return existing || initCombo;
    });
    setItemSafe(KEYS.COMBOS, merged);
    return merged;
  }
  return combos;
}

export function saveStoredCombos(combos: ComboOffer[]): void {
  setItemSafe(KEYS.COMBOS, combos);
}

export function updateComboStock(comboId: string, newStock: number): void {
  const combos = getStoredCombos();
  const updated = combos.map((c) =>
    c.id === comboId ? { ...c, stock: Math.max(0, newStock) } : c
  );
  saveStoredCombos(updated);
}

export function updateComboDetails(updatedCombo: ComboOffer): void {
  const combos = getStoredCombos();
  const updated = combos.map((c) => (c.id === updatedCombo.id ? updatedCombo : c));
  saveStoredCombos(updated);
}

export function deductComboStockForBill(billItems: { name: string; qty: number }[]): void {
  const combos = getStoredCombos();
  let changed = false;
  const updated = combos.map((combo) => {
    // Match either by full combo name or combo number identifier
    const matched = billItems.find(
      (b) =>
        b.name.includes(combo.name) ||
        b.name.toLowerCase().includes(`combo ${combo.comboNumber}`) ||
        b.name.toLowerCase().includes(`combo-${combo.comboNumber}`)
    );
    if (matched) {
      changed = true;
      return {
        ...combo,
        stock: Math.max(0, combo.stock - matched.qty),
      };
    }
    return combo;
  });
  if (changed) {
    saveStoredCombos(updated);
  }
}

export function comboToCrackerItem(combo: ComboOffer): CrackerItem {
  return {
    id: combo.id,
    name: `${combo.name} (${combo.itemCount} Items)`,
    category: 'Combos',
    price: combo.price,
    stock: combo.stock,
    isAvailable: combo.isAvailable && combo.stock > 0,
    unit: 'Combo Pack',
    description: `Limited Offer (${combo.itemCount} Items for ₹${combo.price.toLocaleString('en-IN')}) - ${combo.tagline}`,
  };
}

// 2. Bills
export function getStoredBills(): Bill[] {
  return getItemSafe<Bill[]>(KEYS.BILLS, []);
}

export function saveStoredBills(bills: Bill[]): void {
  setItemSafe(KEYS.BILLS, bills);
}

export function saveNewBill(bill: Bill): void {
  const currentBills = getStoredBills();
  // Prevent duplicate billNo
  const existingIdx = currentBills.findIndex((b) => b.billNo === bill.billNo);
  if (existingIdx >= 0) {
    currentBills[existingIdx] = bill;
  } else {
    currentBills.unshift(bill); // latest first
  }
  saveStoredBills(currentBills);
}

export function deleteStoredBill(billNo: string): void {
  const currentBills = getStoredBills();
  const updated = currentBills.filter((b) => b.billNo !== billNo);
  saveStoredBills(updated);
  removeFromRetryQueue(billNo);
}

export function updateBillSyncState(
  billNo: string,
  status: SyncStatus,
  error?: string
): void {
  const currentBills = getStoredBills();
  const updated = currentBills.map((b) => {
    if (b.billNo === billNo) {
      return {
        ...b,
        syncStatus: status,
        syncedAt: status === 'Synced' ? new Date().toISOString() : b.syncedAt,
        lastSyncError: error,
      };
    }
    return b;
  });
  saveStoredBills(updated);

  // Manage retry queue
  if (status === 'Synced') {
    removeFromRetryQueue(billNo);
  } else if (status === 'Failed' || status === 'Pending') {
    addToRetryQueue(billNo);
  }
}

export function updateBillSupabaseSyncState(
  billNo: string,
  status: SyncStatus,
  error?: string
): void {
  const currentBills = getStoredBills();
  const updated = currentBills.map((b) => {
    if (b.billNo === billNo) {
      return {
        ...b,
        supabaseSyncStatus: status,
        supabaseSyncedAt: status === 'Synced' ? new Date().toISOString() : b.supabaseSyncedAt,
        supabaseError: error,
      };
    }
    return b;
  });
  saveStoredBills(updated);
}

// 3. Retry Queue
export function getRetryQueue(): string[] {
  return getItemSafe<string[]>(KEYS.RETRY_QUEUE, []);
}

export function addToRetryQueue(billNo: string): void {
  const queue = getRetryQueue();
  if (!queue.includes(billNo)) {
    queue.push(billNo);
    setItemSafe(KEYS.RETRY_QUEUE, queue);
  }
}

export function removeFromRetryQueue(billNo: string): void {
  const queue = getRetryQueue();
  const filtered = queue.filter((id) => id !== billNo);
  setItemSafe(KEYS.RETRY_QUEUE, filtered);
}

// 4. Settings
export function getStoredSettings(): AppSettings {
  const settings = getItemSafe<AppSettings | null>(KEYS.SETTINGS, null);
  if (!settings) {
    setItemSafe(KEYS.SETTINGS, INITIAL_SETTINGS);
    return INITIAL_SETTINGS;
  }
  return {
    ...INITIAL_SETTINGS,
    ...settings,
    shopAddress: settings.shopAddress === 'Main Market Road, Near Tuljabhavani Temple Gate, Solapur Highway' ? '' : (settings.shopAddress || ''),
    shopPhone: settings.shopPhone === '+91 98765 43210' ? '+91 9067766862, +91 9270047802, +91 7219440949, +91 9172184846' : (settings.shopPhone || '+91 9067766862, +91 9270047802, +91 7219440949, +91 9172184846'),
    shopGstin: settings.shopGstin === '27AABCT1234F1Z5' ? '' : (settings.shopGstin || ''),
    supabaseProjectId: (settings.supabaseProjectId === 'ijftsmhpmvcfjynuxogz' || !settings.supabaseProjectId) ? INITIAL_SETTINGS.supabaseProjectId : settings.supabaseProjectId,
    supabaseUrl: (settings.supabaseUrl === 'https://ijftsmhpmvcfjynuxogz.supabase.co' || !settings.supabaseUrl) ? INITIAL_SETTINGS.supabaseUrl : settings.supabaseUrl,
    supabaseAnonKey: (settings.supabaseAnonKey === 'sb_publishable_nXL5zwfUjwf_pXXVjErMyQ_PX61KQ1K' || !settings.supabaseAnonKey) ? INITIAL_SETTINGS.supabaseAnonKey : settings.supabaseAnonKey,
  };
}


export function saveStoredSettings(settings: AppSettings): void {
  setItemSafe(KEYS.SETTINGS, settings);
}

// 5. Admin Accounts
export function getStoredAdmins(): AdminAccount[] {
  const admins = getItemSafe<AdminAccount[]>(KEYS.ADMINS, []);
  const validUsernames = ['Shreyashbhut', 'Ompatriwar', 'Tilakrai', 'Vedyadav'];
  
  // Check if current stored accounts need migration to the 4 designated admins
  const needsMigration =
    !admins ||
    admins.length !== 4 ||
    !admins.every((a) => validUsernames.includes(a.username));

  if (needsMigration) {
    setItemSafe(KEYS.ADMINS, INITIAL_ADMINS);
    return INITIAL_ADMINS;
  }
  return admins;
}

export function saveStoredAdmins(admins: AdminAccount[]): void {
  setItemSafe(KEYS.ADMINS, admins);
}

export function getStoredAuth(): AdminAccount | null {
  const auth = getItemSafe<AdminAccount | null>(KEYS.AUTH, null);
  const validUsernames = ['Shreyashbhut', 'Ompatriwar', 'Tilakrai', 'Vedyadav'];
  if (auth && validUsernames.includes(auth.username)) {
    return auth;
  }
  // Clear any obsolete session
  if (auth) {
    setStoredAuth(null);
  }
  return null;
}

export function setStoredAuth(admin: AdminAccount | null): void {
  setItemSafe(KEYS.AUTH, admin);
}

// 6. Sequential Bill Number Generator
export function generateNextBillNo(): string {
  const currentSeq = getItemSafe<number>(KEYS.BILL_SEQ, 1000);
  const nextSeq = currentSeq + 1;
  setItemSafe(KEYS.BILL_SEQ, nextSeq);
  return `TP-${nextSeq}`;
}

export function peekNextBillNo(): string {
  const currentSeq = getItemSafe<number>(KEYS.BILL_SEQ, 1000);
  return `TP-${currentSeq + 1}`;
}
