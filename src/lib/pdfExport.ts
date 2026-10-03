import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IDailySale, IMonthlySummary, IItemSummary } from '@/types';

// Helper to format currency in BDT
export const formatBDT = (amount: number): string => {
  return 'Tk. ' + (amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

// Export Daily Sales Memo PDF
export const exportDailySalePdf = (sale: IDailySale) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header banner
  doc.setFillColor(15, 23, 42); // dark slate #0f172a
  doc.rect(0, 0, 210, 36, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TANVIR TRADERS', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Authorised Dealer: MEGHNA BEVERAGE LTD - FRESH', 14, 22);
  doc.text('ALFADANGA, FARIDPUR', 14, 28);

  // Memo Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 42, 182, 24, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 42, 182, 24, 3, 3, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`DAILY SALES SUMMARY / MEMO`, 18, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date: ${sale.date}`, 18, 58);
  doc.text(`Memo No: ${sale.memoNo}`, 75, 58);
  doc.text(`Items Sold: ${sale.items?.length || 0} products`, 135, 58);

  // Filter sold items (only items with totalPcsSold > 0)
  const soldItems = (sale.items || []).filter((item) => item.totalPcsSold > 0);

  const tableRows = soldItems.map((item, index) => [
    (index + 1).toString(),
    item.productSku || '-',
    item.productName,
    item.quantityCartons?.toString() || '0',
    item.quantityPcs?.toString() || '0',
    item.totalPcsSold?.toString() || '0',
    'Tk. ' + item.unitTradePrice?.toFixed(2),
    'Tk. ' + item.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
  ]);

  autoTable(doc, {
    startY: 72,
    head: [
      [
        '#',
        'SKU',
        'Item Description',
        'Cartons',
        'Pcs',
        'Total Pcs',
        'Rate (TP)',
        'Total Amount',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 68 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 26 },
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 180;

  // Grand Total Summary Box
  const summaryBoxY = finalY + 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(110, summaryBoxY, 86, 26, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(110, summaryBoxY, 86, 26, 'S');

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Cartons Sold:`, 114, summaryBoxY + 7);
  doc.text(`${sale.totalCartonsSold} ctn`, 175, summaryBoxY + 7, { align: 'right' });

  doc.text(`Total Pieces Sold:`, 114, summaryBoxY + 13);
  doc.text(`${sale.totalPcsSold} pcs`, 175, summaryBoxY + 13, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`GRAND TOTAL:`, 114, summaryBoxY + 21);
  doc.text(formatBDT(sale.totalAmount), 190, summaryBoxY + 21, { align: 'right' });

  // Signature lines
  const sigY = summaryBoxY + 45;
  if (sigY < 275) {
    doc.setDrawColor(148, 163, 184);
    doc.line(20, sigY, 70, sigY);
    doc.line(140, sigY, 190, sigY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By / Store Keeper', 25, sigY + 5);
    doc.text('Proprietor / Tanvir Traders', 145, sigY + 5);
  }

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Tanvir Traders - Official Meghna Beverage Ltd - Fresh Dealership. Generated on ${new Date().toLocaleString()}`,
    14,
    290
  );

  doc.save(`Tanvir_Traders_DailySale_${sale.date}.pdf`);
};

// Export Monthly Summary & Stock Report PDF
export const exportMonthlyReportPdf = (
  month: string,
  summary: IMonthlySummary,
  itemSummaries: IItemSummary[]
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TANVIR TRADERS', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`MEGHNA BEVERAGE LTD – FRESH (${month})`, 14, 20);

  doc.text('ALFADANGA, FARIDPUR', 14, 25);

  // 4 Metric KPI Cards
  const cardW = 42;
  const cardH = 22;
  const cardY = 42;

  // Card 1: Inward Count & Value
  doc.setFillColor(240, 253, 244); // green-50
  doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, cardY, cardW, cardH, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text('FACTORY INWARD', 17, cardY + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${summary.inwardCount} Shipments`, 17, cardY + 12);
  doc.setFontSize(8);
  doc.text(formatBDT(summary.totalInwardTaka), 17, cardY + 18);

  // Card 2: Total Sales
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(60, cardY, cardW, cardH, 2, 2, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(60, cardY, cardW, cardH, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 64, 175);
  doc.text('TOTAL MONTH SALES', 63, cardY + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${summary.totalSalesDays} Active Days`, 63, cardY + 12);
  doc.setFontSize(8);
  doc.text(formatBDT(summary.totalSalesTaka), 63, cardY + 18);

  // Card 3: Gross Profit
  doc.setFillColor(254, 243, 199); // amber-50
  doc.roundedRect(106, cardY, cardW, cardH, 2, 2, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(106, cardY, cardW, cardH, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(146, 64, 14);
  doc.text('EST. GROSS PROFIT', 109, cardY + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(formatBDT(summary.totalProfitTaka), 109, cardY + 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Margin: ${summary.totalSalesTaka > 0 ? ((summary.totalProfitTaka / summary.totalSalesTaka) * 100).toFixed(1) : 0}%`, 109, cardY + 18);

  // Card 4: Current Stock Valuation
  doc.setFillColor(245, 243, 255); // purple-50
  doc.roundedRect(152, cardY, cardW + 2, cardH, 2, 2, 'F');
  doc.setDrawColor(221, 214, 254);
  doc.roundedRect(152, cardY, cardW + 2, cardH, 2, 2, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 33, 168);
  doc.text('STOCK VALUATION (TP)', 155, cardY + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(formatBDT(summary.currentTotalStockValueTP), 155, cardY + 13);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${summary.currentTotalStockCartons} Total Cartons`, 155, cardY + 18);

  // Product Items Table
  const tableRows = itemSummaries.map((p, idx) => [
    (idx + 1).toString(),
    p.sku,
    p.name,
    p.category,
    p.inwardPcsThisMonth ? `${p.inwardPcsThisMonth} pcs` : '0',
    p.soldPcsThisMonth ? `${p.soldPcsThisMonth} pcs` : '0',
    `${p.currentStockCartons} ctn (${p.currentStockPcs}p)`,
    'Tk. ' + p.tradePrice.toFixed(2),
    'Tk. ' + p.stockValueTP.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
  ]);

  autoTable(doc, {
    startY: 68,
    head: [
      [
        '#',
        'SKU',
        'Product Name',
        'Category',
        'Recvd',
        'Sold',
        'Current Stock',
        'TP Rate',
        'Stock Value',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 16 },
      2: { cellWidth: 54 },
      3: { cellWidth: 26 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 24 },
      7: { halign: 'right', cellWidth: 16 },
      8: { halign: 'right', cellWidth: 20 },
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Tanvir Traders (Meghna Beverage Ltd - Fresh Dealership) | Page ${i} of ${pageCount}`,
      14,
      292
    );
  }

  doc.save(`Tanvir_Traders_MonthlyReport_${month}.pdf`);
};
