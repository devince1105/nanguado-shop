import {
  Shirt,
  ShoppingBag,
  Footprints,
  Glasses,
  Gem,
  Gift,
  Sparkles,
  Smartphone,
  Laptop,
  Utensils,
  BookOpen,
  Dumbbell,
  PawPrint,
  Palette,
  Baby,
  Watch,
  Tag,
  Heart,
  Camera,
  Car,
  Home,
  Headphones,
  Coffee,
  Tv,
  Sun,
  Smile,
  Music,
  Gamepad2,
  Package,
  Armchair,
  Bike,
  Crown,
  Flame,
  HatGlasses,
  Star,
  Award,
  Zap,
  Scissors,
  Brush,
  Umbrella,
  Ticket,
  Flower2,
  type LucideIcon,
} from "lucide-react";

/** 將傳入之 icon 名稱轉為標準化格式 */
function normalizeIconName(str: string): string {
  return str.trim().toLowerCase().replace(/_/g, "-");
}

/** 豐富的 Lucide 圖示對應表 (50+ 常用電商分類 Icon) */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  shirt: Shirt,
  "t-shirt": Shirt,
  "shopping-bag": ShoppingBag,
  bag: ShoppingBag,
  footprints: Footprints,
  shoes: Footprints,
  glasses: Glasses,
  "hat-glasses": HatGlasses,
  hatglasses: HatGlasses,
  gem: Gem,
  gift: Gift,
  sparkles: Sparkles,
  smartphone: Smartphone,
  phone: Smartphone,
  laptop: Laptop,
  pc: Laptop,
  utensils: Utensils,
  food: Utensils,
  "book-open": BookOpen,
  book: BookOpen,
  dumbbell: Dumbbell,
  sport: Dumbbell,
  "paw-print": PawPrint,
  pet: PawPrint,
  palette: Palette,
  makeup: Palette,
  baby: Baby,
  watch: Watch,
  heart: Heart,
  camera: Camera,
  car: Car,
  home: Home,
  headphones: Headphones,
  coffee: Coffee,
  tv: Tv,
  sun: Sun,
  smile: Smile,
  music: Music,
  "gamepad-2": Gamepad2,
  gamepad: Gamepad2,
  package: Package,
  armchair: Armchair,
  furniture: Armchair,
  bike: Bike,
  crown: Crown,
  vip: Crown,
  flame: Flame,
  hot: Flame,
  star: Star,
  award: Award,
  zap: Zap,
  scissors: Scissors,
  brush: Brush,
  umbrella: Umbrella,
  ticket: Ticket,
  flower: Flower2,
  "flower-2": Flower2,
  tag: Tag,
};

export const CATEGORY_ICON_OPTIONS = [
  { id: "shirt", label: "衣著服飾", Icon: Shirt },
  { id: "shopping-bag", label: "包包袋款", Icon: ShoppingBag },
  { id: "footprints", label: "鞋款足履", Icon: Footprints },
  { id: "glasses", label: "眼鏡配件", Icon: Glasses },
  { id: "hat-glasses", label: "帽子眼鏡", Icon: HatGlasses },
  { id: "watch", label: "手錶飾品", Icon: Watch },
  { id: "gem", label: "精品珠寶", Icon: Gem },
  { id: "palette", label: "美妝彩妝", Icon: Palette },
  { id: "smartphone", label: "手機3C", Icon: Smartphone },
  { id: "laptop", label: "電腦筆電", Icon: Laptop },
  { id: "headphones", label: "耳機影音", Icon: Headphones },
  { id: "utensils", label: "美食餐飲", Icon: Utensils },
  { id: "coffee", label: "咖啡飲料", Icon: Coffee },
  { id: "book-open", label: "圖書文具", Icon: BookOpen },
  { id: "gift", label: "禮品周邊", Icon: Gift },
  { id: "dumbbell", label: "運動健身", Icon: Dumbbell },
  { id: "paw-print", label: "寵物用品", Icon: PawPrint },
  { id: "sparkles", label: "居家生活", Icon: Sparkles },
  { id: "armchair", label: "傢俱居家", Icon: Armchair },
  { id: "baby", label: "母嬰兒童", Icon: Baby },
  { id: "gamepad-2", label: "電玩遊戲", Icon: Gamepad2 },
  { id: "camera", label: "攝影器材", Icon: Camera },
  { id: "heart", label: "健康護理", Icon: Heart },
  { id: "flame", label: "熱銷發燒", Icon: Flame },
  { id: "crown", label: "尊榮VIP", Icon: Crown },
  { id: "bike", label: "戶外單車", Icon: Bike },
  { id: "star", label: "精選星級", Icon: Star },
  { id: "tag", label: "通用標籤", Icon: Tag },
];

