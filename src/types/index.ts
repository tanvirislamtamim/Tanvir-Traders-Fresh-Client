export interface IPriceHistory {
  tradePrice: number;
  dealerPrice: number;
  effectiveFrom: string;
  note?: string;
}

export interface IProduct {
  _id: string;
  sku: string;
  name: string;
  banglaName?: string;
  category: string;
  cartonSize: number; // Pieces per Carton
  dealerPrice: number; // Purchase price from Meghna Beverage Ltd (DP)
  tradePrice: number; // Selling price to retail shops (TP)
  mrp: number; // Printed retail price
  currentStockPcs: number; // Current stock in pieces
  currentStockCartons?: string;
  minStockAlert: number;
  isActive: boolean;
  priceHistory?: IPriceHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IDailySaleItem {
  productId: string | { _id: string; name: string; sku: string };
  productName: string;
  productSku: string;
  category?: string;
  cartonSize: number;
  quantityCartons: number;
  quantityPcs: number;
  totalPcsSold: number;
  unitTradePrice: number;
  unitDealerPrice: number;
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
}

export interface IDailySale {
  _id: string;
  date: string; // YYYY-MM-DD
  memoNo: string;
  notes?: string;
  items: IDailySaleItem[];
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  totalCartonsSold: number;
  totalPcsSold: number;
  stockDeducted: boolean;
  createdAt?: string;
}

export interface IStockInwardItem {
  productId: string;
  productName: string;
  productSku: string;
  cartonSize: number;
  quantityCartons: number;
  quantityPcs: number;
  totalPcsReceived: number;
  unitDealerPrice: number;
  totalCost: number;
}

export interface IStockInward {
  _id: string;
  challanNo: string;
  date: string;
  supplier: string;
  vehicleNo?: string;
  receivedBy?: string;
  notes?: string;
  items: IStockInwardItem[];
  totalAmount: number;
  totalCartons: number;
  totalPcs: number;
  stockAdded: boolean;
  createdAt?: string;
}

export interface IMonthlySummary {
  inwardCount: number;
  totalInwardTaka: number;
  totalInwardCartons: number;
  totalInwardPcs: number;
  totalSalesDays: number;
  totalSalesTaka: number;
  totalCostTaka: number;
  totalProfitTaka: number;
  totalCartonsSold: number;
  totalPcsSold: number;
  currentTotalStockPcs: number;
  currentTotalStockCartons: number;
  currentTotalStockValueDP: number;
  currentTotalStockValueTP: number;
  lowStockCount: number;
}

export interface IItemSummary {
  productId: string;
  sku: string;
  name: string;
  banglaName?: string;
  category: string;
  cartonSize: number;
  tradePrice: number;
  dealerPrice: number;
  inwardPcsThisMonth: number;
  soldPcsThisMonth: number;
  currentStockPcs: number;
  currentStockCartons: number;
  stockValueDP: number;
  stockValueTP: number;
}

export interface IDashboardSummary {
  today: {
    date: string;
    hasEntry: boolean;
    saleAmount: number;
    profitAmount: number;
    pcsSold: number;
    cartonsSold: number;
  };
  monthly: {
    month: string;
    salesAmount: number;
    profitAmount: number;
    inwardCount: number;
    inwardAmount: number;
  };
  inventory: {
    totalProductsCount: number;
    totalStockPcs: number;
    totalStockValueDP: number;
    totalStockValueTP: number;
    lowStockCount: number;
  };
}
