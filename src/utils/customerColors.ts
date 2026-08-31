export interface CustomerColorTheme {
  id: string;
  nameAr: string;
  hex: string;
  avatarBg: string;      // Solid avatar background with text
  avatarLight: string;   // Light avatar bg with colored text
  borderAccent: string;  // Right accent line (border-r-4 / border-r-5)
  border: string;        // Border color
  cardBg: string;        // Rich noticeable tinted background for cards/boxes
  cardHover: string;     // Hover background
  activeCardBg: string;  // Selected/active card style
  tableRow: string;      // Table row background and hover
  badge: string;         // Pill badge class
  text: string;          // Main text color
  dot: string;           // Dot indicator
  gradient: string;      // Gradient for modals/headers
  ring: string;          // Focus ring
}

export const CUSTOMER_COLORS: CustomerColorTheme[] = [
  {
    id: 'indigo',
    nameAr: 'نيلي ملكي',
    hex: '#4f46e5',
    avatarBg: 'bg-indigo-600 text-white',
    avatarLight: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    borderAccent: 'border-r-4 border-r-indigo-600',
    border: 'border-indigo-200/90',
    cardBg: 'bg-indigo-50/80 hover:bg-indigo-100/70 border-indigo-200',
    cardHover: 'hover:bg-indigo-100/80 hover:border-indigo-300',
    activeCardBg: 'bg-indigo-100/90 border-indigo-500 ring-2 ring-indigo-400',
    tableRow: 'bg-indigo-50/40 hover:bg-indigo-100/60',
    badge: 'bg-indigo-100 text-indigo-900 border border-indigo-300',
    text: 'text-indigo-800',
    dot: 'bg-indigo-600',
    gradient: 'from-indigo-700 to-indigo-600',
    ring: 'ring-indigo-400',
  },
  {
    id: 'emerald',
    nameAr: 'أخضر زمردي',
    hex: '#059669',
    avatarBg: 'bg-emerald-600 text-white',
    avatarLight: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderAccent: 'border-r-4 border-r-emerald-600',
    border: 'border-emerald-200/90',
    cardBg: 'bg-emerald-50/80 hover:bg-emerald-100/70 border-emerald-200',
    cardHover: 'hover:bg-emerald-100/80 hover:border-emerald-300',
    activeCardBg: 'bg-emerald-100/90 border-emerald-500 ring-2 ring-emerald-400',
    tableRow: 'bg-emerald-50/40 hover:bg-emerald-100/60',
    badge: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
    text: 'text-emerald-800',
    dot: 'bg-emerald-600',
    gradient: 'from-emerald-700 to-emerald-600',
    ring: 'ring-emerald-400',
  },
  {
    id: 'amber',
    nameAr: 'كهرماني ذهبي',
    hex: '#d97706',
    avatarBg: 'bg-amber-600 text-white',
    avatarLight: 'bg-amber-100 text-amber-900 border-amber-200',
    borderAccent: 'border-r-4 border-r-amber-600',
    border: 'border-amber-200/90',
    cardBg: 'bg-amber-50/80 hover:bg-amber-100/70 border-amber-200',
    cardHover: 'hover:bg-amber-100/80 hover:border-amber-300',
    activeCardBg: 'bg-amber-100/90 border-amber-500 ring-2 ring-amber-400',
    tableRow: 'bg-amber-50/40 hover:bg-amber-100/60',
    badge: 'bg-amber-100 text-amber-900 border border-amber-300',
    text: 'text-amber-800',
    dot: 'bg-amber-600',
    gradient: 'from-amber-700 to-amber-600',
    ring: 'ring-amber-400',
  },
  {
    id: 'rose',
    nameAr: 'وردي ياقوتي',
    hex: '#e11d48',
    avatarBg: 'bg-rose-600 text-white',
    avatarLight: 'bg-rose-100 text-rose-900 border-rose-200',
    borderAccent: 'border-r-4 border-r-rose-600',
    border: 'border-rose-200/90',
    cardBg: 'bg-rose-50/80 hover:bg-rose-100/70 border-rose-200',
    cardHover: 'hover:bg-rose-100/80 hover:border-rose-300',
    activeCardBg: 'bg-rose-100/90 border-rose-500 ring-2 ring-rose-400',
    tableRow: 'bg-rose-50/40 hover:bg-rose-100/60',
    badge: 'bg-rose-100 text-rose-900 border border-rose-300',
    text: 'text-rose-800',
    dot: 'bg-rose-600',
    gradient: 'from-rose-700 to-rose-600',
    ring: 'ring-rose-400',
  },
  {
    id: 'purple',
    nameAr: 'بنفسجي فاخر',
    hex: '#9333ea',
    avatarBg: 'bg-purple-600 text-white',
    avatarLight: 'bg-purple-100 text-purple-900 border-purple-200',
    borderAccent: 'border-r-4 border-r-purple-600',
    border: 'border-purple-200/90',
    cardBg: 'bg-purple-50/80 hover:bg-purple-100/70 border-purple-200',
    cardHover: 'hover:bg-purple-100/80 hover:border-purple-300',
    activeCardBg: 'bg-purple-100/90 border-purple-500 ring-2 ring-purple-400',
    tableRow: 'bg-purple-50/40 hover:bg-purple-100/60',
    badge: 'bg-purple-100 text-purple-900 border border-purple-300',
    text: 'text-purple-800',
    dot: 'bg-purple-600',
    gradient: 'from-purple-700 to-purple-600',
    ring: 'ring-purple-400',
  },
  {
    id: 'sky',
    nameAr: 'أزرق سماوي',
    hex: '#0284c7',
    avatarBg: 'bg-sky-600 text-white',
    avatarLight: 'bg-sky-100 text-sky-900 border-sky-200',
    borderAccent: 'border-r-4 border-r-sky-600',
    border: 'border-sky-200/90',
    cardBg: 'bg-sky-50/80 hover:bg-sky-100/70 border-sky-200',
    cardHover: 'hover:bg-sky-100/80 hover:border-sky-300',
    activeCardBg: 'bg-sky-100/90 border-sky-500 ring-2 ring-sky-400',
    tableRow: 'bg-sky-50/40 hover:bg-sky-100/60',
    badge: 'bg-sky-100 text-sky-900 border border-sky-300',
    text: 'text-sky-800',
    dot: 'bg-sky-600',
    gradient: 'from-sky-700 to-sky-600',
    ring: 'ring-sky-400',
  },
  {
    id: 'orange',
    nameAr: 'برتقالي مشرق',
    hex: '#ea580c',
    avatarBg: 'bg-orange-600 text-white',
    avatarLight: 'bg-orange-100 text-orange-900 border-orange-200',
    borderAccent: 'border-r-4 border-r-orange-600',
    border: 'border-orange-200/90',
    cardBg: 'bg-orange-50/80 hover:bg-orange-100/70 border-orange-200',
    cardHover: 'hover:bg-orange-100/80 hover:border-orange-300',
    activeCardBg: 'bg-orange-100/90 border-orange-500 ring-2 ring-orange-400',
    tableRow: 'bg-orange-50/40 hover:bg-orange-100/60',
    badge: 'bg-orange-100 text-orange-900 border border-orange-300',
    text: 'text-orange-800',
    dot: 'bg-orange-600',
    gradient: 'from-orange-700 to-orange-600',
    ring: 'ring-orange-400',
  },
  {
    id: 'teal',
    nameAr: 'تركوازي بحري',
    hex: '#0d9488',
    avatarBg: 'bg-teal-600 text-white',
    avatarLight: 'bg-teal-100 text-teal-900 border-teal-200',
    borderAccent: 'border-r-4 border-r-teal-600',
    border: 'border-teal-200/90',
    cardBg: 'bg-teal-50/80 hover:bg-teal-100/70 border-teal-200',
    cardHover: 'hover:bg-teal-100/80 hover:border-teal-300',
    activeCardBg: 'bg-teal-100/90 border-teal-500 ring-2 ring-teal-400',
    tableRow: 'bg-teal-50/40 hover:bg-teal-100/60',
    badge: 'bg-teal-100 text-teal-900 border border-teal-300',
    text: 'text-teal-800',
    dot: 'bg-teal-600',
    gradient: 'from-teal-700 to-teal-600',
    ring: 'ring-teal-400',
  },
  {
    id: 'cyan',
    nameAr: 'فيروزي متألق',
    hex: '#0891b2',
    avatarBg: 'bg-cyan-600 text-white',
    avatarLight: 'bg-cyan-100 text-cyan-900 border-cyan-200',
    borderAccent: 'border-r-4 border-r-cyan-600',
    border: 'border-cyan-200/90',
    cardBg: 'bg-cyan-50/80 hover:bg-cyan-100/70 border-cyan-200',
    cardHover: 'hover:bg-cyan-100/80 hover:border-cyan-300',
    activeCardBg: 'bg-cyan-100/90 border-cyan-500 ring-2 ring-cyan-400',
    tableRow: 'bg-cyan-50/40 hover:bg-cyan-100/60',
    badge: 'bg-cyan-100 text-cyan-900 border border-cyan-300',
    text: 'text-cyan-800',
    dot: 'bg-cyan-600',
    gradient: 'from-cyan-700 to-cyan-600',
    ring: 'ring-cyan-400',
  },
  {
    id: 'fuchsia',
    nameAr: 'فوشيا متميز',
    hex: '#c026d3',
    avatarBg: 'bg-fuchsia-600 text-white',
    avatarLight: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
    borderAccent: 'border-r-4 border-r-fuchsia-600',
    border: 'border-fuchsia-200/90',
    cardBg: 'bg-fuchsia-50/80 hover:bg-fuchsia-100/70 border-fuchsia-200',
    cardHover: 'hover:bg-fuchsia-100/80 hover:border-fuchsia-300',
    activeCardBg: 'bg-fuchsia-100/90 border-fuchsia-500 ring-2 ring-fuchsia-400',
    tableRow: 'bg-fuchsia-50/40 hover:bg-fuchsia-100/60',
    badge: 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300',
    text: 'text-fuchsia-800',
    dot: 'bg-fuchsia-600',
    gradient: 'from-fuchsia-700 to-fuchsia-600',
    ring: 'ring-fuchsia-400',
  },
  {
    id: 'lime',
    nameAr: 'ليموني حيوي',
    hex: '#65a30d',
    avatarBg: 'bg-lime-600 text-white',
    avatarLight: 'bg-lime-100 text-lime-900 border-lime-200',
    borderAccent: 'border-r-4 border-r-lime-600',
    border: 'border-lime-200/90',
    cardBg: 'bg-lime-50/80 hover:bg-lime-100/70 border-lime-200',
    cardHover: 'hover:bg-lime-100/80 hover:border-lime-300',
    activeCardBg: 'bg-lime-100/90 border-lime-500 ring-2 ring-lime-400',
    tableRow: 'bg-lime-50/40 hover:bg-lime-100/60',
    badge: 'bg-lime-100 text-lime-900 border border-lime-300',
    text: 'text-lime-800',
    dot: 'bg-lime-600',
    gradient: 'from-lime-700 to-lime-600',
    ring: 'ring-lime-400',
  },
  {
    id: 'violet',
    nameAr: 'بنفسج براق',
    hex: '#7c3aed',
    avatarBg: 'bg-violet-600 text-white',
    avatarLight: 'bg-violet-100 text-violet-900 border-violet-200',
    borderAccent: 'border-r-4 border-r-violet-600',
    border: 'border-violet-200/90',
    cardBg: 'bg-violet-50/80 hover:bg-violet-100/70 border-violet-200',
    cardHover: 'hover:bg-violet-100/80 hover:border-violet-300',
    activeCardBg: 'bg-violet-100/90 border-violet-500 ring-2 ring-violet-400',
    tableRow: 'bg-violet-50/40 hover:bg-violet-100/60',
    badge: 'bg-violet-100 text-violet-900 border border-violet-300',
    text: 'text-violet-800',
    dot: 'bg-violet-600',
    gradient: 'from-violet-700 to-violet-600',
    ring: 'ring-violet-400',
  },
  {
    id: 'blue',
    nameAr: 'أزرق كحلي',
    hex: '#2563eb',
    avatarBg: 'bg-blue-600 text-white',
    avatarLight: 'bg-blue-100 text-blue-900 border-blue-200',
    borderAccent: 'border-r-4 border-r-blue-600',
    border: 'border-blue-200/90',
    cardBg: 'bg-blue-50/80 hover:bg-blue-100/70 border-blue-200',
    cardHover: 'hover:bg-blue-100/80 hover:border-blue-300',
    activeCardBg: 'bg-blue-100/90 border-blue-500 ring-2 ring-blue-400',
    tableRow: 'bg-blue-50/40 hover:bg-blue-100/60',
    badge: 'bg-blue-100 text-blue-900 border border-blue-300',
    text: 'text-blue-800',
    dot: 'bg-blue-600',
    gradient: 'from-blue-700 to-blue-600',
    ring: 'ring-blue-400',
  },
  {
    id: 'red',
    nameAr: 'أحمر قرمزي',
    hex: '#dc2626',
    avatarBg: 'bg-red-600 text-white',
    avatarLight: 'bg-red-100 text-red-900 border-red-200',
    borderAccent: 'border-r-4 border-r-red-600',
    border: 'border-red-200/90',
    cardBg: 'bg-red-50/80 hover:bg-red-100/70 border-red-200',
    cardHover: 'hover:bg-red-100/80 hover:border-red-300',
    activeCardBg: 'bg-red-100/90 border-red-500 ring-2 ring-red-400',
    tableRow: 'bg-red-50/40 hover:bg-red-100/60',
    badge: 'bg-red-100 text-red-900 border border-red-300',
    text: 'text-red-800',
    dot: 'bg-red-600',
    gradient: 'from-red-700 to-red-600',
    ring: 'ring-red-400',
  },
  {
    id: 'yellow',
    nameAr: 'ذهبي عنبري',
    hex: '#ca8a04',
    avatarBg: 'bg-yellow-600 text-white',
    avatarLight: 'bg-yellow-100 text-yellow-900 border-yellow-200',
    borderAccent: 'border-r-4 border-r-yellow-600',
    border: 'border-yellow-200/90',
    cardBg: 'bg-yellow-50/80 hover:bg-yellow-100/70 border-yellow-200',
    cardHover: 'hover:bg-yellow-100/80 hover:border-yellow-300',
    activeCardBg: 'bg-yellow-100/90 border-yellow-500 ring-2 ring-yellow-400',
    tableRow: 'bg-yellow-50/40 hover:bg-yellow-100/60',
    badge: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
    text: 'text-yellow-800',
    dot: 'bg-yellow-600',
    gradient: 'from-yellow-700 to-yellow-600',
    ring: 'ring-yellow-400',
  },
  {
    id: 'slate',
    nameAr: 'رمادي حجري',
    hex: '#475569',
    avatarBg: 'bg-slate-700 text-white',
    avatarLight: 'bg-slate-100 text-slate-900 border-slate-300',
    borderAccent: 'border-r-4 border-r-slate-700',
    border: 'border-slate-300',
    cardBg: 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-300',
    cardHover: 'hover:bg-slate-200/80 hover:border-slate-400',
    activeCardBg: 'bg-slate-200 border-slate-600 ring-2 ring-slate-400',
    tableRow: 'bg-slate-50 hover:bg-slate-100/80',
    badge: 'bg-slate-200 text-slate-900 border border-slate-300',
    text: 'text-slate-800',
    dot: 'bg-slate-700',
    gradient: 'from-slate-700 to-slate-600',
    ring: 'ring-slate-400',
  },
];

/**
 * Deterministically compute a color theme for any customer
 */
export function getCustomerColor(customer?: { id?: string; name?: string; color?: string } | null): CustomerColorTheme {
  if (!customer) {
    return CUSTOMER_COLORS[0];
  }

  // 1. If customer has an explicit color assigned, match it
  if (customer.color) {
    const found = CUSTOMER_COLORS.find((c) => c.id === customer.color);
    if (found) return found;
  }

  // 2. If it is the default cash customer, assign teal
  if (customer.id === 'cust-1' || customer.name?.includes('نقدي')) {
    return CUSTOMER_COLORS.find((c) => c.id === 'teal') || CUSTOMER_COLORS[0];
  }

  // 3. Otherwise, hash the name/id deterministically across the 16 colors
  const key = `${customer.id || ''}-${customer.name || ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % CUSTOMER_COLORS.length;
  return CUSTOMER_COLORS[index];
}
