import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit,
  KeyRound,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  Phone,
  Mail,
  History,
  CheckSquare,
  Square,
  Sliders,
  RefreshCw,
  LogIn,
  Percent,
  Layers,
  FileSpreadsheet,
  Filter,
  Check,
  XCircle,
  Coins
} from 'lucide-react';
import { User as UserType, UserRole, UserPermission, AuditLog } from '../../types';
import { db } from '../../database/db';
import { useAuthStore, ROLE_PRESET_PERMISSIONS } from '../../stores/useAuthStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEditingUser?: UserType | null;
}

interface PermissionDefinition {
  id: UserPermission;
  label: string;
  group: 'pos' | 'inventory' | 'finance' | 'admin';
  desc: string;
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // POS
  { id: 'pos_sale', label: 'إتمام عمليات البيع وإصدار الفواتير', group: 'pos', desc: 'إصدار الفواتير وتحصيل المبالغ النقدية والشبكة والآجل' },
  { id: 'pos_discount', label: 'منح وتطبيق خصومات المبيعات', group: 'pos', desc: 'تطبيق نسب خصم على بنود وسلة الفاتورة وفق الحد المسموح' },
  { id: 'pos_price_override', label: 'تعديل السعر يدوياً في الكاشير', group: 'pos', desc: 'تغيير سعر بيع الصنف مباشرة أثناء المعاملة دون الرجوع للكتالوج' },
  { id: 'pos_return', label: 'تسجيل مرتجعات المبيعات', group: 'pos', desc: 'استرجاع المنتجات المباعة وإعادة المبالغ أو تعديل حساب العميل' },
  { id: 'pos_void_item', label: 'حذف بنود وإلغاء سلة البيع', group: 'pos', desc: 'إلغاء وتفريغ عناصر الفاتورة بعد إضافتها' },
  { id: 'pos_drawer_open', label: 'فتح درج الكاشير النقدي', group: 'pos', desc: 'إرسال أمر فتح الدرج دون الحاجة لطباعة فاتورة جديدة' },

  // Inventory
  { id: 'inventory_view', label: 'استعراض دليل المخزون والأدوية', group: 'inventory', desc: 'البحث في كتالوج الأدوية ومعاينة الأرصدة والأسعار ومواقع الرفوف' },
  { id: 'inventory_edit', label: 'إضافة وتعديل الأدوية والدفعات', group: 'inventory', desc: 'تعديل أسعار الشراء والبيع وتواريخ الصلاحية وتفاصيل بطاقات الأصناف' },
  { id: 'inventory_adjust', label: 'تسوية الجرد وفروقات الهالك', group: 'inventory', desc: 'تعديل كميات الدفعات يدوياً وتوثيق أسباب الفروقات التالفة والمفقودة' },

  // Finance & Accounts
  { id: 'purchases_manage', label: 'إدارة فواتير المشتريات والموردين', group: 'finance', desc: 'تسجيل بضائع الموردين وسندات الصرف وكشوفات حساب الشركات' },
  { id: 'customers_manage', label: 'إدارة العملاء وحسابات الآجل', group: 'finance', desc: 'إضافة عملاء جدد، متابعة الديون وسندات القبض وكشوفات الحساب' },
  { id: 'expenses_manage', label: 'تسجيل ومتابعة المصروفات التشغيلية', group: 'finance', desc: 'إدراج مصاريف الصيدلية والرواتب والإيجار وفواتير الكهرباء' },
  { id: 'cashbox_manage', label: 'إدارة الصندوق والخزينة وإغلاق الوردية', group: 'finance', desc: 'مطابقة درج النقدية، تسجيل الإيداعات والسحوبات وجرد الشفت' },
  { id: 'reports_view', label: 'الاطلاع على التقارير المالية والإحصاءات', group: 'finance', desc: 'استعراض تقارير المبيعات، حركة الأصناف ومؤشرات الأداء' },
  { id: 'reports_cost_profit', label: 'الاطلاع على تكاليف الشراء وهوامش الأرباح', group: 'finance', desc: 'معاينة أسعار الشراء الحقيقية وصافي الأرباح (بيانات بالغة السرية)' },

