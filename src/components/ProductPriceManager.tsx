'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Search,
  Edit,
  History,
  Save,
  Plus,
  AlertCircle,
  TrendingUp,
  Layers,
  CheckCircle2,
  X,
  FileSpreadsheet,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { formatBDT } from '@/lib/pdfExport';
import { IProduct } from '@/types';

export default function ProductPriceManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<IProduct | null>(null);

  // Price Modal State
  const [modalTradePrice, setModalTradePrice] = useState<number>(0);
  const [modalDealerPrice, setModalDealerPrice] = useState<number>(0);
  const [modalMrp, setModalMrp] = useState<number>(0);
  const [modalStockPcs, setModalStockPcs] = useState<number>(0);
  const [modalNote, setModalNote] = useState('');
  const [isResettingStock, setIsResettingStock] = useState(false);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Prevent background page from scrolling when any modal is open
  useEffect(() => {
    if (selectedProductForModal || isAddModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProductForModal, isAddModalOpen]);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    banglaName: '',
    category: 'Carbonated Beverages',
    cartonSize: 24,
    dealerPrice: 16.5,
    tradePrice: 18.0,
    mrp: 20,
    initialStockPcs: 0,
    minStockAlert: 96,
  });

  // Batch Update State
  const [batchPrices, setBatchPrices] = useState<
    Record<string, { tradePrice: number; dealerPrice: number; mrp: number }>
  >({});

  // Fetch all products
  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data;
    },
  });

  const products: IProduct[] = productsData?.data || [];

  // Reset all stock to 0
  const handleResetAllStock = async () => {
    if (
      !window.confirm(
        'আপনি কি নিশ্চিত যে সমস্ত ৫৯টি পণ্যের স্টক ০ (শূন্য) করতে চান?\n\nএটি করার পর নতুন চালান আগমন (Stock Inward) ছাড়া সকল পণ্যের গোডাউন স্টক ০ থাকবে।'
      )
    ) {
      return;
    }
    setIsResettingStock(true);
    try {
      const res = await api.post('/products/reset-all-stock');
      toast.success(res.data.message || 'সকল পণ্যের স্টক সফলভাবে ০ করা হয়েছে!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'স্টক রিসেট করতে সমস্যা হয়েছে');
    } finally {
      setIsResettingStock(false);
    }
  };

  // Open single price edit modal
  const handleOpenPriceModal = (product: IProduct) => {
    setSelectedProductForModal(product);
    setModalTradePrice(product.tradePrice);
    setModalDealerPrice(product.dealerPrice);
    setModalMrp(product.mrp);
    setModalStockPcs(product.currentStockPcs || 0);
    setModalNote(`মাসিক রেট রিভিশন - ${new Date().toLocaleString('bn-BD', { month: 'long', year: 'numeric' })}`);
  };

  // Submit single price change mutation
  const priceUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProductForModal) return;
      const res = await api.patch(`/products/${selectedProductForModal._id}/price`, {
        newTradePrice: modalTradePrice,
        newDealerPrice: modalDealerPrice,
        newMrp: modalMrp,
        note: modalNote,
      });

      // Also update stock if changed
      if (modalStockPcs !== selectedProductForModal.currentStockPcs) {
        await api.put(`/products/${selectedProductForModal._id}`, {
          currentStockPcs: modalStockPcs,
        });
      }

      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'পণ্যের রেট ও স্টক সফলভাবে আপডেট করা হয়েছে!', {
        duration: 5000,
        icon: '🏷️',
      });
      setSelectedProductForModal(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'রেট আপডেট করতে সমস্যা হয়েছে!');
    },
  });

  // Toggle batch mode
  const handleToggleBatchMode = () => {
    if (!isBatchMode) {
      const initial: Record<string, { tradePrice: number; dealerPrice: number; mrp: number }> = {};
      products.forEach((p) => {
        initial[p._id] = {
          tradePrice: p.tradePrice,
          dealerPrice: p.dealerPrice,
          mrp: p.mrp,
        };
      });
      setBatchPrices(initial);
      setIsBatchMode(true);
    } else {
      setIsBatchMode(false);
    }
  };

  // Submit batch price update
  const batchUpdateMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(batchPrices).map(([id, val]) => ({
        id,
        newTradePrice: val.tradePrice,
        newDealerPrice: val.dealerPrice,
        newMrp: val.mrp,
      }));

      const res = await api.post('/products/batch-price-update', {
        updates,
        note: 'মাসিক এককালীন রেট আপডেট',
      });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'সকল পণ্যের নতুন রেট সফলভাবে আপডেট হয়েছে!');
      setIsBatchMode(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'ব্যাচ রেট আপডেটে সমস্যা হয়েছে!');
    },
  });

  // Create new product mutation
  const createProductMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/products', newProduct);
      return res.data;
    },
    onSuccess: () => {
      toast.success('নতুন বিস্কুট আইটেম সফলভাবে যোগ করা হয়েছে!');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'পণ্য যোগ করতে সমস্যা হয়েছে!');
    },
  });

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.banglaName && p.banglaName.includes(searchQuery)) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900">
                  Product & Price Management (এডমিন প্যানেল)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  প্রতি মাসে পণ্যের রেট পরিবর্তন করুন। আগের বিক্রয়ের মেমো অক্ষুণ্ণ থাকবে, নতুন বিক্রয় নতুন রেটে হিসাব হবে।
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleBatchMode}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md ${isBatchMode
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isBatchMode ? 'স্প্রেডশিট মোড বন্ধ করুন' : 'মাসিক এককালীন রেট আপডেট মোড'}
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-orange-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              নতুন আইটেম যোগ করুন
            </button>
          </div>
        </div>

        {/* Security & Price Integrity Notice */}
        <div className="mt-5 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-600 bg-emerald-50 border border-emerald-200">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">স্মার্ট হিস্টোরিক্যাল রেট প্রটেকশন:</span>{' '}
            আপনি যেকোনো বিস্কুটের নতুন বিক্রয় রেট (Trade Price) বা ডিলার রেট (Dealer Price) আপডেট করলে পূর্ববর্তী তারিখের
            কোনো বিক্রয় মেমোর মূল্যের পরিবর্তন হবে না। ভবিষ্যতের সকল বিক্রয় স্বয়ংক্রিয়ভাবে নতুন রেটে হিসাব হবে।
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-slate-900">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="বিস্কুটের নাম বা SKU দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
            >
              {cat === 'All' ? `সব আইটেম (${products.length})` : cat}
            </button>
          ))}
        </div>

        {isBatchMode && (
          <button
            onClick={() => batchUpdateMutation.mutate()}
            disabled={batchUpdateMutation.isPending}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition"
          >
            <Save className="w-4 h-4" />
            <span>{batchUpdateMutation.isPending ? 'আপডেট হচ্ছে...' : 'সব নতুন রেট সেভ করুন'}</span>
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3 w-24">SKU</th>
                <th className="py-3 px-4 min-w-[220px]">পণ্যের নাম (Product Name)</th>
                <th className="py-3 px-3 text-center">ক্যাটাগরি</th>
                <th className="py-3 px-3 text-center">প্যাকিং</th>
                <th className="py-3 px-3 text-right">ক্রয় রেট (IP)</th>
                <th className="py-3 px-3 text-right bg-amber-100/70 text-amber-900 border-x border-amber-200">
                  বিক্রয় রেট (ETP)
                </th>
                <th className="py-3 px-3 text-right">MRP</th>
                <th className="py-3 px-3 text-center">বর্তমান স্টক</th>
                <th className="py-3 px-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-500">
                    পণ্য তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    কোন পণ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => {
                  const isLowStock = p.currentStockPcs <= p.minStockAlert;
                  const batchVal = batchPrices[p._id];

                  return (
                    <tr key={p._id} className="hover:bg-slate-50 bg-white transition-colors">
                      <td className="py-3 px-3 text-center text-xs text-slate-500">{index + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-xs text-amber-400">{p.sku}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-bold">{p.name}</div>
                        {p.banglaName && (
                          <div className="text-xs text-slate-400 font-normal">{p.banglaName}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-xs text-slate-400">{p.category}</td>
                      <td className="py-3 px-3 text-center text-xs font-mono text-slate-300">
                        {p.cartonSize} p/c
                      </td>

                      {/* Dealer Price (DP) */}
                      <td className="py-3 px-3 text-right font-mono text-xs">
                        {isBatchMode && batchVal ? (
                          <input
                            type="number"
                            step="0.05"
                            value={batchVal.dealerPrice}
                            onChange={(e) =>
                              setBatchPrices((prev) => ({
                                ...prev,
                                [p._id]: {
                                  ...prev[p._id],
                                  dealerPrice: parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                            className="w-16 bg-slate-950 border border-slate-700 text-right px-1.5 py-0.5 rounded text-white font-mono"
                          />
                        ) : (
                          <span className="text-slate-300">৳{p.dealerPrice.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Trade Price (TP) */}
                      <td className="py-3 px-3 text-right font-mono text-xs bg-amber-500/5">
                        {isBatchMode && batchVal ? (
                          <input
                            type="number"
                            step="0.05"
                            value={batchVal.tradePrice}
                            onChange={(e) =>
                              setBatchPrices((prev) => ({
                                ...prev,
                                [p._id]: {
                                  ...prev[p._id],
                                  tradePrice: parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                            className="w-16 bg-slate-950 border border-amber-500/80 text-right px-1.5 py-0.5 rounded text-amber-300 font-bold font-mono"
                          />
                        ) : (
                          <span className="text-amber-400 font-bold text-sm">
                            ৳{p.tradePrice.toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-400">
                        ৳{p.mrp.toFixed(2)}
                      </td>

                      {/* Stock */}
                      <td
                        className={`text-center text-xs font-medium ${isLowStock ? "text-red-600" : "text-gray-700"
                          }`}
                      >
                        {(p.currentStockPcs / p.cartonSize).toFixed(1)} ctn
                        <span className="text-gray-500"> ({p.currentStockPcs} pcs)</span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleOpenPriceModal(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg text-xs font-semibold transition"
                          title="Update Price"
                        >
                          <Edit className="w-3 h-3" /> রেট আপডেট
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Product Price Update Modal */}
      {selectedProductForModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProductForModal(null);
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-900 my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[88vh] overflow-hidden">
            {/* Header (fixed at top of modal) */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-mono text-amber-500 uppercase font-bold">
                  {selectedProductForModal.sku}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedProductForModal.name}
                </h3>
                {selectedProductForModal.banglaName && (
                  <p className="text-xs text-slate-500 font-medium">{selectedProductForModal.banglaName}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  রেট পরিবর্তনের নিয়ম:
                </div>
                নতুন বিক্রয় রেট কেবল আজকের পরের নতুন সেল মেমোতে কার্যকর হবে। পূর্ববর্তী তারিখের
                বিক্রয়সমূহ তাদের মূল রেটেই সংরক্ষিত থাকবে।
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    বর্তমান বিক্রয় রেট (Current TP)
                  </label>
                  <div className="text-sm font-bold text-slate-700 font-mono bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                    ৳{selectedProductForModal.tradePrice.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-orange-600 mb-1">
                    নতুন বিক্রয় রেট (New TP) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={modalTradePrice}
                    onChange={(e) => setModalTradePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-orange-400 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    নতুন ক্রয় রেট (New IP)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={modalDealerPrice}
                    onChange={(e) => setModalDealerPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 shadow-sm font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    প্যাকেট MRP
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={modalMrp}
                    onChange={(e) => setModalMrp(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 shadow-sm font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রেট পরিবর্তনের কারণ / নোট (Revision Note)
                </label>
                <input
                  type="text"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="যেমন: ফ্রেশ কোম্পানি নির্ধারিত নতুন মূল্য তালিকা"
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Price History */}
              {selectedProductForModal.priceHistory &&
                selectedProductForModal.priceHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2">
                      <History className="w-3.5 h-3.5 text-amber-500" />
                      রেট পরিবর্তনের অতীত ইতিহাস (History Log):
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px] font-mono">
                      {selectedProductForModal.priceHistory.map((h, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center justify-between text-slate-700"
                        >
                          <div>
                            <span className="text-emerald-600 font-bold">TP: ৳{h.tradePrice}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            <span>IP: ৳{h.dealerPrice}</span>
                            {h.note && <span className="ml-2 text-slate-500 font-sans">({h.note})</span>}
                          </div>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(h.effectiveFrom).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Footer (fixed at bottom of modal) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                বাতিল করুন
              </button>
              <button
                onClick={() => priceUpdateMutation.mutate()}
                disabled={priceUpdateMutation.isPending}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
              >
                {priceUpdateMutation.isPending ? 'আপডেট হচ্ছে...' : 'নতুন রেট কার্যকর করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-900 my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[88vh] overflow-hidden">
            {/* Header (fixed at top of modal) */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900">নতুন পণ্য যোগ করুন</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU কোড *
                  </label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="FR-021"
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ক্যাটাগরি
                  </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="Carbonated Beverages">Carbonated Beverages</option>
                    <option value="Drinking Water">Drinking Water</option>
                    <option value="Energy Drinks">Energy Drinks</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পণ্যের নাম (English) *
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Fresh Cola 250 ml"
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বাংলা নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={newProduct.banglaName}
                  onChange={(e) => setNewProduct({ ...newProduct, banglaName: e.target.value })}
                  placeholder="ফ্রেশ খাবার পানীয়"
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    প্যাকিং (পিস/ctn)
                  </label>
                  <input
                    type="number"
                    value={newProduct.cartonSize}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, cartonSize: parseInt(e.target.value, 10) || 24 })
                    }
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ক্রয় রেট (IP)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={newProduct.dealerPrice}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, dealerPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 shadow-sm font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-orange-600 mb-1">
                    বিক্রয় রেট (TP)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={newProduct.tradePrice}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, tradePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-white border-2 border-orange-400 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer (fixed at bottom of modal) */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                বাতিল
              </button>
              <button
                onClick={() => createProductMutation.mutate()}
                disabled={createProductMutation.isPending || !newProduct.sku || !newProduct.name}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
              >
                {createProductMutation.isPending ? 'যোগ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
