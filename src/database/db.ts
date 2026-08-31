import {
  Product,
  Batch,
  SaleInvoice,
  SaleReturn,
  PurchaseInvoice,
  Supplier,
  SupplierPayment,
  Customer,
  CustomerPayment,
  Expense,
  CashboxTransaction,
  ShiftReconciliation,
  PharmacySettings,
  User,
  AuditLog,
  AppNotification,
  CartItem
} from '../types';

import {
  initialSettings,
  initialUsers,
  initialSuppliers,
  initialCustomers,
  initialProducts,
  initialBatches,
  initialExpenses
} from './seedData';
import { getEssential100MedicinesDataset } from './essential100Medicines';

const DB_KEYS = {
  SETTINGS: 'pharma_settings',
  USERS: 'pharma_users',
  SUPPLIERS: 'pharma_suppliers',
  CUSTOMERS: 'pharma_customers',
  PRODUCTS: 'pharma_products',
  BATCHES: 'pharma_batches',
  SALES: 'pharma_sales',
  RETURNS: 'pharma_returns',
  PURCHASES: 'pharma_purchases',
  SUPPLIER_PAYMENTS: 'pharma_supplier_payments',
  CUSTOMER_PAYMENTS: 'pharma_customer_payments',
  EXPENSES: 'pharma_expenses',
  CASH_TRANSACTIONS: 'pharma_cash_transactions',
  SHIFT_RECONCILIATIONS: 'pharma_shift_reconciliations',
  AUDIT_LOGS: 'pharma_audit_logs',
  NOTIFICATIONS: 'pharma_notifications',
  INITIALIZED: 'pharma_db_v2_initialized',
};

