import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  DollarSign,
  User,
  CreditCard,
  Building,
  CheckCircle2,
  Printer,
  MessageCircle,
  FileText,
  AlertTriangle,
  Search,
  Check,
  ChevronDown,
  Sparkles,
  Receipt
} from 'lucide-react';
import { Customer, CustomerPayment } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { printerService } from '../../services/printerService';
import { getCustomerColor } from '../../utils/customerColors';

interface QuickPaymentModalProps {
  isOpen: boolean;
  initialCustomer?: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  initialCustomer,
  onClose,
  onSaved,
}) => {
  const { formatCurrency, settings } = useSettingsStore();
  const { currentUser } = useAuthStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [printAuto, setPrintAuto] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastPayment, setLastPayment] = useState<CustomerPayment | null>(null);

  // Search in customer dropdown
  const [customerSearch, setCustomerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const allCust = db.getCustomers();
      setCustomers(allCust);
      if (initialCustomer) {
        setSelectedCustomerId(initialCustomer.id);
        if (initialCustomer.currentBalance > 0) {
          setAmount(initialCustomer.currentBalance.toString());
        }
      } else {
        const firstDebtor = allCust.find((c) => c.currentBalance > 0);
        if (firstDebtor) {
          setSelectedCustomerId(firstDebtor.id);
          setAmount(firstDebtor.currentBalance.toString());
        } else if (allCust.length > 0) {
          setSelectedCustomerId(allCust[0].id);
        }
      }
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('سداد دفعة من الحساب الآجل');
      setLastPayment(null);
      setCustomerSearch('');
      setIsDropdownOpen(false);
    }
  }, [isOpen, initialCustomer]);

  // Outside click close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setIsDropdownOpen(false);
    setCustomerSearch('');
    if (cust.currentBalance > 0) {
      setAmount(cust.currentBalance.toString());
    } else {
      setAmount('');
    }
  };

  const handleFullPay = () => {
    if (selectedCustomer) {
      setAmount(selectedCustomer.currentBalance.toString());
    }
  };

  const handleHalfPay = () => {
    if (selectedCustomer && selectedCustomer.currentBalance > 0) {
      const half = Math.round((selectedCustomer.currentBalance / 2) * 100) / 100;
      setAmount(half.toString());
    }
  };

  const handleAddAmount = (addVal: number) => {
    const curr = parseFloat(amount) || 0;
    setAmount((curr + addVal).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('يرجى اختيار العميل أولاً');
      return;
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      alert('يرجى إدخال مبلغ سداد صحيح أكبر من الصفر');
      return;
    }

    setIsSubmitting(true);
    try {
      const payment = db.addCustomerPayment({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        date: date,
        amount: payAmount,
        paymentMethod: paymentMethod,
        notes: notes.trim() || 'سداد دفعة نقدية من الحساب',
        recordedBy: currentUser?.name || 'الكاشير',
      });

      const updatedCust = {
        ...selectedCustomer,
        currentBalance: Math.max(0, selectedCustomer.currentBalance - payAmount),
      };

      if (printAuto) {
        printerService.printCustomerPaymentReceipt(payment, updatedCust, settings);
      }

      setLastPayment(payment);
      onSaved();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ سند القبض');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    if (lastPayment && selectedCustomer) {
      const updatedCust = {
        ...selectedCustomer,
        currentBalance: Math.max(0, selectedCustomer.currentBalance - lastPayment.amount),
      };
      printerService.printCustomerPaymentReceipt(lastPayment, updatedCust, settings);
    }
  };

  const handleSendWhatsApp = () => {
    if (!lastPayment || !selectedCustomer) return;
    const cleanPhone = selectedCustomer.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.startsWith('967')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `967${cleanPhone.slice(1)}`
      : cleanPhone
      ? `967${cleanPhone}`
      : '';

    const newBal = Math.max(0, selectedCustomer.currentBalance - lastPayment.amount);
    const msg = `*صيدلية ${settings.pharmacyName}*\n` +
      `--------------------------------\n` +
      `سند قبض مالي رقم: *#${lastPayment.id.slice(-6).toUpperCase()}*\n` +
      `العميل المحترم: *${selectedCustomer.name}*\n\n` +
      `✅ *المبلغ المستلم:* ${formatCurrency(lastPayment.amount)}\n` +
      `💳 *طريقة الدفع:* ${paymentMethod === 'cash' ? 'نقداً' : paymentMethod === 'card' ? 'شبكة / بطاقة' : 'تحويل بنكي'}\n` +
      `📌 *الرصيد المتبقي:* ${formatCurrency(newBal)}\n` +
      `📅 *التاريخ:* ${lastPayment.date}\n` +
      `📝 *البيان:* ${lastPayment.notes || 'سداد دفعة من الحساب'}\n\n` +
      `شاكرين حسن تعاملكم معنا دائماً 🌿`;

    const encoded = encodeURIComponent(msg);
    if (phoneWithCode) {
      window.open(`https://wa.me/${phoneWithCode}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs select-none animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-teal-200 w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
        {/* Compact Header */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-teal-800 to-teal-700 text-white flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-teal-200">
              <Receipt className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-xs sm:text-sm leading-tight text-white">
                سند قبض فوري وسداد ديون
              </h2>
              <p className="text-[10px] text-teal-200 leading-none mt-0.5">
                تصفية حساب العميل وتسجيل الدفعة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {lastPayment ? (
          /* Post-Payment Success View */
          <div className="p-4 text-center space-y-3 overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-4 ring-emerald-50">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                تم حفظ سند القبض بنجاح!
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تم تحديث رصيد العميل وكشف الحساب فوراً
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">العميل:</span>
                <span className="font-bold text-slate-900">{selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">المبلغ المقبوض:</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">
                  {formatCurrency(lastPayment.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">الرصيد المتبقي:</span>
                <span className="font-bold text-amber-700 font-mono text-xs">
                  {formatCurrency(
                    Math.max(0, (selectedCustomer?.currentBalance || 0) - lastPayment.amount)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">تاريخ السند:</span>
                <span className="font-mono text-slate-700 text-[11px]">{lastPayment.date}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="py-2 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الإيصال</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>إرسال واتساب</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              تم وإغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-2.5 overflow-y-auto flex-1 text-xs">
            {/* 1. Customer Selector Dropdown with Search */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between text-[11px]">
                <span>اختيار العميل *</span>
                {selectedCustomer && (
                  <span className="text-[10px]">
                    المديونية:{' '}
                    <strong
                      className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                        selectedCustomer.currentBalance > 0
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {formatCurrency(selectedCustomer.currentBalance)}
                    </strong>
                  </span>
                )}
              </label>

              {/* Selected Customer Display button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full rounded-xl px-2.5 py-2 text-xs text-right font-bold text-slate-800 flex items-center justify-between cursor-pointer focus:outline-none transition-all ${
                  selectedCustomer
                    ? `${getCustomerColor(selectedCustomer).cardBg} ${getCustomerColor(selectedCustomer).borderAccent}`
                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedCustomer ? (
                    <>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs shrink-0 ${getCustomerColor(selectedCustomer).avatarBg}`}>
                        {selectedCustomer.name.charAt(0)}
                      </div>
                      <span className="truncate text-slate-900">{selectedCustomer.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${getCustomerColor(selectedCustomer).badge}`}>
                        {getCustomerColor(selectedCustomer).nameAr}
                      </span>
                    </>
                  ) : (
                    <span>-- اضغط لاختيار العميل --</span>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full right-0 left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-teal-200 overflow-hidden divide-y divide-slate-100">
                  <div className="p-1.5 bg-teal-50/80 sticky top-0">
                    <div className="relative">
                      <Search className="w-3 h-3 text-teal-600 absolute right-2 top-2" />
                      <input
                        type="text"
                        placeholder="ابحث بالاسم أو رقم الهاتف..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pr-6 pl-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">لا يوجد عميل مطابق</div>
                    ) : (
                      filteredCustomers.map((c) => {
                        const theme = getCustomerColor(c);
                        const isSelected = selectedCustomerId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className={`p-2 cursor-pointer flex items-center justify-between transition-colors border-r-4 ${theme.borderAccent.split(' ')[1]} ${
                              isSelected ? theme.activeCardBg : `${theme.cardBg} ${theme.cardHover}`
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs shrink-0 ${theme.avatarBg}`}>
                                {c.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-slate-800 truncate">{c.name}</span>
                                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${theme.badge}`}>
                                    {theme.nameAr}
                                  </span>
                                </div>
                                {c.phone && <div className="text-[10px] text-slate-400 font-mono">{c.phone}</div>}
                              </div>
                            </div>
                            <div className="shrink-0 text-left mr-1">
                              {c.currentBalance > 0 ? (
                                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {formatCurrency(c.currentBalance)}
                                </span>
                              ) : (
                                <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                                  خالص
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Amount Input + Quick Action Chips */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-bold text-[11px]">
                  المبلغ المقبوض ({settings.currencySymbol}) *
                </label>
                {selectedCustomer && selectedCustomer.currentBalance > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleHalfPay}
                      className="text-teal-700 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded text-[10px] font-bold border border-teal-200 cursor-pointer"
                    >
                      نصف الدين
                    </button>
                    <button
                      type="button"
                      onClick={handleFullPay}
                      className="text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-300 cursor-pointer"
                    >
                      كامل الدين
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <DollarSign className="w-4 h-4 text-emerald-600 absolute right-2.5 top-2.5 pointer-events-none" />
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pr-8 pl-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-2xs"
                  autoFocus={!selectedCustomer}
                />
              </div>

              {/* Quick Amount Add Chips */}
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5">
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">مبالغ سريعة:</span>
                {[500, 1000, 2000, 5000, 10000, 20000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v.toString())}
                    className="shrink-0 px-2 py-0.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded text-[10px] font-mono font-bold border border-slate-200 cursor-pointer transition-colors active:scale-95"
                  >
                    {v.toLocaleString('ar-YE')}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Payment Method Switcher */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">طريقة الدفع</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs ring-1 ring-teal-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>نقداً</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs ring-1 ring-teal-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>شبكة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs ring-1 ring-teal-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>تحويل</span>
                </button>
              </div>
            </div>

            {/* 4. Date & Notes in 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-bold mb-0.5 text-[10px]">تاريخ السند</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-0.5 text-[10px]">البيان / ملاحظات</label>
                <input
                  type="text"
                  placeholder="سداد دفعة من الحساب..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Print Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printAuto}
                  onChange={(e) => setPrintAuto(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-0"
                />
                <span>طباعة إيصال القبض فور التأكيد</span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-800 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-teal-700/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد وحفظ السند</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

