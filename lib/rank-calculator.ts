// ============================================================
// StudyHup — Rank Calculator
// Nguồn chân lý DUY NHẤT cho logic rank.
// Dùng chung cho: API, cron decay, dashboard, profile, card render.
// ============================================================

export type RankTierId =
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'CHALLENGER'
  | 'THACH_DAU';

export type DivisionLabel = 'IV' | 'III' | 'II' | 'I';

export interface RankDivision {
  label: DivisionLabel;
  minHours: number;
  maxHours: number;
}

export interface RankTier {
  id: RankTierId;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  gradient: readonly [string, string];
  minHours: number;
  maxHours: number;
  divisions: readonly RankDivision[];
  /** true => xếp theo thứ hạng server, không theo giờ */
  serverRanked: boolean;
  /** có bị Rank Decay không */
  decayEnabled: boolean;
}

// ------------------------------------------------------------
// CẤU HÌNH TIER
// ------------------------------------------------------------

const div = (
  label: DivisionLabel,
  minHours: number,
  maxHours: number,
): RankDivision => ({ label, minHours, maxHours });

export const RANK_TIERS: readonly RankTier[] = [
  {
    id: 'GOLD',
    name: 'Vàng',
    nameEn: 'Gold',
    icon: '🥇',
    color: '#E6B325',
    gradient: ['#F7D774', '#C9922B'],
    minHours: 50,
    maxHours: 100,
    divisions: [
      div('IV', 50, 62.5),
      div('III', 62.5, 75),
      div('II', 75, 87.5),
      div('I', 87.5, 100),
    ],
    serverRanked: false,
    decayEnabled: false,
  },
  {
    id: 'PLATINUM',
    name: 'Bạch Kim',
    nameEn: 'Platinum',
    icon: '💠',
    color: '#3FD0C9',
    gradient: ['#9AF5EF', '#1E9E97'],
    minHours: 100,
    maxHours: 200,
    divisions: [
      div('IV', 100, 125),
      div('III', 125, 150),
      div('II', 150, 175),
      div('I', 175, 200),
    ],
    serverRanked: false,
    decayEnabled: false,
  },
  {
    id: 'DIAMOND',
    name: 'Kim Cương',
    nameEn: 'Diamond',
    icon: '💎',
    color: '#4FA8FF',
    gradient: ['#A9D6FF', '#1F6FD0'],
    minHours: 200,
    maxHours: 300,
    divisions: [
      div('IV', 200, 225),
      div('III', 225, 250),
      div('II', 250, 275),
      div('I', 275, 300),
    ],
    serverRanked: false,
    decayEnabled: true, // từ Kim Cương trở lên mới bị decay
  },
  {
    id: 'MASTER',
    name: 'Tinh Anh',
    nameEn: 'Master',
    icon: '🌟',
    color: '#B36BFF',
    gradient: ['#DCBBFF', '#7A2BE0'],
    minHours: 300,
    maxHours: 400,
    divisions: [
      div('IV', 300, 325),
      div('III', 325, 350),
      div('II', 350, 375),
      div('I', 375, 400),
    ],
    serverRanked: false,
    decayEnabled: true,
  },
  {
    id: 'GRANDMASTER',
    name: 'Cao Thủ',
    nameEn: 'Grandmaster',
    icon: '🔥',
    color: '#FF6B4A',
    gradient: ['#FFB199', '#D42B00'],
    minHours: 400,
    maxHours: 600,
    divisions: [
      div('IV', 400, 450),
      div('III', 450, 500),
      div('II', 500, 550),
      div('I', 550, 600),
    ],
    serverRanked: false,
    decayEnabled: true,
  },
  {
    // Spec: Chiến Thần 1000h–1500h, KHÔNG chia bậc nhỏ
    id: 'CHALLENGER',
    name: 'Chiến Thần',
    nameEn: 'Challenger',
    icon: '⚔️',
    color: '#FF3B6B',
    gradient: ['#FF9BB3', '#B3002D'],
    minHours: 1000,
    maxHours: 1500,
    divisions: [],
    serverRanked: false,
    decayEnabled: true,
  },
  {
    // Top 50 server — xử lý riêng bằng resolveThachDau()
    id: 'THACH_DAU',
    name: 'Thách Đấu',
    nameEn: 'Thách Đấu',
    icon: '👑',
    color: '#FFD400',
    gradient: ['#FFF3A6', '#D19A00'],
    minHours: 0,
    maxHours: Number.POSITIVE_INFINITY,
    divisions: [],
    serverRanked: true,
    decayEnabled: false,
  },
] as const;

