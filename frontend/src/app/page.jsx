'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  Tag, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle,
  Search,
  Star,
  X,
  AlertOctagon,
  RotateCcw
} from 'lucide-react';

const PRODUCTS = [
  {
    id: "prod_1",
    name: "Developer Fleece Hoodie",
    category: "Apparel",
    price: 65.00,
    rating: 4.9,
    reviewsCount: 128,
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=60",
    description: "Premium heavyweight fleece hoodie engineered for long coding sessions."
  },
  {
    id: "prod_2",
    name: "Mechanical Coding Keyboard",
    category: "Hardware",
    price: 120.00,
    rating: 4.8,
    reviewsCount: 94,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60",
    description: "Hot-swappable tactile mechanical keyboard designed for fast pair programming."
  },
  {
    id: "prod_3",
    name: "UltraWide 4K Developer Monitor",
    category: "Electronics",
    price: 450.00,
    rating: 4.9,
    reviewsCount: 210,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=60",
    description: "34-inch curved monitor with dual-pane layout for IDE code inspection and logs."
  },
  {
    id: "prod_4",
    name: "Ceramic Developer Coffee Mug",
    category: "Accessories",
    price: 22.00,
    rating: 4.7,
    reviewsCount: 56,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60",
    description: "Matte ceramic mug designed to keep your coffee warm through build iterations."
  }
];