  // Administration & Security
  { id: 'settings_manage', label: 'تعديل إعدادات وبيانات الصيدلية', group: 'admin', desc: 'تخصيص ترويسة الفاتورة والطابعات والضريبة والنسخ الاحتياطي' },
  { id: 'users_manage', label: 'إدارة المستخدمين والصلاحيات ورموز PIN', group: 'admin', desc: 'إنشاء حسابات الموظفين وتعيين الصلاحيات وسجلات الدخول' },
  { id: 'backup_manage', label: 'النسخ الاحتياطي واستعادة البيانات', group: 'admin', desc: 'تصدير واستيراد ملفات قاعدة البيانات الكاملة للنظام' },
  { id: 'audit_view', label: 'استعراض سجل الرقابة والعمليات الأمنية', group: 'admin', desc: 'تتبع كافة الحركات والتفويضات والتعديلات الحساسة في النظام' },
];

const PERMISSION_GROUPS: { key: 'pos' | 'inventory' | 'finance' | 'admin'; title: string; color: string; desc: string }[] = [
  { key: 'pos', title: 'عمليات نقطة البيع والمبيعات (POS)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', desc: 'صلاحيات الفواتير والخصومات ودرج الكاشير والمرتجعات' },
  { key: 'inventory', title: 'إدارة المخزون والأدوية (Inventory)', color: 'text-teal-700 bg-teal-50 border-teal-200', desc: 'صلاحيات كتالوج الأدوية، الدفعات والجرد والتسويات' },
  { key: 'finance', title: 'المالية والحسابات والديون (Finance)', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', desc: 'المشتريات، العملاء، المصروفات، الصندوق وتقارير الأرباح' },
  { key: 'admin', title: 'الإدارة والأمان والنظام (Administration)', color: 'text-purple-700 bg-purple-50 border-purple-200', desc: 'إعدادات النظام، الموظفين، النسخ الاحتياطي وسجلات الرقابة' },
];

const AVATAR_COLORS = [
  { id: 'teal', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-500' },
  { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' },
  { id: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  { id: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  { id: 'amber', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  { id: 'rose', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500' },
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  initialEditingUser,
}) => {
  const { currentUser, switchUser, hasPermission, hasRole } = useAuthStore();
  const { showToast } = useSettingsStore();

  const canManageUsers = hasPermission('users_manage') || hasRole(['admin']);

  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'matrix' | 'audit'>('list');
  const [users, setUsers] = useState<UserType[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedAuditUser, setSelectedAuditUser] = useState<string>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Form State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [role, setRole] = useState<UserRole>('cashier');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shift, setShift] = useState<'morning' | 'evening' | 'night' | 'full'>('morning');
  const [avatarColor, setAvatarColor] = useState('teal');
  const [isActive, setIsActive] = useState(true);
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<UserPermission[]>([]);

  const refreshData = () => {
    setUsers(db.getUsers());
    setAuditLogs(db.getAuditLogs());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      if (initialEditingUser) {
        startEditingUser(initialEditingUser);
      } else {
        setActiveTab('list');
      }
    }
  }, [isOpen, initialEditingUser]);

  const startCreateUser = () => {
    if (!canManageUsers) {
      showToast('عذراً، لا تملك صلاحية إضافة مستخدمين جدد', 'error');
      return;
    }
    setEditingUserId(null);
    setName('');
    setUsername('');
    setPin('');
    setRole('cashier');
    setPhone('');
    setEmail('');
    setShift('morning');
    setAvatarColor('teal');
    setIsActive(true);
    setMaxDiscountPercentage(5);
    setNotes('');
    setSelectedPermissions(ROLE_PRESET_PERMISSIONS['cashier']);
    setActiveTab('editor');
  };

  const startEditingUser = (user: UserType) => {
    setEditingUserId(user.id);
    setName(user.name);
    setUsername(user.username);
    setPin(user.pin || '');
    setRole(user.role);
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setShift(user.shift || 'morning');
    setAvatarColor(user.avatarColor || 'teal');
    setIsActive(user.active);
    setMaxDiscountPercentage(user.maxDiscountPercentage !== undefined ? user.maxDiscountPercentage : (user.role === 'admin' ? 100 : user.role === 'pharmacist' ? 20 : 5));
    setNotes(user.notes || '');
    setSelectedPermissions(user.permissions || ROLE_PRESET_PERMISSIONS[user.role] || []);
    setActiveTab('editor');
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    // Apply default preset permissions for the chosen role
    setSelectedPermissions(ROLE_PRESET_PERMISSIONS[newRole]);
    if (newRole === 'admin') {
      setMaxDiscountPercentage(100);
    } else if (newRole === 'pharmacist') {
      setMaxDiscountPercentage(20);
    } else if (newRole === 'cashier') {
      setMaxDiscountPercentage(5);
    } else {
      setMaxDiscountPercentage(10);
    }
  };

  const handleTogglePermission = (permId: UserPermission) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleToggleGroup = (groupKey: 'pos' | 'inventory' | 'finance' | 'admin') => {
    const groupPerms = PERMISSION_DEFINITIONS.filter((p) => p.group === groupKey).map((p) => p.id);
    const allChecked = groupPerms.every((p) => selectedPermissions.includes(p));

    if (allChecked) {
      // Remove all group perms
      setSelectedPermissions(selectedPermissions.filter((p) => !groupPerms.includes(p)));
    } else {
      // Add missing group perms
      const newPerms = Array.from(new Set([...selectedPermissions, ...groupPerms]));
      setSelectedPermissions(newPerms);
    }
  };

  const handleSelectAllPermissions = () => {
    const all = PERMISSION_DEFINITIONS.map((p) => p.id);
    setSelectedPermissions(all);
  };

  const handleClearPermissions = () => {
    setSelectedPermissions([]);
  };

  const handleApplyPreset = (presetRole: UserRole) => {
    setSelectedPermissions(ROLE_PRESET_PERMISSIONS[presetRole]);
    showToast(`تم تطبيق مصفوفة صلاحيات (${presetRole === 'admin' ? 'المدير' : presetRole === 'pharmacist' ? 'الصيدلي' : presetRole === 'accountant' ? 'المحاسب' : 'الكاشير'})`, 'info');
  };

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(randomPin);
    setShowPin(true);
    showToast(`تم توليد رمز PIN سري جديد: ${randomPin}`, 'info');
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) {
      alert('عذراً، لا تملك صلاحية تعديل وحفظ بيانات المستخدمين');
      return;
    }
    if (!name.trim()) {
      alert('يرجى إدخال اسم الموظف');
      return;
    }
    if (!username.trim()) {
      alert('يرجى إدخال اسم تسجيل الدخول');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      alert('يجب أن يتكون رمز الـ PIN من 4 أرقام على الأقل');
      return;
    }

    const cleanUsername = username.toLowerCase().trim();
    const allUsers = db.getUsers();

    // Check duplicate username if adding or changing
    const duplicate = allUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.id !== editingUserId
    );
    if (duplicate) {
      alert('اسم تسجيل الدخول هذا مستخدم بالفعل من قبل موظف آخر، يرجى اختيار اسم مستخدم مختلف');
      return;
    }

    const userToSave: UserType = {
      id: editingUserId || `usr-${Date.now()}`,
      name: name.trim(),
      username: cleanUsername,
      pin: pin.trim(),
      role,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      shift,
      avatarColor,
      active: isActive,
      maxDiscountPercentage: Number(maxDiscountPercentage) || 0,
      notes: notes.trim() || undefined,
      permissions: selectedPermissions,
      createdAt: editingUserId
        ? allUsers.find((u) => u.id === editingUserId)?.createdAt || new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      lastLogin: editingUserId
        ? allUsers.find((u) => u.id === editingUserId)?.lastLogin
        : undefined,
    };

    db.saveUser(userToSave);
    refreshData();
    showToast(editingUserId ? 'تم تحديث بيانات وصلاحيات المستخدم بنجاح' : 'تم إضافة الموظف الجديد بنجاح', 'success');
    setActiveTab('list');
  };

  const handleDeleteUser = (u: UserType) => {
    if (!canManageUsers) {
      alert('عذراً، لا تملك صلاحية حذف المستخدمين');
      return;
    }
    if (u.id === currentUser?.id) {
      alert('لا يمكن حذف الحساب المسجل به دخولك حالياً');
      return;
    }
    if (confirm(`هل أنت متأكد تماماً من رغبتك في حذف حساب (${u.name}) نهائياً من النظام؟`)) {
      db.deleteUser(u.id);
      refreshData();
      showToast(`تم حذف حساب ${u.name}`, 'info');
    }
  };

  const handleToggleActive = (u: UserType) => {
    if (!canManageUsers) {
      alert('عذراً، لا تملك صلاحية تفعيل أو تعطيل حسابات المستخدمين');
      return;
    }
    if (u.id === currentUser?.id) {
      alert('لا يمكنك تعطيل حسابك النشط حالياً');
      return;
    }
    const updated: UserType = { ...u, active: !u.active };
    db.saveUser(updated);
    refreshData();
    showToast(updated.active ? `تم تفعيل حساب ${u.name}` : `تم تعطيل حساب ${u.name}`, 'info');
  };

  const handleFastSwitch = (u: UserType) => {
    if (!u.active) {
      alert('هذا الحساب معطل حالياً');
      return;
    }
    switchUser(u.id);
    showToast(`تم تسجيل الدخول السريع بحساب: ${u.name}`, 'success');
    onClose();
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery));
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchUser = selectedAuditUser === 'all' || log.userId === selectedAuditUser;
      const matchQuery =
        !auditSearchQuery ||
        (log.action && log.action.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
        (log.details && log.details.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
        (log.userName && log.userName.toLowerCase().includes(auditSearchQuery.toLowerCase()));
      return matchUser && matchQuery;
    });
  }, [auditLogs, selectedAuditUser, auditSearchQuery]);

  if (!isOpen) return null;

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.active).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const pharmacistCount = users.filter((u) => u.role === 'pharmacist').length;
  const cashierCount = users.filter((u) => u.role === 'cashier').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150" dir="rtl">
      <div className="bg-white border border-slate-200 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-purple-800 flex items-center justify-between bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-purple-200 border border-white/10 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg text-white">إدارة طاقم العمل والصلاحيات الأمنية</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  {totalUsers} موظفين مسجلين
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                تخصيص بطاقات الدخول، رموز الـ PIN، مصفوفة الصلاحيات، حدود الخصم، وسجل الرقابة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-header Tabs */}
        <div className="px-5 py-2.5 bg-purple-50/70 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-purple-100/70 border border-purple-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>قائمة الموظفين والحسابات</span>
            </button>

            <button
              type="button"
              onClick={startCreateUser}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor' && !editingUserId
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-purple-100/70 border border-purple-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>إضافة موظف جديد</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-purple-100/70 border border-purple-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>مصفوفة الأدوار المقارنة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-purple-100/70 border border-purple-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>سجل الحركات والأمان</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {activeCount} مفعّل
            </span>
            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              {adminCount} مدير
            </span>
            <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              {pharmacistCount} صيدلي
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
          
          {/* TAB 1: USERS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو اسم الدخول أو رقم الهاتف..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-slate-500 whitespace-nowrap">تصفية حسب الدور:</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">جميع الموظفين ({totalUsers})</option>
                    <option value="admin">مدير نظام ({adminCount})</option>
                    <option value="pharmacist">صيدلي مسؤول ({pharmacistCount})</option>
                    <option value="cashier">كاشير مبيعات ({cashierCount})</option>
                    <option value="accountant">محاسب مالي</option>
                  </select>
                </div>
              </div>

              {/* Users Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  const colorObj = AVATAR_COLORS.find((c) => c.id === user.avatarColor) || AVATAR_COLORS[0];
                  const userPerms = user.permissions || ROLE_PRESET_PERMISSIONS[user.role] || [];
                  
                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-3 shadow-2xs ${
                        isCurrent
                          ? 'bg-purple-50/50 border-purple-300 ring-1 ring-purple-400/40'
                          : user.active
                          ? 'bg-white border-slate-200 hover:border-purple-200'
                          : 'bg-slate-100/70 border-slate-200 opacity-70'
                      }`}
                    >
                      {/* Top Row: Avatar, Name, Role Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border ${colorObj.bg} ${colorObj.text} ${colorObj.border} shrink-0 shadow-2xs`}>
                            {user.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900">{user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-700 text-white">
                                  أنت الآن
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px] font-mono">
                              <span>@{user.username}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <KeyRound className="w-3 h-3 text-slate-400" />
                                PIN: {user.pin || '••••'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Role & Status Pill */}
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-900 border-purple-200'
                                : user.role === 'pharmacist'
                                ? 'bg-teal-100 text-teal-900 border-teal-200'
                                : user.role === 'accountant'
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                            }`}
                          >
                            {user.role === 'admin'
                              ? 'مدير النظام'
                              : user.role === 'pharmacist'
                              ? 'صيدلي مسؤول'
                              : user.role === 'accountant'
                              ? 'محاسب مالي'
                              : 'كاشير مبيعات'}
                          </span>

                          <span className={`text-[10px] font-bold flex items-center gap-1 ${user.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {user.active ? 'حساب مفعّل' : 'معطل مؤقتاً'}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Meta details (Shift, Phone, Discount limit) */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>الوردية: {user.shift === 'morning' ? 'صباحية' : user.shift === 'evening' ? 'مسائية' : user.shift === 'night' ? 'ليلية' : 'دوام كامل'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 font-bold">
                          <Percent className="w-3.5 h-3.5 text-amber-600" />
                          <span>حد الخصم: {user.maxDiscountPercentage !== undefined ? `${user.maxDiscountPercentage}%` : user.role === 'admin' ? '100%' : '5%'}</span>
                        </div>

                        {user.phone && (
                          <div className="flex items-center gap-1.5 font-mono col-span-2">
                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                            <span>{user.phone}</span>
                          </div>
                        )}

                        <div className="col-span-2 flex flex-wrap gap-1 mt-1">
                          {userPerms.slice(0, 4).map((p) => {
                            const def = PERMISSION_DEFINITIONS.find((pd) => pd.id === p);
                            return def ? (
                              <span key={p} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                                {def.label}
                              </span>
                            ) : null;
                          })}
                          {userPerms.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px]">
                              +{userPerms.length - 4} صلاحية إضافية
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleFastSwitch(user)}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="تسجيل الدخول الفوري بهذا الحساب للتجربة"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>دخول سريع</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            disabled={isCurrent}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              user.active
                                ? 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {user.active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            <span>{user.active ? 'تعطيل' : 'تفعيل'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditingUser(user)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition-colors cursor-pointer"
                            title="تعديل الحساب والصلاحيات"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                              title="حذف الحساب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                  <UserX className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">لا يوجد موظفين يطابقون خيارات البحث والتصفية</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setRoleFilter('all');
                    }}
                    className="text-xs text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    إعادة ضبط الفلترة
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: USER & PERMISSIONS EDITOR */}
          {activeTab === 'editor' && (
            <form onSubmit={handleSaveUser} className="space-y-4">
              
              {/* Basic Profile Card */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-800">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>{editingUserId ? 'تعديل بيانات وصلاحيات الموظف' : 'إضافة موظف جديد إلى طاقم العمل'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600">حالة الحساب:</label>
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      <span>{isActive ? 'نشط ومفعّل' : 'معطل مؤقتاً'}</span>
                    </button>
                  </div>
                </div>

                {/* Avatar Color Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">لون السمة الرمزية للموظف:</label>
                  <div className="flex items-center gap-2">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAvatarColor(c.id)}
                        className={`w-7 h-7 rounded-xl ${c.bg} ${c.border} border-2 flex items-center justify-center transition-all cursor-pointer ${
                          avatarColor === c.id ? 'ring-2 ring-purple-600 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموظف الكامل *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: د. مروان الحمادي"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم تسجيل الدخول (Username) *</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="marwan"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>

                  {/* PIN Code Field with Auto-Generator */}
                  <div className="sm:col-span-2 bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-purple-700" />
                        <span>رمز الدخول السريع (PIN Code - 4 أرقام) *</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomPin}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>توليد PIN عشوائي</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPin ? 'text' : 'password'}
                          required
                          maxLength={6}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="مثال: 1234"
                          className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs text-purple-950 font-mono font-black tracking-widest text-center focus:outline-none focus:border-purple-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute left-3 top-2.5 text-slate-400 hover:text-purple-700 cursor-pointer"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        يستخدم لإلغاء قفل الشاشة السريع وتفويض العمليات في الكاشير
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الدور الوظيفي الرئيسي *</label>
                    <select
                      value={role}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                    >
                      <option value="cashier">كاشير مبيعات (نقطة البيع، تحصيل الفواتير، بيانات العملاء)</option>
                      <option value="pharmacist">صيدلي مسؤول (البيع، كتالوج الأدوية، تواريخ الصلاحية، الجرد)</option>
                      <option value="accountant">محاسب مالي (التقارير المالية، المصروفات، المشتريات، كشوفات الديون)</option>
                      <option value="admin">مدير النظام (صلاحيات غير محدودة + إعدادات النظام وقاعدة البيانات)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">أقصى نسبة خصم مسموح بها (%) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={maxDiscountPercentage}
                        onChange={(e) => setMaxDiscountPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                      />
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      أي خصم يتجاوز هذه النسبة سيتطلب إدخال PIN المدير للموافقة
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الوردية / الدوام المعتمد</label>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                    >
                      <option value="morning">وردية صباحية (08:00 ص - 04:00 م)</option>
                      <option value="evening">وردية مسائية (04:00 م - 12:00 ص)</option>
                      <option value="night">وردية ليلية (12:00 ص - 08:00 ص)</option>
                      <option value="full">دوام كامل / مرن</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الجوال</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="777000111"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Granular Permissions Matrix */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-700" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">مصفوفة الصلاحيات المخصصة</h4>
                      <p className="text-[11px] text-slate-500">تم تحديد الصلاحيات وفقاً للدور ويمكنك تخصيص كل صلاحية بدقة:</p>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('cashier')}
                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold cursor-pointer"
                    >
                      كاشير
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('pharmacist')}
                      className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold cursor-pointer"
                    >
                      صيدلي
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('accountant')}
                      className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold cursor-pointer"
                    >
                      محاسب
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold cursor-pointer"
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={handleClearPermissions}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-[10px] font-bold cursor-pointer"
                    >
                      مسح
                    </button>
                  </div>
                </div>

                {/* Grouped Permissions */}
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupPerms = PERMISSION_DEFINITIONS.filter((p) => p.group === group.key);
                    const allGroupChecked = groupPerms.every((p) => selectedPermissions.includes(p.id));
                    const someGroupChecked = groupPerms.some((p) => selectedPermissions.includes(p.id));

                    return (
                      <div key={group.key} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className={`px-3.5 py-2 flex items-center justify-between border-b ${group.color}`}>
                          <div>
                            <div className="text-xs font-bold">{group.title}</div>
                            <div className="text-[10px] opacity-80">{group.desc}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleGroup(group.key)}
                            className="text-[10px] font-black underline cursor-pointer hover:opacity-80"
                          >
                            {allGroupChecked ? 'إلغاء المجموعة' : 'تحديد المجموعة بالكامل'}
                          </button>
                        </div>

                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-slate-50/50">
                          {groupPerms.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-white border-purple-400 shadow-2xs text-purple-950 ring-1 ring-purple-400/20'
                                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-0 w-4 h-4 cursor-pointer"
                                />
                                <div className="space-y-0.5">
                                  <div className="text-xs font-bold leading-tight">{perm.label}</div>
                                  <div className="text-[10px] text-slate-500 leading-snug">{perm.desc}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء والعودة للقائمة
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  {editingUserId ? 'حفظ التعديلات' : 'إضافة الموظف الآن'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ROLES COMPARISON MATRIX */}
          {activeTab === 'matrix' && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900">مصفوفة الصلاحيات القياسية المقارنة للأدوار</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">جدول مقارن يوضح الصلاحيات الممنوحة افتراضياً لكل مستوى وظيفي في الصيدلية:</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-purple-900 text-white font-bold">
                      <th className="p-3 border-b border-purple-800">الصلاحية الوظيفية</th>
                      <th className="p-3 border-b border-purple-800 text-center w-28">مدير النظام</th>
                      <th className="p-3 border-b border-purple-800 text-center w-28">صيدلي مسؤول</th>
                      <th className="p-3 border-b border-purple-800 text-center w-28">محاسب مالي</th>
                      <th className="p-3 border-b border-purple-800 text-center w-28">كاشير مبيعات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {PERMISSION_DEFINITIONS.map((perm, idx) => {
                      const adminHas = ROLE_PRESET_PERMISSIONS['admin'].includes(perm.id);
                      const pharmHas = ROLE_PRESET_PERMISSIONS['pharmacist'].includes(perm.id);
                      const accHas = ROLE_PRESET_PERMISSIONS['accountant'].includes(perm.id);
                      const cashHas = ROLE_PRESET_PERMISSIONS['cashier'].includes(perm.id);

                      return (
                        <tr key={perm.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{perm.label}</div>
                            <div className="text-[10px] text-slate-500">{perm.desc}</div>
                          </td>

                          <td className="p-3 text-center">
                            {adminHas ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700">
                                <Check className="w-4 h-4 font-bold" />
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {pharmHas ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700">
                                <Check className="w-4 h-4 font-bold" />
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {accHas ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700">
                                <Check className="w-4 h-4 font-bold" />
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {cashHas ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-4 h-4 font-bold" />
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Audit Header & Filter */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-700" />
                  <span className="font-bold text-xs text-slate-800">سجل الرقابة الأمنية والعمليات</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                    {filteredAuditLogs.length} حركة مسجلة
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
                    <input
                      type="text"
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      placeholder="بحث بالسجل..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-8 pl-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <select
                    value={selectedAuditUser}
                    onChange={(e) => setSelectedAuditUser(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">كافة الموظفين</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Logs List */}
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {filteredAuditLogs.slice(0, 50).map((log) => (
                  <div key={log.id} className="p-3 sm:p-3.5 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-800 font-bold text-xs shrink-0 mt-0.5">
                        {log.userName ? log.userName.slice(0, 1) : 'ن'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{log.action}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-mono">
                            {log.module}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed font-medium">
                          {log.details}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 font-mono">
                          <span>بواسطة: {log.userName || 'مستخدم النظام'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono shrink-0 whitespace-nowrap text-left">
                      {new Date(log.timestamp).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                      <br />
                      <span className="text-[10px]">{new Date(log.timestamp).toLocaleDateString('ar-YE')}</span>
                    </div>
                  </div>
                ))}

                {filteredAuditLogs.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold">
                    لا توجد حركات مسجلة تطابق خيارات البحث
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
