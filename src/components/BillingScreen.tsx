import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Flame,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { CartItem, ComboOffer, CrackerCategory, CrackerItem } from '../types';
import { CrackerCategoryIcon } from './CrackerCategoryIcon';
import { CartPanel } from './CartPanel';
import { ComboOffersSection } from './ComboOffersSection';

interface BillingScreenProps {
  items: CrackerItem[];
  combos: ComboOffer[];
  cart: CartItem[];
  onAddToCart: (item: CrackerItem, quantity: number) => void;
  onUpdateCartQty: (itemId: string, newQty: number) => void;
  onRemoveCartItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: (details: {
    customerName: string;
    customerPhone: string;
    discountPercent: number;
    taxPercent: number;
    billedBy: string;
  }) => void;
  onUpdateComboStock?: (comboId: string, newStock: number) => void;
  scriptUrlConfigured: boolean;
  onNavigateToSettings: () => void;
  defaultTaxPercent: number;
  currentAdminName?: string;
  isMobileCartOpen: boolean;
  setIsMobileCartOpen: (open: boolean) => void;
  isAdmin?: boolean;
}

const CATEGORIES: ('All' | CrackerCategory)[] = [
  'All',
  'Combos',
  'Fuljhadi',
  'Sparklers',
  'Flower Pots',
  'Ground Chakkars',
  'Rockets',
  'Sound Crackers',
  'Gift Boxes',
];

