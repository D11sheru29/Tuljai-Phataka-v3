import { Bill, SyncStatus } from '../types';
import {
  getRetryQueue,
  getStoredBills,
  getStoredSettings,
  updateBillSyncState,
} from '../utils/storage';

export interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
  isDuplicate?: boolean;
}

/**
 * Format bill payload matching the exact specification:
 * billNo, date, time, customerName, customerPhone, items (name, category, qty, unitPrice, lineTotal),
 * subtotal, discountPercent, discountAmount, taxPercent, taxAmount, grandTotal, billedBy.
 */
export function formatBillPayload(bill: Bill) {
  return {
    billNo: bill.billNo,
    date: bill.date,
    time: bill.time,
    customerName: bill.customerName || 'Walk-in Customer',
    customerPhone: bill.customerPhone || '',
    items: bill.items.map((it) => ({
      name: it.name,
      category: it.category,
      qty: it.qty,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
    })),
    subtotal: bill.subtotal,
    discountPercent: bill.discountPercent,
    discountAmount: bill.discountAmount,
    taxPercent: bill.taxPercent,
    taxAmount: bill.taxAmount,
    grandTotal: bill.grandTotal,
    billedBy: bill.billedBy || 'Counter Staff',
  };
}

/**
 * Sends a single bill to Google Sheets via Google Apps Script.
 * Uses a robust multi-tier approach:
 * Tier 1: Server proxy (/api/sync-bill) which natively follows 302 redirects with zero browser CORS blocking.
 * Tier 2: Direct browser fetch POST with text/plain (avoids preflight) and redirect: 'follow'.
 * Tier 3: GET query parameter fallback (?action=save_bill) if browser blocks POST cross-origin redirects.
 */
export async function sendBillToAppsScript(
  bill: Bill,
  scriptUrlOverride?: string
): Promise<SyncResult> {
  const settings = getStoredSettings();
  const targetUrl = (scriptUrlOverride || settings.scriptUrl || '').trim();

  if (!targetUrl) {
    updateBillSyncState(bill.billNo, 'Pending', 'Google Sheet URL not configured');
    return {
      success: false,
      message: 'Google Sheet URL not configured',
      error: 'No Web App URL set in Admin Settings',
    };
  }

  const payload = formatBillPayload(bill);

  // --- Tier 1: Local server proxy (/api/sync-bill) ---
  try {
    const proxyResponse = await fetch('/api/sync-bill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scriptUrl: targetUrl,
        payload,
      }),
    });

    if (proxyResponse.ok) {
      const proxyJson = await proxyResponse.json();
      if (proxyJson.status === 'success') {
        updateBillSyncState(bill.billNo, 'Synced');
        return {
          success: true,
          message: proxyJson.message || 'Synced to Google Sheet',
          isDuplicate: Boolean(proxyJson.isDuplicate),
        };
      } else {
        const errorMsg = proxyJson.message || 'Google Apps Script returned an error';
        updateBillSyncState(bill.billNo, 'Failed', errorMsg);
        return {
          success: false,
          message: errorMsg,
          error: errorMsg,
        };
      }
    } else {
      // If server responded with 4xx from Google Apps Script, parse details
      const errorJson = await proxyResponse.json().catch(() => null);
      if (errorJson && errorJson.message) {
        updateBillSyncState(bill.billNo, 'Failed', errorJson.message);
        return {
          success: false,
          message: errorJson.message,
          error: errorJson.message,
        };
      }
    }
  } catch {
    // Server proxy route unavailable or network down, proceed to browser direct fetch
  }

  // --- Tier 2: Direct browser POST fetch ---
  try {
    const directResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (directResponse.ok) {
      const resultText = await directResponse.text();
      let json: any = null;
      try {
        json = JSON.parse(resultText);
      } catch {
        // Text output
      }

      if (json && json.status === 'error') {
        const errMsg = json.message || 'Google Apps Script reported an error';
        updateBillSyncState(bill.billNo, 'Failed', errMsg);
        return { success: false, message: errMsg, error: errMsg };
      }

      updateBillSyncState(bill.billNo, 'Synced');
      return {
        success: true,
        message: json?.message || resultText || 'Synced to Google Sheet',
        isDuplicate: Boolean(json?.isDuplicate),
      };
    } else {
      const err = `HTTP ${directResponse.status}: ${directResponse.statusText}`;
      updateBillSyncState(bill.billNo, 'Failed', err);
      return { success: false, message: 'Server returned error', error: err };
    }
  } catch (directErr: any) {
    // Direct POST failed (often browser cross-origin redirect blocking)
    // --- Tier 3: GET query parameter fallback ---
    try {
      const separator = targetUrl.includes('?') ? '&' : '?';
      const getFallbackUrl = `${targetUrl}${separator}action=save_bill&payload=${encodeURIComponent(
        JSON.stringify(payload)
      )}&t=${Date.now()}`;

      const getResponse = await fetch(getFallbackUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      if (getResponse.ok) {
        const getText = await getResponse.text();
        let getJson: any = null;
        try {
          getJson = JSON.parse(getText);
        } catch {}

        if (getJson && getJson.status === 'error') {
          const errMsg = getJson.message || 'Apps Script returned error';
          updateBillSyncState(bill.billNo, 'Failed', errMsg);
          return { success: false, message: errMsg, error: errMsg };
        }

        updateBillSyncState(bill.billNo, 'Synced');
        return {
          success: true,
          message: getJson?.message || 'Synced to Google Sheet via GET fallback',
          isDuplicate: Boolean(getJson?.isDuplicate),
        };
      }
    } catch {
      // GET fallback also failed
    }

    const errorMsg =
      directErr?.message ||
      'Failed to reach Google Apps Script. Please verify the Web App deployment has "Who has access: Anyone".';
    updateBillSyncState(bill.billNo, 'Failed', errorMsg);
    return {
      success: false,
      message: 'Failed to send to Google Sheet',
      error: errorMsg,
    };
  }
}

