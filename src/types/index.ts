export type CrackerCategory =
  | 'Fuljhadi'
  | 'Sparklers'
  | 'Flower Pots'
  | 'Ground Chakkars'
  | 'Rockets'
  | 'Sound Crackers'
  | 'Gift Boxes'
  | 'Combos';

export interface ComboItemEntry {
  name: string;
  qty: number;
  category?: string;
}

export interface ComboOffer {
  id: string; // 'combo-1', 'combo-2', 'combo-3'
  comboNumber: number; // 1, 2, 3
  name: string;
  tagline: string;
  itemCount: number; // 18, 18, 21
  price: number; // 1699, 1999, 3499
  originalPrice: number;
  stock: number; // Admin-manageable quantity available
  isAvailable: boolean;
  isLimitedOffer: boolean;
  badge?: string;
  description: string;
  itemsIncluded: ComboItemEntry[];
}

export interface CrackerItem {
  id: string;
  name: string;
  category: CrackerCategory;
  price: number; // in ₹
  stock: number;
  imageUrl?: string;
  isAvailable: boolean;
  description?: string;
  unit?: string; // e.g. "Box", "Pkt", "Piece"
}

export interface CartItem {
  item: CrackerItem;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BillItemLine {
  name: string;
  category: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export type SyncStatus = 'Synced' | 'Pending' | 'Failed';

export interface Bill {
  id: string;
  billNo: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  timestamp: number;
  customerName?: string;
  customerPhone?: string;
  items: BillItemLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  billedBy: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
  lastSyncError?: string;
  retryCount?: number;
  // Supabase Sync Tracking
  supabaseSyncStatus?: SyncStatus;
  supabaseSyncedAt?: string;
  supabaseError?: string;
}

export type AdminUsername =
  | 'Shreyashbhut'
  | 'Ompatriwar'
  | 'Tilakrai'
  | 'Vedyadav';

export interface AdminAccount {
  username: AdminUsername;
  displayName: string;
  password: string;
}

export interface AppSettings {
  scriptUrl: string;
  defaultTaxPercent: number;
  shopName: string;
  shopTagline: string;
  shopAddress: string;
  shopPhone: string;
  shopGstin?: string;
  autoSyncIntervalSec: number;
  // Supabase Backend Settings
  supabaseProjectId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

