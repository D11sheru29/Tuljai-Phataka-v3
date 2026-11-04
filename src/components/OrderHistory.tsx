import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import { Bill, SyncStatus } from '../types';
import { processRetryQueue, sendBillToAppsScript } from '../services/sheetsSync';
import { saveBillToSupabase, syncAllPendingSupabaseBills } from '../services/supabaseSync';
import { deleteStoredBill } from '../utils/storage';


interface OrderHistoryProps {
  bills: Bill[];
  onViewBill: (bill: Bill) => void;
  onRefreshBills: () => void;
  onNavigateToBilling: () => void;
  onDeleteBill?: (billNo: string) => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  bills,
  onViewBill,
  onRefreshBills,
  onNavigateToBilling,
  onDeleteBill,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [syncFilter, setSyncFilter] = useState<'all' | SyncStatus>('all');
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [retryingBillNo, setRetryingBillNo] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [expandedBillNo, setExpandedBillNo] = useState<string | null>(null);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  // Date references
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Filtered bills
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // Date filter
      if (dateFilter === 'today' && bill.date !== todayStr) return false;
      if (dateFilter === 'yesterday' && bill.date !== yesterdayStr) return false;
      if (dateFilter === 'week') {
        const billDate = new Date(bill.date);
        if (billDate < sevenDaysAgo) return false;
      }

      // Sync filter
      if (syncFilter !== 'all' && bill.syncStatus !== syncFilter) return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const matchesBillNo = bill.billNo.toLowerCase().includes(query);
        const matchesCustomer =
          (bill.customerName && bill.customerName.toLowerCase().includes(query)) ||
          (bill.customerPhone && bill.customerPhone.includes(query));
        const matchesBilledBy = bill.billedBy.toLowerCase().includes(query);
        const matchesItems = bill.items.some(
          (it) =>
            it.name.toLowerCase().includes(query) ||
            it.category.toLowerCase().includes(query)
        );

        if (!matchesBillNo && !matchesCustomer && !matchesBilledBy && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [bills, dateFilter, syncFilter, searchQuery, todayStr, yesterdayStr]);

  // Overall Statistics
  const todayBills = bills.filter((b) => b.date === todayStr);
  const todayRevenue = todayBills.reduce((acc, b) => acc + b.grandTotal, 0);
  const allTimeRevenue = bills.reduce((acc, b) => acc + b.grandTotal, 0);
  const pendingBills = bills.filter((b) => b.syncStatus !== 'Synced');
  const syncedBillsCount = bills.filter((b) => b.syncStatus === 'Synced').length;

  // Single bill retry sync to both Google Sheets and Supabase
  const handleSingleBillRetry = async (bill: Bill, e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingBillNo(bill.billNo);
    setSyncFeedback(null);
    try {
      const [sheetRes, supaRes] = await Promise.allSettled([
        sendBillToAppsScript(bill),
        saveBillToSupabase(bill),
      ]);

      onRefreshBills();
      const sheetOk = sheetRes.status === 'fulfilled' && sheetRes.value.success;
      const supaOk = supaRes.status === 'fulfilled' && supaRes.value.success;

      if (sheetOk && supaOk) {
        setSyncFeedback(`Bill ${bill.billNo} synced to both Supabase and Google Sheets successfully!`);
      } else if (supaOk) {
        setSyncFeedback(`Bill ${bill.billNo} saved to Supabase backend tables successfully!`);
      } else if (sheetOk) {
        setSyncFeedback(`Bill ${bill.billNo} synced to Google Sheets successfully!`);
      } else {
        const supaErr = supaRes.status === 'fulfilled' ? supaRes.value.message : '';
        const sheetErr = sheetRes.status === 'fulfilled' ? sheetRes.value.message : '';
        setSyncFeedback(`Sync error for ${bill.billNo}: ${supaErr || sheetErr}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sync error: ${err?.message || 'Network error'}`);
    } finally {
      setRetryingBillNo(null);
    }
  };

  // Bulk retry sync to both Google Sheets and Supabase
  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    setSyncFeedback(null);
    try {
      const [sheetRes, supaRes] = await Promise.allSettled([
        processRetryQueue(),
        syncAllPendingSupabaseBills(),
      ]);
      onRefreshBills();

      const sheetCount = sheetRes.status === 'fulfilled' ? sheetRes.value.synced : 0;
      const supaCount = supaRes.status === 'fulfilled' ? supaRes.value.synced : 0;

      setSyncFeedback(
        `Sync complete: ${supaCount} bills saved to Supabase, ${sheetCount} bills synced to Google Sheets.`
      );
    } catch (err: any) {
      setSyncFeedback(`Retry failed: ${err?.message || 'Network error'}`);
    } finally {
      setIsRetryingAll(false);
    }
  };

