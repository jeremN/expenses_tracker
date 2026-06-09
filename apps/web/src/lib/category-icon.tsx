import {
  Tag, ShoppingCart, Utensils, Home, Car, Bus, Plane, HeartPulse, Stethoscope,
  GraduationCap, Briefcase, Gift, Gamepad2, Film, Music, Dumbbell, Shirt,
  Coffee, Wifi, Zap, Droplet, PiggyBank, CreditCard, Banknote, Baby, PawPrint,
  type LucideIcon,
} from 'lucide-react'

// Curated, finance-relevant subset. Keys are stored verbatim in
// `categories.icon`; never render arbitrary strings.
const ICONS = {
  tag: Tag,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  home: Home,
  car: Car,
  bus: Bus,
  plane: Plane,
  'heart-pulse': HeartPulse,
  stethoscope: Stethoscope,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  gift: Gift,
  gamepad: Gamepad2,
  film: Film,
  music: Music,
  dumbbell: Dumbbell,
  shirt: Shirt,
  coffee: Coffee,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
  'piggy-bank': PiggyBank,
  'credit-card': CreditCard,
  banknote: Banknote,
  baby: Baby,
  pet: PawPrint,
} satisfies Record<string, LucideIcon>

export type CategoryIconName = keyof typeof ICONS
export const CATEGORY_ICON_NAMES = Object.keys(ICONS) as CategoryIconName[]
const FALLBACK: LucideIcon = Tag

export function isCategoryIconName(name: unknown): name is CategoryIconName {
  return typeof name === 'string' && name in ICONS
}

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = isCategoryIconName(name) ? ICONS[name] : FALLBACK
  return <Icon className={className} aria-hidden />
}