/**
 * Tests the connection to the Google Apps Script URL using doGet()
 */
export async function testAppsScriptConnection(url: string): Promise<SyncResult> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return {
      success: false,
      message: 'Please provide a valid Web App URL',
      error: 'URL is empty',
    };
  }

  // Try server proxy test first
  try {
    const proxyRes = await fetch('/api/test-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: cleanUrl }),
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.status === 'success') {
        return {
          success: true,
          message: data.message || 'Connected! "TULJAI PHATAKA billing API is running"',
        };
      }
    }
  } catch {}

  // Direct client test fallback
  try {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const testUrl = `${cleanUrl}${separator}format=json&t=${Date.now()}`;
    const response = await fetch(testUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (response.ok) {
      const text = await response.text();
      let msg = text;
      try {
        const json = JSON.parse(text);
        msg = json.message || text;
      } catch {}
      return {
        success: true,
        message: msg || 'Connected! "TULJAI PHATAKA billing API is running"',
      };
    } else {
      return {
        success: false,
        message: `HTTP error: ${response.status} ${response.statusText}`,
        error: `Status ${response.status}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message:
        'Connection failed. Please ensure the Web App is deployed with "Who has access: Anyone".',
      error: err?.message || 'Network error',
    };
  }
}

/**
 * Tests sending a real test bill ping to Google Apps Script to verify write access
 */
export async function testAppsScriptPostSync(url: string): Promise<SyncResult> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return {
      success: false,
      message: 'Please provide a valid Web App URL',
      error: 'URL is empty',
    };
  }

  const dummyBill: Bill = {
    id: `test-${Date.now()}`,
    billNo: `TEST-PING-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    customerName: 'API Connection Test',
    customerPhone: '9999999999',
    items: [
      {
        name: 'Connection Test Item',
        category: 'Test',
        qty: 1,
        unitPrice: 10,
        lineTotal: 10,
      },
    ],
    subtotal: 10,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 10,
    billedBy: 'System Diagnostic',
    syncStatus: 'Pending',
  };

  return sendBillToAppsScript(dummyBill, cleanUrl);
}

/**
 * Background auto-sync runner: checks the retry queue and pending bills
 */
export async function processRetryQueue(): Promise<{
  attempted: number;
  synced: number;
  failed: number;
}> {
  const settings = getStoredSettings();
  if (!settings.scriptUrl || !settings.scriptUrl.trim()) {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  // Get all bills that are not 'Synced'
  const allBills = getStoredBills();
  const queueBillNos = getRetryQueue();
  const billsToSync = allBills.filter(
    (b) => b.syncStatus !== 'Synced' || queueBillNos.includes(b.billNo)
  );

  if (billsToSync.length === 0) {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const bill of billsToSync) {
    const res = await sendBillToAppsScript(bill, settings.scriptUrl);
    if (res.success) {
      syncedCount++;
    } else {
      failedCount++;
    }
  }

  return {
    attempted: billsToSync.length,
    synced: syncedCount,
    failed: failedCount,
  };
}
