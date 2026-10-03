'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  Trash2,
  Calendar,
  Save,
  Clock,
  CheckCircle2,
  Layers,
  Search,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { formatBDT } from '@/lib/pdfExport';
import { IProduct, IStockInward } from '@/types';

interface InwardItemRow {
  productId: string;
  productName: string;
  productSku: string;
  cartonSize: number;
  dealerPrice: number;
  quantityCartons: number;
  quantityPcs: number;
}

export default function StockInwardEntry() {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Form State
  const [challanNo, setChallanNo] = useState(`CH-${Date.now().toString().slice(-6)}`);
  const [inwardDate, setInwardDate] = useState(todayStr);
  const [vehicleNo, setVehicleNo] = useState('');
  const [receivedBy, setReceivedBy] = useState('Tanvir Traders Store');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<InwardItemRow[]>([]);
  const [historySearch, setHistorySearch] = useState('');

  // Fetch all products
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data;
    },
  });

  const products: IProduct[] = productsData?.data || [];

  // Fetch inward history
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['stock-inward-history'],
    queryFn: async () => {
      const res = await api.get('/stock-inward?limit=30');
      return res.data;
    },
  });

  const inwardHistory: IStockInward[] = historyData?.data || [];

  // Add all 59 products to form with 0 quantity
  const handleLoadAllProducts = () => {
    if (products.length === 0) return;
    const newRows: InwardItemRow[] = products.map((p) => ({
      productId: p._id,
      productName: p.name,
      productSku: p.sku,
      cartonSize: p.cartonSize || 24,
      dealerPrice: p.dealerPrice,
      quantityCartons: 0,
      quantityPcs: 0,
    }));
    setRows(newRows);
    toast.success('৫৯ টি পণ্য ফর্মে লোড হয়েছে!');
  };

  // Add single product row
  const handleAddRow = () => {
    if (products.length === 0) return;
    const firstProduct = products[0];
    setRows((prev) => [
      ...prev,
      {
        productId: firstProduct._id,
        productName: firstProduct.name,
        productSku: firstProduct.sku,
        cartonSize: firstProduct.cartonSize,
        dealerPrice: firstProduct.dealerPrice,
        quantityCartons: 1,
        quantityPcs: 0,
      },
    ]);
  };

  // Update row
  const handleRowProductChange = (index: number, pId: string) => {
    const selected = products.find((p) => p._id === pId);
    if (!selected) return;

    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: selected._id,
        productName: selected.name,
        productSku: selected.sku,
        cartonSize: selected.cartonSize,
        dealerPrice: selected.dealerPrice,
      };
      return copy;
    });
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate live totals for the challan
  const totals = useMemo(() => {
    let totalCost = 0;
    let totalCartons = 0;
    let totalPcs = 0;
    let activeRows = 0;

    rows.forEach((r) => {
      const cartons = Number(r.quantityCartons) || 0;
      const pcs = Number(r.quantityPcs) || 0;
      const rowTotalPcs = cartons * r.cartonSize + pcs;

      if (rowTotalPcs > 0) {
        totalCost += rowTotalPcs * (Number(r.dealerPrice) || 0);
        totalCartons += cartons + pcs / r.cartonSize;
        totalPcs += rowTotalPcs;
        activeRows++;
      }
    });

    return {
      totalCost,
      totalCartons: Number(totalCartons.toFixed(1)),
      totalPcs,
      activeRows,
    };
  }, [rows]);

  // Submit inward mutation
  const inwardMutation = useMutation({
    mutationFn: async () => {
      const activeItems = rows
        .filter((r) => (Number(r.quantityCartons) || 0) * r.cartonSize + (Number(r.quantityPcs) || 0) > 0)
        .map((r) => ({
          productId: r.productId,
          quantityCartons: Number(r.quantityCartons) || 0,
          quantityPcs: Number(r.quantityPcs) || 0,
          unitDealerPrice: Number(r.dealerPrice),
        }));

      if (activeItems.length === 0) {
        throw new Error('অন্তত একটি পণ্যের পরিমাণ এন্ট্রি করুন!');
      }

      const res = await api.post('/stock-inward', {
        challanNo,
        date: inwardDate,
        supplier: 'Meghna Beverage Ltd',
        vehicleNo,
        receivedBy,
        notes,
        items: activeItems,
      });

      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'চালান সফলভাবে সেভ ও গোডাউন স্টক বৃদ্ধি করা হয়েছে!', {
        duration: 5000,
        icon: '🚛',
      });
      // Reset form
      setChallanNo(`CH-${Date.now().toString().slice(-6)}`);
      setRows([]);
      setVehicleNo('');
      setNotes('');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-inward-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
      refetchHistory();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'সেভ করতে সমস্যা হয়েছে!');
    },
  });

  // Delete inward
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/stock-inward/${id}`);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'চালান ডিলিট ও স্টক কর্তন করা হয়েছে!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-inward-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
    },
  });

  const filteredHistory = useMemo(() => {
    return inwardHistory.filter(
      (inv) =>
        inv.challanNo.toLowerCase().includes(historySearch.toLowerCase()) ||
        inv.date.includes(historySearch) ||
        (inv.vehicleNo && inv.vehicleNo.toLowerCase().includes(historySearch.toLowerCase()))
    );
  }, [inwardHistory, historySearch]);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-10 sm:pb-20">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm text-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="shrink-0 p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg md:text-2xl font-black text-slate-900 leading-tight">
                  Stock Inward / Fresh Challan Entry
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                  মেঘনা বেভারেজ (ফ্রেশ) থেকে নতুন মাল পৌঁছালে চালান নম্বর, গাড়ির নম্বর ও পণ্যের সংখ্যা এন্ট্রি করুন।
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleLoadAllProducts}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              সব ৫৯ টি আইটেম ফর্মে নিন
            </button>
            <button
              onClick={handleAddRow}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              একটি আইটেম যোগ করুন
            </button>
          </div>
        </div>

        {/* Challan Header Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-200">
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-slate-700 mb-1 sm:mb-1.5">
              চালান নম্বর (Challan / Invoice No.)
            </label>
            <input
              type="text"
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              placeholder="e.g. AK-88421"
              className="w-full bg-white border-2 border-slate-300 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-slate-700 mb-1 sm:mb-1.5">
              মাল আসার তারিখ (Date of Arrival)
            </label>
            <input
              type="date"
              value={inwardDate}
              onChange={(e) => setInwardDate(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-slate-700 mb-1 sm:mb-1.5">
              গাড়ি নং / ট্রাক নং (Vehicle / Truck No.)
            </label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              placeholder="e.g. ঢাকা মেট্রো-ট ১১-২২৩৩"
              className="w-full bg-white border-2 border-slate-300 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-slate-700 mb-1 sm:mb-1.5">
              মাল রিসিভার (Received By)
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="e.g. Tanvir Traders Store"
              className="w-full bg-white border-2 border-slate-300 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Inward Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden text-slate-900">
        <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs sm:text-sm text-slate-900">
              চালানের পণ্যের তালিকা ({rows.length} টি আইটেম)
            </span>
          </div>

          {rows.length > 0 && (
            <button
              onClick={() => setRows([])}
              className="text-[10px] sm:text-xs text-rose-400 hover:underline whitespace-nowrap"
            >
              তালিকা ক্লিয়ার করুন
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-10 sm:py-16 px-3 sm:px-4">
            <Truck className="w-9 h-9 sm:w-12 sm:h-12 text-slate-600 mx-auto mb-2 sm:mb-3" />
            <h3 className="text-sm sm:text-base font-bold text-slate-300">কোন পণ্য যোগ করা হয়নি</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4 sm:mb-5 leading-relaxed">
              চালানে আসা মাল এন্ট্রি করতে উপরের বোতাম দিয়ে একবারে সব ৫৯ টি বিস্কুট লোড করুন অথবা একটি একটি করে পণ্য যোগ করুন।
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
              <button
                onClick={handleLoadAllProducts}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition shadow-lg shadow-emerald-600/30"
              >
                সব ৫৯ টি আইটেম লোড করুন
              </button>
              <button
                onClick={handleAddRow}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition"
              >
                একটি পণ্য বাছাই করুন
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-max min-w-[900px] lg:w-full text-left text-[10px] sm:text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-700 text-[9px] sm:text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 sm:py-3 px-2 sm:px-3 text-center w-8 sm:w-10">#</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 min-w-[220px] sm:min-w-[280px]">পণ্য নির্বাচন (Product)</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-3 text-center w-20 sm:w-24">প্যাকিং</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-3 text-center w-24 sm:w-28 bg-emerald-100/70 text-emerald-900 border-x border-emerald-200">
                    আগত কার্টুন
                  </th>
                  <th className="py-2 sm:py-3 px-2 sm:px-3 text-center w-20 sm:w-24 bg-emerald-100/70 text-emerald-900 border-x border-emerald-200">
                    লুজ পিস
                  </th>
                  <th className="py-2 sm:py-3 px-2 sm:px-3 text-center w-20 sm:w-24">মোট পিস</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-3 text-right w-24 sm:w-28">ডিলার রেট (IP)</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-right min-w-[100px] sm:min-w-[120px] bg-slate-100 text-emerald-900 border-l border-slate-200">
                    মোট খরচ (৳)
                  </th>
                  <th className="py-2 sm:py-3 px-2 sm:px-3 text-center w-10 sm:w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {rows.map((row, index) => {
                  const cartons = Number(row.quantityCartons) || 0;
                  const pcs = Number(row.quantityPcs) || 0;
                  const totalPcs = cartons * row.cartonSize + pcs;
                  const rowCost = totalPcs * (Number(row.dealerPrice) || 0);

                  return (
                    <tr
                      key={index}
                      className={`hover:bg-slate-50/80 transition-colors bg-white ${totalPcs > 0 ? 'bg-emerald-50/40' : ''
                        }`}
                    >
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center text-[10px] sm:text-xs text-slate-600 font-semibold">
                        {index + 1}
                      </td>

                      {/* Product Selector */}
                      <td className="py-2 sm:py-2.5 px-2 sm:px-4">
                        <select
                          value={row.productId}
                          onChange={(e) => handleRowProductChange(index, e.target.value)}
                          className="w-full bg-white border-2 border-slate-300 rounded-lg px-2 py-1.5 text-[10px] sm:text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-sm"
                        >
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              [{p.sku}] {p.name} {p.banglaName ? `(${p.banglaName})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Carton Size */}
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center text-[10px] sm:text-xs text-slate-700 font-mono font-medium">
                        {row.cartonSize} p/c
                      </td>

                      {/* Inward Cartons */}
                      <td className="py-2 px-2 sm:px-3 text-center bg-emerald-50/30">
                        <input
                          type="number"
                          min="0"
                          value={row.quantityCartons === 0 ? '' : row.quantityCartons}
                          placeholder="0"
                          onChange={(e) =>
                            handleRowChange(index, 'quantityCartons', Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="w-16 sm:w-20 text-center font-bold font-mono text-[11px] sm:text-sm bg-white border-2 border-slate-300 rounded-lg py-1.5 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                        />
                      </td>

                      {/* Inward Pcs */}
                      <td className="py-2 px-2 sm:px-3 text-center bg-emerald-50/30">
                        <input
                          type="number"
                          min="0"
                          value={row.quantityPcs === 0 ? '' : row.quantityPcs}
                          placeholder="0"
                          onChange={(e) =>
                            handleRowChange(index, 'quantityPcs', Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="w-14 sm:w-16 text-center font-bold font-mono text-[11px] sm:text-sm bg-white border-2 border-slate-300 rounded-lg py-1.5 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                        />
                      </td>

                      {/* Total Pcs */}
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center font-mono font-bold text-[10px] sm:text-xs text-slate-800">
                        {totalPcs > 0 ? (
                          <span className="text-emerald-900 font-bold bg-emerald-100 border border-emerald-300 px-1.5 sm:px-2 py-0.5 rounded">
                            {totalPcs}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Dealer Purchase Price */}
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.dealerPrice}
                          onChange={(e) =>
                            handleRowChange(index, 'dealerPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 sm:w-20 text-right font-mono text-[10px] sm:text-xs bg-white border-2 border-slate-300 rounded-lg py-1 px-1.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
                        />
                      </td>

                      {/* Row Cost */}
                      <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-right font-mono font-bold text-[10px] sm:text-xs text-emerald-700">
                        ৳{rowCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* Remove Row */}
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center">
                        <button
                          onClick={() => handleRemoveRow(index)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Challan Summary Footer */}
        {rows.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
            <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-6 text-[10px] sm:text-xs text-slate-600 w-full md:w-auto">
              <div>
                <span className="text-slate-500">গৃহীত আইটেম: </span>
                <span className="text-slate-900 font-bold">{totals.activeRows} টি পণ্য</span>
              </div>
              <div>
                <span className="text-slate-500">মোট কার্টুন: </span>
                <span className="text-emerald-700 font-bold font-mono">{totals.totalCartons} ctn</span>
              </div>
              <div>
                <span className="text-slate-500">মোট পিস: </span>
                <span className="text-emerald-700 font-bold font-mono">{totals.totalPcs.toLocaleString()} pcs</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-300 px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl col-span-2 sm:col-span-1">
                <span className="text-emerald-800 font-semibold">মোট চালানের মূল্য: </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-800 font-mono">
                  {formatBDT(totals.totalCost)}
                </span>
              </div>
            </div>

            <button
              onClick={() => inwardMutation.mutate()}
              disabled={inwardMutation.isPending || totals.totalPcs === 0}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-600/30 transition transform active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {inwardMutation.isPending ? 'চালান সেভ হচ্ছে...' : 'চালান সেভ ও গোডাউন স্টক বাড়ান'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* History of Past Inwards */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm text-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-tight">
              পূর্বের চালান সমূহ (Inward Shipments History)
            </h2>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="চালান নং বা তারিখ দিয়ে খুঁজুন..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg sm:rounded-xl pl-8 sm:pl-9 pr-3 py-2 sm:py-1.5 text-[10px] sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-max min-w-[760px] lg:w-full text-left text-[10px] sm:text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[9px] sm:text-xs">
              <tr>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3">তারিখ</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">চালান নং</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3">সরবরাহকারী</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-3">গাড়ি নং</th>
                <th className="py-3 px-3 text-center">কার্টুন সংখ্যা</th>
                <th className="py-3 px-3 text-center">মোট পিস</th>
                <th className="py-3 px-4 text-right">মোট মূল্য (৳)</th>
                <th className="py-3 px-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {historyLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    ইতিহাস লোড হচ্ছে...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    কোন চালান রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredHistory.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50 bg-white">
                    <td className="py-2.5 sm:py-3 px-2 sm:px-3 font-semibold text-slate-900">{inv.date}</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-mono font-bold text-amber-700">
                      {inv.challanNo}
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-slate-700 font-medium">{inv.supplier}</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-slate-600">{inv.vehicleNo || '-'}</td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center font-mono text-slate-800 font-medium">
                      {inv.totalCartons} ctn
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center font-mono text-slate-800 font-medium">
                      {inv.totalPcs.toLocaleString()}
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                      ৳{inv.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `চালান ${inv.challanNo} ডিলিট করতে চান? এতে গোডাউন স্টক থেকে মাল কর্তন হবে।`
                            )
                          ) {
                            deleteMutation.mutate(inv._id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Challan and revert stock"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}