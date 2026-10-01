// GENERADO por scripts/sync-shared.mjs desde "Car Wash 505/src/types/database.ts". No editar a mano.
/**
 * Tipos de filas de la base de datos (espejo de supabase/migrations).
 * Las fechas llegan como string ISO.
 */
import type { OpeningHours } from "./site";

export type ContentStatus = "draft" | "published" | "archived";
/** `operator` = colaborador de la app móvil: existe en `profiles` pero no tiene acceso al panel web. */
export type UserRole = "super_admin" | "editor" | "viewer" | "operator" | "lobby";
export type ProfileStatus = "active" | "disabled";

/** owner_staff() (migración 23): personal del local que administra el dueño desde la app. */
export type StaffMember = {
  id: string;
  username: string;
  email: string;
  /** true = cuenta creada con usuario y contraseña (correo interno que no recibe mensajes). */
  internal: boolean;
  full_name: string | null;
  role: "operator" | "lobby";
  status: ProfileStatus;
  created_at: string;
  last_sign_in_at: string | null;
};

export type ServiceCategory = "maintenance" | "interior" | "paint_correction" | "ceramic" | "chassis" | "engine" | "other";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type ServiceRow = {
  id: string;
  slug: string;
  category: ServiceCategory;
  name_es: string;
  name_en: string;
  description_es: string;
  description_en: string;
  benefits_es: string[];
  benefits_en: string[];
  includes_es: string[];
  includes_en: string[];
  excludes_es: string[];
  excludes_en: string[];
  price_car: number | null;
  price_suv: number | null;
  /** Camioneta grande. Sin valor = precio a confirmar para ese tamaño. */
  price_large: number | null;
  /** Moneda de los precios de este servicio (USD o NIO). */
  currency: string;
  requires_evaluation: boolean;
  duration_text_es: string | null;
  duration_text_en: string | null;
  image_path: string | null;
  image_alt_es: string | null;
  image_alt_en: string | null;
  video_path: string | null;
  cta_label_es: string | null;
  cta_label_en: string | null;
  featured: boolean;
  sort_order: number;
  status: ContentStatus;
  /** Reservas en la app (internos: no se publican en el sitio ni en la API pública). */
  bay_kind: BayKind | null;
  duration_minutes_car: number | null;
  duration_minutes_suv: number | null;
  duration_minutes_large: number | null;
  bookable: boolean;
  /** Migración 25: 'main' = servicio principal; 'addon' = adicional (motor, chasis…). */
  booking_role?: "main" | "addon";
  /** Principales con los que se puede sumar el adicional (vacío = todos). */
  addon_for?: string[];
  /** Horas de garantía por lluvia desde que el vehículo sale finalizado (Deluxe: 24). */
  rain_warranty_hours: number | null;
  created_at: string;
  updated_at: string;
};

export type PromotionRow = {
  id: string;
  slug: string;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  benefit_es: string;
  benefit_en: string;
  conditions_es: string | null;
  conditions_en: string | null;
  image_path: string | null;
  image_alt_es: string | null;
  image_alt_en: string | null;
  cta_label_es: string | null;
  cta_label_en: string | null;
  cta_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  show_banner: boolean;
  show_home: boolean;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
};

