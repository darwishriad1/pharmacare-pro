import { create } from 'zustand';
import { User, UserRole, UserPermission } from '../types';
import { db } from '../database/db';
import { ActiveTab } from './useSettingsStore';

export const ROLE_PRESET_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  admin: [
    'pos_sale',
    'pos_discount',
    'pos_return',
    'pos_price_override',
    'pos_void_item',
    'pos_drawer_open',
    'inventory_view',
    'inventory_edit',
    'inventory_adjust',
    'purchases_manage',
    'customers_manage',
    'expenses_manage',
    'cashbox_manage',
    'reports_view',
    'reports_cost_profit',
    'settings_manage',
    'users_manage',
    'backup_manage',
    'audit_view',
  ],
  pharmacist: [
    'pos_sale',
    'pos_discount',
    'pos_return',
    'pos_price_override',
    'pos_void_item',
    'pos_drawer_open',
    'inventory_view',
    'inventory_edit',
    'inventory_adjust',
    'purchases_manage',
    'customers_manage',
    'expenses_manage',
    'reports_view',
    'reports_cost_profit',
  ],
  cashier: [
    'pos_sale',
    'pos_discount',
    'inventory_view',
    'customers_manage',
    'pos_drawer_open',
  ],
  accountant: [
    'pos_sale',
    'inventory_view',
    'purchases_manage',
    'customers_manage',
    'expenses_manage',
    'cashbox_manage',
    'reports_view',
    'reports_cost_profit',
    'backup_manage',
    'audit_view',
  ],
};

export interface ManagerAuthRequest {
  title: string;
  description: string;
  requiredPermission?: UserPermission;
  onAuthorized: (manager: User) => void;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isScreenLocked: boolean;
  isQuickSwitchModalOpen: boolean;
  managerAuthRequest: ManagerAuthRequest | null;

  login: (usernameOrPin: string, passwordOrPin?: string) => { success: boolean; message?: string };
  switchUser: (userId: string, pin?: string) => { success: boolean; message?: string };
  logout: () => void;
  lockScreen: () => void;
  unlockScreen: (pin: string) => { success: boolean; message?: string };
  setQuickSwitchModalOpen: (open: boolean) => void;
  requestManagerAuth: (request: ManagerAuthRequest) => void;
  closeManagerAuth: () => void;

  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: UserPermission) => boolean;
  canAccessTab: (tab: ActiveTab) => boolean;
  verifyManagerPin: (pin: string, requiredPermission?: UserPermission) => { valid: boolean; manager?: User; message?: string };
}

const AUTH_STORAGE_KEY = 'pharma_current_user_id';
const LOCK_STORAGE_KEY = 'pharma_screen_locked';

