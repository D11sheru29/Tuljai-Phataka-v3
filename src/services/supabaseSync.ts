import { Bill } from '../types';
import { getStoredBills, updateBillSupabaseSyncState } from '../utils/storage';
import { createSupabaseInstance, getSupabaseConfig } from './supabaseClient';

export interface SupabaseSyncResult {
  success: boolean;
  message: string;
  error?: string;
  isDuplicate?: boolean;
  tablesMissing?: boolean;
}

export interface SupabaseTestResult {
  success: boolean;
  message: string;
  tablesExist: boolean;
  error?: string;
}

/**
 * Format bill header record for Supabase 'bills' table
 */
export function formatSupabaseBill(bill: Bill) {
  const itemsSummary = bill.items
    .map((it) => `${it.name} (${it.qty} ${it.qty > 1 ? 'units' : 'unit'})`)
    .join(', ');
  const itemsCount = bill.items.reduce((acc, it) => acc + it.qty, 0);

  return {
    id: bill.id || `bill-${Date.now()}`,
    bill_no: bill.billNo,
    date: bill.date,
    time: bill.time,
    timestamp: bill.timestamp || Date.now(),
    customer_name: bill.customerName?.trim() || 'Walk-in Customer',
    customer_phone: bill.customerPhone?.trim() || '',
    subtotal: Number(bill.subtotal.toFixed(2)),
    discount_percent: Number(bill.discountPercent.toFixed(2)),
    discount_amount: Number(bill.discountAmount.toFixed(2)),
    tax_percent: Number(bill.taxPercent.toFixed(2)),
    tax_amount: Number(bill.taxAmount.toFixed(2)),
    grand_total: Number(bill.grandTotal.toFixed(2)),
    billed_by: bill.billedBy || 'Shop Admin',
    items_summary: itemsSummary,
    items_count: itemsCount,
    sync_status: 'Synced',
    synced_at: new Date().toISOString(),
  };
}

/**
 * Format bill item lines for Supabase 'bill_items' table
 */
export function formatSupabaseBillItems(bill: Bill) {
  return bill.items.map((it) => ({
    bill_no: bill.billNo,
    name: it.name,
    category: it.category || 'General',
    qty: it.qty,
    unit_price: Number(it.unitPrice.toFixed(2)),
    line_total: Number(it.lineTotal.toFixed(2)),
  }));
}

/**
 * Tests connection to the Supabase backend project and verifies if the 'bills' table exists.
 */
export async function testSupabaseConnection(): Promise<SupabaseTestResult> {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return {
      success: false,
      message: 'Supabase URL or Publishable Key is missing in configuration',
      tablesExist: false,
      error: 'Missing credentials',
    };
  }

  // Tier 1: Try server-side test endpoint
  try {
    const serverRes = await fetch('/api/supabase/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      return {
        success: data.success,
        message: data.message,
        tablesExist: Boolean(data.tablesExist),
        error: data.error,
      };
    }
  } catch {
    // Proceed to direct client SDK check
  }

  // Tier 2: Direct Supabase client query
  try {
    const client = createSupabaseInstance();
    const { data: _data, error } = await client
      .from('bills')
      .select('bill_no')
      .limit(1);

    if (!error) {
      return {
        success: true,
        tablesExist: true,
        message: `Connected! Supabase project '${config.projectId}' is online and 'bills' table is verified.`,
      };
    }

    // Check if table missing (PGRST205 error code)
    if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
      return {
        success: true,
        tablesExist: false,
        message: `Connected to Supabase project '${config.projectId}', but the 'bills' table is not created yet. Please run the SQL schema in your Supabase SQL Editor.`,
        error: error.message,
      };
    }

    // Other PostgREST error
    return {
      success: false,
      tablesExist: false,
      message: `Supabase query error (${error.code || 'UNKNOWN'}): ${error.message}`,
      error: error.message,
    };
  } catch (err: any) {
    return {
      success: false,
      tablesExist: false,
      message: err?.message || 'Failed to connect to Supabase project',
      error: err?.message,
    };
  }
}