export const BillingScreen: React.FC<BillingScreenProps> = ({
  items,
  combos,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onClearCart,
  onCheckout,
  onUpdateComboStock,
  scriptUrlConfigured,
  onNavigateToSettings,
  defaultTaxPercent,
  currentAdminName,
  isMobileCartOpen,
  setIsMobileCartOpen,
  isAdmin = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | CrackerCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});
  const [justAddedItemId, setJustAddedItemId] = useState<string | null>(null);

  const getCardQty = (itemId: string) => cardQuantities[itemId] || 1;

  const setCardQty = (itemId: string, qty: number, maxStock: number) => {
    const validQty = Math.max(1, Math.min(maxStock, qty));
    setCardQuantities((prev) => ({
      ...prev,
      [itemId]: validQty,
    }));
  };

  const handleAddClick = (item: CrackerItem) => {
    const qty = getCardQty(item.id);
    onAddToCart(item, qty);
    setJustAddedItemId(item.id);
    setTimeout(() => {
      setJustAddedItemId((curr) => (curr === item.id ? null : curr));
    }, 1200);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate cart summary for mobile bar
  const totalCartCount = cart.reduce((acc, it) => acc + it.quantity, 0);
  const cartSubtotal = cart.reduce((acc, it) => acc + it.lineTotal, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Warning banner if Google Sheet URL is not connected */}
      {!scriptUrlConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4 text-amber-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Google Sheet URL not configured.</span>{' '}
              <span>Bills are automatically recorded in your Supabase backend and on this device.</span>
            </div>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="flex items-center gap-1 font-bold text-orange-600 hover:text-orange-700 underline underline-offset-2 shrink-0 self-start sm:self-auto"
          >
            <span>Manage Backend in Settings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}


      {/* Main Layout: Catalogue Grid (Left) + Cart Panel (Right) */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Column: Search, Filter Tabs & Product Cards */}
        <div className="flex-1 w-full space-y-5">
          {/* Limited Offer Combos Section */}
          {(selectedCategory === 'All' || selectedCategory === 'Combos' || searchQuery.toLowerCase().includes('combo')) && (
            <ComboOffersSection
              combos={combos}
              onAddToCart={onAddToCart}
              onUpdateComboStock={onUpdateComboStock}
              isAdmin={isAdmin}
            />
          )}

          {/* Banner prompt if another category is selected */}
          {selectedCategory !== 'All' && selectedCategory !== 'Combos' && !searchQuery && (
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-300 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950 shadow-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Flame className="w-4 h-4 text-orange-600 fill-amber-300 shrink-0" />
                <span>Special Festive Limited Offer Combos (18 & 21 items) available starting at ₹1,699!</span>
              </div>
              <button
                onClick={() => setSelectedCategory('Combos')}
                className="font-bold text-orange-600 hover:text-orange-700 underline underline-offset-2 flex items-center gap-1 shrink-0 self-start sm:self-auto"
              >
                <span>View Limited Combos ({combos.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search Bar & Stats */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search crackers by name or category..."
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500 shadow-sm transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-600 shrink-0 self-center">
              Showing <span className="font-bold text-orange-600">{filteredItems.length}</span> individual items
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const count =
                cat === 'All'
                  ? items.length + combos.length
                  : cat === 'Combos'
                  ? combos.length
                  : items.filter((i) => i.category === cat).length;
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/20'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cards Grid */}
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
              <Package className="w-12 h-12 mx-auto stroke-1 text-slate-400 mb-3" />
              <p className="text-base font-bold text-slate-800">No crackers found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching with another keyword or pick a different category.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-orange-600 text-xs font-bold rounded-xl transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isOutOfStock = item.stock <= 0;
                const isUnavailable = !item.isAvailable || isOutOfStock;
                const isLowStock = item.stock > 0 && item.stock < 10;
                const currentCardQty = getCardQty(item.id);
                const justAdded = justAddedItemId === item.id;

                // Check how many are currently in cart
                const existingInCart = cart.find((c) => c.item.id === item.id);
                const cartQty = existingInCart ? existingInCart.quantity : 0;
                const remainingAvailable = Math.max(0, item.stock - cartQty);

                return (
                  <div
                    key={item.id}
                    className={`relative bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-sm ${
                      isUnavailable
                        ? 'border-slate-200 opacity-60'
                        : 'border-slate-200 hover:border-orange-400 hover:shadow-md hover:shadow-slate-200/50'
                    }`}
                  >
                    <div>
                      {/* Card Top: Visual Graphic + Category & Stock Info */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100/80 flex items-center justify-center shrink-0 p-2 shadow-sm">
                          <CrackerCategoryIcon category={item.category} size="md" />
                        </div>

                        <div className="text-right flex flex-col items-end">
                          {/* Stock Status Badge */}
                          {isOutOfStock ? (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                              Out of Stock
                            </span>
                          ) : !item.isAvailable ? (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                              Unavailable
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-lg">
                              Only {item.stock} left
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold font-mono tabular-nums bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                              Stock: {item.stock} {item.unit || ''}
                            </span>
                          )}

                          {cartQty > 0 && (
                            <span className="text-[10px] text-orange-600 font-bold mt-1">
                              ({cartQty} in current bill)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Item Title & Category */}
                      <div className="mb-2">
                        <div className="text-[11px] text-orange-600 font-bold uppercase tracking-wider">
                          {item.category}
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2 mt-0.5">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom: Price, Stepper, and Add Button */}
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xs text-slate-500 font-medium">Price</span>
                        <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                          ₹{item.price.toFixed(2)}
                        </span>
                      </div>

                      {isUnavailable ? (
                        <button
                          disabled
                          className="w-full py-2 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed text-center"
                        >
                          Unavailable
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* Quantity Selector */}
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                            <button
                              onClick={() =>
                                setCardQty(item.id, currentCardQty - 1, item.stock)
                              }
                              disabled={currentCardQty <= 1}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors shadow-sm"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-mono font-bold text-xs text-slate-900 tabular-nums">
                              {currentCardQty}
                            </span>
                            <button
                              onClick={() =>
                                setCardQty(item.id, currentCardQty + 1, item.stock)
                              }
                              disabled={currentCardQty >= item.stock}
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors shadow-sm"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Add to Bill Button */}
                          <button
                            onClick={() => handleAddClick(item)}
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                              justAdded
                                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 shadow-orange-500/20'
                            }`}
                          >
                            {justAdded ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Added!</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>Add to Bill</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Desktop Cart Panel */}
        <CartPanel
          items={cart}
          inventory={items}
          combos={combos}
          onUpdateQuantity={onUpdateCartQty}
          onRemoveItem={onRemoveCartItem}
          onClearCart={onClearCart}
          onCheckout={onCheckout}
          defaultTaxPercent={defaultTaxPercent}
          currentAdminName={currentAdminName}
          isMobileDrawerOpen={false}
        />
      </div>

      {/* Mobile Drawer (When Opened) */}
      {isMobileCartOpen && (
        <CartPanel
          items={cart}
          inventory={items}
          combos={combos}
          onUpdateQuantity={onUpdateCartQty}
          onRemoveItem={onRemoveCartItem}
          onClearCart={onClearCart}
          onCheckout={onCheckout}
          defaultTaxPercent={defaultTaxPercent}
          currentAdminName={currentAdminName}
          isMobileDrawerOpen={true}
          onCloseMobileDrawer={() => setIsMobileCartOpen(false)}
        />
      )}

      {/* Floating Bottom Bar for Mobile Viewers */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-2xl flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-slate-500">
              {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart
            </div>
            <div className="text-base font-black text-slate-900 font-mono tabular-nums">
              ₹{cartSubtotal.toFixed(2)}
            </div>
          </div>

          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>View & Generate Bill</span>
          </button>
        </div>
      )}
    </div>
  );
};
