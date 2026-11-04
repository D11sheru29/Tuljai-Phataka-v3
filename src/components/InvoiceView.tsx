import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import { Bill } from '../types';
import { sendBillToAppsScript } from '../services/sheetsSync';
import { saveBillToSupabase } from '../services/supabaseSync';

interface InvoiceViewProps {
  bill: Bill;
  onClose: () => void;
  onNewBill: () => void;
  onBillUpdated?: (updatedBill: Bill) => void;
  onNavigateToHistory?: () => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  bill: initialBill,
  onClose,
  onNewBill,
  onBillUpdated,
  onNavigateToHistory,
}) => {
  const [bill, setBill] = useState<Bill>(initialBill);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [isRetryingSupabase, setIsRetryingSupabase] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Triggers native browser print dialog which has "Save as PDF" option pre-selected or easily available
    window.print();
  };

  const handleManualSyncRetry = async () => {
    setIsRetryingSync(true);
    setSyncFeedback(null);
    try {
      const result = await sendBillToAppsScript(bill);
      if (result.success) {
        const updated = {
          ...bill,
          syncStatus: 'Synced' as const,
          syncedAt: new Date().toISOString(),
          lastSyncError: undefined,
        };
        setBill(updated);
        onBillUpdated?.(updated);
        setSyncFeedback('Successfully synced to Google Sheet!');
      } else {
        const updated = {
          ...bill,
          syncStatus: 'Failed' as const,
          lastSyncError: result.error || result.message,
        };
        setBill(updated);
        onBillUpdated?.(updated);
        setSyncFeedback(`Sheet sync failed: ${result.error || result.message}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sheet sync error: ${err?.message || 'Network error'}`);
    } finally {
      setIsRetryingSync(false);
    }
  };

  const handleManualSupabaseRetry = async () => {
    setIsRetryingSupabase(true);
    setSyncFeedback(null);
    try {
      const result = await saveBillToSupabase(bill);
      if (result.success) {
        const updated = {
          ...bill,
          supabaseSyncStatus: 'Synced' as const,
          supabaseSyncedAt: new Date().toISOString(),
          supabaseError: undefined,
        };
        setBill(updated);
        onBillUpdated?.(updated);
        setSyncFeedback('Successfully saved to Supabase backend tables!');
      } else {
        const updated = {
          ...bill,
          supabaseSyncStatus: 'Failed' as const,
          supabaseError: result.error || result.message,
        };
        setBill(updated);
        onBillUpdated?.(updated);
        setSyncFeedback(`Supabase sync failed: ${result.message}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Supabase sync error: ${err?.message || 'Network error'}`);
    } finally {
      setIsRetryingSupabase(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="no-print flex flex-wrap items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              Bill Invoice Preview
            </span>

            {/* Google Sheet Sync Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full ${
                bill.syncStatus === 'Synced'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : bill.syncStatus === 'Pending'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
              title="Google Sheet Sync Status"
            >
              {bill.syncStatus === 'Synced' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : bill.syncStatus === 'Pending' ? (
                <Clock className="w-3 h-3 text-amber-600" />
              ) : (
                <XCircle className="w-3 h-3 text-rose-600" />
              )}
              <span>Sheet: {bill.syncStatus}</span>
            </span>

            {/* Supabase Sync Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full ${
                bill.supabaseSyncStatus === 'Synced'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : bill.supabaseSyncStatus === 'Pending'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title="Supabase Backend Tables Sync Status"
            >
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Supabase: {bill.supabaseSyncStatus || 'Pending'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {bill.supabaseSyncStatus !== 'Synced' && (
              <button
                onClick={handleManualSupabaseRetry}
                disabled={isRetryingSupabase}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors disabled:opacity-50"
                title="Retry saving to Supabase backend tables"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingSupabase ? 'animate-spin' : ''}`} />
                <span>Retry Supabase</span>
              </button>
            )}

            {bill.syncStatus !== 'Synced' && (
              <button
                onClick={handleManualSyncRetry}
                disabled={isRetryingSync}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors disabled:opacity-50"
                title="Retry saving to Google Sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingSync ? 'animate-spin' : ''}`} />
                <span>Retry Sheet</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close invoice preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Sync Feedback Alert (if manual retry) */}
        {syncFeedback && (
          <div className="no-print px-5 py-2 text-xs bg-slate-100 border-b border-slate-200 text-slate-800 flex items-center justify-between">
            <span>{syncFeedback}</span>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-500 hover:text-slate-800 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Printable Invoice Sheet */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-white text-slate-900 printable-area select-text">
          {/* Invoice Header */}
          <div className="border-b-2 border-slate-900 pb-5 text-center sm:text-left sm:flex sm:justify-between sm:items-start">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 uppercase font-display">
                TULJAI PHATAKA
              </h1>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                Authorized Crackers & Fireworks Wholesale & Retail
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Main Market Road, Near Tuljabhavani Temple Gate, Solapur Highway
              </p>
              <p className="text-xs text-slate-500">
                Phone: +91 98765 43210 · GSTIN: 27AABCT1234F1Z5
              </p>
            </div>

            <div className="mt-4 sm:mt-0 text-center sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                TAX INVOICE / CASH BILL
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-950 font-mono tracking-tight mt-0.5">
                {bill.billNo}
              </div>
              <div className="text-xs text-slate-600 font-mono tabular-nums mt-1">
                Date: {bill.date} · {bill.time}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Billed By: <span className="font-semibold text-slate-700">{bill.billedBy}</span>
              </div>
            </div>
          </div>

          {/* Customer Details Row */}
          <div className="py-3 px-4 my-4 bg-slate-50 border border-slate-200 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Customer Name: </span>
              <span className="font-semibold text-slate-900">
                {bill.customerName && bill.customerName.trim() ? bill.customerName : 'Walk-in Customer'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Contact Number: </span>
              <span className="font-semibold text-slate-900 font-mono">
                {bill.customerPhone && bill.customerPhone.trim() ? bill.customerPhone : 'N/A'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-700">
                  <th className="py-2.5 px-3 font-bold text-center w-10">#</th>
                  <th className="py-2.5 px-3 font-bold">Item Description</th>
                  <th className="py-2.5 px-3 font-bold hidden sm:table-cell">Category</th>
                  <th className="py-2.5 px-3 font-bold text-center w-16">Qty</th>
                  <th className="py-2.5 px-3 font-bold text-right w-24">Rate (₹)</th>
                  <th className="py-2.5 px-3 font-bold text-right w-24">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bill.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 hidden sm:table-cell">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-mono tabular-nums">
                      {item.qty}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      ₹{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ₹{item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invoice Summary & Totals */}
          <div className="border-t-2 border-slate-800 mt-4 pt-3 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="text-[11px] text-slate-500 max-w-xs">
              <p className="font-semibold text-slate-700 mb-1">Terms & Conditions:</p>
              <p>1. Check items before leaving the counter.</p>
              <p>2. Keep fireworks in dry, cool places away from children.</p>
              <p>3. Strictly non-refundable and non-exchangeable once sold.</p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between py-0.5">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums font-medium">₹{bill.subtotal.toFixed(2)}</span>
              </div>

              {bill.discountPercent > 0 && (
                <div className="flex justify-between py-0.5 text-emerald-700">
                  <span>Discount ({bill.discountPercent}%):</span>
                  <span className="font-mono tabular-nums font-medium">- ₹{bill.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {bill.taxPercent > 0 && (
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>GST / Tax ({bill.taxPercent}%):</span>
                  <span className="font-mono tabular-nums font-medium">+ ₹{bill.taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-slate-300 pt-2 mt-1 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-950 uppercase tracking-tight">Grand Total:</span>
                <span className="text-xl font-black text-slate-950 font-mono tabular-nums">
                  ₹{bill.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Print Sheet Footer Note */}
          <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-center">
            <p className="text-xs font-semibold text-slate-800">
              💥 Wishing You and Your Family a Safe & Joyous Celebration! 💥
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Please sell and use crackers according to local laws and safety rules.
            </p>
          </div>
        </div>

        {/* Modal Bottom Action Controls (Hidden when printing) */}
        <div className="no-print px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl hover:brightness-105 active:scale-95 transition-all shadow-md shadow-orange-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs sm:text-sm rounded-xl transition-colors active:scale-95 shadow-sm"
            >
              <Download className="w-4 h-4 text-orange-600" />
              <span>Download as PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToHistory && (
              <button
                onClick={onNavigateToHistory}
                className="px-3 py-2 bg-white hover:bg-orange-50 text-orange-600 font-bold text-xs sm:text-sm rounded-xl transition-colors border border-orange-200 shadow-sm"
              >
                View in History
              </button>
            )}
            <button
              onClick={onNewBill}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              + New Bill
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