class PharmacyDatabase {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private getItem<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return fallback;
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage error on key:', key, e);
    }
  }

  public init(forceReset = false) {
    const isInit = localStorage.getItem(DB_KEYS.INITIALIZED);
    if (!isInit || forceReset) {
      this.setItem(DB_KEYS.SETTINGS, initialSettings);
      this.setItem(DB_KEYS.USERS, initialUsers);
      this.setItem(DB_KEYS.SUPPLIERS, initialSuppliers);
      this.setItem(DB_KEYS.CUSTOMERS, initialCustomers);
      this.setItem(DB_KEYS.PRODUCTS, initialProducts);
      this.setItem(DB_KEYS.BATCHES, initialBatches);
      this.setItem(DB_KEYS.EXPENSES, initialExpenses);
      this.setItem(DB_KEYS.SALES, []);
      this.setItem(DB_KEYS.RETURNS, []);
      this.setItem(DB_KEYS.PURCHASES, []);
      this.setItem(DB_KEYS.SUPPLIER_PAYMENTS, []);
      this.setItem(DB_KEYS.CUSTOMER_PAYMENTS, []);
      this.setItem(DB_KEYS.AUDIT_LOGS, [
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          userId: 'usr-1',
          userName: 'النظام',
          action: 'تهيئة قاعدة البيانات',
          module: 'settings',
          details: 'تم تجهيز قاعدة بيانات الصيدلية وكتالوج الأدوية بنجاح',
        },
      ]);
      localStorage.setItem(DB_KEYS.INITIALIZED, 'true');
      this.recalculateAllProductStocks();
      this.checkAndGenerateAlerts();
    }

    // Automatically ensure essential 100 medicines list is populated
    this.ensureEssential100Medicines();

    this.notify();
  }

  public ensureEssential100Medicines(force = false): void {
    const is100Loaded = localStorage.getItem('pharma_essential_100_v1');
    if (is100Loaded && !force) return;

    const { products: essentialProds, batches: essentialBatches } = getEssential100MedicinesDataset();
    const existingProducts = this.getProducts();
    const existingBatches = this.getBatches();

    const existingBarcodeMap = new Map<string, Product>();
    const existingNameMap = new Map<string, Product>();
    existingProducts.forEach((p) => {
      if (p.barcode) existingBarcodeMap.set(p.barcode.trim(), p);
      if (p.name) existingNameMap.set(p.name.trim().toLowerCase(), p);
    });

    let addedCount = 0;
    const newProductsToAdd: Product[] = [];
    const newBatchesToAdd: Batch[] = [];

    essentialProds.forEach((ep, idx) => {
      const matchByBarcode = ep.barcode ? existingBarcodeMap.get(ep.barcode.trim()) : undefined;
      const matchByName = existingNameMap.get(ep.name.trim().toLowerCase());
      const existing = matchByBarcode || matchByName;

      if (!existing) {
        newProductsToAdd.push(ep);
        if (essentialBatches[idx]) {
          newBatchesToAdd.push(essentialBatches[idx]);
        }
        addedCount++;
      } else {
        // Ensure the batch exists for existing product if it has no stock
        const hasBatch = existingBatches.some((b) => b.productId === existing.id || b.batchNumber === ep.barcode);
        if (!hasBatch && essentialBatches[idx]) {
          newBatchesToAdd.push({
            ...essentialBatches[idx],
            productId: existing.id,
            productName: existing.name,
          });
        }
      }
    });

    if (newProductsToAdd.length > 0) {
      this.setItem(DB_KEYS.PRODUCTS, [...existingProducts, ...newProductsToAdd]);
    }
    if (newBatchesToAdd.length > 0) {
      this.setItem(DB_KEYS.BATCHES, [...existingBatches, ...newBatchesToAdd]);
    }

    localStorage.setItem('pharma_essential_100_v1', 'true');
    this.recalculateAllProductStocks();
    this.checkAndGenerateAlerts();

    if (addedCount > 0) {
      this.logAudit(
        'استيراد قائمة الأدوية الأساسية',
        'inventory',
        `تم دمج ${addedCount} صنف دوائي من قائمة الـ 100 دواء الأساسية بنجاح`
      );
    }
  }

  // --- Settings ---
  public getSettings(): PharmacySettings {
    const saved = this.getItem<PharmacySettings>(DB_KEYS.SETTINGS, initialSettings);
    return { ...initialSettings, ...saved };
  }

  public updateSettings(settings: Partial<PharmacySettings>): PharmacySettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.setItem(DB_KEYS.SETTINGS, updated);
    this.logAudit('تعديل إعدادات النظام', 'settings', 'تم تحديث معلومات الصيدلية أو إعدادات الفاتورة');
    this.notify();
    return updated;
  }

  // --- Users ---
  public getUsers(): User[] {
    const users = this.getItem<User[]>(DB_KEYS.USERS, initialUsers);
    // Ensure admin user matches updated default if unchanged
    const adminIndex = users.findIndex((u) => u.id === 'usr-1');
    if (adminIndex >= 0 && (users[adminIndex].username === 'admin' || users[adminIndex].name.includes('أحمد المنصوري'))) {
      users[adminIndex] = initialUsers[0];
      this.setItem(DB_KEYS.USERS, users);
    }
    return users;
  }

  public saveUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    this.setItem(DB_KEYS.USERS, users);
    this.logAudit('حفظ مستخدم', 'auth', `تم حفظ بيانات المستخدم: ${user.name}`);
    this.notify();
  }

  public deleteUser(userId: string): void {
    let users = this.getUsers();
    users = users.filter((u) => u.id !== userId);
    this.setItem(DB_KEYS.USERS, users);
    this.notify();
  }

  // --- Products & Batches ---
  public getProducts(): Product[] {
    return this.getItem<Product[]>(DB_KEYS.PRODUCTS, initialProducts);
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    return this.getProducts().find((p) => p.barcode === clean);
  }

  public getBatches(): Batch[] {
    return this.getItem<Batch[]>(DB_KEYS.BATCHES, initialBatches);
  }

  public getBatchesForProduct(productId: string): Batch[] {
    return this.getBatches()
      .filter((b) => b.productId === productId && b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()); // FIFO (الأقرب انتهاء أولاً)
  }

  public saveProduct(product: Product, initialBatchData?: Partial<Batch>): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    const now = new Date().toISOString().split('T')[0];

    let savedProduct: Product;
    if (index >= 0) {
      savedProduct = { ...product, updatedAt: now };
      products[index] = savedProduct;
    } else {
      savedProduct = {
        ...product,
        id: product.id || `med-${Date.now().toString(36)}`,
        createdAt: now,
        updatedAt: now,
      };
      products.push(savedProduct);

      // Create initial batch if supplied
      if (initialBatchData && initialBatchData.quantity && initialBatchData.quantity > 0) {
        const batches = this.getBatches();
        batches.push({
          id: `bat-${Date.now().toString(36)}`,
          productId: savedProduct.id,
          batchNumber: initialBatchData.batchNumber || `BAT-${new Date().getFullYear()}-01`,
          expiryDate: initialBatchData.expiryDate || '2027-12-31',
          quantity: initialBatchData.quantity,
          costPrice: initialBatchData.costPrice || savedProduct.costPrice,
          sellingPrice: initialBatchData.sellingPrice || savedProduct.price,
          receivedDate: now,
          status: 'active',
          supplierId: initialBatchData.supplierId,
          supplierName: initialBatchData.supplierName,
        });
        this.setItem(DB_KEYS.BATCHES, batches);
      }
    }

    this.setItem(DB_KEYS.PRODUCTS, products);
    this.recalculateProductStock(savedProduct.id);
    this.logAudit('حفظ دواء', 'inventory', `تم حفظ بيانات الدواء: ${savedProduct.name}`);
    this.checkAndGenerateAlerts();
    this.notify();
    return savedProduct;
  }

  public deleteProduct(productId: string): void {
    let products = this.getProducts();
    products = products.filter((p) => p.id !== productId);
    this.setItem(DB_KEYS.PRODUCTS, products);

    let batches = this.getBatches();
    batches = batches.filter((b) => b.productId !== productId);
    this.setItem(DB_KEYS.BATCHES, batches);

    this.notify();
  }

  public saveBatch(batch: Batch): void {
    const batches = this.getBatches();
    const index = batches.findIndex((b) => b.id === batch.id);
    if (index >= 0) {
      batches[index] = batch;
    } else {
      batches.push({
        ...batch,
        id: batch.id || `bat-${Date.now().toString(36)}`,
      });
    }
    this.setItem(DB_KEYS.BATCHES, batches);
    this.recalculateProductStock(batch.productId);
    this.checkAndGenerateAlerts();
    this.notify();
  }

  public deleteBatch(batchId: string): void {
    const batches = this.getBatches();
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;

    const filtered = batches.filter((b) => b.id !== batchId);
    this.setItem(DB_KEYS.BATCHES, filtered);
    this.recalculateProductStock(batch.productId);
    this.notify();
  }

  public adjustBatchQuantity(batchId: string, newQuantity: number, reason: string, userId: string, userName: string): void {
    const batches = this.getBatches();
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;

    const diff = newQuantity - batch.quantity;
    batch.quantity = Math.max(0, newQuantity);
    if (batch.quantity === 0) {
      batch.status = 'depleted';
    }
    this.setItem(DB_KEYS.BATCHES, batches);
    this.recalculateProductStock(batch.productId);

    const product = this.getProductById(batch.productId);
    this.logAudit(
      'تسوية مخزون',
      'inventory',
      `تسوية دفعة ${batch.batchNumber} لصنف ${product?.name || ''} من ${batch.quantity - diff} إلى ${newQuantity}. السبب: ${reason}`
    );
    this.notify();
  }

  private recalculateProductStock(productId: string): void {
    const batches = this.getBatches().filter((b) => b.productId === productId);
    const totalQty = batches.reduce((acc, b) => acc + (b.quantity || 0), 0);

    const products = this.getProducts();
    const pIndex = products.findIndex((p) => p.id === productId);
    if (pIndex >= 0) {
      products[pIndex].totalQuantity = totalQty;
      this.setItem(DB_KEYS.PRODUCTS, products);
    }
  }

  public recalculateAllProductStocks(): void {
    const products = this.getProducts();
    const batches = this.getBatches();

    products.forEach((p) => {
      const pBatches = batches.filter((b) => b.productId === p.id);
      p.totalQuantity = pBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);
    });

    this.setItem(DB_KEYS.PRODUCTS, products);
    this.notify();
  }

  // --- Sales & POS Operations ---
  public getSales(): SaleInvoice[] {
    return this.getItem<SaleInvoice[]>(DB_KEYS.SALES, []);
  }

  public getSaleById(id: string): SaleInvoice | undefined {
    return this.getSales().find((s) => s.id === id);
  }

  public createSaleInvoice(invoiceData: Omit<SaleInvoice, 'id' | 'invoiceNumber' | 'createdAt'>): SaleInvoice {
    const sales = this.getSales();
    const count = sales.length + 1;
    const invNum = `INV-${new Date().getFullYear()}-${count.toString().padStart(5, '0')}`;

    const invoice: SaleInvoice = {
      ...invoiceData,
      id: `sale-${Date.now()}`,
      invoiceNumber: invNum,
      createdAt: new Date().toISOString(),
    };

    // Deduct stock from batches (FIFO)
    const batches = this.getBatches();

    invoice.items.forEach((item) => {
      // Amount in full packages equivalent
      const pkgQty = item.quantity * item.unitMultiplier;
      let remainingToDeduct = pkgQty;

      // Deduct from specific batch if chosen, or FIFO from all batches of product
      const productBatches = batches
        .filter((b) => b.productId === item.product.id && b.quantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      if (item.batchId) {
        const targetBatch = batches.find((b) => b.id === item.batchId);
        if (targetBatch) {
          targetBatch.quantity = Math.max(0, targetBatch.quantity - remainingToDeduct);
          if (targetBatch.quantity === 0) targetBatch.status = 'depleted';
          remainingToDeduct = 0;
        }
      }

      if (remainingToDeduct > 0) {
        for (const b of productBatches) {
          if (b.quantity >= remainingToDeduct) {
            b.quantity -= remainingToDeduct;
            remainingToDeduct = 0;
            if (b.quantity === 0) b.status = 'depleted';
            break;
          } else {
            remainingToDeduct -= b.quantity;
            b.quantity = 0;
            b.status = 'depleted';
          }
        }
      }
    });

    this.setItem(DB_KEYS.BATCHES, batches);
    invoice.items.forEach((i) => this.recalculateProductStock(i.product.id));

    // Update Customer debt balance if credit / debt sale
    let custId = invoice.customerId;
    const unpaidDebt = Math.max(0, invoice.grandTotal - (invoice.paidAmount || 0));

    // If customerId is missing but customerName/patientName is provided, find or create the customer
    const rawCustName = (invoice.customerName || invoice.patientName || '').trim();
    if (!custId && rawCustName && rawCustName !== 'عميل نقدي') {
      const customers = this.getCustomers();
      let match = customers.find(
        (c) => c.name.trim().toLowerCase() === rawCustName.toLowerCase()
      );
      if (!match && (invoice.paymentMethod === 'credit' || unpaidDebt > 0)) {
        match = this.saveCustomer({
          name: rawCustName,
          phone: '',
          address: '',
          currentBalance: 0,
          totalPurchases: 0,
          maxCreditLimit: 0,
          notes: 'تم إنشاؤه تلقائياً عند إجراء فاتورة آجلة',
        });
      }
      if (match) {
        custId = match.id;
        invoice.customerId = match.id;
        invoice.customerName = match.name;
      }
    }

    if (custId) {
      const customers = this.getCustomers();
      const customer = customers.find((c) => c.id === custId);
      if (customer) {
        if (invoice.paymentMethod === 'credit' || unpaidDebt > 0) {
          customer.currentBalance += unpaidDebt;
        }
        customer.totalPurchases = (customer.totalPurchases || 0) + invoice.grandTotal;
        this.setItem(DB_KEYS.CUSTOMERS, customers);
      }
    }

    sales.unshift(invoice);
    this.setItem(DB_KEYS.SALES, sales);

    this.logAudit('إجراء عملية بيع', 'pos', `فاتورة مبيعات رقم ${invNum} بقيمة ${invoice.grandTotal} ر.ي`);
    this.checkAndGenerateAlerts();
    this.notify();
    return invoice;
  }

  // --- Sales Returns ---
  public getReturns(): SaleReturn[] {
    return this.getItem<SaleReturn[]>(DB_KEYS.RETURNS, []);
  }

  public createSaleReturn(returnData: Omit<SaleReturn, 'id' | 'returnNumber' | 'createdAt'>): SaleReturn {
    const returns = this.getReturns();
    const count = returns.length + 1;
    const returnNumber = `RET-${new Date().getFullYear()}-${count.toString().padStart(5, '0')}`;

    const newReturn: SaleReturn = {
      ...returnData,
      id: `ret-${Date.now()}`,
      returnNumber,
      createdAt: new Date().toISOString(),
    };

    // Restore stock to batches
    const batches = this.getBatches();
    newReturn.items.forEach((item) => {
      let multiplier = 1;
      if (item.unitType === 'strip') {
        const product = this.getProductById(item.productId);
        multiplier = 1 / (product?.stripsPerPackage || 1);
      } else if (item.unitType === 'piece') {
        const product = this.getProductById(item.productId);
        const strips = product?.stripsPerPackage || 1;
        const pieces = product?.piecesPerStrip || 10;
        multiplier = 1 / (strips * pieces);
      }

      const pkgQty = item.returnedQuantity * multiplier;

      if (item.batchId) {
        const batch = batches.find((b) => b.id === item.batchId);
        if (batch) {
          batch.quantity += pkgQty;
          batch.status = 'active';
        }
      } else {
        const firstBatch = batches.find((b) => b.productId === item.productId);
        if (firstBatch) {
          firstBatch.quantity += pkgQty;
          firstBatch.status = 'active';
        }
      }
      this.recalculateProductStock(item.productId);
    });

    this.setItem(DB_KEYS.BATCHES, batches);

    // Update customer debt balance if customer exists
    if (newReturn.customerId && newReturn.refundMethod === 'credit_reversal') {
      const customers = this.getCustomers();
      const customer = customers.find((c) => c.id === newReturn.customerId);
      if (customer) {
        customer.currentBalance = Math.max(0, customer.currentBalance - newReturn.totalRefund);
        this.setItem(DB_KEYS.CUSTOMERS, customers);
      }
    }

    // Update original invoice status
    const sales = this.getSales();
    const invoice = sales.find((s) => s.id === newReturn.originalInvoiceId);
    if (invoice) {
      invoice.status = 'partially_returned';
      this.setItem(DB_KEYS.SALES, sales);
    }

    returns.unshift(newReturn);
    this.setItem(DB_KEYS.RETURNS, returns);

    this.logAudit('إرجاع مبيعات', 'pos', `سند مرتجع رقم ${returnNumber} لفاتورة ${newReturn.originalInvoiceNumber}`);
    this.notify();
    return newReturn;
  }

  // --- Purchases & Suppliers ---
  public getPurchases(): PurchaseInvoice[] {
    return this.getItem<PurchaseInvoice[]>(DB_KEYS.PURCHASES, []);
  }

  public getPurchaseInvoices(): PurchaseInvoice[] {
    return this.getPurchases();
  }

  public getPurchaseById(id: string): PurchaseInvoice | undefined {
    return this.getPurchases().find((p) => p.id === id);
  }

  public savePurchaseInvoice(invoice: PurchaseInvoice): PurchaseInvoice {
    const purchases = this.getPurchases();
    const index = purchases.findIndex((p) => p.id === invoice.id);
    let saved: PurchaseInvoice;
    if (index >= 0) {
      saved = invoice;
      purchases[index] = saved;
    } else {
      saved = invoice;
      purchases.unshift(saved);
    }
    this.setItem(DB_KEYS.PURCHASES, purchases);
    this.notify();
    return saved;
  }

  public deletePurchaseInvoice(invoiceId: string): void {
    let purchases = this.getPurchases();
    purchases = purchases.filter((p) => p.id !== invoiceId);
    this.setItem(DB_KEYS.PURCHASES, purchases);
    this.notify();
  }

  public createPurchaseInvoice(purchaseData: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'createdAt'>): PurchaseInvoice {
    const purchases = this.getPurchases();
    const count = purchases.length + 1;
    const invNum = `PUR-${new Date().getFullYear()}-${count.toString().padStart(5, '0')}`;

    const purchase: PurchaseInvoice = {
      ...purchaseData,
      id: `pur-${Date.now()}`,
      invoiceNumber: invNum,
      createdAt: new Date().toISOString(),
    };

    // Add or increment batches
    const batches = this.getBatches();
    const products = this.getProducts();

    purchase.items.forEach((item) => {
      // Check if batch with this number already exists
      const existingBatch = batches.find((b) => b.productId === item.productId && b.batchNumber === item.batchNumber);
      if (existingBatch) {
        existingBatch.quantity += item.quantity;
        existingBatch.costPrice = item.costPrice;
        existingBatch.sellingPrice = item.sellingPrice;
        existingBatch.expiryDate = item.expiryDate;
        existingBatch.status = 'active';
      } else {
        batches.push({
          id: `bat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: item.productId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          supplierId: purchase.supplierId,
          supplierName: purchase.supplierName,
          receivedDate: purchase.date,
          status: 'active',
        });
      }

      // Update product cost and selling price in catalog
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.costPrice = item.costPrice;
        prod.price = item.sellingPrice;
        if (prod.stripsPerPackage) {
          prod.stripPrice = Math.round(item.sellingPrice / prod.stripsPerPackage);
        }
      }
    });

    this.setItem(DB_KEYS.BATCHES, batches);
    this.setItem(DB_KEYS.PRODUCTS, products);
    purchase.items.forEach((i) => this.recalculateProductStock(i.productId));

    // Update supplier balance
    if (purchase.supplierId && purchase.remainingAmount > 0) {
      const suppliers = this.getSuppliers();
      const sup = suppliers.find((s) => s.id === purchase.supplierId);
      if (sup) {
        sup.currentBalance += purchase.remainingAmount;
        this.setItem(DB_KEYS.SUPPLIERS, suppliers);
      }
    }

    purchases.unshift(purchase);
    this.setItem(DB_KEYS.PURCHASES, purchases);

    this.logAudit('فاتورة مشتريات', 'purchases', `فاتورة شراء رقم ${invNum} من المورد ${purchase.supplierName} بقيمة ${purchase.grandTotal} ر.ي`);
    this.checkAndGenerateAlerts();
    this.notify();
    return purchase;
  }

  public getSuppliers(): Supplier[] {
    return this.getItem<Supplier[]>(DB_KEYS.SUPPLIERS, initialSuppliers);
  }

  public saveSupplier(supplier: Supplier): Supplier {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    let saved: Supplier;
    if (index >= 0) {
      saved = supplier;
      suppliers[index] = saved;
    } else {
      saved = {
        ...supplier,
        id: supplier.id || `sup-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString().split('T')[0],
      };
      suppliers.push(saved);
    }
    this.setItem(DB_KEYS.SUPPLIERS, suppliers);
    this.notify();
    return saved;
  }

  public deleteSupplier(supplierId: string): void {
    let suppliers = this.getSuppliers();
    suppliers = suppliers.filter((s) => s.id !== supplierId);
    this.setItem(DB_KEYS.SUPPLIERS, suppliers);
    this.notify();
  }

  public getSupplierPayments(): SupplierPayment[] {
    return this.getItem<SupplierPayment[]>(DB_KEYS.SUPPLIER_PAYMENTS, []);
  }

  public addSupplierPayment(payment: Omit<SupplierPayment, 'id' | 'createdAt'>): SupplierPayment {
    const payments = this.getSupplierPayments();
    const newPayment: SupplierPayment = {
      ...payment,
      id: `spay-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const suppliers = this.getSuppliers();
    const sup = suppliers.find((s) => s.id === payment.supplierId);
    if (sup) {
      sup.currentBalance = Math.max(0, sup.currentBalance - payment.amount);
      this.setItem(DB_KEYS.SUPPLIERS, suppliers);
    }

    payments.unshift(newPayment);
    this.setItem(DB_KEYS.SUPPLIER_PAYMENTS, payments);

    this.logAudit('سند صرف لمورد', 'suppliers', `صرف مبلغ ${payment.amount} ر.ي للمورد ${payment.supplierName}`);
    this.notify();
    return newPayment;
  }

  // --- Customers & Debt Repayments ---
  public getCustomers(): Customer[] {
    return this.getItem<Customer[]>(DB_KEYS.CUSTOMERS, initialCustomers);
  }

  public saveCustomer(customer: Partial<Customer> & { name: string }): Customer {
    const customers = this.getCustomers();
    const index = customer.id ? customers.findIndex((c) => c.id === customer.id) : -1;
    let saved: Customer;
    if (index >= 0) {
      saved = {
        ...customers[index],
        ...customer,
      } as Customer;
      customers[index] = saved;
    } else {
      saved = {
        id: customer.id || `cust-${Date.now().toString(36)}`,
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email,
        address: customer.address || '',
        currentBalance: customer.currentBalance || 0,
        maxCreditLimit: customer.maxCreditLimit || 0,
        totalPurchases: customer.totalPurchases || 0,
        color: customer.color,
        notes: customer.notes,
        createdAt: customer.createdAt || new Date().toISOString().split('T')[0],
      };
      customers.push(saved);
    }
    this.setItem(DB_KEYS.CUSTOMERS, customers);
    this.notify();
    return saved;
  }

  public deleteCustomer(customerId: string): void {
    let customers = this.getCustomers();
    customers = customers.filter((c) => c.id !== customerId);
    this.setItem(DB_KEYS.CUSTOMERS, customers);
    this.notify();
  }

  public getCustomerPayments(): CustomerPayment[] {
    return this.getItem<CustomerPayment[]>(DB_KEYS.CUSTOMER_PAYMENTS, []);
  }

  public addCustomerPayment(payment: Omit<CustomerPayment, 'id' | 'createdAt'>): CustomerPayment {
    const payments = this.getCustomerPayments();
    const newPayment: CustomerPayment = {
      ...payment,
      id: `cpay-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === payment.customerId);
    if (cust) {
      cust.currentBalance = Math.max(0, cust.currentBalance - payment.amount);
      this.setItem(DB_KEYS.CUSTOMERS, customers);
    }

    payments.unshift(newPayment);
    this.setItem(DB_KEYS.CUSTOMER_PAYMENTS, payments);

    this.logAudit('سند قبض من عميل', 'customers', `قبض مبلغ ${payment.amount} ر.ي من العميل ${payment.customerName}`);
    this.notify();
    return newPayment;
  }

  public deleteCustomerPayment(paymentId: string): void {
    let payments = this.getCustomerPayments();
    const payment = payments.find((p) => p.id === paymentId);
    if (payment) {
      const customers = this.getCustomers();
      const cust = customers.find((c) => c.id === payment.customerId);
      if (cust) {
        cust.currentBalance += payment.amount;
        this.setItem(DB_KEYS.CUSTOMERS, customers);
      }
      payments = payments.filter((p) => p.id !== paymentId);
      this.setItem(DB_KEYS.CUSTOMER_PAYMENTS, payments);
      this.logAudit('إلغاء سند قبض', 'customers', `إلغاء سند قبض بقيمة ${payment.amount} ر.ي للعميل ${payment.customerName}`);
      this.notify();
    }
  }

  // --- Expenses ---
  public getExpenses(): Expense[] {
    return this.getItem<Expense[]>(DB_KEYS.EXPENSES, initialExpenses);
  }

  public addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const expenses = this.getExpenses();
    const newExp: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExp);
    this.setItem(DB_KEYS.EXPENSES, expenses);
    this.logAudit('تسجيل مصروف', 'settings', `مصروف: ${expense.title} بمبلغ ${expense.amount} ر.ي`);
    this.notify();
    return newExp;
  }

  public deleteExpense(id: string): void {
    let expenses = this.getExpenses();
    expenses = expenses.filter((e) => e.id !== id);
    this.setItem(DB_KEYS.EXPENSES, expenses);
    this.notify();
  }

  // --- Cashbox Transactions (Deposits, Withdrawals, Injections) ---
  public getCashTransactions(): CashboxTransaction[] {
    return this.getItem<CashboxTransaction[]>(DB_KEYS.CASH_TRANSACTIONS, []);
  }

  public addCashTransaction(tx: Omit<CashboxTransaction, 'id' | 'createdAt'>): CashboxTransaction {
    const transactions = this.getCashTransactions();
    const newTx: CashboxTransaction = {
      ...tx,
      id: `ctx-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    transactions.unshift(newTx);
    this.setItem(DB_KEYS.CASH_TRANSACTIONS, transactions);
    const actionLabel = tx.type === 'deposit' ? 'إيداع نقدي بالصندوق' : 'سحب نقدي من الصندوق';
    this.logAudit(actionLabel, 'settings', `${tx.title} بمبلغ ${tx.amount} ر.ي`);
    this.notify();
    return newTx;
  }

  public deleteCashTransaction(id: string): void {
    let transactions = this.getCashTransactions();
    transactions = transactions.filter((t) => t.id !== id);
    this.setItem(DB_KEYS.CASH_TRANSACTIONS, transactions);
    this.notify();
  }

  // --- Shift Drawer Reconciliations (جرد ومطابقة الصندوق) ---
  public getShiftReconciliations(): ShiftReconciliation[] {
    return this.getItem<ShiftReconciliation[]>(DB_KEYS.SHIFT_RECONCILIATIONS, []);
  }

  public saveShiftReconciliation(rec: Omit<ShiftReconciliation, 'id' | 'createdAt'>): ShiftReconciliation {
    const list = this.getShiftReconciliations();
    const count = list.length + 1;
    const recNum = `REC-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;
    const newRec: ShiftReconciliation = {
      ...rec,
      id: `rec-${Date.now()}`,
      reconciliationNumber: recNum,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newRec);
    this.setItem(DB_KEYS.SHIFT_RECONCILIATIONS, list);
    this.logAudit('تسوية وجرد الصندوق', 'settings', `جرد الصندوق رقم ${recNum} - فارق: ${rec.difference} ر.ي (${rec.status})`);
    this.notify();
    return newRec;
  }

  public deleteShiftReconciliation(id: string): void {
    let list = this.getShiftReconciliations();
    list = list.filter((r) => r.id !== id);
    this.setItem(DB_KEYS.SHIFT_RECONCILIATIONS, list);
    this.notify();
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(DB_KEYS.AUDIT_LOGS, []);
  }

  public logAudit(action: string, module: AuditLog['module'], details: string, userId = 'usr-1', userName = 'المستخدم الحالي'): void {
    const logs = this.getAuditLogs();
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      module,
      details,
    };
    logs.unshift(log);
    if (logs.length > 500) logs.pop();
    this.setItem(DB_KEYS.AUDIT_LOGS, logs);
  }

  // --- Notifications & Automated Alerts ---
  public getNotifications(): AppNotification[] {
    return this.getItem<AppNotification[]>(DB_KEYS.NOTIFICATIONS, []);
  }

  public markNotificationAsRead(id: string): void {
    const notifs = this.getNotifications();
    const n = notifs.find((x) => x.id === id);
    if (n) {
      n.read = true;
      this.setItem(DB_KEYS.NOTIFICATIONS, notifs);
      this.notify();
    }
  }

  public clearAllNotifications(): void {
    this.setItem(DB_KEYS.NOTIFICATIONS, []);
    this.notify();
  }

  public checkAndGenerateAlerts(): void {
    const settings = this.getSettings();
    const batches = this.getBatches();
    const products = this.getProducts();
    const notifs: AppNotification[] = [];

    const now = new Date();
    const thresholdDays = settings.nearExpiryThresholdDays || 90;
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + thresholdDays);

    // 1. Check near expiry & expired batches
    batches.forEach((b) => {
      if (b.quantity <= 0) return;
      const exp = new Date(b.expiryDate);
      const prod = products.find((p) => p.id === b.productId);
      const prodName = prod?.name || 'دواء غير معروف';

      if (exp <= now) {
        notifs.push({
          id: `exp-${b.id}`,
          type: 'expiry_alert',
          title: 'دواء منتهي الصلاحية!',
          message: `انتهت صلاحية الدفعة (${b.batchNumber}) لصنف "${prodName}" بتاريخ ${b.expiryDate} (الكمية: ${b.quantity})`,
          link: '/inventory',
          date: new Date().toISOString(),
          read: false,
        });
      } else if (exp <= thresholdDate) {
        const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        notifs.push({
          id: `near-${b.id}`,
          type: 'expiry_alert',
          title: 'تنبيه: اقتراب انتهاء الصلاحية',
          message: `ينتهي صنف "${prodName}" دفعة (${b.batchNumber}) خلال ${daysLeft} يوم (${b.expiryDate}) - الكمية: ${b.quantity}`,
          link: '/inventory',
          date: new Date().toISOString(),
          read: false,
        });
      }
    });

    // 2. Check Low stock
    products.forEach((p) => {
      if (p.totalQuantity <= (p.minStock || settings.lowStockDefaultThreshold || 5)) {
        notifs.push({
          id: `low-${p.id}`,
          type: 'low_stock',
          title: 'تنبيه: نفاد وشيك للمخزون',
          message: `المخزون المتوفر من "${p.name}" وصل إلى (${p.totalQuantity}) عبوة فقط (الحد الأدنى: ${p.minStock})`,
          link: '/products',
          date: new Date().toISOString(),
          read: false,
        });
      }
    });

    this.setItem(DB_KEYS.NOTIFICATIONS, notifs.slice(0, 30));
  }

  // --- Export & Import Backup ---
  public getDatabaseStats() {
    const products = this.getProducts();
    const batches = this.getBatches();
    const sales = this.getSales();
    const returns = this.getReturns();
    const purchases = this.getPurchases();
    const customers = this.getCustomers();
    const suppliers = this.getSuppliers();
    const expenses = this.getExpenses();
    const users = this.getUsers();
    const auditLogs = this.getAuditLogs();

    return {
      productsCount: products.length,
      batchesCount: batches.length,
      salesCount: sales.length,
      returnsCount: returns.length,
      purchasesCount: purchases.length,
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      expensesCount: expenses.length,
      usersCount: users.length,
      auditLogsCount: auditLogs.length,
      totalRecords:
        products.length +
        batches.length +
        sales.length +
        returns.length +
        purchases.length +
        customers.length +
        suppliers.length +
        expenses.length +
        users.length +
        auditLogs.length,
    };
  }

  public exportFullBackup(): string {
    const backup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      users: this.getUsers(),
      suppliers: this.getSuppliers(),
      customers: this.getCustomers(),
      products: this.getProducts(),
      batches: this.getBatches(),
      sales: this.getSales(),
      returns: this.getReturns(),
      purchases: this.getPurchases(),
      supplierPayments: this.getSupplierPayments(),
      customerPayments: this.getCustomerPayments(),
      expenses: this.getExpenses(),
      auditLogs: this.getAuditLogs(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data.products || !data.settings) {
        throw new Error('ملف النسخة الاحتياطية غير صالح');
      }

      if (data.settings) this.setItem(DB_KEYS.SETTINGS, data.settings);
      if (data.users) this.setItem(DB_KEYS.USERS, data.users);
      if (data.suppliers) this.setItem(DB_KEYS.SUPPLIERS, data.suppliers);
      if (data.customers) this.setItem(DB_KEYS.CUSTOMERS, data.customers);
      if (data.products) this.setItem(DB_KEYS.PRODUCTS, data.products);
      if (data.batches) this.setItem(DB_KEYS.BATCHES, data.batches);
      if (data.sales) this.setItem(DB_KEYS.SALES, data.sales);
      if (data.returns) this.setItem(DB_KEYS.RETURNS, data.returns);
      if (data.purchases) this.setItem(DB_KEYS.PURCHASES, data.purchases);
      if (data.supplierPayments) this.setItem(DB_KEYS.SUPPLIER_PAYMENTS, data.supplierPayments);
      if (data.customerPayments) this.setItem(DB_KEYS.CUSTOMER_PAYMENTS, data.customerPayments);
      if (data.expenses) this.setItem(DB_KEYS.EXPENSES, data.expenses);
      if (data.auditLogs) this.setItem(DB_KEYS.AUDIT_LOGS, data.auditLogs);

      this.recalculateAllProductStocks();
      this.checkAndGenerateAlerts();
      this.logAudit('استعادة نسخة احتياطية', 'settings', 'تم استعادة قاعدة البيانات من ملف نسخة احتياطية خارجي');
      this.notify();
      return true;
    } catch (e) {
      console.error('Import backup failed', e);
      return false;
    }
  }
}

export const db = new PharmacyDatabase();
