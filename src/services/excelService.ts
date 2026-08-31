import { Product, SaleInvoice, Batch, Supplier, Customer, Expense, PurchaseInvoice } from '../types';

export const excelService = {
  /**
   * Export Products to CSV (Excel compatible with UTF-8 BOM)
   */
  exportProductsToCSV(products: Product[]) {
    const headers = [
      'الباركود',
      'اسم الدواء التجاري',
      'الاسم العلمي',
      'المجموعة الدوائية',
      'الشكل الصيدلاني',
      'التركيز',
      'الشركة المصنعة',
      'بلد الصنع',
      'سعر الشراء (عبوة)',
      'سعر البيع (عبوة)',
      'سعر الشريط',
      'سعر الحبة',
      'أشرطة بالعبوة',
      'حبات بالشريط',
      'الكمية المتوفرة',
      'الحد الأدنى',
      'موقع الرف',
    ];

    const rows = products.map((p) => [
      `"${p.barcode}"`,
      `"${p.name}"`,
      `"${p.scientificName || ''}"`,
      `"${p.category}"`,
      `"${p.form}"`,
      `"${p.strength || ''}"`,
      `"${p.manufacturer || ''}"`,
      `"${p.country || ''}"`,
      p.costPrice,
      p.price,
      p.stripPrice || '',
      p.piecePrice || '',
      p.stripsPerPackage || 1,
      p.piecesPerStrip || 10,
      p.totalQuantity,
      p.minStock,
      `"${p.locationRack || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `products_catalog_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export Sales Invoices to CSV
   */
  exportSalesToCSV(sales: SaleInvoice[]) {
    const headers = [
      'رقم الفاتورة',
      'التاريخ',
      'الوقت',
      'اسم العميل',
      'عدد الأصناف',
      'المجموع الفرعي',
      'إجمالي الخصم',
      'الضريبة',
      'صافي الفاتورة',
      'المدفوع',
      'طريقة الدفع',
      'الكاشير',
      'الحالة',
    ];

    const rows = sales.map((s) => [
      `"${s.invoiceNumber}"`,
      `"${s.date}"`,
      `"${s.time}"`,
      `"${s.customerName || 'عميل نقدي'}"`,
      s.items.length,
      s.subtotal,
      s.totalDiscount,
      s.vatTotal,
      s.grandTotal,
      s.paidAmount,
      `"${s.paymentMethod}"`,
      `"${s.cashierName}"`,
      `"${s.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `sales_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export Customer Account Statement to CSV
   */
  exportCustomerStatementToCSV(
    customer: Customer,
    transactions: Array<{
      date: string;
      time?: string;
      ref: string;
      typeLabel: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }>
  ) {
    const headers = ['التاريخ', 'الوقت', 'رقم المرجع', 'نوع الحركة', 'البيان والتفاصيل', 'مدين (مشتريات)', 'دائن (المقبوض والمسدد)', 'الرصيد المتبقي'];

    const rows = transactions.map((t) => [
      `"${t.date}"`,
      `"${t.time || ''}"`,
      `"${t.ref}"`,
      `"${t.typeLabel}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.debit,
      t.credit,
      t.balance,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(
      csvContent,
      `statement_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv;charset=utf-8;'
    );
  },

  /**
   * Export Customers to CSV
   */
  exportCustomersToCSV(customers: Customer[]) {
    const headers = ['اسم العميل', 'رقم الهاتف', 'العنوان', 'سقف الائتمان', 'إجمالي المشتريات', 'الرصيد المدين (الدين)'];

    const rows = customers.map((c) => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.address || ''}"`,
      c.maxCreditLimit,
      c.totalPurchases,
      c.currentBalance,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `customers_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export Expenses to CSV
   */
  exportExpensesToCSV(expenses: Expense[]) {
    const headers = ['التاريخ', 'البند', 'البيان', 'المبلغ', 'طريقة الدفع', 'المسؤول'];

    const rows = expenses.map((e) => [
      `"${e.date}"`,
      `"${e.category}"`,
      `"${e.title}"`,
      e.amount,
      `"${e.paymentMethod}"`,
      `"${e.paidBy}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `expenses_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export Purchase Invoices to CSV
   */
  exportPurchasesToCSV(purchases: PurchaseInvoice[]) {
    const headers = [
      'رقم الفاتورة',
      'رقم فاتورة المورد',
      'التاريخ',
      'اسم المورد',
      'عدد الأصناف',
      'إجمالي التكلفة',
      'المدفوع',
      'المتبقي (آجل)',
      'حالة الدفع',
      'المستلم / المسؤول',
      'ملاحظات',
    ];

    const rows = purchases.map((p) => [
      `"${p.invoiceNumber}"`,
      `"${p.supplierInvoiceNumber || ''}"`,
      `"${p.date}"`,
      `"${p.supplierName}"`,
      p.items.length,
      p.grandTotal || p.totalAmount || 0,
      p.paidAmount || 0,
      p.remainingAmount || 0,
      `"${p.paymentStatus === 'paid' ? 'مدفوعة بالكامل' : p.paymentStatus === 'partial' ? 'مدفوعة جزئياً' : 'آجل / غير مدفوعة'}"`,
      `"${p.createdBy || ''}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `purchases_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export Suppliers Directory to CSV
   */
  exportSuppliersToCSV(suppliers: Supplier[]) {
    const headers = ['اسم الشركة / المورد', 'المندوب المسؤول', 'رقم الهاتف', 'البريد الإلكتروني', 'العنوان', 'إجمالي المشتريات', 'الرصيد المستحق (دين للمورد)'];

    const rows = suppliers.map((s) => [
      `"${s.name}"`,
      `"${s.contactPerson || ''}"`,
      `"${s.phone}"`,
      `"${s.email || ''}"`,
      `"${s.address || ''}"`,
      s.totalPurchases || 0,
      s.currentBalance || 0,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `suppliers_directory_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export Supplier Statement to CSV
   */
  exportSupplierStatementToCSV(
    supplier: Supplier,
    transactions: Array<{
      date: string;
      time?: string;
      ref: string;
      typeLabel: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }>
  ) {
    const headers = ['التاريخ', 'الوقت', 'رقم المرجع', 'نوع الحركة', 'البيان والتفاصيل', 'وارد / مشتريات (مستحق)', 'المسدد للمورد (دفعات)', 'الرصيد المتبقي للمورد'];

    const rows = transactions.map((t) => [
      `"${t.date}"`,
      `"${t.time || ''}"`,
      `"${t.ref}"`,
      `"${t.typeLabel}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.debit,
      t.credit,
      t.balance,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(
      csvContent,
      `supplier_statement_${supplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv;charset=utf-8;'
    );
  },

  /**
   * Export Batches & Inventory Expiry List
   */
  exportBatchesToCSV(batches: Batch[], products: Product[]) {
    const headers = [
      'اسم الدواء',
      'رقم التشغيلة (Batch)',
      'تاريخ الانتهاء',
      'الكمية المتبقية',
      'سعر الشراء',
      'سعر البيع',
      'إجمالي قيمة التكلفة',
      'إجمالي قيمة البيع',
      'اسم المورد',
      'تاريخ الاستلام',
      'الحالة',
    ];

    const rows = batches.map((b) => {
      const prod = products.find((p) => p.id === b.productId);
      return [
        `"${prod?.name || ''}"`,
        `"${b.batchNumber}"`,
        `"${b.expiryDate}"`,
        b.quantity,
        b.costPrice,
        b.sellingPrice,
        b.quantity * b.costPrice,
        b.quantity * b.sellingPrice,
        `"${b.supplierName || ''}"`,
        `"${b.receivedDate || ''}"`,
        `"${b.status}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `inventory_batches_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Parse CSV file into Products
   */
  parseProductsCSV(csvText: string): Partial<Product>[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const products: Partial<Product>[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Match comma separated while respecting quotes
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) => v.replace(/^"|"$/g, '').trim());

      if (values.length >= 4 && values[1]) {
        const barcode = values[0] || `${Date.now()}${i}`;
        const name = values[1];
        const scientificName = values[2] || '';
        const category = values[3] || 'أدوية عامة';
        const form = values[4] || 'أقراص';
        const strength = values[5] || '';
        const manufacturer = values[6] || '';
        const country = values[7] || '';
        const costPrice = parseFloat(values[8]) || 1000;
        const price = parseFloat(values[9]) || Math.round(costPrice * 1.3);
        const stripPrice = values[10] ? parseFloat(values[10]) : undefined;
        const piecePrice = values[11] ? parseFloat(values[11]) : undefined;
        const stripsPerPackage = values[12] ? parseInt(values[12], 10) : 2;
        const piecesPerStrip = values[13] ? parseInt(values[13], 10) : 10;
        const minStock = values[15] ? parseInt(values[15], 10) : 5;
        const locationRack = values[16] || '';

        products.push({
          barcode,
          name,
          scientificName,
          category,
          form,
          strength,
          manufacturer,
          country,
          costPrice,
          price,
          stripPrice,
          piecePrice,
          stripsPerPackage,
          piecesPerStrip,
          minStock,
          locationRack,
          requiresPrescription: false,
          vatRate: 0,
          active: true,
          totalQuantity: 0,
        });
      }
    }

    return products;
  },

  /**
   * Export Comprehensive Financial Report to CSV
   */
  exportFinancialReportToCSV(data: {
    periodTitle: string;
    dateRangeStr: string;
    salesTotal: number;
    costTotal: number;
    grossProfit: number;
    grossMargin: number;
    expensesTotal: number;
    netProfit: number;
    netMargin: number;
    invoicesCount: number;
    itemsSoldCount: number;
    cashSales: number;
    cardSales: number;
    creditSales: number;
    purchasesTotal?: number;
    supplierDebtsTotal?: number;
    customerDebtsTotal?: number;
  }) {
    const headers = ['البند المالي / المؤشر', 'القيمة المحققة (ر.ي)', 'ملاحظات وتفاصيل'];
    const rows = [
      ['"الفترة الزمنية"', `"${data.periodTitle} (${data.dateRangeStr})"`, '""'],
      ['"إجمالي المبيعات (Revenue)"', data.salesTotal, `"${data.invoicesCount} فاتورة بيع"`],
      ['"تكلفة البضاعة المباعة (COGS)"', data.costTotal, '""'],
      ['"مجمل الربح التجاري (Gross Profit)"', data.grossProfit, `"هامش ${data.grossMargin}%"`],
      ['"المصروفات التشغيلية (OPEX)"', data.expensesTotal, '"إيجارات، رواتب، كهرباء وغيرها"'],
      ['"صافي الربح الفعلي (Net Profit)"', data.netProfit, `"هامش صافي ${data.netMargin}%"`],
      ['"المقبوض نقداً (كاش الدرج)"', data.cashSales, '""'],
      ['"المحصل عبر الشبكة والبطاقات"', data.cardSales, '""'],
      ['"مبيعات آجلة (ذمم عملاء)"', data.creditSales, '""'],
      ['"إجمالي حجم المشتريات والتوريد"', data.purchasesTotal || 0, '""'],
      ['"إجمالي ديون الموردين والشركات"', data.supplierDebtsTotal || 0, '""'],
      ['"إجمالي ديون وذمم العملاء"', data.customerDebtsTotal || 0, '""'],
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `financial_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  /**
   * Export Best Selling Products to CSV
   */
  exportBestSellersToCSV(items: Array<{ name: string; qty: number; revenue: number; profit: number; margin: number }>) {
    const headers = ['الترتيب', 'اسم الصنف الدوائي', 'الكمية المباعة', 'إجمالي الإيراد', 'صافي الربح', 'هامش الربح %'];
    const rows = items.map((item, idx) => [
      idx + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      item.qty,
      item.revenue,
      item.profit,
      `${item.margin}%`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `best_sellers_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  },

  downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