// ------------------------------------------------------------
// HẰNG SỐ NGHIỆP VỤ
// ------------------------------------------------------------

/** Dưới ngưỡng này = UNRANKED */
export const MIN_RANK_HOURS = 50;

/** Trần giờ học hợp lệ ghi nhận mỗi ngày */
export const DAILY_VALID_HOURS_CAP = 12;

/** Top N của Thách Đấu */
export const THACH_DAU_TOP_N = 50;

/**
 * ⚠️ GAP TRONG SPEC: 600h–1000h chưa được định nghĩa tier.
 * Hiện tại: user trong vùng này được giữ ở "Cao Thủ I" (progress 100%,
 * không thể lên Chiến Thần cho tới khi đạt 1000h).
 * TODO(product): xác nhận có thêm tier phụ (VD: "Đại Cao Thủ") hay giữ nguyên.
 */
export const UNDEFINED_RANK_GAP: readonly [number, number] = [600, 1000];

// ------------------------------------------------------------
// LEVEL (đã làm phẳng: tier + division)
// ------------------------------------------------------------

export interface RankLevel {
  tierId: RankTierId;
  tierName: string;
  tierIcon: string;
  tierColor: string;
  tierGradient: readonly [string, string];
  division: DivisionLabel | null;
  /** "Vàng III" | "Chiến Thần" */
  label: string;
  /** "III" | null */
  divisionLabel: DivisionLabel | null;
  minHours: number;
  maxHours: number;
  serverRanked: boolean;
  decayEnabled: boolean;
}

const toLevel = (
  tier: RankTier,
  division: DivisionLabel | null,
  minHours: number,
  maxHours: number,
): RankLevel => ({
  tierId: tier.id,
  tierName: tier.name,
  tierIcon: tier.icon,
  tierColor: tier.color,
  tierGradient: tier.gradient,
  division,
  divisionLabel: division,
  label: division ? `${tier.name} ${division}` : tier.name,
  minHours,
  maxHours,
  serverRanked: tier.serverRanked,
  decayEnabled: tier.decayEnabled,
});

/** Danh sách level phẳng, sắp xếp tăng dần theo giờ */
export const RANK_LEVELS: readonly RankLevel[] = RANK_TIERS.filter(
  (t) => !t.serverRanked,
).flatMap((tier) =>
  tier.divisions.length === 0
    ? [toLevel(tier, null, tier.minHours, tier.maxHours)]
    : tier.divisions.map((d) => toLevel(tier, d.label, d.minHours, d.maxHours)),
);

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

const clampHours = (h: number) =>
  Number.isFinite(h) ? Math.max(0, h) : 0;

const round1 = (n: number) => Math.round(n * 10) / 10;

const pct = (value: number, total: number) =>
  total <= 0 ? 100 : Math.min(100, Math.max(0, (value / total) * 100));

