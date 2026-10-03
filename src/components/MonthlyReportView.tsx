'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  FileDown,
  TrendingUp,
  Truck,
  ShoppingBag,
  Search,
  RefreshCw,
  Building2,
} from 'lucide-react';
import api from '@/lib/axios';
import { exportMonthlyReportPdf, formatBDT } from '@/lib/pdfExport';
import { IMonthlySummary, IItemSummary } from '@/types';

export default function MonthlyReportView() {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: reportData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['monthly-report', selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/reports/monthly?month=${selectedMonth}`);
      return res.data;
    },
  });

  const summary: IMonthlySummary = reportData?.summary || {
    inwardCount: 0,
    totalInwardTaka: 0,
    totalInwardCartons: 0,
    totalInwardPcs: 0,
    totalSalesDays: 0,
    totalSalesTaka: 0,
    totalCostTaka: 0,
    totalProfitTaka: 0,
    totalCartonsSold: 0,
    totalPcsSold: 0,
    currentTotalStockPcs: 0,
    currentTotalStockCartons: 0,
    currentTotalStockValueDP: 0,
    currentTotalStockValueTP: 0,
    lowStockCount: 0,
  };

  const itemSummaries: IItemSummary[] = reportData?.itemSummaries || [];

  const filteredItems = itemSummaries.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.banglaName && item.banglaName.includes(searchQuery)) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', ...Array.from(new Set(itemSummaries.map((i) => i.category)))];

  const handleDownloadPdf = () => {
    if (!reportData || itemSummaries.length === 0) return;
    exportMonthlyReportPdf(selectedMonth, summary, itemSummaries);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white">
                  Monthly Dealership &amp; Stock Report
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  মাসে কতবার মাল ঢুকলো, কত টাকার মাল আসলো, কত টাকা সেল হলো এবং কারেন্ট স্টকের পূর্ণাঙ্গ বিবরণ।
                </p>
              </div>
            </div>
          </div>

          {/* Month Selector & PDF Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 shadow-inner">
              <Calendar className="w-4 h-4 text-purple-400 mr-2" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Refresh Report"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-purple-400' : ''}`} />
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isLoading || itemSummaries.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-100 hover:bg-sky-200 text-slate-800 border border-slate-200 font-extrabold rounded-xl text-xs shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-4 h-4 text-indigo-600" />
              <span>মাসিক স্টক রিপোর্ট PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Core Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-800">
          {/* 1. Inward Shipments */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> কারখানা থেকে মাল আগমন
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Inward
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {summary.inwardCount}{' '}
              <span className="text-xs font-normal text-slate-400">বার মাল এসেছে</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              মোট মালের মূল্য:{' '}
              <span className="font-bold text-emerald-400 font-mono">
                {formatBDT(summary.totalInwardTaka)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {summary.totalInwardCartons} ctn ({summary.totalInwardPcs.toLocaleString()} pcs)
            </div>
          </div>

          {/* 2. Monthly Total Sales */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between text-blue-400 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4" /> চলতি মাসে মোট সেল
              </span>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Sales
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatBDT(summary.totalSalesTaka)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              বিক্রিত মোট মাল:{' '}
              <span className="font-bold text-blue-400 font-mono">
                {summary.totalCartonsSold} ctn
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {summary.totalPcsSold.toLocaleString()} পিস ({summary.totalSalesDays} দিন এন্ট্রি)
            </div>
          </div>

          {/* 3. Estimated Gross Profit */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> অনুমিত মোট লাভ (Profit)
              </span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Margin
              </span>
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono">
              {formatBDT(summary.totalProfitTaka)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              লাভের শতকরা হার:{' '}
              <span className="font-bold text-amber-400 font-mono">
                {summary.totalSalesTaka > 0
                  ? ((summary.totalProfitTaka / summary.totalSalesTaka) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              বিক্রিত মালের ক্রয়মূল্য: {formatBDT(summary.totalCostTaka)}

            </div>
          </div>

          {/* 4. Current Total Warehouse Stock Value */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between text-purple-400 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> গোডাউন বর্তমান স্টক মূল্য
              </span>
              <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Valuation
              </span>
            </div>
            <div className="text-2xl font-black text-purple-300 font-mono">
              {formatBDT(summary.currentTotalStockValueTP)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              ক্রয়মূল্যে (IP):{' '}
              <span className="font-bold text-slate-200 font-mono">
                {formatBDT(summary.currentTotalStockValueDP)}
              </span>
            </div>
            <div className="text-[11px] text-purple-300 mt-0.5 font-mono">
              {summary.currentTotalStockCartons} কার্টুন ({summary.currentTotalStockPcs.toLocaleString()} পিস)
            </div>
          </div>
        </div>
      </div>

      {/* Product-wise Movement & Closing Stock Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-black">
        {/* Table header controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="পণ্য বা SKU দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-black font-semibold placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${selectedCategory === cat
                  ? 'bg-sky-600 text-white font-bold shadow-sm'
                  : 'bg-slate-100 text-black hover:bg-slate-200 border border-slate-200'
                  }`}
              >
                {cat === 'All' ? 'সব ক্যাটাগরি' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left text-xs text-black">
            <thead className="bg-slate-100 text-black uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-10 text-black font-bold">#</th>
                <th className="py-3 px-3 w-20 text-black font-bold">SKU</th>
                <th className="py-3 px-4 min-w-[220px] text-black font-bold">পণ্যের বিবরণ (Item Name)</th>
                <th className="py-3 px-3 text-center text-black font-bold">ক্যাটাগরি</th>
                <th className="py-3 px-3 text-center bg-emerald-50 text-black font-bold border-x border-emerald-100">
                  মাসে প্রাপ্তি (Inward)
                </th>
                <th className="py-3 px-3 text-center bg-blue-50 text-black font-bold border-x border-blue-100">
                  মাসে বিক্রয় (Sold)
                </th>
                <th className="py-3 px-3 text-center bg-sky-50 text-black font-bold border-x border-sky-100">
                  বর্তমান সমাপনী স্টক
                </th>
                <th className="py-3 px-3 text-right text-black font-bold">বিক্রয় রেট (ETP)</th>
                <th className="py-3 px-4 text-right bg-slate-100 text-black font-bold">
                  স্টক মূল্য (৳ TP)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-black">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-black font-semibold opacity-100">
                    মাসিক হিসাব প্রস্তুত হচ্ছে...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-black font-semibold opacity-100">
                    কোনো আইটেম পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isLow = item.currentStockPcs <= 48;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center text-black font-bold opacity-100">{index + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-black opacity-100">{item.sku}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-black opacity-100">{item.name}</div>
                        {item.banglaName && (
                          <div className="text-[11px] text-black font-medium opacity-100">{item.banglaName}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-black font-medium opacity-100">{item.category}</td>

                      {/* Inward Pcs this month */}
                      <td className="py-3 px-3 text-center font-mono font-bold bg-emerald-50/60 text-black opacity-100 border-x border-emerald-100/60">
                        {item.inwardPcsThisMonth > 0 ? (
                          `${item.inwardPcsThisMonth} pcs`
                        ) : (
                          <span className="text-black font-normal opacity-100">-</span>
                        )}
                      </td>

                      {/* Sold Pcs this month */}
                      <td className="py-3 px-3 text-center font-mono font-bold bg-blue-50/60 text-black opacity-100 border-x border-blue-100/60">
                        {item.soldPcsThisMonth > 0 ? (
                          `${item.soldPcsThisMonth} pcs`
                        ) : (
                          <span className="text-black font-normal opacity-100">-</span>
                        )}
                      </td>

                      {/* Current Closing Stock */}
                      <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center font-mono bg-sky-50/60 text-black border-x border-sky-100/60 whitespace-nowrap">
                        <span
                          className={`px-1 sm:px-2 py-0.5 rounded-full font-bold text-[10px] sm:text-xs ${isLow
                            ? "bg-rose-100 text-rose-900 border border-rose-300"
                            : "text-black"
                            }`}
                        >
                          {item.currentStockCartons} ctn ({item.currentStockPcs}p)
                        </span>
                      </td>

                      {/* Trade Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-black opacity-100">
                        ৳{item.tradePrice.toFixed(2)}
                      </td>

                      {/* Stock Value */}
                      <td className="py-3 px-4 text-right font-mono font-black text-black opacity-100 text-sm bg-slate-50">
                        ৳{item.stockValueTP.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