export default function StorefrontPage() {
  const [cart, setCart] = useState([
    { ...PRODUCTS[0], quantity: 1 }
  ]);
  const [promoCode, setPromoCode] = useState("");
  const [address, setAddress] = useState({ country: "US", zip_code: "90210" });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fatal crash state (takes over entire screen) & Toast popup state
  const [isCrashed, setIsCrashed] = useState(false);
  const [crashError, setCrashError] = useState(null);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'error') => {
    setToast({ message, type, id: Date.now() });
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`Added "${product.name}" to cart`, 'success');
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    setLoading(true);
    setCheckoutResult(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ id: i.id, price: i.price, quantity: i.quantity })),
          promo_code: promoCode,
          address: address.country ? address : null
        })
      });

      const data = await res.json();

      // Scenario 1: Fatal 500 Crash (Breaks the entire website)
      if (res.status === 500) {
        setCrashError({
          status: 500,
          error: data.error || "500 Internal Server Error",
          message: data.message || "Unhandled Runtime Exception in Checkout Gateway",
          trace_id: data.trace_id || `tr-${Date.now()}`
        });
        setIsCrashed(true);
        return;
      }

      // Scenario 2: Handled error / 400 Bad Request / Invalid code
      if (!res.ok || data.status === "INVALID_PROMO" || data.status === "ERROR") {
        showToast("Incorrect or invalid code", "error");
        setCheckoutResult({
          error: true,
          message: data.message || "Incorrect or invalid code"
        });
        return;
      }

      // Scenario 3: Valid or Handled Fallback
      const enteredCode = promoCode.trim().toUpperCase();
      if (enteredCode && data.pricing && data.pricing.discount_percent > 0) {
        // Valid coupon successfully applied
        showToast(`Coupon applied! ${data.pricing.discount_percent}% discount added`, "success");
      } else if (enteredCode && data.pricing && data.pricing.discount_percent === 0) {
        // Handled invalid code (post-fix)
        showToast("Incorrect or invalid code", "error");
      }

      // Successful checkout calculation
      setCheckoutResult({
        error: false,
        pricing: data.pricing,
        inventory: data.inventory,
        shipping: data.shipping
      });
    } catch (err) {
      setCrashError({
        status: 500,
        error: "Network / Service Crash",
        message: "Failed to connect to checkout service. The backend server failed to respond."
      });
      setIsCrashed(true);
    } finally {
      setLoading(false);
    }
  };

  // FULL SCREEN FATAL CRASH UI: Replaces the entire site when unhandled 500 crash occurs
  if (isCrashed) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none">
        <div className="max-w-lg w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-8 md:p-10 shadow-2xl space-y-6 animate-pulse-slow">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertOctagon className="w-8 h-8 text-rose-500 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-rose-400 uppercase bg-rose-950/80 px-3 py-1 rounded-full border border-rose-800">
              Fatal 500 Internal Error
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Application Crashed</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              A runtime exception caused the application server to fail. The page cannot be displayed.
            </p>
          </div>

          {crashError && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-left font-mono text-xs space-y-1.5 text-rose-300 overflow-x-auto shadow-inner">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Server Exception Details</p>
              <p className="font-bold text-rose-400">{crashError.error}</p>
              <p className="text-slate-300 text-[11px] break-words">{crashError.message}</p>
              {crashError.trace_id && (
                <p className="text-indigo-400 text-[10px]">Trace ID: {crashError.trace_id}</p>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setIsCrashed(false);
              setCrashError(null);
            }}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Store & Reset State</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative">
      {/* Toast Notification Popup */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce-in max-w-sm w-full transition-all">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 ${
            toast.type === 'error' 
              ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-rose-900/10' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-900/10'
          }`}>
            <div className="flex items-center gap-3">
              {toast.type === 'error' ? (
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold">{toast.type === 'error' ? 'Invalid Code' : 'Coupon Applied'}</p>
                <p className="text-xs text-slate-700 mt-0.5">{toast.message}</p>
              </div>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="p-1 rounded-md hover:bg-black/5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Utility Bar */}
      <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs text-slate-600">
        <div>
          <span>Free worldwide shipping on orders over $50 | 30-Day Money-Back Guarantee</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-900 cursor-pointer transition-colors">Support</span>
          <span className="font-mono font-medium">USD ($)</span>
        </div>
      </div>

      {/* Main E-Commerce Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-indigo-600/20">
            A
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight">
              ArgusStore
            </h1>
            <p className="text-xs text-slate-500">Developer Gear & Equipment</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <button
          onClick={() => setIsCheckoutOpen(true)}
          className="relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Cart</span>
          {cart.length > 0 && (
            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Simple Coupon Tab / Banner */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Valid Coupon Codes: SAVE10 (10% OFF) & SAVE20 (20% OFF)</p>
              <p className="text-xs text-slate-500">Apply valid promo codes during checkout. Invalid codes are handled without interrupting the store.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPromoCode("SAVE10");
                setIsCheckoutOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-indigo-600/20 whitespace-nowrap"
            >
              SAVE10
            </button>
            <button
              onClick={() => {
                setPromoCode("SAVE20");
                setIsCheckoutOpen(true);
              }}
              className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm whitespace-nowrap"
            >
              SAVE20
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {["All", "Apparel", "Hardware", "Electronics", "Accessories"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">{filteredProducts.length} Products</span>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => (
            <div key={prod.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="h-52 overflow-hidden bg-slate-100 relative">
                  <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-indigo-700 text-[11px] px-2.5 py-1 rounded-full font-mono font-medium border border-indigo-100 shadow-sm">
                    {prod.category}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1 text-amber-500 text-xs mb-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-slate-800">{prod.rating}</span>
                    <span className="text-slate-400 text-[11px]">({prod.reviewsCount})</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base leading-snug">{prod.name}</h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{prod.description}</p>
                </div>
              </div>

              <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-4">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono font-medium">Price</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">${prod.price.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => addToCart(prod)}
                  className="bg-slate-900 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart & Checkout Slide-Over Drawer */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-md h-full flex flex-col justify-between p-6 overflow-y-auto shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  Your Shopping Cart
                </h3>
                <button 
                  onClick={() => setIsCheckoutOpen(false)} 
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 my-4 max-h-60 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">Your shopping cart is empty.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">${item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg">
                          <button onClick={() => updateQuantity(item.id, -1)} className="px-2.5 py-0.5 text-slate-600 hover:text-slate-900 font-medium">-</button>
                          <span className="px-2 text-xs font-mono font-bold text-slate-900">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="px-2.5 py-0.5 text-slate-600 hover:text-slate-900 font-medium">+</button>
                        </div>
                        <span className="font-mono text-slate-900 font-semibold w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-rose-500 hover:text-rose-700 text-xs p-1">✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Input Form */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 my-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" /> Promo Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter coupon (e.g. SAVE10, SAVE20)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                    />
                    <button
                      onClick={handleCheckout}
                      disabled={loading || !promoCode.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
                    >
                      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                    </button>
                  </div>

                  {/* Coupon Applied Badge */}
                  {checkoutResult?.pricing?.discount_amount > 0 && (
                    <div className="mt-2.5 flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs animate-fade-in">
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Coupon applied! ({checkoutResult.pricing.discount_percent}% OFF)</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">-${checkoutResult.pricing.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Shipping Address</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Country (e.g. US)"
                      value={address.country}
                      onChange={(e) => setAddress({ ...address, country: e.target.value })}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Postal / Zip Code"
                      value={address.zip_code}
                      onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Status Results */}
              {checkoutResult && !checkoutResult.error && (
                <div className="p-4 rounded-2xl text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <strong className="font-bold flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Order Placed Successfully!
                  </strong>
                  <p className="text-xs text-slate-700">Total Charged: <span className="font-mono font-bold text-slate-900">${checkoutResult.pricing.total.toFixed(2)}</span></p>
                  {checkoutResult.pricing.discount_amount > 0 && (
                    <p className="text-[11px] text-emerald-700 font-medium">Coupon Discount Applied: -${checkoutResult.pricing.discount_amount.toFixed(2)}</p>
                  )}
                  {checkoutResult.shipping && (
                    <p className="text-[10px] text-slate-500 font-mono">Carrier: {checkoutResult.shipping.carrier} (${checkoutResult.shipping.shipping_fee})</p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Order Summary & Action */}
            <div className="border-t border-slate-200 pt-4 mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-700 font-semibold">${cartSubtotal.toFixed(2)}</span>
              </div>
              
              {checkoutResult?.pricing?.discount_amount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                  <span>Coupon Discount ({checkoutResult.pricing.discount_percent}%):</span>
                  <span className="font-mono font-bold">-${checkoutResult.pricing.discount_amount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                <span className="text-slate-700 font-bold">Estimated Total:</span>
                <span className="font-mono text-slate-900 font-bold text-base">
                  ${(checkoutResult?.pricing?.total ?? cartSubtotal).toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{loading ? "Processing Order..." : "Place Order & Calculate"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs text-slate-500">
        ArgusStore &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}