/**
 * Saves a generated bill to Supabase tables 'bills' and 'bill_items'.
 * Uses server-side proxy route with fallback to direct client SDK.
 */
export async function saveBillToSupabase(bill: Bill): Promise<SupabaseSyncResult> {
  const config = getSupabaseConfig();
  const billRecord = formatSupabaseBill(bill);
  const itemsRecords = formatSupabaseBillItems(bill);

  // --- Tier 1: Server-side proxy (/api/supabase/sync-bill) ---
  try {
    const proxyRes = await fetch('/api/supabase/sync-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config,
        bill: billRecord,
        items: itemsRecords,
      }),
    });

    if (proxyRes.ok) {
      const result = await proxyRes.json();
      if (result.success) {
        updateBillSupabaseSyncState(bill.billNo, 'Synced');
        return {
          success: true,
          message: result.message || 'Saved to Supabase backend successfully',
          isDuplicate: Boolean(result.isDuplicate),
        };
      } else {
        const errMsg = result.message || 'Failed to save bill to Supabase';
        updateBillSupabaseSyncState(bill.billNo, 'Failed', errMsg);
        return {
          success: false,
          message: errMsg,
          error: result.error,
          tablesMissing: Boolean(result.tablesMissing),
        };
      }
    }
  } catch {
    // Server proxy failed or network issue; proceed to client SDK
  }

  // --- Tier 2: Direct browser client SDK ---
  try {
    const client = createSupabaseInstance();

    // 1. Upsert into 'bills' table (prevents duplicate key errors)
    const { error: billError } = await client
      .from('bills')
      .upsert(billRecord, { onConflict: 'bill_no' });

    if (billError) {
      // Check for missing table
      if (billError.code === 'PGRST205' || billError.message?.includes('schema cache')) {
        const msg = `Supabase 'bills' table not found. Please run the SQL schema in your Supabase SQL Editor.`;
        updateBillSupabaseSyncState(bill.billNo, 'Failed', msg);
        return {
          success: false,
          message: msg,
          error: billError.message,
          tablesMissing: true,
        };
      }

      updateBillSupabaseSyncState(bill.billNo, 'Failed', billError.message);
      return {
        success: false,
        message: `Supabase bills table error: ${billError.message}`,
        error: billError.message,
      };
    }

    // 2. Insert items into 'bill_items' table (delete old items for this bill if re-syncing to avoid duplication)
    try {
      await client.from('bill_items').delete().eq('bill_no', bill.billNo);
    } catch {
      // ignore
    }

    if (itemsRecords.length > 0) {
      const { error: itemsError } = await client
        .from('bill_items')
        .insert(itemsRecords);

      if (itemsError) {
        console.warn('Supabase bill_items insert error:', itemsError);
      }
    }

    updateBillSupabaseSyncState(bill.billNo, 'Synced');
    return {
      success: true,
      message: `Bill ${bill.billNo} saved to Supabase successfully`,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Error connecting to Supabase';
    updateBillSupabaseSyncState(bill.billNo, 'Failed', errorMsg);
    return {
      success: false,
      message: 'Failed to sync bill to Supabase',
      error: errorMsg,
    };
  }
}

/**
 * Synchronize all bills that have not yet been synced to Supabase
 */
export async function syncAllPendingSupabaseBills(): Promise<{
  attempted: number;
  synced: number;
  failed: number;
  tablesMissing?: boolean;
}> {
  const allBills = getStoredBills();
  const pendingBills = allBills.filter((b) => b.supabaseSyncStatus !== 'Synced');

  if (pendingBills.length === 0) {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;
  let tablesMissing = false;

  for (const bill of pendingBills) {
    const res = await saveBillToSupabase(bill);
    if (res.success) {
      synced++;
    } else {
      failed++;
      if (res.tablesMissing) {
        tablesMissing = true;
      }
    }
  }

  return {
    attempted: pendingBills.length,
    synced,
    failed,
    tablesMissing,
  };
}
