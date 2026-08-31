import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, Banknote, Users, Layers, Printer, AlertTriangle, UserPlus, Phone, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { usePOSStore } from '../../stores/usePOSStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { printerService } from '../../services/printerService';
import { PaymentMethod } from '../../types';

export const PaymentModal: React.FC = () => {
  const {
    isPaymentModalOpen,
    setPaymentModalOpen,
    setCustomerModalOpen,
    selectedCustomer,
    getSubtotal,
    getTotalDiscount,
    getGrandTotal,
    checkout,
    overallDiscount,
    overallDiscountType,
    setOverallDiscount,
  } = usePOSStore();

  const { settings, formatCurrency } = useSettingsStore();
  const { currentUser } = useAuthStore();

  const grandTotal = getGrandTotal();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<string>(grandTotal.toString());
  const [cardAmount, setCardAmount] = useState<string>('0');
  const [creditDownPayment, setCreditDownPayment] = useState<string>('0');
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isPaymentModalOpen) {
      setCashGiven(grandTotal.toString());
      setCardAmount('0');
      setCreditDownPayment('0');
      // If a customer is selected and had credit preferences or default to cash
      setPaymentMethod('cash');
    }
  }, [isPaymentModalOpen, grandTotal]);

  if (!isPaymentModalOpen) return null;

  const cashNum = parseFloat(cashGiven) || 0;
  const cardNum = parseFloat(cardAmount) || 0;
  const creditDownPaymentNum = parseFloat(creditDownPayment) || 0;
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, cashNum - grandTotal) : 0;

  // Credit calculation
  const creditDebtAmount = Math.max(0, grandTotal - creditDownPaymentNum);
  const previousDebt = selectedCustomer?.currentBalance || 0;
  const newProjectedDebt = previousDebt + creditDebtAmount;
  const isCreditLimitExceeded =
    selectedCustomer &&
    selectedCustomer.maxCreditLimit > 0 &&
    newProjectedDebt > selectedCustomer.maxCreditLimit;

  const handleQuickAmount = (amount: number) => {
    setCashGiven(amount.toString());
  };

  const handleCreditDownPaymentPreset = (type: 'zero' | 'half' | 'quarter' | 'full') => {
    if (type === 'zero') setCreditDownPayment('0');
    else if (type === 'half') setCreditDownPayment(Math.round(grandTotal / 2).toString());
    else if (type === 'quarter') setCreditDownPayment(Math.round(grandTotal / 4).toString());
    else if (type === 'full') setCreditDownPayment(grandTotal.toString());
  };

  const handleComplete = () => {
    if (paymentMethod === 'credit') {
      if (!selectedCustomer) {
        alert('⚠️ تنبيه: لا يمكن إتمام فاتورة بيع آجل بدون تحديد عميل! يرجى اختيار عميل من الدليل أولاً.');
        return;
      }

      if (creditDownPaymentNum > grandTotal) {
        alert('المبلغ المدفوع مقدماً لا يمكن أن يكون أكبر من إجمالي الفاتورة!');
        return;
      }
    }

    if (paymentMethod === 'cash' && cashNum < grandTotal) {
      if (!selectedCustomer) {
        if (!confirm(`المبلغ المدفوع (${cashNum}) أقل من إجمالي الفاتورة (${grandTotal}) ولا يوجد عميل محدد لتسجيل الباقي عليه. هل تريد المتابعة؟`)) {
          return;
        }
      } else {
        if (!confirm(`المبلغ المدفوع (${cashNum}) أقل من إجمالي الفاتورة (${grandTotal}). سيتم تسجيل المتبقي (${grandTotal - cashNum} ${settings.currencySymbol}) كدين آجل على العميل "${selectedCustomer.name}". هل تريد المتابعة؟`)) {
          return;
        }
      }
    }

    // Determine paidAmount based on payment method
    let finalPaidAmount = grandTotal;
    let finalCashAmount: number | undefined = undefined;
    let finalCardAmount: number | undefined = undefined;

    if (paymentMethod === 'credit') {
      finalPaidAmount = creditDownPaymentNum;
      finalCashAmount = creditDownPaymentNum > 0 ? creditDownPaymentNum : undefined;
    } else if (paymentMethod === 'cash') {
      finalPaidAmount = Math.min(cashNum, grandTotal);
      finalCashAmount = cashNum;
    } else if (paymentMethod === 'card') {
      finalPaidAmount = grandTotal;
      finalCardAmount = grandTotal;
    } else if (paymentMethod === 'mixed') {
      finalPaidAmount = cashNum + cardNum;
      finalCashAmount = cashNum;
      finalCardAmount = cardNum;
    }

    const invoice = checkout(
      paymentMethod,
      finalPaidAmount,
      finalCardAmount,
      finalCashAmount,
      currentUser?.id,
      currentUser?.name,
      notes
    );

    if (invoice && autoPrint) {
      printerService.printThermalReceipt(invoice, settings);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-teal-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/70">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900">إتمام ودفع الفاتورة</h2>
            <p className="text-xs text-slate-500">حدد طريقة الدفع وتفاصيل الحساب الآجل إن وجد</p>
          </div>
          <button
            onClick={() => setPaymentModalOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white text-slate-400 hover:text-slate-700 transition-colors active:scale-95 border border-transparent hover:border-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Total Display */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-xs text-teal-800 font-bold">المبلغ الإجمالي للفاتورة:</span>
              <div className="text-2xl sm:text-3xl font-black text-teal-950 mt-0.5 tracking-tight font-mono">
                {formatCurrency(grandTotal)}
              </div>
            </div>
            {selectedCustomer ? (
              <div className="text-left bg-white px-3.5 py-2 rounded-xl border border-teal-100 text-xs shadow-2xs">
                <span className="text-slate-400 block text-[10px]">العميل المحدد:</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">{selectedCustomer.name}</span>
                {selectedCustomer.currentBalance > 0 && (
                  <span className="text-rose-600 block text-[10px] font-mono mt-0.5 font-bold">
                    ديون سابقة: {formatCurrency(selectedCustomer.currentBalance)}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition-colors shadow-2xs active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-teal-600" />
                <span>ربط بعميل</span>
              </button>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">طريقة الدفع:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center min-h-[64px] p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                  paymentMethod === 'cash'
                    ? 'bg-teal-700 border-teal-700 text-white shadow-md shadow-teal-700/20 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Banknote className={`w-6 h-6 mb-1 ${paymentMethod === 'cash' ? 'text-teal-200' : 'text-teal-600'}`} />
                نقداً
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center min-h-[64px] p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                  paymentMethod === 'card'
                    ? 'bg-teal-700 border-teal-700 text-white shadow-md shadow-teal-700/20 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CreditCard className={`w-6 h-6 mb-1 ${paymentMethod === 'card' ? 'text-teal-200' : 'text-sky-600'}`} />
                شبكة / بطاقة
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`flex flex-col items-center justify-center min-h-[64px] p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                  paymentMethod === 'credit'
                    ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/20 font-black'
                    : 'bg-amber-50/50 border-amber-200 text-amber-900 hover:bg-amber-100/50'
                }`}
              >
                <Users className={`w-6 h-6 mb-1 ${paymentMethod === 'credit' ? 'text-amber-100' : 'text-amber-600'}`} />
                آجل (ذمة)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('mixed')}
                className={`flex flex-col items-center justify-center min-h-[64px] p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                  paymentMethod === 'mixed'
                    ? 'bg-teal-700 border-teal-700 text-white shadow-md shadow-teal-700/20 font-black'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Layers className={`w-6 h-6 mb-1 ${paymentMethod === 'mixed' ? 'text-teal-200' : 'text-purple-600'}`} />
                مختلط
              </button>
            </div>
          </div>

          {/* Credit Sale Specific Section */}
          {paymentMethod === 'credit' && (
            <div className="space-y-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 animate-in fade-in duration-150">
              {!selectedCustomer ? (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-rose-700 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>يجب تحديد عميل لتسجيل هذه الفاتورة على حسابه الآجل</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomerModalOpen(true)}
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    <span>فتح دليل العملاء لاختيار عميل</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Customer Status Banner */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">حساب العميل:</span>
                      <span className="font-black text-slate-900">{selectedCustomer.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">المديونية السابقة:</span>
                      <span className="font-mono font-bold text-rose-600">{formatCurrency(previousDebt)}</span>
                    </div>
                    {selectedCustomer.maxCreditLimit > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">سقف الائتمان المسموح:</span>
                        <span className="font-mono font-bold text-slate-700">{formatCurrency(selectedCustomer.maxCreditLimit)}</span>
                      </div>
                    )}
                  </div>

                  {/* Down Payment Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      المبلغ المدفوع مقدماً نقداً (إن وجد):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={creditDownPayment}
                      onChange={(e) => setCreditDownPayment(e.target.value)}
                      placeholder="0"
                      className="w-full min-h-[44px] bg-white border border-amber-300 focus:border-amber-500 rounded-xl px-4 py-2 text-lg font-mono font-bold text-amber-950 focus:outline-none shadow-2xs"
                    />
                  </div>

                  {/* Quick Down Payment Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCreditDownPaymentPreset('zero')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                        creditDownPaymentNum === 0
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      0 (آجل بالكامل)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreditDownPaymentPreset('quarter')}
                      className="px-2.5 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreditDownPaymentPreset('half')}
                      className="px-2.5 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreditDownPaymentPreset('full')}
                      className="px-2.5 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold transition-all active:scale-95"
                    >
                      المبلغ كاملاً
                    </button>
                  </div>

                  {/* Debt Summary Breakdown */}
                  <div className="bg-amber-100/70 p-3 rounded-xl border border-amber-300/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-900 font-medium">المبلغ المسجل كدين آجل جديد:</span>
                      <span className="font-mono font-black text-sm text-amber-950">
                        {formatCurrency(creditDebtAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/80">
                      <span className="text-slate-700 font-bold">إجمالي مديونية العميل بعد الفاتورة:</span>
                      <span className="font-mono font-black text-sm text-rose-700">
                        {formatCurrency(newProjectedDebt)}
                      </span>
                    </div>
                  </div>

                  {/* Credit Limit Warning */}
                  {isCreditLimitExceeded && (
                    <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>تنبيه: مديونية العميل ستتجاوز سقف الائتمان المحدد ({formatCurrency(selectedCustomer.maxCreditLimit)})</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cash Specific inputs */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المبلغ المدفوع والمستلم نقداً:</label>
                <input
                  type="number"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  className="w-full min-h-[48px] bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xl font-mono font-bold text-teal-900 focus:outline-none shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Quick Money Denominations */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickAmount(grandTotal)}
                  className="px-3.5 py-1.5 min-h-[36px] rounded-xl bg-teal-50 hover:bg-teal-100 text-xs font-bold text-teal-800 border border-teal-200 active:scale-95 transition-all shadow-2xs"
                >
                  المبلغ بالضبط
                </button>
                {[500, 1000, 2000, 5000, 10000, 20000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-white hover:bg-slate-100 text-xs font-mono font-bold text-slate-700 border border-slate-200 active:scale-95 transition-all shadow-2xs"
                  >
                    +{amt.toLocaleString('ar-YE')}
                  </button>
                ))}
              </div>

              {/* Change / Balance */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-sm">
                <span className="text-slate-600 font-bold">المتبقي للعميل (الفكة):</span>
                <span className={`font-mono font-black text-lg ${changeAmount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Mixed Payment inputs */}
          {paymentMethod === 'mixed' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المدفوع نقداً:</label>
                <input
                  type="number"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-3.5 py-2 text-base font-mono font-bold text-teal-900 focus:outline-none shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المدفوع شبكة/بطاقة:</label>
                <input
                  type="number"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-teal-500 rounded-xl px-3.5 py-2 text-base font-mono font-bold text-teal-900 focus:outline-none shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Options: Auto Print & Notes */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 select-none py-1.5">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="rounded-lg border-slate-300 bg-white text-teal-700 focus:ring-0 w-5 h-5 cursor-pointer"
              />
              <Printer className="w-4 h-4 text-teal-600" />
              <span>طباعة إيصال حراري فور إتمام العملية</span>
            </label>

            <input
              type="text"
              placeholder="ملاحظات اختيارية على الفاتورة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[42px] bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            onClick={() => setPaymentModalOpen(false)}
            className="px-5 py-3 min-h-[46px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 transition-colors active:scale-95"
          >
            إلغاء
          </button>
          <button
            onClick={handleComplete}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 text-white ${
              paymentMethod === 'credit'
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : 'bg-teal-700 hover:bg-teal-600 shadow-teal-700/20'
            }`}
          >
            <Check className="w-5 h-5" />
            {paymentMethod === 'credit' ? 'تأكيد وترحيل الفاتورة للآجل' : 'تأكيد الدفع وإنهاء الفاتورة'}
          </button>
        </div>
      </div>
    </div>
  );
};
