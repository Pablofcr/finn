import {
  Utensils, ShoppingCart, UtensilsCrossed, Bike, Coffee,
  Car, Fuel, CarTaxiFront, Bus,
  Home, Zap, Droplet, Wifi,
  HeartPulse, Pill, Stethoscope, ShieldPlus,
  GraduationCap, Gamepad2, Shirt, ShoppingBag,
  Sparkles, Repeat, Gift, CircleEllipsis,
  Briefcase, Laptop, TrendingUp, Coins,
  Tag,
  type LucideIcon,
} from 'lucide-react'

/**
 * Map the string saved in Category.icon to a Lucide component.
 * Keys mirror what src/lib/keyword-map.ts stores in CATEGORY_METADATA.icon.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Alimentação family
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  'utensils-crossed': UtensilsCrossed,
  bike: Bike,
  coffee: Coffee,

  // Transporte family
  car: Car,
  fuel: Fuel,
  'car-taxi-front': CarTaxiFront,
  bus: Bus,

  // Moradia family
  home: Home,
  zap: Zap,
  droplet: Droplet,
  wifi: Wifi,

  // Saúde family
  'heart-pulse': HeartPulse,
  pill: Pill,
  stethoscope: Stethoscope,
  'shield-plus': ShieldPlus,

  // Flat EXPENSE categories
  'graduation-cap': GraduationCap,
  'gamepad-2': Gamepad2,
  shirt: Shirt,
  'shopping-bag': ShoppingBag,
  sparkles: Sparkles,
  repeat: Repeat,
  gift: Gift,
  'circle-ellipsis': CircleEllipsis,

  // INCOME
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  coins: Coins,

  // Fallback
  tag: Tag,
}

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Tag
  return CATEGORY_ICONS[name] ?? Tag
}
