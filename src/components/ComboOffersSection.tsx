import React, { useState } from 'react';
import {
  AlertCircle,
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Flame,
  Minus,
  Package,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ComboOffer, CrackerItem } from '../types';
import { comboToCrackerItem } from '../utils/storage';

interface ComboOffersSectionProps {
  combos: ComboOffer[];
  onAddToCart: (item: CrackerItem, quantity: number) => void;
  onUpdateComboStock?: (comboId: string, newStock: number) => void;
  isAdmin?: boolean;
}

export const ComboOffersSection: React.FC<ComboOffersSectionProps> = ({
  combos,
  onAddToCart,
  onUpdateComboStock,
  isAdmin = false,
}) => {
  const [expandedComboId, setExpandedComboId] = useState<string | null>(null);
  const [comboQuantities, setComboQuantities] = useState<Record<string, number>>({});
  const [justAddedComboId, setJustAddedComboId] = useState<string | null>(null);

  // Admin inline stock editing
  const [editingStockComboId, setEditingStockComboId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<number>(0);

  const getComboQty = (comboId: string) => comboQuantities[comboId] || 1;

  const setComboQty = (comboId: string, qty: number, maxStock: number) => {
    const validQty = Math.max(1, Math.min(maxStock > 0 ? maxStock : 1, qty));
    setComboQuantities((prev) => ({
      ...prev,
      [comboId]: validQty,
    }));
  };

  const handleAddComboToCart = (combo: ComboOffer) => {
    if (combo.stock <= 0 || !combo.isAvailable) return;
    const qty = getComboQty(combo.id);
    const item = comboToCrackerItem(combo);
    onAddToCart(item, qty);
    setJustAddedComboId(combo.id);
    setTimeout(() => {
      setJustAddedComboId((curr) => (curr === combo.id ? null : curr));
    }, 1200);
  };

  const handleStartEditStock = (combo: ComboOffer) => {
    setEditingStockComboId(combo.id);
    setTempStockValue(combo.stock);
  };

  const handleSaveStock = (comboId: string) => {
    if (onUpdateComboStock) {
      onUpdateComboStock(comboId, Math.max(0, tempStockValue));
    }
    setEditingStockComboId(null);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-amber-300/80 bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-white p-5 sm:p-6 shadow-sm">
      {/* Decorative festive top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-amber-200/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/30">
            <Flame className="w-5 h-5 fill-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Festival Limited Offer Combos</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-sm uppercase tracking-wider">
                  Limited Offer
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Special pre-packed celebration boxes • Instant 1-click billing with massive festive savings
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] font-semibold px-3 py-1.5 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin Mode: You can manage combo stock quantities anytime</span>
          </div>
        )}
      </div>

      {/* 3 Combo Offer Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {combos.map((combo) => {
          const isOutOfStock = combo.stock <= 0;
          const isLowStock = combo.stock > 0 && combo.stock < 8;
          const isExpanded = expandedComboId === combo.id;
          const justAdded = justAddedComboId === combo.id;
          const savings = Math.max(0, combo.originalPrice - combo.price);
          const currentQty = getComboQty(combo.id);

          // Card theme styling according to tier
          const tierBorder =
            combo.comboNumber === 1
              ? 'border-amber-300 hover:border-amber-500'
              : combo.comboNumber === 2
              ? 'border-orange-300 hover:border-orange-500'
              : 'border-red-300 hover:border-red-500 ring-1 ring-red-400/30';

          const headerGrad =
            combo.comboNumber === 1
              ? 'from-amber-500/15 to-orange-500/5 text-amber-900'
              : combo.comboNumber === 2
              ? 'from-orange-500/15 to-red-500/5 text-orange-950'
              : 'from-red-500/20 via-orange-500/10 to-amber-500/5 text-red-950';

          return (
            <div
              key={combo.id}
              className={`relative bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between shadow-sm overflow-hidden ${tierBorder} ${
                isOutOfStock ? 'opacity-70' : 'hover:shadow-md'
              }`}
            >
              {/* Card Header & Badge Banner */}
              <div className={`p-4 bg-gradient-to-br ${headerGrad} border-b border-slate-100`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-900 text-amber-300 shadow-sm">
                      Combo {combo.comboNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-white/80 border border-slate-200/80 px-2 py-0.5 rounded-md">
                      {combo.itemCount} Items
                    </span>
                  </div>

                  {combo.badge && (
                    <span className="text-[11px] font-bold text-red-700 bg-red-100/90 border border-red-200 px-2 py-0.5 rounded-md">
                      {combo.badge}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mt-2.5 leading-snug">
                  {combo.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  {combo.tagline}
                </p>

                {/* Price Display */}
                <div className="mt-3.5 flex items-baseline gap-2.5">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    ₹{combo.price.toLocaleString('en-IN')}
                  </div>
                  {combo.originalPrice > combo.price && (
                    <div className="text-xs text-slate-400 line-through">
                      ₹{combo.originalPrice.toLocaleString('en-IN')}
                    </div>
                  )}
                  {savings > 0 && (
                    <div className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      Save ₹{savings.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body: Stock & Breakdown */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                {/* Admin Stock Management Row */}
                <div className="flex items-center justify-between text-xs pt-1 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 font-medium">Available Quantity:</span>
                  </div>

                  {editingStockComboId === combo.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={tempStockValue}
                        onChange={(e) => setTempStockValue(parseInt(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 border border-orange-500 rounded text-center text-xs font-bold"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveStock(combo.id)}
                        className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                        title="Save Quantity"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {isOutOfStock ? (
                        <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px]">
                          Sold Out
                        </span>
                      ) : isLowStock ? (
                        <span className="font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md text-[11px]">
                          Only {combo.stock} left
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                          {combo.stock} packs in stock
                        </span>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => handleStartEditStock(combo)}
                          className="text-slate-400 hover:text-orange-600 p-0.5 rounded transition-colors"
                          title="Edit Quantity"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsible Included Items Breakdown */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <button
                    onClick={() => setExpandedComboId(isExpanded ? null : combo.id)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-orange-600 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-orange-500" />
                      <span>{combo.itemCount} Items Included in Box</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-[11px]">
                      {combo.itemsIncluded.map((ci, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-slate-700 py-0.5"
                        >
                          <span className="truncate pr-2">• {ci.name}</span>
                          <span className="font-mono font-bold text-orange-700 bg-orange-100/70 px-1.5 py-0.2 rounded text-[10px] shrink-0">
                            x{ci.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Bottom: Quantity & Add to Bill Button */}
                <div className="pt-2 flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
                    <button
                      onClick={() => setComboQty(combo.id, currentQty - 1, combo.stock)}
                      disabled={isOutOfStock || currentQty <= 1}
                      className="px-2.5 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold font-mono text-slate-900">
                      {currentQty}
                    </span>
                    <button
                      onClick={() => setComboQty(combo.id, currentQty + 1, combo.stock)}
                      disabled={isOutOfStock || currentQty >= combo.stock}
                      className="px-2.5 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleAddComboToCart(combo)}
                    disabled={isOutOfStock}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                      isOutOfStock
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : justAdded
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-600 hover:via-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/25 active:scale-[0.98]'
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added to Bill!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add Combo ({currentQty})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