  const handleConfirmDeleteBill = () => {
    if (!billToDelete) return;
    const targetBillNo = billToDelete.billNo;
    if (onDeleteBill) {
      onDeleteBill(targetBillNo);
    } else {
      deleteStoredBill(targetBillNo);
      onRefreshBills();
    }
    setBillToDelete(null);
    setDeleteFeedback(`Bill ${targetBillNo} has been deleted successfully.`);
    setTimeout(() => setDeleteFeedback(null), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display uppercase tracking-tight">
              Order History & Bills
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 border border-orange-200 text-orange-800 font-bold font-mono tabular-nums">
              {bills.length} Total Bills
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time log of every generated bill, customer records, and Google Sheets sync status
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRetryAll}
            disabled={isRetryingAll || pendingBills.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-semibold text-xs rounded-xl transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
            <span>Retry Failed Syncs ({pendingBills.length})</span>
          </button>

          <button
            onClick={onNavigateToBilling}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:brightness-105 active:scale-95 transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>+ Create New Bill</span>
          </button>
        </div>
      </div>

      {/* Delete Feedback Message */}
      {deleteFeedback && (
        <div className="p-3 bg-rose-50 border border-rose-200 shadow-sm rounded-xl text-xs text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{deleteFeedback}</span>
          </div>
          <button
            onClick={() => setDeleteFeedback(null)}
            className="text-rose-400 hover:text-rose-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sync Feedback Message */}
      {syncFeedback && (
        <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl text-xs text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Today's Revenue</span>
          <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
            ₹{todayRevenue.toFixed(2)}
          </div>
          <span className="text-[11px] text-orange-600 font-semibold mt-1 block font-mono">
            {todayBills.length} order{todayBills.length === 1 ? '' : 's'} today
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">All-Time Revenue</span>
          <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
            ₹{allTimeRevenue.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across {bills.length} total generated bills
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Google Sheet Synced</span>
          <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-1">
            {syncedBillsCount}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Rows recorded in spreadsheet
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Pending / Failed Sync</span>
          <div className="text-2xl font-black text-amber-700 font-mono tabular-nums mt-1">
            {pendingBills.length}
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
            Queued in localStorage retry buffer
          </span>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bill No (e.g. TP-1001), customer, phone, item name..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === 'all'
                  ? 'bg-white text-orange-600 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === 'today'
                  ? 'bg-white text-orange-600 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                dateFilter === 'week'
                  ? 'bg-white text-orange-600 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
          </div>

          {/* Sync Status Filter */}
          <select
            value={syncFilter}
            onChange={(e) => setSyncFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-orange-500 shadow-sm"
          >
            <option value="all">All Sync States</option>
            <option value="Synced">Synced Only</option>
            <option value="Pending">Pending Only</option>
            <option value="Failed">Failed Only</option>
          </select>
        </div>
      </div>

      {/* Orders List Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Showing {filteredBills.length} bill{filteredBills.length === 1 ? '' : 's'}
          </span>
          <span className="text-[11px] text-slate-500">
            Click on any order to view details or reprint
          </span>
        </div>

        {filteredBills.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Receipt className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
            <p className="text-base font-bold text-slate-700">No orders found</p>
            <p className="text-xs text-slate-500">
              {bills.length === 0
                ? 'No bills have been generated yet. Go to Billing to generate the first bill.'
                : 'No orders match your search or filter settings.'}
            </p>
            {bills.length === 0 ? (
              <button
                onClick={onNavigateToBilling}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-md"
              >
                Go to Billing Counter
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('all');
                  setSyncFilter('all');
                }}
                className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 font-bold text-xs rounded-lg transition-colors"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBills.map((bill) => {
              const isExpanded = expandedBillNo === bill.billNo;
              const isRetrying = retryingBillNo === bill.billNo;
              const itemsCount = bill.items.reduce((acc, it) => acc + it.qty, 0);

              return (
                <div
                  key={bill.billNo}
                  className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => onViewBill(bill)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Bill No, Date, Customer & Billed By */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-black text-orange-600 font-mono tracking-wide">
                          {bill.billNo}
                        </span>

                        {/* Google Sheet Sync Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.syncStatus === 'Synced'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : bill.syncStatus === 'Pending'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                          title="Google Sheet Sync"
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

                        {/* Supabase Backend Sync Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.supabaseSyncStatus === 'Synced'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : bill.supabaseSyncStatus === 'Pending'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                          title="Supabase Backend Tables Sync"
                        >
                          <Database className="w-3 h-3 text-emerald-600" />
                          <span>Supabase: {bill.supabaseSyncStatus || 'Pending'}</span>
                        </span>
                      </div>


                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono text-slate-700 font-semibold">
                          {bill.date} · {bill.time}
                        </span>
                        <span>·</span>
                        <span className="text-slate-900 font-bold">
                          {bill.customerName && bill.customerName.trim()
                            ? bill.customerName
                            : 'Walk-in Customer'}
                        </span>
                        {bill.customerPhone && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-600">
                              {bill.customerPhone}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span className="text-slate-500">
                          Billed by: <strong className="text-slate-700">{bill.billedBy}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Middle: Items Summary */}
                    <div className="text-xs text-slate-600 md:max-w-xs truncate">
                      <span className="font-bold text-slate-800">
                        {itemsCount} item{itemsCount === 1 ? '' : 's'}:
                      </span>{' '}
                      {bill.items.map((it) => `${it.name} (x${it.qty})`).join(', ')}
                    </div>

                    {/* Right: Grand Total & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <div className="text-[11px] text-slate-400 font-medium">Grand Total</div>
                        <div className="text-lg font-black text-slate-900 font-mono tabular-nums">
                          ₹{bill.grandTotal.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {bill.syncStatus !== 'Synced' && (
                          <button
                            onClick={(e) => handleSingleBillRetry(bill, e)}
                            disabled={isRetrying}
                            className="p-2 text-amber-700 hover:bg-amber-50 rounded-xl border border-amber-300 transition-colors"
                            title="Retry Google Sheets sync for this bill"
                          >
                            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewBill(bill);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
                          title="View / Print Invoice"
                        >
                          <Eye className="w-3.5 h-3.5 text-orange-600" />
                          <span>View Bill</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBillToDelete(bill);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors"
                          title="Delete this bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-xs font-semibold">Delete</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBillNo(isExpanded ? null : bill.billNo);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700"
                          title="Toggle line items preview"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Item Breakdown (If toggled) */}
                  {isExpanded && (
                    <div
                      className="mt-3 pt-3 border-t border-slate-200 bg-slate-50 rounded-xl p-3 text-xs space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-bold text-slate-800">
                        Itemized Breakdown:
                      </div>
                      <div className="space-y-1 divide-y divide-slate-200">
                        {bill.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="pt-1 flex items-center justify-between text-slate-700"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">{it.name}</span>
                              <span className="text-[11px] text-slate-500 ml-2">({it.category})</span>
                            </div>
                            <div className="font-mono tabular-nums text-slate-600">
                              {it.qty} × ₹{it.unitPrice.toFixed(2)} ={' '}
                              <strong className="text-slate-900">₹{it.lineTotal.toFixed(2)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500 font-medium">
                        <div>
                          <span>Subtotal: ₹{bill.subtotal.toFixed(2)}</span>
                          {bill.discountPercent > 0 && (
                            <span className="ml-3 text-emerald-700 font-semibold">
                              Discount ({bill.discountPercent}%): -₹{bill.discountAmount.toFixed(2)}
                            </span>
                          )}
                          {bill.taxPercent > 0 && (
                            <span className="ml-3 text-slate-600">
                              Tax ({bill.taxPercent}%): +₹{bill.taxAmount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onViewBill(bill)}
                          className="text-orange-600 hover:underline font-bold"
                        >
                          Open Full Invoice View →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Delete Bill {billToDelete.billNo}?
                </h3>
                <p className="text-xs text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Number:</span>
                <span className="font-mono font-bold text-slate-900">{billToDelete.billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">
                  {billToDelete.customerName || 'Walk-in Customer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span>{billToDelete.date} at {billToDelete.time}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-800">Grand Total:</span>
                <span className="text-orange-600 font-mono text-sm">
                  ₹{billToDelete.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Deleting this bill will remove it from your order history and local storage records.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setBillToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteBill}
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
  );
};
