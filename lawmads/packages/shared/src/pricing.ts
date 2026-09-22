/** Plans, SKUs and the quote engine. Prices in USD cents to avoid float drift. */
export type Sku =
  | 'plan_free' | 'plan_pro_monthly' | 'plan_pro_annual' | 'plan_student_monthly' | 'addon_editor_student'
  | 'certificate' | 'diploma' | 'career_certificate' | 'course_certificate'
  | 'badge_exam' | 'badge_bundle' | 'ai_track_pass' | 'enterprise_seat'
  | 'db_research' | 'db_professional' | 'db_api' | 'editor_professional' | 'editor_firm'
  | 'ai_cfb' | 'ai_cm' | 'ai_aai' | 'shop_tee_classic' | 'shop_tee_community';

export interface SkuDef {
  sku: Sku; name: string; cents: number; anchorCents?: number; billing: 'once' | 'monthly' | 'annual' | 'per_seat_monthly';
  installments?: { count: number; eachCents: number };
  promoEligible: boolean; studentEligible: boolean;
}

export const SKUS: Record<Sku, SkuDef> = {
  plan_free: { sku: 'plan_free', name: 'Lawmad Free', cents: 0, billing: 'monthly', promoEligible: false, studentEligible: false },
  plan_pro_monthly: { sku: 'plan_pro_monthly', name: 'Lawmad Pro (monthly)', cents: 2900, billing: 'monthly', promoEligible: false, studentEligible: true },
  plan_pro_annual: { sku: 'plan_pro_annual', name: 'Lawmad Pro (annual)', cents: 22800, billing: 'annual', promoEligible: true, studentEligible: true },
  plan_student_monthly: { sku: 'plan_student_monthly', name: 'Student Monthly', cents: 1300, anchorCents: 1900, billing: 'monthly', promoEligible: false, studentEligible: false },
  addon_editor_student: { sku: 'addon_editor_student', name: 'Intelligent Editor add-on', cents: 900, billing: 'monthly', promoEligible: false, studentEligible: false },
  course_certificate: { sku: 'course_certificate', name: 'Course Certificate', cents: 12000, billing: 'once', promoEligible: true, studentEligible: true },
  certificate: { sku: 'certificate', name: 'Professional Certificate®', cents: 39000, billing: 'once', installments: { count: 3, eachCents: 14000 }, promoEligible: true, studentEligible: true },
  diploma: { sku: 'diploma', name: 'Lawmads Diploma', cents: 89000, billing: 'once', installments: { count: 6, eachCents: 16000 }, promoEligible: true, studentEligible: true },
  career_certificate: { sku: 'career_certificate', name: 'Career Certificate', cents: 149000, billing: 'once', installments: { count: 6, eachCents: 27000 }, promoEligible: true, studentEligible: true },
  badge_exam: { sku: 'badge_exam', name: 'Jurisdiction badge exam', cents: 7900, billing: 'once', promoEligible: false, studentEligible: true },
  badge_bundle: { sku: 'badge_bundle', name: 'All nine badge exams', cents: 29900, anchorCents: 71100, billing: 'once', promoEligible: false, studentEligible: true },
  ai_track_pass: { sku: 'ai_track_pass', name: 'AI Track Pass', cents: 169000, anchorCents: 208000, billing: 'once', promoEligible: false, studentEligible: false },
  ai_cfb: { sku: 'ai_cfb', name: 'Claude for Beginners CFB®', cents: 12000, billing: 'once', promoEligible: true, studentEligible: true },
  ai_cm: { sku: 'ai_cm', name: 'Claude Master CM®', cents: 49000, billing: 'once', promoEligible: true, studentEligible: true },
  ai_aai: { sku: 'ai_aai', name: 'Agentic AI AAI®', cents: 49000, billing: 'once', promoEligible: true, studentEligible: true },
  enterprise_seat: { sku: 'enterprise_seat', name: 'Firms & Enterprise seat', cents: 5900, billing: 'per_seat_monthly', promoEligible: false, studentEligible: false },
  db_research: { sku: 'db_research', name: 'Law Database — Research', cents: 1200, billing: 'monthly', promoEligible: false, studentEligible: false },
  db_professional: { sku: 'db_professional', name: 'Law Database — Professional', cents: 2900, billing: 'monthly', promoEligible: false, studentEligible: false },
  db_api: { sku: 'db_api', name: 'Law Database — API', cents: 29900, billing: 'monthly', promoEligible: false, studentEligible: false },
  editor_professional: { sku: 'editor_professional', name: 'Editor — Professional seat', cents: 2400, billing: 'per_seat_monthly', promoEligible: false, studentEligible: false },
  editor_firm: { sku: 'editor_firm', name: 'Editor — Firm seat', cents: 3900, billing: 'per_seat_monthly', promoEligible: false, studentEligible: false },
  shop_tee_classic: { sku: 'shop_tee_classic', name: 'The Logo Tee', cents: 2500, billing: 'once', promoEligible: false, studentEligible: false },
  shop_tee_community: { sku: 'shop_tee_community', name: 'Community Tee', cents: 2900, billing: 'once', promoEligible: false, studentEligible: false }
};

