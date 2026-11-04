import React, { useState } from 'react';
import {
  AlertCircle,
  FileCheck2,
  Minus,
  Percent,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { CartItem, CrackerItem } from '../types';

interface CartPanelProps {
  items: CartItem[];
  inventory: CrackerItem[];
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: (details: {
    customerName: string;
    customerPhone: string;
    discountPercent: number;
    taxPercent: number;
    billedBy: string;
  }) => void;
  defaultTaxPercent: number;
  currentAdminName?: string;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  items,
  inventory,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  defaultTaxPercent,
  currentAdminName,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercentInput, setDiscountPercentInput] = useState<string>('0');
  const [taxPercentInput, setTaxPercentInput] = useState<string>(String(defaultTaxPercent || '0'));
  const [customBilledBy, setCustomBilledBy] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Parse percentages safely
  const discountPercent = Math.max(0, Math.min(100, parseFloat(discountPercentInput) || 0));
  const taxPercent = Math.max(0, Math.min(100, parseFloat(taxPercentInput) || 0));

  // Subtotal
  const subtotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
  const discountAmount = Number(((subtotal * discountPercent) / 100).toFixed(2));
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number(((taxableAmount * taxPercent) / 100).toFixed(2));
  const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

  const handleCheckoutClick = () => {
    setValidationError(null);

    if (items.length === 0) {
      setValidationError('Please add at least one item to generate a bill.');
      return;
    }

    // Validate quantities against latest stock in inventory
    for (const line of items) {
      const invItem = inventory.find((i) => i.id === line.item.id);
      if (!invItem) {
        setValidationError(`Item "${line.item.name}" was not found in catalogue.`);
        return;
      }
      if (line.quantity < 1) {
        setValidationError(`Quantity for "${line.item.name}" must be at least 1.`);
        return;
      }
      if (line.quantity > invItem.stock) {
        setValidationError(
          `Quantity for "${line.item.name}" (${line.quantity}) exceeds available stock (${invItem.stock}).`
        );
        return;
      }
    }

    const billedBy = currentAdminName || customBilledBy.trim() || 'Counter Staff';

    onCheckout({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      discountPercent,
      taxPercent,
      billedBy,
    });
  };

  const content = (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden">
      {/* Cart Header */}
      <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-orange-600" />
          <h2 className="font-extrabold text-slate-900 text-base font-display">
            Current Bill ({items.reduce((acc, it) => acc + it.quantity, 0)})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold transition-colors"
              title="Clear Cart"
            >
              Clear All
            </button>
          )}
          {onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-700"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-[380px] lg:max-h-[340px]">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingCart className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
            <p className="text-xs text-slate-400 mt-1">
              Select cracker items from the catalogue to add them to this bill.
            </p>
          </div>
        ) : (
          items.map((line) => {
            const currentStock =
              inventory.find((i) => i.id === line.item.id)?.stock ?? line.item.stock;
            const isAtMaxStock = line.quantity >= currentStock;

            return (
              <div
                key={line.item.id}
                className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                      {line.item.name}
                    </h4>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{line.item.category}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-slate-700 font-semibold">
                        ₹{line.unitPrice} each
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveItem(line.item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-0.5 shadow-sm">
                    <button
                      onClick={() => onUpdateQuantity(line.item.id, line.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-mono font-bold text-xs text-slate-900 tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(line.item.id, line.quantity + 1)}
                      disabled={isAtMaxStock}
                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title={isAtMaxStock ? 'Maximum stock reached' : 'Increase quantity'}
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 font-mono tabular-nums">
                      ₹{line.lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {isAtMaxStock && (
                  <p className="text-[10px] text-amber-700 font-semibold">
                    Max available stock ({currentStock}) reached.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Customer Info & Discount / Tax Controls */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        {/* Customer Name & Phone (Optional) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Customer Name <span className="text-slate-400">(opt)</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Ramesh"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-orange-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Phone Number <span className="text-slate-400">(opt)</span>
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:border-orange-500 shadow-sm"
            />
          </div>
        </div>

        {/* Discount & Tax percentage controls */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Discount (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={discountPercentInput}
                onChange={(e) => setDiscountPercentInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono tabular-nums pr-6 focus:outline-none focus:border-orange-500 shadow-sm"
              />
              <span className="absolute right-2 top-2 text-slate-400 text-[10px]">
                %
              </span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              GST / Tax (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={taxPercentInput}
                onChange={(e) => setTaxPercentInput(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono tabular-nums pr-6 focus:outline-none focus:border-orange-500 shadow-sm"
              />
              <span className="absolute right-2 top-2 text-slate-400 text-[10px]">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Billed By Display */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
          <span>Billed By:</span>
          <span className="font-bold text-slate-800">
            {currentAdminName || 'Counter Staff'}
          </span>
        </div>

        {/* Price Calculations Breakdown */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800">
              ₹{subtotal.toFixed(2)}
            </span>
          </div>

          {discountPercent > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Discount ({discountPercent}%)</span>
              <span className="font-mono tabular-nums">
                - ₹{discountAmount.toFixed(2)}
              </span>
            </div>
          )}

          {taxPercent > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>GST / Tax ({taxPercent}%)</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">
                + ₹{taxAmount.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-300">
            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Grand Total
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Validation Error Inline */}
        {validationError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Generate Bill Button */}
        <button
          onClick={handleCheckoutClick}
          disabled={items.length === 0}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-105 active:scale-[0.99] text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-md shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <FileCheck2 className="w-5 h-5" />
          <span>Generate Bill</span>
        </button>
      </div>
    </div>
  );

  // Mobile Bottom Drawer Render
  if (isMobileDrawerOpen) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/50 backdrop-blur-sm">
        <div className="w-full max-h-[90vh] overflow-hidden rounded-t-3xl animate-in slide-in-from-bottom duration-200">
          {content}
        </div>
      </div>
    );
  }

  // Desktop Static Column Render
  return <div className="hidden lg:block w-96 shrink-0">{content}</div>;
};
