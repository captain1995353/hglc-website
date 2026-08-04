export type CourseTrack = "korean" | "english";
export type DeliveryMode = "online" | "offline" | "hybrid";
export type EnrollmentStatus =
  | "pending_payment"
  | "active"
  | "completed"
  | "cancelled";
export type PaymentProvider = "sslcommerz" | "stripe" | "manual";
export type PaymentStatus =
  | "initiated"
  | "pending_review"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type Course = {
  id: string;
  slug: string;
  track: CourseTrack;
  title_en: string;
  title_ko: string;
  summary_en: string;
  summary_ko: string;
  description_en: string;
  description_ko: string;
  level: string;
  outcomes_en: string[];
  outcomes_ko: string[];
  duration_weeks: number;
  hours_per_week: number;
  price_bdt: number;
  price_usd: number;
  sort_order: number;
  is_active: boolean;
};

export type Batch = {
  id: string;
  course_id: string;
  name: string;
  mode: DeliveryMode;
  start_date: string;
  end_date: string | null;
  schedule_text: string;
  room_or_link: string;
  seats_total: number;
  seats_taken: number;
  is_open: boolean;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  batch_id: string | null;
  status: EnrollmentStatus;
  note: string;
  created_at: string;
};

export type Payment = {
  id: string;
  enrollment_id: string;
  user_id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  tran_id: string;
  provider_ref: string | null;
  sender_number: string | null;
  meta: Record<string, unknown>;
  verified_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
};

/** Course row joined with its open batches — what the course pages render. */
export type CourseWithBatches = Course & { batches: Batch[] };
