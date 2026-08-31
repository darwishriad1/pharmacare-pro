import React, { useState } from 'react';
import {
  X,
  FileText,
  TrendingUp,
  Coins,
  Package,
  Users,
  Building2,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Printer,
  Download,
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Percent,
  Sparkles,
  Boxes,
} from 'lucide-react';
import { useSettingsStore, ActiveTab } from '../../stores/useSettingsStore';

interface ReportCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: 'pnl' | 'item_movements' | 'bestsellers' | 'shift' | 'expiryloss' | 'purchases_debts' | 'expenses') => void;
}

interface ReportInfo {
  id: string;
  tabKey?: 'pnl' | 'item_movements' | 'bestsellers' | 'shift' | 'expiryloss' | 'purchases_debts' | 'expenses';
  appSectionTab?: ActiveTab;
  title: string;
  category: 'financial' | 'inventory' | 'sales' | 'debts' | 'compliance';
  categoryLabel: string;
  icon: any;
  colorClass: string;
  badgeBg: string;
  summary: string;
  contains: string[];
  importance: string;
  targetAudience: string;
  periodicity: string;
}

export const ReportCatalogModal: React.FC<ReportCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const { setActiveTab } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<ReportInfo | null>(null);

  if (!isOpen) return null;

  const reportsCatalog: ReportInfo[] = [
    {
      id: 'item_movements',
      tabKey: 'item_movements',
      title: 'تقرير حركة الأصناف والوارد والمبيعات وصافي الأرباح (Stock & Item Ledger)',
      category: 'inventory',
      categoryLabel: 'المخزون وحركة الأصناف',
      icon: Boxes,
      colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
      badgeBg: 'bg-teal-100 text-teal-800',
      summary: 'كشف تحليلي شامل لكل صنف دوائي: عدد الأصناف والكميات الواردة، الكميات المباعة، الرصيد المتبقي، إيراد الصنف، وتكلفة الشراء وصافي الربح المحقق.',
      contains: [
        'معرفة عدد الأصناف الواردة وإجمالي الكميات المشتراة والمدخلة للمستودع',
        'الكمية المباعة (المنصرف) من كل علاج وصنف خلال الفترة المحددة',
        'الرصيد الفعلي المتبقي في المخزون الحالي بالعبوات والأشرطة',
        'سعر التكلفة وسعر البيع المعتمد لكل دواء',
        'إجمالي الإيرادات ومبيعات كل صنف على حدة',
        'تكلفة شراء البضاعة المباعة لكل صنف',
        'صافي ربح الصنف الذي ابتاع ونسبة هامش الربح %',
        'تقييم قيمة المخزون المتبقي بالتكلفة وبسعر البيع',
        'كشف حركة زمني تفصيلي وتاريخ فواتير الشراء والبيع لكل دواء بنقرة واحدة',
      ],
      importance: 'يمكنك من مراقبة دوران الأدوية، معرفة الأصناف الأكثر ربحية، وكشف الأدوية الراكدة لتجنب الخسائر.',
      targetAudience: 'مالك الصيدلية، مدير المشتريات، الصيدلي المسؤول',
      periodicity: 'يومي، أسبوعي، شهري، وفترة مخصصة',
    },
    {
      id: 'pnl',
      tabKey: 'pnl',
      title: 'قائمة الأرباح والخسائر الشاملة (P&L Income Statement)',
      category: 'financial',
      categoryLabel: 'مالي ومحاسبي',
      icon: TrendingUp,
      colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      summary: 'التقرير المالي الأساسي الذي يوضح صافي أرباح الصيدلية الحقيقية بعد خصم تكلفة البضاعة والمصاريف.',
      contains: [
        'إجمالي إيرادات المبيعات المحققة (Revenue) لجميع الفواتير غير المرتجعة',
        'تكلفة شراء البضاعة المباعة (Cost of Goods Sold - COGS) بناءً على أسعار الشراء الفعلية',
        'مجمل الربح التجاري (Gross Profit) ونسبة هامش الربح الإجمالي',
        'المصروفات التشغيلية والنفقات اليومية والشهرية (إيجار، رواتب، كهرباء، صيانة)',
        'صافي الربح الفعلي المحقق (Net Profit) الصافي القابل للتوزيع أو الاستثمار',
        'مقارنة الهوامش المالية والربحية مع الفترات السابقة',
      ],
      importance: 'يعطي المالك والمحاسب الرؤية الدقيقة لمدى ربحية الصيدلية واستدامتها المالية.',
      targetAudience: 'مالك الصيدلية، المدير المالي، المحاسب العام',
      periodicity: 'يومي، أسبوعي، شهري، سنوي',
    },
    {
      id: 'shift_cash',
      tabKey: 'shift',
      title: 'تقرير تقفيل الوردية وحركة الخزينة اليومية (Z-Report & Cash Flow)',
      category: 'financial',
      categoryLabel: 'مالي ومحاسبي',
      icon: Coins,
      colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
      badgeBg: 'bg-teal-100 text-teal-800',
      summary: 'كشف التدفق النقدي وجرد درج الكاشير ومطابقة المقبوضات مع المبيعات عند انتهاء كل وردية.',
      contains: [
        'المقبوضات النقدية الفعلية (الكاش الموجود في درج الخزينة)',
        'المبالغ المحصلة عبر أجهزة الشبكة والبطاقات المصرفية ومدى مطابقتها للحسابات البنكية',
        'المبيعات الآجلة المعلقة على ذمم العملاء خلال الوردية',
        'سندات الصرف والمدفوعات والمصروفات النثرية التي خرجت من الصندوق أثناء الوردية',
        'عدد الفواتير الصادرة ومتوسط قيمة الفاتورة لكل كاشير',
        'إجمالي الإيداعات النقدية والتسليم للكاشير التالي أو الإيداع في البنك',
      ],
      importance: 'منع العجز المالي وضمان الرقابة الدقيقة على النقدية بين الورديات المختلفة.',
      targetAudience: 'كاشير الصيدلية، مشرف الوردية، مسؤول الصندوق',
      periodicity: 'عند إغلاق كل وردية عمل ونهاية كل يوم',
    },
    {
      id: 'bestsellers',
      tabKey: 'bestsellers',
      title: 'تقرير الأصناف الأكثر طلباً والأعلى ربحية (Best Sellers & Velocity)',
      category: 'sales',
      categoryLabel: 'مبيعات وأدوية',
      icon: Package,
      colorClass: 'text-sky-700 bg-sky-50 border-sky-200',
      badgeBg: 'bg-sky-100 text-sky-800',
      summary: 'ترتيب أداء الأدوية والمستلزمات الطبية لمعرفة الأدوية الأكثر طلباً والأكثر مساهمة في دخل الصيدلية.',
      contains: [
        'ترتيب الأصناف الـ 10 إلى 50 الأكثر مبيعاً حسب الكميات المباعة والوحدات',
        'إجمالي الإيرادات المالية المحققة من كل صنف على حدة',
        'صافي الأرباح المحققة وهامش الربح المئوي لكل دواء',
        'معدل دوران المخزون للأصناف سريعة الحركة (Fast-moving drugs)',
        'تحديد الأصناف الاستراتيجية لعدم انقطاعها من الرفوف إطلاقاً',
      ],
      importance: 'تحسين قرارات الشراء والتفاوض مع الموردين للحصول على عروض أفضل للأصناف سريعة البيع.',
      targetAudience: 'مسؤول المشتريات، الصيدلي الأول، مدير المخزون',
      periodicity: 'أسبوعي وشهري',
    },
    {
      id: 'purchases_debts',
      tabKey: 'purchases_debts',
      appSectionTab: 'purchases',
      title: 'تقرير المشتريات ومستحقات الموردين والشركات (Purchases & Payables)',
      category: 'debts',
      categoryLabel: 'مشتريات وديون',
      icon: Building2,
      colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800',
      summary: 'متابعة حركة فواتير التوريد، المدفوعات المسددة للموردين، والديون والذمم الدائنة المستحقة.',
      contains: [
        'سجل فواتير التوريد المستلمة من شركات ومستودعات الأدوية',
        'المبالغ المسددة والمدفوعة للموردين وسندات الصرف المالي المعتمدة',
        'الديون والذمم المتبقية الواجبة السداد لشركات التوريد',
        'كشوفات حساب تفصيلية لكل مورد تشمل جميع الحركات المالية',
        'مقارنة أسعار شراء الأدوية وتكلفة كل دفعة دخلت الصيدلية',
      ],
      importance: 'إدارة السيولة المالية للصيدلية والالتزام بمواعيد سداد شركات الأدوية للحفاظ على سمعة الصيدلية.',
      targetAudience: 'المحاسب، مسؤول المشتريات، مدير الصيدلية',
      periodicity: 'أسبوعي وشهري',
    },
    {
      id: 'customer_debts',
      appSectionTab: 'customers',
      title: 'تقرير ديون وذمم العملاء والتحصيل (Customer Receivables & Aging)',
      category: 'debts',
      categoryLabel: 'عملاء وديون',
      icon: Users,
      colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-800',
      summary: 'متابعة ديون المرضى والعملاء الآجلين، كشوفات الحسابات الفردية، وسرعة التحصيل.',
      contains: [
        'إجمالي الذمم المدينة (المبالغ التي للصيدلية عند العملاء والمرضى)',
        'قائمة العملاء المدينين مرتبة حسب حجم المديونية وتاريخ آخر سداد',
        'تنبيهات العملاء الذين تجاوزوا سقف الائتمان المسموح به',
        'سندات القبض المالي والتحصيلات النقدية والتحويلات المسددة',
        'طباعة كشوفات حساب رسمية معتمدة لإرسالها للعملاء',
      ],
      importance: 'تقليل الديون المعدومة وتحفيز التحصيل الدوري لحماية التدفق النقدي للصيدلية.',
      targetAudience: 'أمين الصندوق، المحاسب، مسؤول التحصيل',
      periodicity: 'يومي وأسبوعي',
    },
    {
      id: 'expiryloss',
      tabKey: 'expiryloss',
      appSectionTab: 'inventory',
      title: 'تقرير الرواكد والصلاحيات ومخاطر المخزون (Expiry & Stock Dead/Risk)',
      category: 'inventory',
      categoryLabel: 'مخزون وصلاحيات',
      icon: ShieldAlert,
      colorClass: 'text-orange-700 bg-orange-50 border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-800',
      summary: 'تحليل الأدوية القريبة من الانتهاء (30/60/90 يوم) والأصناف الراكدة لتقليل الخسائر والتلف.',
      contains: [
        'حصر كامل للدفعات والتشغيلات القريبة من تاريخ الانتهاء مع تحديد أرقام التشغيلات (Batches)',
        'حساب القيمة الرأسمالية المعرضة للخسارة في حال انتهاء الصلاحية دون بيع',
        'قائمة بالأصناف الراكدة التي لم تتحرك منذ فترة طويلة',
        'إجمالي قيمة رأس المال المستثمر في المخزون الحالي بسعر التكلفة',
        'توصيات بتطبيق سياسة الصرف بالأقدم (FEFO) وعمل إرجاع للموردين قبل فوات الأوان',
      ],
      importance: 'حماية أموال الصيدلية من التلف المالي وضمان سلامة المرضى بعدم صرف دواء منتهي الصلاحية.',
      targetAudience: 'الصيدلي المسؤول، أمين المستودع، مدير المشتريات',
      periodicity: 'أسبوعي وشهري',
    },
    {
      id: 'expenses',
      tabKey: 'expenses',
      appSectionTab: 'expenses',
      title: 'تقرير المصروفات والنفقات التشغيلية (Operating Expenses - OPEX)',
      category: 'financial',
      categoryLabel: 'مالي ومحاسبي',
      icon: Coins,
      colorClass: 'text-purple-700 bg-purple-50 border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-800',
      summary: 'تحليل كافة بنود المصاريف التي تم صرفها من الصيدلية وتأثيرها على الأرباح.',
      contains: [
        'توزيع المصاريف حسب البنود (إيجار المقر، رواتب الموظفين، فواتير الكهرباء والمياه، الصيانة، النثريات)',
        'طريقة السداد المستخدمة لكل مصروف (نقداً من الدرج أو حوالة بنكية)',
        'المستخدم أو المسؤول الذي اعتمد وسجل المصروف',
        'نسبة المصروفات التشغيلية إلى إجمالي إيرادات المبيعات',
      ],
      importance: 'ترشيد النفقات واكتشاف أي هدر أو تسريب مالي غير مبرر في المصاريف اليومية.',
      targetAudience: 'المدير المالي، المحاسب، صاحب الصيدلية',
      periodicity: 'أسبوعي وشهري',
    },
  ];

  const filteredReports = reportsCatalog.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contains.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || r.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAction = (report: ReportInfo) => {
    if (report.tabKey) {
      onSelectTab(report.tabKey);
      onClose();
    } else if (report.appSectionTab) {
      setActiveTab(report.appSectionTab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-right">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-teal-300 border border-white/15">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">دليل ومحتويات تقارير الصيدلية</h2>
              <p className="text-xs text-teal-200/90">
                تعرف بالتفصيل على ما يحتويه كل تقرير مالي وإداري وكيفية الاستفادة منه
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن تقرير، بيان مالي، مؤشر أو بند..."
              className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'financial', label: 'مالي وأرباح' },
              { id: 'sales', label: 'مبيعات وأصناف' },
              { id: 'debts', label: 'ديون وموردين' },
              { id: 'inventory', label: 'مخزون وصلاحيات' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: List or Selected Detail */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 bg-slate-100/50">
          {selectedReport ? (
            /* Detailed Single Report View */
            <div className="bg-white rounded-2xl border border-teal-100 p-5 shadow-xs space-y-4">
              <button
                onClick={() => setSelectedReport(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors w-fit cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                العودة لكافة التقارير
              </button>

              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${selectedReport.colorClass}`}>
                    <selectedReport.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${selectedReport.badgeBg}`}>
                        {selectedReport.categoryLabel}
                      </span>
                      <span className="text-xs text-slate-400">الدورية: {selectedReport.periodicity}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{selectedReport.title}</h3>
                  </div>
                </div>

                <button
                  onClick={() => handleAction(selectedReport)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  عرض وتطبيق التقرير
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {selectedReport.summary}
              </p>

              {/* What It Contains List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  ماذا يحتوي هذا التقرير بالتفصيل؟
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedReport.contains.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-teal-50/40 border border-teal-100 text-xs text-slate-800 flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why & Target Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900">الأهمية الإدارية والمالية:</div>
                  <div className="text-slate-600 leading-relaxed">{selectedReport.importance}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900">المستخدمين المعنيين:</div>
                  <div className="text-slate-600 leading-relaxed">{selectedReport.targetAudience}</div>
                </div>
              </div>
            </div>
          ) : (
            /* Grid of Report Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-teal-300 p-4 transition-all duration-200 shadow-2xs hover:shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${report.colorClass}`}>
                          <report.icon className="w-5 h-5" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${report.badgeBg}`}>
                          {report.categoryLabel}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{report.periodicity}</span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-800 transition-colors leading-snug">
                      {report.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {report.summary}
                    </p>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[11px] font-bold text-slate-700">أبرز المحتويات:</div>
                      <ul className="text-[11px] text-slate-600 space-y-0.5 mr-3 list-disc">
                        {report.contains.slice(0, 2).map((c, i) => (
                          <li key={i} className="line-clamp-1">{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      تفاصيل المحتوى
                    </button>
                    <button
                      onClick={() => handleAction(report)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      عرض التقرير
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredReports.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200">
              لا توجد تقارير مطابقة لكلمات البحث
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>نظام التقارير المالية المتكامل لصيدليات PharmaCare</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
