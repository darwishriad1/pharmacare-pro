import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Truck, Search, Layers, Calendar, DollarSign } from 'lucide-react';
import { Supplier, Product, PurchaseItem, PurchaseInvoice } from '../../types';
import { db } from '../../database/db';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { formatCurrency } = useSettingsStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');

  // Items table
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemBatchNum, setItemBatchNum] = useState(`BAT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 89)}`);
  const [itemExpiry, setItemExpiry] = useState('2027-12-31');
  const [itemQty, setItemQty] = useState('10');
  const [itemCost, setItemCost] = useState('1000');
  const [itemSell, setItemSell] = useState('1400');

  useEffect(() => {
    if (isOpen) {
      const sups = db.getSuppliers();
      const prods = db.getProducts();
      setSuppliers(sups);
      setProducts(prods);
      if (sups.length > 0) setSelectedSupplierId(sups[0].id);
      if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
        setItemCost(prods[0].costPrice.toString());
        setItemSell(prods[0].price.toString());
      }
      setInvoiceNumber(`PUR-${Date.now().toString().slice(-6)}`);
      setItems([]);
      setPaidAmount('0');
      setPaymentStatus('paid');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setItemCost(prod.costPrice.toString());
      setItemSell(prod.price.toString());
    }
  };

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseInt(itemQty, 10) || 1;
    const cost = parseFloat(itemCost) || 0;
    const sell = parseFloat(itemSell) || 0;

    const newItem: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      barcode: prod.barcode,
      batchNumber: itemBatchNum,
      expiryDate: itemExpiry,
      quantity: qty,
      costPrice: cost,
      sellingPrice: sell,
      discount: 0,
      tax: 0,
      total: qty * cost,
    };

    const newItems = [...items, newItem];
    setItems(newItems);

    const totalCost = newItems.reduce((acc, i) => acc + i.total, 0);
    setPaidAmount(totalCost.toString());

    // Generate next batch number
    setItemBatchNum(`BAT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 89)}`);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const totalCost = updated.reduce((acc, i) => acc + i.total, 0);
    setPaidAmount(totalCost.toString());
  };

  const subtotal = items.reduce((acc, i) => acc + i.total, 0);
  const paidNum = parseFloat(paidAmount) || 0;
  const remaining = Math.max(0, subtotal - paidNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل في فاتورة الشراء');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    db.createPurchaseInvoice({
      supplierInvoiceNumber: invoiceNumber || undefined,
      supplierId: supplier?.id || 'sup-cash',
      supplierName: supplier?.name || 'توريد نقدي مباشر',
      date: new Date().toISOString().split('T')[0],
      items,
      subtotal,
      discount: 0,
      tax: 0,
      grandTotal: subtotal,
      paidAmount: paidNum,
      remainingAmount: remaining,
      status: 'received',
      paymentStatus: paidNum >= subtotal ? 'paid' : paidNum > 0 ? 'partial' : 'unpaid',
      notes,
      createdBy: 'مدير الصيدلية',
    });

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-teal-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">تسجيل فاتورة توريد / مشتريات جديدة</h2>
              <p className="text-xs text-teal-100/90">إدخال بضاعة واردة وإضافتها تلقائياً لدفعات المخزون</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-slate-50/50">
          {/* Supplier & Invoice metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المورد / الشركة *</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-500 focus:bg-white"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.currentBalance > 0 ? `(مستحق: ${formatCurrency(s.currentBalance)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم فاتورة الشراء / التوريد</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات / رقم الإذن</label>
              <input
                type="text"
                placeholder="إذن استلام، رقم شحنة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Add Item Line Section */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              إضافة أدوية إلى الفاتورة
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">اختر الدواء</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-500 focus:bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.form}) - باركود: {p.barcode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم التشغيلة (Batch #)</label>
                <input
                  type="text"
                  value={itemBatchNum}
                  onChange={(e) => setItemBatchNum(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={itemExpiry}
                  onChange={(e) => setItemExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الكمية (عبوات)</label>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">سعر الشراء</label>
                <input
                  type="number"
                  value={itemCost}
                  onChange={(e) => setItemCost(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-teal-800 font-black focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">سعر البيع المقترح</label>
                <input
                  type="number"
                  value={itemSell}
                  onChange={(e) => setItemSell(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-700 font-black focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إدراج الصنف في الفاتورة
              </button>
            </div>
          </div>

          {/* Items Table Preview */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-2.5">اسم الصنف</th>
                  <th className="p-2.5">التشغيلة</th>
                  <th className="p-2.5">الانتهاء</th>
                  <th className="p-2.5">الكمية</th>
                  <th className="p-2.5">سعر الشراء</th>
                  <th className="p-2.5 text-left">الإجمالي</th>
                  <th className="p-2.5 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                      لم يتم إضافة أصناف بعد
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                      <td className="p-2.5 font-mono text-amber-700 font-medium">{item.batchNumber}</td>
                      <td className="p-2.5 font-mono text-slate-600">{item.expiryDate}</td>
                      <td className="p-2.5 font-mono font-black text-slate-900">{item.quantity}</td>
                      <td className="p-2.5 font-mono text-slate-700">{formatCurrency(item.costPrice)}</td>
                      <td className="p-2.5 text-left font-mono font-black text-teal-700">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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

          {/* Payment & Financials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-teal-50/70 p-4 rounded-xl border border-teal-200 shadow-2xs">
            <div>
              <span className="text-xs text-teal-900 font-bold block">إجمالي الفاتورة:</span>
              <span className="text-xl font-black font-mono text-teal-800">{formatCurrency(subtotal)}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-teal-900 mb-1">المبلغ المدفوع للمورد حالياً:</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1 text-xs font-mono font-black text-emerald-700 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <span className="text-xs text-teal-900 font-bold block">المتبقي كدين للمورد (آجل):</span>
              <span className={`text-xl font-black font-mono ${remaining > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors active:scale-95 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={items.length === 0}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              حفظ الفاتورة وإدخال البضاعة للمخزن
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