const getInitialUser = (): User | null => {
  const users = db.getUsers();
  const savedId = localStorage.getItem(AUTH_STORAGE_KEY);
  if (savedId) {
    const found = users.find((u) => u.id === savedId && u.active);
    if (found) return found;
  }
  // Fallback to first active admin or first active user
  const admin = users.find((u) => u.role === 'admin' && u.active);
  return admin || users[0] || null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: getInitialUser(),
  isAuthenticated: !!getInitialUser(),
  isScreenLocked: localStorage.getItem(LOCK_STORAGE_KEY) === 'true',
  isQuickSwitchModalOpen: false,
  managerAuthRequest: null,

  login: (identifier: string, secret?: string) => {
    const users = db.getUsers().filter((u) => u.active);
    const cleanId = identifier.trim().toLowerCase();

    // Check by username + pin/password OR by PIN only
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        u.pin === identifier ||
        (u.phone && u.phone === identifier)
    );

    if (!user) {
      return { success: false, message: 'اسم المستخدم أو رمز PIN غير صحيح' };
    }

    if (secret && user.pin && user.pin !== secret) {
      return { success: false, message: 'رمز الدخول السري (PIN) غير مطابق' };
    }

    localStorage.setItem(AUTH_STORAGE_KEY, user.id);
    localStorage.removeItem(LOCK_STORAGE_KEY);
    db.logAudit('تسجيل دخول', 'auth', `تسجيل دخول ناجح للمستخدم: ${user.name}`, user.id, user.name);

    set({ currentUser: user, isAuthenticated: true, isScreenLocked: false });
    return { success: true };
  },

  switchUser: (userId: string, pin?: string) => {
    const user = db.getUsers().find((u) => u.id === userId && u.active);
    if (!user) {
      return { success: false, message: 'المستخدم غير موجود أو حسابه معطل' };
    }

    if (pin !== undefined && user.pin && user.pin !== pin.trim()) {
      return { success: false, message: 'رمز PIN غير صحيح' };
    }

    localStorage.setItem(AUTH_STORAGE_KEY, user.id);
    localStorage.removeItem(LOCK_STORAGE_KEY);
    db.logAudit('تبديل مستخدم', 'auth', `تم تبديل المستخدم الحالي إلى: ${user.name}`, user.id, user.name);
    set({ currentUser: user, isAuthenticated: true, isScreenLocked: false, isQuickSwitchModalOpen: false });
    return { success: true };
  },

  logout: () => {
    const user = get().currentUser;
    if (user) {
      db.logAudit('تسجيل خروج', 'auth', `تسجيل خروج للمستخدم: ${user.name}`, user.id, user.name);
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(LOCK_STORAGE_KEY);
    set({ currentUser: null, isAuthenticated: false, isScreenLocked: false });
  },

  lockScreen: () => {
    localStorage.setItem(LOCK_STORAGE_KEY, 'true');
    set({ isScreenLocked: true });
    const user = get().currentUser;
    if (user) {
      db.logAudit('قفل الشاشة', 'auth', `تم قفل الشاشة مؤقتاً بواسطة: ${user.name}`, user.id, user.name);
    }
  },

  unlockScreen: (pin: string) => {
    const { currentUser } = get();
    const cleanPin = pin.trim();

    if (!currentUser) {
      return { success: false, message: 'لا يوجد مستخدم نشط' };
    }

    // Check current user's PIN or any Admin/Pharmacist PIN
    if (currentUser.pin === cleanPin) {
      localStorage.removeItem(LOCK_STORAGE_KEY);
      set({ isScreenLocked: false });
      return { success: true };
    }

    // Check if another admin/supervisor unlocked it
    const allUsers = db.getUsers().filter((u) => u.active);
    const supervisor = allUsers.find((u) => (u.role === 'admin' || u.role === 'pharmacist') && u.pin === cleanPin);
    if (supervisor) {
      localStorage.removeItem(LOCK_STORAGE_KEY);
      set({ isScreenLocked: false });
      db.logAudit('إلغاء قفل الشاشة', 'auth', `تم فتح القفل بواسطة المشرف: ${supervisor.name}`, supervisor.id, supervisor.name);
      return { success: true };
    }

    return { success: false, message: 'رمز PIN غير صحيح' };
  },

  setQuickSwitchModalOpen: (open: boolean) => set({ isQuickSwitchModalOpen: open }),

  requestManagerAuth: (request: ManagerAuthRequest) => {
    set({ managerAuthRequest: request });
  },

  closeManagerAuth: () => {
    set({ managerAuthRequest: null });
  },

  hasRole: (roles: UserRole[]) => {
    const user = get().currentUser;
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has universal access
    return roles.includes(user.role);
  },

  hasPermission: (permission: UserPermission) => {
    const user = get().currentUser;
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin always has all permissions

    // If explicit permissions array is set on user
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions.includes(permission);
    }

    // Fallback to default preset permissions for their role
    const preset = ROLE_PRESET_PERMISSIONS[user.role] || [];
    return preset.includes(permission);
  },

  canAccessTab: (tab: ActiveTab) => {
    const { currentUser, hasRole, hasPermission } = get();
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    switch (tab) {
      case 'dashboard':
        return hasRole(['admin', 'pharmacist', 'accountant']) || hasPermission('reports_view');
      case 'pos':
        return hasPermission('pos_sale');
      case 'invoices':
        return true; // All active users can view sales log
      case 'products':
      case 'inventory':
        return hasPermission('inventory_view') || hasRole(['admin', 'pharmacist', 'accountant']);
      case 'purchases':
        return hasPermission('purchases_manage') || hasRole(['admin', 'pharmacist', 'accountant']);
      case 'customers':
        return hasPermission('customers_manage') || hasRole(['admin', 'pharmacist', 'accountant', 'cashier']);
      case 'expenses':
        return hasPermission('expenses_manage') || hasRole(['admin', 'accountant', 'pharmacist']);
      case 'cashbox':
        return hasPermission('cashbox_manage') || hasRole(['admin', 'accountant']);
      case 'drawer':
        return true; // All cashiers and managers can access drawer reconciliation
      case 'reports':
        return hasPermission('reports_view') || hasRole(['admin', 'accountant', 'pharmacist']);
      case 'settings':
        return hasPermission('settings_manage') || hasPermission('users_manage') || hasRole(['admin', 'pharmacist', 'accountant']);
      default:
        return true;
    }
  },

  verifyManagerPin: (pin: string, requiredPermission?: UserPermission) => {
    const cleanPin = pin.trim();
    if (!cleanPin) return { valid: false, message: 'يرجى إدخال رمز PIN' };
    const users = db.getUsers().filter((u) => u.active);
    
    // Find manager with matching PIN
    const manager = users.find((u) => {
      if (u.pin !== cleanPin) return false;
      if (u.role === 'admin') return true;
      if (requiredPermission) {
        const perms = u.permissions || ROLE_PRESET_PERMISSIONS[u.role] || [];
        return perms.includes(requiredPermission);
      }
      return u.role === 'pharmacist';
    });

    if (manager) {
      return { valid: true, manager };
    }
    return { valid: false, message: 'رمز PIN الخاص بالمدير أو المشرف غير صحيح أو لا يملك الصلاحية المطلوبة' };
  },
}));
