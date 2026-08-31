export type UserRole = 'admin' | 'pharmacist' | 'cashier' | 'accountant';

export type UserPermission =
  | 'pos_sale'              // إتمام عمليات البيع
  | 'pos_discount'          // منح خصومات
  | 'pos_return'            // تسجيل مرتجعات مبيعات
  | 'pos_price_override'    // تعديل أسعار البيع يدوياً
  | 'pos_void_item'         // حذف بنود من السلة أثناء البيع
  | 'pos_drawer_open'       // فتح درج الكاشير يدوياً
  | 'inventory_view'        // استعراض المخزون
  | 'inventory_edit'        // إضافة وتعديل الأدوية والدفعات
  | 'inventory_adjust'      // تسوية فروقات الجرد والهالك
  | 'purchases_manage'      // إدارة المشتريات والموردين
  | 'customers_manage'      // إدارة العملاء والديون
  | 'expenses_manage'       // إدارة المصروفات
  | 'cashbox_manage'        // إدارة الصندوق والخزينة والوردية
  | 'reports_view'          // الاطلاع على التقارير المالية
  | 'reports_cost_profit'   // الاطلاع على تكاليف الشراء وهوامش الأرباح
  | 'settings_manage'       // تعديل إعدادات النظام
  | 'users_manage'          // إدارة الموظفين والصلاحيات
  | 'backup_manage'         // النسخ الاحتياطي واستعادة البيانات
  | 'audit_view';           // الاطلاع على سجل الرقابة والأمان

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  email?: string;
  avatar?: string;
  avatarColor?: string; // e.g. 'teal', 'indigo', 'purple', 'emerald', 'amber', 'rose'
  pin?: string;
  active: boolean;
  shift?: 'morning' | 'evening' | 'night' | 'full';
  maxDiscountPercentage?: number; // أقصى نسبة خصم مسموح بها دون تفويض المدير (e.g. 5, 10, 100)
  permissions?: UserPermission[];
  lastLogin?: string;
  notes?: string;
  createdAt: string;
}

export type UnitType = 'package' | 'strip' | 'piece';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  scientificName: string;
  category: string;
  form: string; // أقراص, كبسولات, شراب, حقن, مرهم, قطرة, بخاخ
  strength: string; // 500mg, 1g, 10mg/5ml
  manufacturer: string;
  country?: string;
  costPrice: number; // سعر شراء العبوة
  price: number; // سعر بيع العبوة
  stripPrice?: number; // سعر بيع الشريط
  piecePrice?: number; // سعر بيع الحبة
  stripsPerPackage?: number; // عدد الأشرطة بالعبوة
  piecesPerStrip?: number; // عدد الحبات بالشريط
  minStock: number;
  maxStock?: number;
  requiresPrescription: boolean;
  locationRack?: string; // الرف أو الدرج
  description?: string;
  vatRate: number; // 0% or percentage
  active: boolean;
  totalQuantity: number; // إجمالي العبوات المتوفرة عبر كافة الدفعات
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  productName?: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number; // بالعبوات
  costPrice: number;
  sellingPrice: number;
  supplierId?: string;
  supplierName?: string;
  receivedDate: string;
  status: 'active' | 'near_expiry' | 'expired' | 'depleted';
  notes?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  productName?: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  unitType: UnitType;
  unitName: string;
  unitMultiplier: number; // 1 for package, 1/strips for strip, 1/(strips*pieces) for piece
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountPercentage: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'credit' | 'mixed';

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  customerId?: string;
  customerName: string;
  patientName?: string;
  doctorName?: string;
  pharmacistName?: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  cardAmount?: number;
  cashAmount?: number;
  status: 'completed' | 'returned' | 'partially_returned' | 'cancelled';
  cashierId: string;
  cashierName: string;
  notes?: string;
  createdAt: string;
}