/** 預設圓形 icon 背景顏色選項 (Tailwind Class & HEX) */
export const PRESET_BG_COLORS = [
  { id: "bg-neutral-100", hex: "#f5f5f5", name: "預設淺灰" },
  { id: "bg-pumpkin-100", hex: "#ffedd5", name: "南瓜柔橘" },
  { id: "bg-rose-100", hex: "#ffe4e6", name: "櫻花粉紅" },
  { id: "bg-sky-100", hex: "#e0f2fe", name: "天空天空藍" },
  { id: "bg-emerald-100", hex: "#d1fae5", name: "薄荷薄荷綠" },
  { id: "bg-violet-100", hex: "#ede9fe", name: "薰衣草紫" },
  { id: "bg-yellow-100", hex: "#fef9c3", name: "檸檬淺黃" },
  { id: "bg-teal-100", hex: "#ccfbf1", name: "湖水藍綠" },
  { id: "bg-pink-100", hex: "#fce7f3", name: "芭比粉紫" },
  { id: "bg-amber-100", hex: "#fef3c7", name: "暖金暖黃" },
];

/** 依名稱自動配對 (當未設定自訂 icon 時的預設 fallback) */
export function autoIconForCategoryName(name: string): LucideIcon {
  if (/(t恤|tee|polo|上衣|衣著|帽t|大學t|連帽|外套|衛衣|長袖|短袖|背心)/i.test(name))
    return Shirt;
  if (/(包|袋|後背)/.test(name)) return ShoppingBag;
  if (/(鞋|靴)/.test(name)) return Footprints;
  if (/(眼鏡|墨鏡|帽)/.test(name)) return HatGlasses;
  if (/(黃金|珠寶|鑽|戒|項鍊|精品飾)/.test(name)) return Gem;
  if (/(手錶|飾品)/.test(name)) return Watch;
  if (/(食|美食|零食|伴手|饮|甜點|糕餅)/.test(name)) return Utensils;
  if (/(文創|小物|禮|紀念|周邊)/.test(name)) return Gift;
  if (/(手機|平板|3c|電腦|筆電|電子)/i.test(name)) return Smartphone;
  if (/(家電|影音)/.test(name)) return Laptop;
  if (/(書|文具|雜誌|票券)/.test(name)) return BookOpen;
  if (/(運動|健身|戶外)/.test(name)) return Dumbbell;
  if (/(寵物)/.test(name)) return PawPrint;
  if (/(美妝|保養|化妝|美容)/.test(name)) return Palette;
  if (/(童|嬰|母嬰|兒童|親子)/.test(name)) return Baby;
  if (/(居家|寢具|傢俱|生活|家居)/.test(name)) return Sparkles;
  return Tag;
}

/** 解析 Icon 名稱 */
export function resolveLucideIcon(iconName: string): LucideIcon | null {
  if (!iconName || !iconName.trim()) return null;
  const normalized = normalizeIconName(iconName);
  return CATEGORY_ICON_MAP[normalized] || null;
}

/** 取得分類 Icon 元件 */
export function getCategoryIcon(
  iconName?: string | null,
  categoryName?: string,
): LucideIcon {
  if (iconName) {
    const resolved = resolveLucideIcon(iconName);
    if (resolved) return resolved;
  }
  if (categoryName) {
    return autoIconForCategoryName(categoryName);
  }
  return Tag;
}