/** "62.5" -> "62h30m" */
export function formatHours(hours: number): string {
  const total = Math.max(0, hours);
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  if (m === 60) return `${h + 1}h00m`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}m`;
}

/** "62.5" -> "62.5h" (dạng rút gọn cho badge) */
export function formatHoursShort(hours: number): string {
  return `${round1(hours)}h`;
}

export function getTierById(id: RankTierId): RankTier | undefined {
  return RANK_TIERS.find((t) => t.id === id);
}

export function getRankIcon(id: RankTierId): string {
  return getTierById(id)?.icon ?? '🎓';
}

export function getRankColor(id: RankTierId): string {
  return getTierById(id)?.color ?? '#8A8F98';
}

// ------------------------------------------------------------
// CORE: giờ -> level
// ------------------------------------------------------------

/** Trả về level hiện tại, hoặc null nếu chưa đủ 50h (UNRANKED). */
export function getRankLevel(totalHours: number): RankLevel | null {
  const hours = clampHours(totalHours);
  if (hours < MIN_RANK_HOURS) return null;

  // Duyệt ngược: level cuối cùng có minHours <= hours
  for (let i = RANK_LEVELS.length - 1; i >= 0; i -= 1) {
    if (hours >= RANK_LEVELS[i].minHours) return RANK_LEVELS[i];
  }
  return RANK_LEVELS[0] ?? null;
}

/** Map sang enum `Rank` của Prisma */
export function toRankEnum(totalHours: number): RankTierId | 'UNRANKED' {
  return getRankLevel(totalHours)?.tierId ?? 'UNRANKED';
}

// ------------------------------------------------------------
// CORE: tiến độ
// ------------------------------------------------------------

export interface RankProgress {
  totalHours: number;
  current: RankLevel | null;
  next: RankLevel | null;
  /** Giờ đã tích luỹ trong level hiện tại */
  hoursIntoLevel: number;
  /** Tổng giờ của level hiện tại */
  hoursInLevel: number;
  /** 0..100 — dùng trực tiếp cho <Progress value={...} /> */
  percent: number;
  /** Giờ còn thiếu để lên level kế tiếp */
  hoursToNext: number;
  /** Đang ở vùng 600h–1000h chưa có tier định nghĩa */
  inUndefinedGap: boolean;
  /** Đã chạm cấp cao nhất đo được bằng giờ */
  isMaxLevel: boolean;
}

export function getRankProgress(totalHours: number): RankProgress {
  const hours = clampHours(totalHours);
  const current = getRankLevel(hours);

  // --- UNRANKED: đếm tiến độ tới Vàng IV ---
  if (!current) {
    const first = RANK_LEVELS[0];
    return {
      totalHours: hours,
      current: null,
      next: first,
      hoursIntoLevel: hours,
      hoursInLevel: first.minHours,
      percent: pct(hours, first.minHours),
      hoursToNext: round1(first.minHours - hours),
      inUndefinedGap: false,
      isMaxLevel: false,
    };
  }

  const idx = RANK_LEVELS.indexOf(current);
  const rawNext = RANK_LEVELS[idx + 1] ?? null;
  const levelSpan = current.maxHours - current.minHours;

  const inUndefinedGap =
    rawNext !== null &&
    hours >= current.maxHours &&
    hours < rawNext.minHours;

  const hoursIntoLevel = inUndefinedGap
    ? levelSpan
    : Math.min(Math.max(0, hours - current.minHours), levelSpan);

  const percent = inUndefinedGap ? 100 : pct(hoursIntoLevel, levelSpan);
  const hoursToNext = rawNext ? round1(Math.max(0, rawNext.minHours - hours)) : 0;

  return {
    totalHours: hours,
    current,
    next: rawNext,
    hoursIntoLevel: round1(hoursIntoLevel),
    hoursInLevel: round1(levelSpan),
    percent: Math.round(percent * 10) / 10,
    hoursToNext,
    inUndefinedGap,
    isMaxLevel: rawNext === null,
  };
}

// ------------------------------------------------------------
// CORE: Thách Đấu (Top 50 server)
// ------------------------------------------------------------

export interface LeaderboardEntry {
  userId: string;
  validHours: number;
}

export interface ThachDauResult {
  isThachDau: boolean;
  /** Vị trí 1-based, null nếu không nằm trong top */
  position: number | null;
  /** Giờ của người ở vị trí thứ 50 (ngưỡng vào top) */
  cutoffHours: number | null;
  /** Giờ cần thêm để lọt top (0 nếu đã trong top) */
  hoursToQualify: number;
  topEntries: LeaderboardEntry[];
}

/**
 * Xác định user có thuộc Thách Đấu không.
 * @param entries  Toàn bộ user hợp lệ (không banned) kèm tổng giờ học hợp lệ
 */
export function resolveThachDau(
  userId: string,
  entries: readonly LeaderboardEntry[],
  topN: number = THACH_DAU_TOP_N,
): ThachDauResult {
  const sorted = [...entries]
    .filter((e) => Number.isFinite(e.validHours) && e.validHours > 0)
    .sort((a, b) => b.validHours - a.validHours || a.userId.localeCompare(b.userId));

  const topEntries = sorted.slice(0, topN);
  const index = topEntries.findIndex((e) => e.userId === userId);
  const cutoff = sorted.length >= topN ? sorted[topN - 1].validHours : null;
  const myHours = sorted.find((e) => e.userId === userId)?.validHours ?? 0;

  return {
    isThachDau: index !== -1,
    position: index === -1 ? null : index + 1,
    cutoffHours: cutoff,
    hoursToQualify:
      index !== -1 || cutoff === null ? 0 : round1(Math.max(0, cutoff - myHours + 0.1)),
    topEntries,
  };
}

/**
 * Rank cuối cùng để hiển thị: Thách Đấu > rank theo giờ.
 */
export function resolveDisplayRank(
  totalHours: number,
  thachDau?: ThachDauResult,
): { tierId: RankTierId | 'UNRANKED'; level: RankLevel | null; isThachDau: boolean } {
  if (thachDau?.isThachDau) {
    return { tierId: 'THACH_DAU', level: null, isThachDau: true };
  }
  const level = getRankLevel(totalHours);
  return { tierId: level?.tierId ?? 'UNRANKED', level, isThachDau: false };
}

// ------------------------------------------------------------
// CORE: Rank Decay
// ------------------------------------------------------------

export const RANK_DECAY = {
  /** Học tối thiểu 5h/tuần */
  minWeeklyHours: 5,
  /** Chỉ áp dụng từ Kim Cương trở lên */
  appliesFromTier: 'DIAMOND' as RankTierId,
  /** Trừ 2% tổng giờ cho mỗi tuần không đạt */
  percentPerInactiveWeek: 0.02,
  /** Tối đa trừ 10% mỗi chu kỳ cron */
  maxPercentPerCycle: 0.1,
} as const;

const DECAY_TIER_ORDER: RankTierId[] = [
  'GOLD',
  'PLATINUM',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
];

export function isDecayEligible(tierId: RankTierId): boolean {
  const from = DECAY_TIER_ORDER.indexOf(RANK_DECAY.appliesFromTier);
  const idx = DECAY_TIER_ORDER.indexOf(tierId);
  return idx !== -1 && idx >= from;
}

export interface DecayInput {
  tierId: RankTierId;
  totalHours: number;
  /** Tổng giờ học hợp lệ trong tuần vừa qua */
  weeklyHours: number;
  /** Số tuần liên tiếp không đạt minWeeklyHours */
  inactiveWeeks: number;
  /** Pro: Rank Decay Shield còn hiệu lực */
  hasShield?: boolean;
}

export interface DecayResult {
  applied: boolean;
  hoursLost: number;
  nextTotalHours: number;
  nextRank: RankTierId | 'UNRANKED';
  reason?: 'BELOW_TIER' | 'SHIELD_ACTIVE' | 'WEEKLY_OK';
}

export function computeRankDecay(input: DecayInput): DecayResult {
  const { tierId, totalHours, weeklyHours, inactiveWeeks, hasShield } = input;

  const unchanged = (reason: DecayResult['reason']): DecayResult => ({
    applied: false,
    hoursLost: 0,
    nextTotalHours: round1(totalHours),
    nextRank: toRankEnum(totalHours),
    reason,
  });

  if (hasShield) return unchanged('SHIELD_ACTIVE');
  if (!isDecayEligible(tierId)) return unchanged('BELOW_TIER');
  if (weeklyHours >= RANK_DECAY.minWeeklyHours) return unchanged('WEEKLY_OK');
  if (inactiveWeeks <= 0) return unchanged('WEEKLY_OK');

  const rawPercent = RANK_DECAY.percentPerInactiveWeek * inactiveWeeks;
  const percent = Math.min(rawPercent, RANK_DECAY.maxPercentPerCycle);
  const hoursLost = round1(totalHours * percent);
  const nextTotalHours = round1(Math.max(0, totalHours - hoursLost));

  return {
    applied: true,
    hoursLost,
    nextTotalHours,
    nextRank: toRankEnum(nextTotalHours),
  };
}

/** Giờ học hợp lệ còn được ghi nhận hôm nay */
export function remainingDailyQuota(
  secondsStudiedToday: number,
  capHours: number = DAILY_VALID_HOURS_CAP,
): number {
  return Math.max(0, capHours * 3600 - secondsStudiedToday);
}