export interface SaleReturnItem {
  cartItemId: string;
  productId: string;
  productName: string;
  batchId?: string;
  unitType: UnitType;
  unitName: string;
  returnedQuantity: number;
  unitPrice: number;
  refundAmount: number;
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  date: string;
  time: string;
  customerId?: string;
  customerName: string;
  items: SaleReturnItem[];
  totalRefund: number;
  refundMethod: 'cash' | 'credit_reversal' | 'card';
  reason: string;
  cashierId: string;
  cashierName: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  barcode: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  totalAmount?: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'received' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  currentBalance: number; // المبلغ المطلوب له (دائن)
  totalPurchases?: number;
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  color?: string; // Distinct visual theme color (e.g. 'emerald', 'indigo', 'rose', 'amber', 'purple', etc.)
  currentBalance: number; // رصيد الديون المستحقة عليه
  maxCreditLimit: number;
  totalPurchases: number;
  notes?: string;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'rent' | 'electricity' | 'salaries' | 'supplies' | 'maintenance' | 'taxes' | 'other';
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  paidBy: string;
  notes?: string;
  createdAt: string;
}

export interface CashboxTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'opening_balance' | 'shift_close';
  title: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  category?: string;
  recordedBy: string;
  reason?: string;
  notes?: string;
  createdAt: string;
}

export interface ShiftReconciliation {
  id: string;
  reconciliationNumber?: string;
  shiftDate: string;
  cashierName: string;
  openingBalance: number;
  expectedCash: number;
  countedCash: number;
  difference: number; // positive = surplus, negative = deficit, 0 = matched
  status: 'balanced' | 'surplus' | 'deficit';
  denominations?: Record<string, number>;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: 'pos' | 'inventory' | 'purchases' | 'customers' | 'suppliers' | 'settings' | 'auth';
  details: string;
}

export interface PharmacySettings {
  pharmacyName: string;
  pharmacyNameEn?: string;
  branchName: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  website?: string;
  taxNumber: string;
  crNumber: string;
  licenseNumber: string;
  currency: string;
  currencySymbol: string;
  enableVat: boolean;
  vatPercentage: number;
  nearExpiryThresholdDays: number;
  lowStockDefaultThreshold: number;
  enableSoundEffects: boolean;
  soundEffects?: boolean;
  printReceiptDirectly: boolean;
  receiptSize: '80mm' | '58mm' | 'A4' | 'A5';
  receiptPaperSize?: '80mm' | '58mm' | 'A4' | 'A5';
  receiptHeaderMessage: string;
  receiptFooterMessage: string;
  returnPolicyText?: string;
  showPharmacistNameOnReceipt: boolean;
  allowNegativeStock: boolean;
  logoUrl?: string;
  showLogoOnReceipt?: boolean;
  logoPosition?: 'center' | 'right' | 'left';
  logoSize?: 'small' | 'medium' | 'large';
  showPhoneOnReceipt?: boolean;
  showAddressOnReceipt?: boolean;
  showTaxNumberOnReceipt?: boolean;
  showCrNumberOnReceipt?: boolean;
  showBarcodeOnReceipt?: boolean;
  showQrCodeOnReceipt?: boolean;
  showCustomerOnReceipt?: boolean;
  showDoctorOnReceipt?: boolean;
  // Security & Access Control Policies
  requirePinOnDiscount?: boolean;
  maxDiscountWithoutManager?: number; // percentage e.g. 10
  requirePinOnReturn?: boolean;
  requirePinOnPriceChange?: boolean;
  autoLockMinutes?: number; // 0 = disabled, 5, 10, 15, 30
  enableShiftTracking?: boolean;
  // External Hardware Barcode Scanner Settings
  barcodeScannerSettings?: {
    enabled?: boolean;
    minBarcodeLength?: number;
    maxKeyIntervalMs?: number;
    autoConvertArabicLayout?: boolean;
    enableGS1DataMatrix?: boolean;
    enableSoundFeedback?: boolean;
    autoIncrementQuantity?: boolean;
    repeatScanCooldownMs?: number;
    scannerSuffix?: 'enter' | 'tab' | 'timeout' | 'any';
    customPrefix?: string;
    preventInputPollution?: boolean;
  };
}

export interface AppNotification {
  id: string;
  type: 'expiry_alert' | 'low_stock' | 'debt_alert' | 'info';
  title: string;
  message: string;
  link?: string;
  date: string;
  read: boolean;
}