export const ENTERPRISE_MIN_SEATS = 10;
export const STUDENT_DISCOUNT = 0.30;
export const REFUND_WINDOW_DAYS = 14;

export interface PromoDef { code: string; percentOff: number; appliesTo: readonly Sku[] | 'all'; maxRedemptions?: number; expiresAt?: string }
export const FOUNDING_PROMO: PromoDef = { code: 'DELTA30', percentOff: 30, appliesTo: 'all', maxRedemptions: 500 };

export interface QuoteInput { sku: Sku; quantity?: number; promo?: PromoDef | null; isStudent?: boolean; installments?: boolean; regionMultiplier?: number }
export interface QuoteLine { label: string; cents: number }
export interface Quote {
  sku: Sku; name: string; listCents: number; lines: QuoteLine[]; totalCents: number; dueTodayCents: number;
  discount: { kind: 'promo' | 'student' | null; code?: string; cents: number };
  installments: { count: number; eachCents: number } | null; billing: SkuDef['billing']; quantity: number;
}

/** Discounts never stack: the better of promo vs student applies. Installments carry the listed premium. */
export function quote(input: QuoteInput): Quote {
  const def = SKUS[input.sku];
  const qty = Math.max(1, input.quantity ?? 1);
  if (def.billing === 'per_seat_monthly' && input.sku === 'enterprise_seat' && qty < ENTERPRISE_MIN_SEATS) {
    throw new Error(`Enterprise requires at least ${ENTERPRISE_MIN_SEATS} seats`);
  }
  const mult = input.regionMultiplier ?? 1;
  const list = Math.round(def.cents * mult) * qty;
  const lines: QuoteLine[] = [{ label: `${def.name}${qty > 1 ? ` × ${qty}` : ''}`, cents: list }];

  let promoCents = 0;
  if (input.promo && def.promoEligible && (input.promo.appliesTo === 'all' || input.promo.appliesTo.includes(def.sku))) {
    promoCents = Math.round(list * (input.promo.percentOff / 100));
  }
  const studentCents = input.isStudent && def.studentEligible ? Math.round(list * STUDENT_DISCOUNT) : 0;
  let discount: Quote['discount'] = { kind: null, cents: 0 };
  if (promoCents >= studentCents && promoCents > 0) discount = { kind: 'promo', code: input.promo!.code, cents: promoCents };
  else if (studentCents > 0) discount = { kind: 'student', cents: studentCents };
  if (discount.cents > 0) lines.push({ label: discount.kind === 'promo' ? `Founding Lawmads (${discount.code})` : 'Verified student rate', cents: -discount.cents });

  const afterDiscount = list - discount.cents;
  let installments: Quote['installments'] = null;
  let total = afterDiscount;
  let dueToday = afterDiscount;
  if (input.installments && def.installments) {
    const premium = def.installments.count * def.installments.eachCents - def.cents; // listed premium on the undiscounted price
    const each = Math.ceil((afterDiscount + Math.round(premium * mult)) / def.installments.count);
    installments = { count: def.installments.count, eachCents: each };
    total = each * def.installments.count;
    dueToday = each;
    lines.push({ label: `Installment plan (${def.installments.count} payments)`, cents: total - afterDiscount });
  }
  return { sku: def.sku, name: def.name, listCents: list, lines, totalCents: total, dueTodayCents: dueToday, discount, installments, billing: def.billing, quantity: qty };
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? '−' : '';
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: abs % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