export type CaseStudyRow = {
  id: string;
  slug: string;
  title_es: string;
  title_en: string;
  vehicle: string | null;
  need_es: string;
  need_en: string;
  process_es: string;
  process_en: string;
  result_es: string;
  result_en: string;
  service_id: string | null;
  cover_path: string | null;
  cover_alt_es: string | null;
  cover_alt_en: string | null;
  video_path: string | null;
  original_url: string | null;
  featured: boolean;
  sort_order: number;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseMediaRow = {
  id: string;
  case_study_id: string;
  media_type: "image" | "video";
  file_path: string;
  alt_es: string | null;
  alt_en: string | null;
  sort_order: number;
  created_at: string;
};

export type FaqRow = {
  id: string;
  question_es: string;
  answer_es: string;
  question_en: string;
  answer_en: string;
  category: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
};

export type BusinessSettingsRow = {
  id: number;
  business_name: string;
  address_es: string;
  address_en: string;
  timezone: string;
  whatsapp: string;
  waze_url: string | null;
  google_maps_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  opening_hours: OpeningHours;
  currency: string;
  indexing_enabled: boolean;
  /** Parámetros operativos de reservas de la app (migración 8). */
  booking_slot_minutes: number;
  booking_horizon_days: number;
  booking_min_lead_minutes: number;
  booking_max_active: number;
  /** Confirmación y tolerancia (migración 9). */
  reminder_minutes: number;
  confirm_window_minutes: number;
  no_show_grace_minutes: number;
  updated_at: string;
};

export type VipProgramRow = {
  id: number;
  enabled: boolean;
  title_es: string;
  title_en: string;
  description_es: string | null;
  description_en: string | null;
  rules_es: string | null;
  rules_en: string | null;
  benefit_es: string | null;
  benefit_en: string | null;
  steps_es: string[];
  steps_en: string[];
  conditions_es: string | null;
  conditions_en: string | null;
  participating_service_ids: string[];
  required_visits: number | null;
  image_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
};

export type NytroxSettingsRow = {
  id: number;
  enabled: boolean;
  title_es: string;
  title_en: string;
  description_es: string | null;
  description_en: string | null;
  official_url: string | null;
  logo_path: string | null;
  sells_to_public: boolean;
  confirmed_products: string[];
  updated_at: string;
};

export type SeoSettingsRow = {
  id: string;
  page_key: string;
  title_es: string | null;
  title_en: string | null;
  description_es: string | null;
  description_en: string | null;
  og_image_path: string | null;
  updated_at: string;
};

export type LeadRow = {
  id: string;
  reference_code: string;
  name: string;
  whatsapp: string;
  email: string | null;
  vehicle_type: "car" | "suv" | "large" | "other";
  vehicle_details: string | null;
  need: string;
  service_id: string | null;
  message: string | null;
  contact_preference: "whatsapp" | "email" | "any";
  locale: "es" | "en";
  source: string;
  campaign: string | null;
  status: "new" | "contacted" | "quoted" | "confirmed" | "completed" | "discarded";
  consent: boolean;
  internal_notes: string | null;
  idempotency_key: string;
  ip_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaAssetRow = {
  id: string;
  file_path: string;
  storage_bucket: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  checksum_sha256: string;
  alt_es: string | null;
  alt_en: string | null;
  status: "active" | "archived";
  created_by: string | null;
  created_at: string;
};

export type ConversionEventRow = {
  id: string;
  event_type: string;
  pathname: string;
  locale: "es" | "en";
  service_id: string | null;
  promotion_id: string | null;
  source: string | null;
  campaign: string | null;
  anonymous_session_id: string | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// App móvil (migraciones 7 y 8)
// ---------------------------------------------------------------------------

export type VehicleKind = "car" | "suv" | "large" | "other";
export type BayKind = "wash" | "interior" | "detail" | "cabin";

export type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  birthday: string | null;
  locale: "es" | "en";
  preferred_windows: { weekday: number; from: string; to: string }[];
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  status: ProfileStatus;
  /** Código para invitar amigos (migración 10). */
  referral_code: string;
  /** Desde cuándo es VIP (automático según vip_program.required_visits). */
  vip_since: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleRow = {
  id: string;
  customer_id: string;
  kind: VehicleKind;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  plate: string | null;
  nickname: string | null;
  is_default: boolean;
  archived_at: string | null;
  /** Migración 25: foto en el bucket privado vehicle-photos (<cliente>/<vehículo>/<archivo>). */
  photo_path?: string | null;
  created_at: string;
  updated_at: string;
};

export type BayRow = {
  id: string;
  name: string;
  kind: BayKind;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BayClosureRow = {
  id: string;
  bay_kind: BayKind;
  starts_at: string;
  ends_at: string;
  reason: "weather" | "maintenance" | "other";
  note: string | null;
  created_by: string | null;
  created_at: string;
  /** Migración 26: reabrir no borra el cierre (queda el historial). */
  reopened_at?: string | null;
  reopened_by?: string | null;
};

/** Migración 26: Control de calidad y Lista entre En proceso y Entregada (completed). */
export const BOOKING_STATUSES = ["confirmed", "checked_in", "in_progress", "quality_check", "ready", "completed", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Foto del precio al reservar: un cambio de tarifa posterior no altera reservas ya hechas. */
export type PriceAdjustment = { kind: "peak" | "valley" | "weather" | "flash"; label_es: string; label_en: string; pct: number };
export type QuoteAddon = { product_id: string; name_es: string; name_en: string; price: number };

/**
 * Foto del precio guardada en la reserva (lo que calculó el servidor). `amount` = total a pagar (null si requiere
 * evaluación). Los campos del desglose existen desde la F5 (migración 12); las reservas anteriores no los tienen.
 */
export type PriceSnapshot = {
  vehicle_kind: VehicleKind;
  amount: number | null;
  currency: string;
  requires_evaluation: boolean;
  service_name_es: string;
  service_name_en: string;
  base?: number | null;
  adjustments?: PriceAdjustment[];
  adjustment_pct?: number;
  cap_applied?: boolean;
  offer?: { id: string; pct: number; expires_at: string } | null;
  membership?: { plan_code: MembershipCode; name_es: string; name_en: string; pct: number } | null;
  service_amount?: number | null;
  addons?: QuoteAddon[];
  addons_total?: number;
  /** Migración 25: servicios adicionales (precio null = a cotizar), duración total y lavado gratis VIP. */
  services?: QuoteService[];
  services_total?: number;
  duration_minutes?: number;
  vip?: { free_wash: boolean; discount: number } | null;
  /** Total antes del beneficio VIP (null si alguna parte requiere cotización). */
  normal_amount?: number | null;
  /** Suma de lo que sí tiene precio (para mostrar "desde" cuando el total queda a cotizar). */
  partial_amount?: number;
};
export type QuoteService = { service_id: string; name_es: string; name_en: string; price: number | null; duration_minutes: number };

/** Resultado de quote_price(): el mismo cálculo que guardará book_slot. */
export type Quote = Required<PriceSnapshot>;

export type BookingRow = {
  id: string;
  reference_code: string;
  customer_id: string;
  vehicle_id: string;
  service_id: string;
  bay_id: string;
  /** Rango Postgres `[inicio,fin)`; usar `starts_at` para ordenar. */
  slot: string;
  starts_at: string;
  status: BookingStatus;
  assigned_staff_id: string | null;
  checked_in_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  price_snapshot: PriceSnapshot;
  source: "app" | "staff";
  idempotency_key: string;
  /** Respuesta al recordatorio: asistirá, llegará tarde o no respondió (migración 9). */
  attendance: "attending" | "late" | "no_reply" | null;
  attendance_at: string | null;
  reminder_sent_at: string | null;
  /** "Llego en X min": hora estimada de llegada informada por el cliente. */
  eta_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaPhase = "before" | "after" | "damage";

export type BookingMediaRow = {
  id: string;
  booking_id: string;
  phase: MediaPhase;
  /** Ruta en el bucket privado `service-evidence`: bookings/<booking_id>/<fase>/<archivo>. */
  storage_path: string;
  taken_by: string | null;
  /** Migración 26: nota (p. ej. descripción del daño). */
  note?: string | null;
  created_at: string;
};

export type TicketKind = "complaint" | "pre_existing_damage" | "other";
export type TicketStatus = "open" | "in_review" | "resolved" | "closed";

export type SupportTicketRow = {
  id: string;
  customer_id: string;
  booking_id: string | null;
  kind: TicketKind;
  description: string;
  status: TicketStatus;
  resolution: string | null;
  created_at: string;
  updated_at: string;
};

// Fidelización (migración 10)

export type LoyaltyRewardRow = {
  id: string;
  name_es: string;
  name_en: string;
  description_es: string;
  description_en: string;
  cost_points: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type RedemptionStatus = "issued" | "used" | "cancelled";

/** Resumen que devuelve la RPC my_wallet(). */
/** Tarjeta VIP de casillas (my_vip_card / customer_vip_card). La última casilla es el lavado gratis. */
export type VipCardState = {
  enabled: boolean;
  card_slots: number;
  card_number: number;
  /** Lavados pagados marcados en la tarjeta actual (0 … card_slots - 1). La última casilla es el lavado gratis. */
  filled: number;
  /** Migración 25: lavados pagados que se necesitan (card_slots - 1) y los que faltan. */
  paid_required?: number;
  remaining_paid?: number;
  next_is_free: boolean;
  /** El lavado gratis ya está apartado en una reserva activa. */
  free_wash_reserved?: boolean;
  free_washes_earned: number;
  total_stamps: number;
};

export type Wallet = {
  loyalty_enabled: boolean;
  balance: number;
  referral_code: string;
  referred: boolean;
  vip_since: string | null;
  vip_required_visits: number | null;
  vip_visits: number;
  badges: {
    code: string;
    name_es: string;
    name_en: string;
    description_es: string;
    description_en: string;
    earned_at: string | null;
  }[];
  redemptions: { id: string; code: string; reward_name_es: string; reward_name_en: string; cost_points: number; created_at: string }[];
  recent: { delta: number; reason: string; created_at: string }[];
};

/** Lo que ve el personal al escanear el QR de la wallet (resolve_wallet_token). */
export type WalletScan = {
  customer_id: string;
  name: string | null;
  vip_since: string | null;
  balance: number;
  badges: string[];
  bookings: { id: string; reference_code: string; status: BookingStatus; starts_at: string; service_name_es: string; service_name_en: string }[];
  redemptions: { id: string; code: string; reward_name_es: string; reward_name_en: string }[];
  /** Desde la migración 11. */
  membership: ActiveMembership | null;
  gift_cards: GiftCardSummary[];
  orders: PendingOrder[];
};

/** staff_scan (migración 22): QR de la app, de Apple Wallet o de Google Wallet → sesión de escaneo de 5 min. */
export type StaffScan = WalletScan & {
  scan_id: string;
  source: "app" | "apple" | "google";
  vip_card: VipCardState;
  vehicles: { id: string; kind: VehicleKind; make: string | null; model: string | null; plate: string | null; nickname: string | null }[];
  walk_in_services: { id: string; name_es: string; name_en: string; category: string }[];
};
export type StaffScanError = { error: "invalid" | "expired" | "revoked" | "inactive" };

/** staff_complete_wash / staff_walk_in vía la Edge Function wallet-pass (incluye la actualización del pase). */
export type StaffWashResult = {
  booking_id: string;
  customer_id: string;
  vip_card: VipCardState;
  wallet: { updated: number; error: string | null };
};

// Pagos en el local, membresías, gift cards y ruleta (migración 11)

export type MembershipCode = "free" | "gold" | "platinum";

export type PendingOrder = {
  id: string;
  code: string;
  kind: "membership" | "gift_card";
  plan_code: MembershipCode | null;
  amount: number;
  currency: string;
  created_at: string;
};

export type ActiveMembership = { plan_code: MembershipCode; name_es: string; name_en: string; ends_at: string };
export type GiftCardSummary = { id: string; balance: number; initial_amount: number; currency: string; expires_at: string | null };

/** Resumen que devuelve la RPC my_commerce(). */
export type Commerce = {
  payments_enabled: boolean;
  gift_cards_enabled: boolean;
  gift_card_amounts: number[];
  gift_card_currency: string;
  spin_enabled: boolean;
  spin_window_days: number;
  plans: {
    code: MembershipCode;
    name_es: string;
    name_en: string;
    price: number | null;
    currency: string;
    period_days: number;
    benefits_es: string[];
    benefits_en: string[];
    purchasable: boolean;
  }[];
  membership: ActiveMembership | null;
  gift_cards: GiftCardSummary[];
  orders: PendingOrder[];
};

export type SpinResult = { label_es: string; label_en: string; points: number };

export type TicketMediaRow = {
  id: string;
  ticket_id: string;
  /** tickets/<ticket_id>/<archivo> en `service-evidence`. */
  storage_path: string;
  created_at: string;
};

/** Extra ofrecido al reservar (booking_extras). `recommended` = ese vehículo ya lo llevó en un servicio completado. */
/** Servicio adicional que se puede sumar a un principal (booking_addon_services, migración 25). */
export type AddonService = {
  id: string;
  name_es: string;
  name_en: string;
  description_es: string | null;
  description_en: string | null;
  price: number | null;
  currency: string;
  duration_minutes: number;
};
export type BookingExtra = {
  id: string;
  name_es: string;
  name_en: string;
  description_es: string | null;
  description_en: string | null;
  price: number;
  currency: string;
  recommended: boolean;
};

export type FlashPromotion = {
  id: string;
  label_es: string;
  label_en: string;
  pct: number;
  starts_at: string;
  ends_at: string;
  /** Vacío = aplica a todos los servicios reservables. */
  services: { id: string; name_es: string; name_en: string }[];
};
export type CustomerOffer = { id: string; pct: number; expires_at: string };
export type Promotions = { flash: FlashPromotion[]; offers: CustomerOffer[] };

export type ChallengeProgress = {
  id: string;
  name_es: string;
  name_en: string;
  target: number;
  progress: number;
  reward_points: number;
  starts_at: string;
  ends_at: string;
  completed: boolean;
};
export type Engagement = { marketing_consent: boolean; birthday: string | null; challenges: ChallengeProgress[] };

// ---------------------------------------------------------------------------
// F6 (migración 14): operación del propietario
// ---------------------------------------------------------------------------
export type RiskFactorCode = "past_no_shows" | "first_visit" | "no_reply" | "late" | "long_lead" | "rain";
export type RiskFactor = { code: RiskFactorCode; value: number | null; points: number };
export type NoShowRisk = {
  booking_id: string;
  reference_code: string;
  customer_name: string | null;
  slot_start: string;
  attendance: "attending" | "late" | "no_reply" | null;
  score: number;
  factors: RiskFactor[];
};
export type LowStockItem = { id: string; name: string; unit: InventoryUnit; stock: number; min_stock: number };
export type OwnerDashboard = {
  summary: {
    day: string;
    counts: Partial<Record<BookingStatus, number>>;
    booked_minutes: number;
    capacity_minutes: number;
    occupancy_pct: number | null;
    /** Desde la migración 26 = pagos válidos del día (igual que collected_revenue). */
    completed_revenue: { currency: string; amount: number }[];
    collected_revenue?: { currency: string; amount: number }[];
    expected_revenue?: { amounts: { currency: string; amount: number }[]; pending_quotes: number };
    /** Entregadas hoy con cobro pendiente. */
    pending_payment?: number;
    by_kind?: { kind: BayKind; bays: number; booked_minutes: number; capacity_minutes: number; occupancy_pct: number | null }[];
    active_closures: number;
  };
  vip_present: { booking_id: string; customer_name: string | null; status: BookingStatus; slot_start: string }[];
  risk_threshold: number;
  risk: NoShowRisk[];
  low_stock: LowStockItem[];
  tasks: { overdue: number; due_today: number };
  revenue_7d: { currency: string; amount: number }[];
  active_restrictions: number;
};

export type InventoryUnit = "unit" | "ml" | "l" | "g" | "kg";
/** inventory_status(): lo que ve el personal (sin costos). */
export type InventoryStatusItem = { id: string; name: string; unit: InventoryUnit; stock: number; min_stock: number | null; low: boolean };

export type MaintenanceTask = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string;
  recurrence: "daily" | "weekly" | "monthly" | null;
  status: "open" | "done";
  done_at: string | null;
  assignee_id?: string | null;
  assignee_name: string | null;
  mine: boolean | null;
  booking_id?: string | null;
  booking_reference?: string | null;
};

/** Migración 26: cobros por reserva. */
export type PaymentMethod = "cash" | "transfer" | "card";
export type PaymentStatus = "pending_quote" | "unpaid" | "partial" | "paid";
export type PaymentSummary = {
  amount_due: number | null;
  paid: number;
  currency: string;
  status: PaymentStatus;
  payments?: { id: string; amount: number; method: PaymentMethod; status: "valid" | "void"; created_at: string; void_reason: string | null }[];
};
export type AssignableStaff = { id: string; name: string; role: "operator" | "lobby" | "super_admin" };
export type TicketEvent = { id: number; ticket_id: string; from_status: TicketStatus | null; to_status: TicketStatus; resolution: string | null; created_at: string };

/** Respuesta de la Edge Function owner-report: enlaces firmados de corta duración. */
export type ReportLinks = { pdf_url: string; csv_url: string; xlsx_url?: string; expires_in: number };
