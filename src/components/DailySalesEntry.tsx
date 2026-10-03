'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Search,
  Save,
  FileDown,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ShoppingBag,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { exportDailySalePdf, formatBDT } from '@/lib/pdfExport';
import { IProduct, IDailySale } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface ItemEntryState {
  productId: string;
  productName: string;
  productSku: string;
  banglaName?: string;
  category: string;
  cartonSize: number;
  currentStockPcs: number;
  originalSoldPcs: number; // Stock already accounted for in this saved memo
  tradePrice: number;
  dealerPrice: number;
  quantityCartons: number;
  quantityPcs: number;
}

export default function DailySalesEntry() {
  const queryClient = useQueryClient();
  const { isAdmin, isDeveloper } = useAuth();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showOnlySold, setShowOnlySold] = useState(false);
  const [itemsState, setItemsState] = useState<Record<string, ItemEntryState>>({});
  const [memoNo, setMemoNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isExistingRecord, setIsExistingRecord] = useState(false);
  const [lastSavedSale, setLastSavedSale] = useState<IDailySale | null>(null);

  // Fetch sheet for date
  const { data: sheetData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['daily-sale-sheet', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/daily-sales/sheet/${selectedDate}`);
      return res.data;
    },
  });

  // Sync sheet data to local state
  useEffect(() => {
    if (!sheetData) return;

    const newMap: Record<string, ItemEntryState> = {};
    const products: IProduct[] = sheetData.activeProducts || [];

    // Map existing products
    products.forEach((p) => {
      newMap[p._id] = {
        productId: p._id,
        productName: p.name,
        productSku: p.sku,
        banglaName: p.banglaName,
        category: p.category,
        cartonSize: p.cartonSize || 24,
        currentStockPcs: Math.max(0, p.currentStockPcs || 0),
        originalSoldPcs: 0,
        tradePrice: p.tradePrice || 0,
        dealerPrice: p.dealerPrice || 0,
        quantityCartons: 0,
        quantityPcs: 0,
      };
    });

    if (sheetData.isExisting && sheetData.sale) {
      setIsExistingRecord(true);
      setMemoNo(sheetData.sale.memoNo || '');
      setNotes(sheetData.sale.notes || '');
      setLastSavedSale(sheetData.sale);

      // Populate sold quantities from existing sale
      (sheetData.sale.items || []).forEach((item: any) => {
        const id = typeof item.productId === 'object' ? item.productId._id : item.productId;
        if (newMap[id]) {
          newMap[id].quantityCartons = item.quantityCartons || 0;
          newMap[id].quantityPcs = item.quantityPcs || 0;
          newMap[id].originalSoldPcs = item.totalPcsSold || 0;
          // Keep recorded price
          newMap[id].tradePrice = item.unitTradePrice ?? newMap[id].tradePrice;
          newMap[id].dealerPrice = item.unitDealerPrice ?? newMap[id].dealerPrice;
        }
      });
    } else {
      setIsExistingRecord(false);
      setMemoNo(`MEMO-${selectedDate.replace(/-/g, '')}`);
      setNotes('');
      setLastSavedSale(null);
    }

    setItemsState(newMap);
  }, [sheetData, selectedDate]);

  // Handle quantity changes with strict stock checks
  const handleQuantityChange = (
    productId: string,
    field: 'quantityCartons' | 'quantityPcs',
    value: string
  ) => {
    const item = itemsState[productId];
    if (!item) return;

    const availableStock = (item.currentStockPcs || 0) + (item.originalSoldPcs || 0);

    // If completely out of stock
    if (availableStock <= 0) {
      toast.error(`"${item.productName}" পণ্যের কোনো স্টক নেই! স্টক ছাড়া বিক্রয় করা যাবে না।`, {
        id: `out-of-stock-${productId}`,
      });
      return;
    }

    const num = Math.max(0, parseInt(value, 10) || 0);
    const newCartons = field === 'quantityCartons' ? num : (item.quantityCartons || 0);
    const newPcs = field === 'quantityPcs' ? num : (item.quantityPcs || 0);
    const newTotalPcs = newCartons * (item.cartonSize || 24) + newPcs;

    if (newTotalPcs > availableStock) {
      const availCtns = (availableStock / (item.cartonSize || 24)).toFixed(1);
      toast.error(
        `পর্যাপ্ত স্টক নেই! "${item.productName}" এর মজুদ আছে মাত্র ${availableStock} পিস (${availCtns} কার্টুন)`,
        { id: `stock-exceed-${productId}`, duration: 3000 }
      );
    }

    setItemsState((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: num,
      },
    }));
  };

  // Quick action: Clear all quantities
  const handleClearAll = () => {
    if (!window.confirm('সব এন্ট্রি ক্লিয়ার করতে চান? (Clear all quantities?)')) return;
    setItemsState((prev) => {
      const reset: Record<string, ItemEntryState> = {};
      Object.entries(prev).forEach(([id, item]) => {
        reset[id] = { ...item, quantityCartons: 0, quantityPcs: 0 };
      });
      return reset;
    });
    toast.success('সব ফিল্ড খালি করা হয়েছে');
  };

  // Save mutation with pre-validation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Pre-validate stock availability on client
      for (const item of Object.values(itemsState)) {
        const availableStock = (item.currentStockPcs || 0) + (item.originalSoldPcs || 0);
        const totalPcs = (item.quantityCartons || 0) * (item.cartonSize || 24) + (item.quantityPcs || 0);

        if (totalPcs > 0) {
          if (availableStock <= 0) {
            throw new Error(`"${item.productName}" পণ্যের কোনো স্টক নেই! স্টক ছাড়া বিক্রয় করা যাবে না।`);
          }
          if (totalPcs > availableStock) {
            const availCtns = (availableStock / (item.cartonSize || 24)).toFixed(1);
            throw new Error(
              `"${item.productName}" এর পর্যাপ্ত স্টক নেই! গোডাউনে মজুদ: ${availableStock} পিস (${availCtns} কার্টুন), কিন্তু বিক্রয় চেয়েছেন: ${totalPcs} পিস।`
            );
          }
        }
      }

      const itemsPayload = Object.values(itemsState).map((item) => ({
        productId: item.productId,
        quantityCartons: item.quantityCartons,
        quantityPcs: item.quantityPcs,
      }));

      const res = await api.post('/daily-sales/save', {
        date: selectedDate,
        memoNo,
        notes,
        items: itemsPayload,
      });
      return res.data;
    },
    onSuccess: (res) => {
      if (res.pending) {
        toast.success(res.message || 'পেন্ডিং-এ পাঠানো হয়েছে! ডিলার অনুমোদনের পর কার্যকর হবে।', {
          duration: 6000, icon: '⏳',
        });
        queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
        queryClient.invalidateQueries({ queryKey: ['pending-count'] });
        return;
      }
      toast.success(res.message || 'ডেইলি সেল সফলভাবে সেভ ও স্টক আপডেট হয়েছে!', {
        duration: 5000, icon: '✅',
      });
      setLastSavedSale(res.data);
      setIsExistingRecord(true);
      // Invalidate relevant queries so stock and dashboard sync instantly
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
      refetch();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'সেভ করতে সমস্যা হয়েছে!';
      toast.error(msg, { duration: 5000 });
    },
  });

  // Calculate live totals
  const allItemsList = useMemo(() => Object.values(itemsState), [itemsState]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let totalPcs = 0;
    let totalCartons = 0;
    let activeItemsCount = 0;

    allItemsList.forEach((item) => {
      const pcs = (item.quantityCartons || 0) * (item.cartonSize || 24) + (item.quantityPcs || 0);
      if (pcs > 0) {
        totalAmount += pcs * item.tradePrice;
        totalPcs += pcs;
        totalCartons += (item.quantityCartons || 0) + (item.quantityPcs || 0) / (item.cartonSize || 24);
        activeItemsCount++;
      }
    });

    return {
      totalAmount,
      totalPcs,
      totalCartons: Number(totalCartons.toFixed(1)),
      activeItemsCount,
    };
  }, [allItemsList]);

  // Check if any item violates stock limit
  const hasStockViolation = useMemo(() => {
    return allItemsList.some((item) => {
      const available = (item.currentStockPcs || 0) + (item.originalSoldPcs || 0);
      const sold = (item.quantityCartons || 0) * (item.cartonSize || 24) + (item.quantityPcs || 0);
      return sold > 0 && (available <= 0 || sold > available);
    });
  }, [allItemsList]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    allItemsList.forEach((item) => set.add(item.category));
    return ['All', ...Array.from(set)];
  }, [allItemsList]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItemsList.filter((item) => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.banglaName && item.banglaName.includes(searchQuery)) ||
        item.productSku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;

      const totalPcs = (item.quantityCartons || 0) * item.cartonSize + (item.quantityPcs || 0);
      const matchesSoldOnly = !showOnlySold || totalPcs > 0;

      return matchesSearch && matchesCat && matchesSoldOnly;
    });
  }, [allItemsList, searchQuery, selectedCategory, showOnlySold]);

  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner & Date Picker Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900">
                Daily Sales Entry <span className="text-amber-400 text-lg font-bold">• দৈনিক বিক্রয় সামারি</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ৫৯ টি ফ্যান্টাস্টিক বিস্কুটের নাম ও রেট ফিক্সড করা আছে। গোডাউনে স্টক থাকা সাপেক্ষে কার্টুন বা পিস সংখ্যা বসিয়ে সেভ করুন।
            </p>
          </div>

          {/* Date Selector & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 shadow-sm">
              <Calendar className="w-4 h-4 text-amber-400 mr-2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {isExistingRecord ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-4 h-4" /> সংরক্ষিত (Saved)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Sparkles className="w-4 h-4" /> নতুন এন্ট্রি (New)
              </span>
            )}
          </div>
        </div>

        {/* Existing Record Notice */}
        {isExistingRecord && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>
                এই তারিখের ({selectedDate}) বিক্রয় পূর্বেই সেভ করা আছে। প্রয়োজন অনুযায়ী কার্টুন/পিস সংখ্যা পরিবর্তন করে পুনরায় সেভ করতে পারবেন।
              </span>
            </div>
            {lastSavedSale && (
              <button
                onClick={() => exportDailySalePdf(lastSavedSale)}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition"
              >
                <FileDown className="w-3.5 h-3.5" /> মেমো PDF
              </button>
            )}
          </div>
        )}
      </div>

      {/* Role-based info banner */}
      {isAdmin && !isDeveloper && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⏳</span>
          <div>
            <div className="text-sm font-bold text-blue-900 mb-1">অ্যাডমিন মোড — পেন্ডিং অনুমোদন প্রয়োজন</div>
            <div className="text-xs text-blue-700 font-medium">
              আপনি অ্যাডমিন হিসেবে এন্ট্রি করছেন। সেভ করলে সরাসরি স্টক কাটবে না — এটি <strong className="text-blue-900">ডিলারের অনুমোদনের জন্য পাঠানো হবে।</strong> ডিলার অনুমোদন করলে তারপর স্টক আপডেট হবে।
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="বিস্কুটের নাম বা SKU দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${selectedCategory === cat
                ? 'bg-amber-500 text-white font-bold shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
            >
              {cat === 'All' ? 'সব আইটেম (All 59)' : cat}
            </button>
          ))}
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowOnlySold(!showOnlySold)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${showOnlySold
              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
              : 'bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900'
              }`}
          >
            <Filter className="w-3.5 h-3.5" />
            শুধু বিক্রয়কৃত ({totals.activeItemsCount})
          </button>

          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition"
          >
            সব রিসেট
          </button>
        </div>
      </div>

      {/* 59 Items Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">বিস্কুটের বিবরণ (Item Description)</th>
                <th className="py-3.5 px-3 text-center">প্যাকিং</th>
                <th className="py-3.5 px-3 text-right">বিক্রয় রেট (TP)</th>
                <th className="py-3.5 px-3 text-center">উপলব্ধ স্টক</th>
                <th className="py-3.5 px-3 text-center w-28 bg-amber-100/70 text-amber-900 border-x border-amber-200">
                  কার্টুন (Ctn)
                </th>
                <th className="py-3.5 px-3 text-center w-24 bg-amber-100/70 text-amber-900 border-x border-amber-200">
                  লুজ পিস (Pcs)
                </th>
                <th className="py-3.5 px-3 text-center">মোট পিস</th>
                <th className="py-3.5 px-4 text-right bg-slate-100 text-amber-900 border-l border-slate-200">
                  মোট টাকা (৳)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                    আইটেম লোড হচ্ছে...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    কোন আইটেম পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const cartons = item.quantityCartons || 0;
                  const pcs = item.quantityPcs || 0;
                  const totalPcsSold = cartons * item.cartonSize + pcs;
                  const itemTotalTaka = totalPcsSold * item.tradePrice;
                  const isSold = totalPcsSold > 0;
                  const availableStock = (item.currentStockPcs || 0) + (item.originalSoldPcs || 0);
                  const isOutOfStock = availableStock <= 0;
                  const isExceedingStock = totalPcsSold > availableStock;
                  const isLowStock = !isOutOfStock && availableStock <= 48;

                  return (
                    <tr
                      key={item.productId}
                      className={`transition-colors ${isExceedingStock
                        ? 'bg-rose-50 border-l-4 border-l-rose-500'
                        : isSold
                          ? 'bg-amber-50/60 border-l-4 border-l-amber-500'
                          : isOutOfStock
                            ? 'bg-slate-50/80'
                            : 'bg-white hover:bg-slate-50/80'
                        }`}
                    >
                      <td className="py-3 px-4 text-center text-slate-600 font-semibold text-xs">
                        {index + 1}
                      </td>

                      {/* Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{item.productName}</span>
                          <span className="text-[11px] font-mono text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-semibold">
                            {item.productSku}
                          </span>
                        </div>
                        {item.banglaName && (
                          <div className="text-xs text-amber-700 font-medium">
                            {item.banglaName}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 font-medium">{item.category}</div>
                      </td>

                      {/* Packing Size */}
                      <td className="py-3 px-3 text-center text-xs text-slate-700">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-mono text-slate-700 font-medium">
                          {item.cartonSize} p/ctn
                        </span>
                      </td>

                      {/* Trade Price (Fixed) */}
                      <td className="py-3 px-3 text-right text-xs font-mono font-bold text-emerald-400">
                        ৳{item.tradePrice.toFixed(2)}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-center text-xs">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 font-bold text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" /> স্টক নেই (০)
                          </span>
                        ) : (
                          <span
                            className={`font-mono px-2 py-0.5 rounded-full ${isLowStock
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                              : 'bg-slate-100 border border-slate-200 text-slate-700 font-medium'
                              }`}
                            title={isLowStock ? 'কম স্টক সর্তকতা: ৪৮ পিস বা তার কম' : ''}
                          >
                            {(availableStock / item.cartonSize).toFixed(1)} ctn ({availableStock}p)
                          </span>
                        )}
                      </td>

                      {/* Carton Input */}
                      <td className="py-2.5 px-3 text-center bg-amber-500/5">
                        <input
                          type="number"
                          min="0"
                          disabled={isOutOfStock}
                          value={isOutOfStock ? '' : (item.quantityCartons === 0 ? '' : item.quantityCartons)}
                          placeholder={isOutOfStock ? 'স্টক নেই' : '0'}
                          title={isOutOfStock ? 'গোডাউনে এই পণ্যের কোনো স্টক নেই, বিক্রয় করা যাবে না।' : ''}
                          onChange={(e) =>
                            handleQuantityChange(item.productId, 'quantityCartons', e.target.value)
                          }
                          className={`w-20 text-center font-bold font-mono text-sm rounded-lg py-1.5 focus:outline-none transition ${isOutOfStock
                            ? 'bg-slate-100 border border-slate-300 text-slate-400 cursor-not-allowed placeholder:text-slate-400'
                            : isExceedingStock
                              ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                              : 'bg-white border-2 border-slate-300 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm'
                            }`}
                        />
                      </td>

                      {/* Loose Pieces Input */}
                      <td className="py-2.5 px-3 text-center bg-amber-500/5">
                        <input
                          type="number"
                          min="0"
                          disabled={isOutOfStock}
                          value={isOutOfStock ? '' : (item.quantityPcs === 0 ? '' : item.quantityPcs)}
                          placeholder={isOutOfStock ? '-' : '0'}
                          title={isOutOfStock ? 'গোডাউনে এই পণ্যের কোনো স্টক নেই, বিক্রয় করা যাবে না।' : ''}
                          onChange={(e) =>
                            handleQuantityChange(item.productId, 'quantityPcs', e.target.value)
                          }
                          className={`w-16 text-center font-bold font-mono text-sm rounded-lg py-1.5 focus:outline-none transition ${isOutOfStock
                            ? 'bg-slate-100 border border-slate-300 text-slate-400 cursor-not-allowed placeholder:text-slate-400'
                            : isExceedingStock
                              ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                              : 'bg-white border-2 border-slate-300 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm'
                            }`}
                        />
                      </td>

                      {/* Total Pieces */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-xs text-slate-800">
                        {isExceedingStock ? (
                          <div className="flex flex-col items-center">
                            <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                              {totalPcsSold}
                            </span>
                            <span className="text-[10px] text-rose-400 font-bold mt-0.5 whitespace-nowrap">
                              মজুদ শেষ! ({availableStock}p)
                            </span>
                          </div>
                        ) : totalPcsSold > 0 ? (
                          <span className="text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                            {totalPcsSold}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Total Amount (BDT) */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm bg-slate-50 text-slate-900">
                        {itemTotalTaka > 0 ? (
                          <span className={isExceedingStock ? 'text-rose-700' : 'text-amber-700'}>
                            ৳{itemTotalTaka.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400">৳0.00</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bottom Sticky Action & Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Quick Metrics */}
          <div className="flex items-center gap-6 overflow-x-auto w-full md:w-auto text-xs text-slate-600">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">বিক্রয়কৃত আইটেম</div>
              <div className="text-base font-extrabold text-slate-900">
                {totals.activeItemsCount}{' '}
                <span className="text-xs font-normal text-slate-500">/ 59 items</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">মোট কার্টুন</div>
              <div className="text-base font-extrabold text-amber-600 font-mono">
                {totals.totalCartons} <span className="text-xs font-normal">ctn</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">মোট পিস</div>
              <div className="text-base font-extrabold text-amber-600 font-mono">
                {totals.totalPcs.toLocaleString()} <span className="text-xs font-normal">pcs</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            {/* Grand Total */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 px-4 py-1 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-amber-800">মোট বিক্রয় (Total)</div>
              <div className="text-xl font-black text-amber-700 font-mono tracking-tight">
                {formatBDT(totals.totalAmount)}
              </div>
            </div>
          </div>

          {/* Action Buttons & Stock Violation Warning */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {hasStockViolation && (
              <span className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                স্টকের চেয়ে বেশি পরিমাণ এন্ট্রি করা হয়েছে!
              </span>
            )}

            {/* Download PDF button */}
            <button
              onClick={() => {
                if (hasStockViolation) {
                  toast.error('স্টকের চেয়ে বেশি পরিমাণ বিক্রয় করা যাবে না! লাল চিহ্নিত আইটেমগুলো ঠিক করুন।');
                  return;
                }
                if (lastSavedSale) {
                  exportDailySalePdf(lastSavedSale);
                } else if (totals.totalAmount > 0) {
                  const tempSale: any = {
                    date: selectedDate,
                    memoNo,
                    totalAmount: totals.totalAmount,
                    totalCartonsSold: totals.totalCartons,
                    totalPcsSold: totals.totalPcs,
                    items: allItemsList
                      .filter((i) => (i.quantityCartons || 0) * i.cartonSize + (i.quantityPcs || 0) > 0)
                      .map((i) => ({
                        productSku: i.productSku,
                        productName: i.productName,
                        quantityCartons: i.quantityCartons,
                        quantityPcs: i.quantityPcs,
                        totalPcsSold: (i.quantityCartons || 0) * i.cartonSize + (i.quantityPcs || 0),
                        unitTradePrice: i.tradePrice,
                        totalAmount:
                          ((i.quantityCartons || 0) * i.cartonSize + (i.quantityPcs || 0)) * i.tradePrice,
                      })),
                  };
                  exportDailySalePdf(tempSale);
                } else {
                  toast.error('প্রথমে বিক্রয় পরিমাণ এন্ট্রি করুন!');
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-sm"
            >
              <FileDown className="w-4 h-4 text-amber-500" />
              <span>পিডিএফ মেমো</span>
            </button>

            {/* Save & Deduct Stock Button */}
            <button
              onClick={() => {
                if (hasStockViolation) {
                  toast.error('স্টকের চেয়ে বেশি পরিমাণ বিক্রয় করা যাবে না! লাল চিহ্নিত আইটেমগুলো ঠিক করুন।');
                  return;
                }
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending || hasStockViolation}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${hasStockViolation
                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-orange-500/25'
                }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {saveMutation.isPending
                  ? (isAdmin && !isDeveloper ? 'পেন্ডিং-এ পাঠানো হচ্ছে...' : 'সন্রক্ষণ ও স্টক কর্তন হচ্ছে...')
                  : hasStockViolation
                    ? 'পর্যাপ্ত স্টক নেই (সংশোধন করুন)'
                    : isAdmin && !isDeveloper
                      ? (isExistingRecord ? '⏳ পেন্ডিং-এ পাঠান (আপডেট)' : '⏳ পেন্ডিং-এ পাঠান')
                      : isExistingRecord
                        ? 'আপডেট ও স্টক সমন্বয় করুন'
                        : 'সেভ করুন ও স্টক মাইনাস করুন'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
