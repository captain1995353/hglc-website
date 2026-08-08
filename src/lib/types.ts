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

// ---------------------------------------------------------------------
// Classroom management
// ---------------------------------------------------------------------

export type AttendanceState = "present" | "absent" | "late" | "excused";
export type SubmissionState = "submitted" | "graded" | "returned";

export type AdmissionWindow = {
  id: string;
  title: string;
  note: string;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
  created_at: string;
};

export type ClassGroup = {
  id: string;
  batch_id: string;
  name: string;
  note: string;
  created_at: string;
};

export type AttendanceSession = {
  id: string;
  batch_id: string;
  held_on: string;
  topic: string;
  note: string;
  created_at: string;
};

export type Assignment = {
  id: string;
  batch_id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  max_score: number;
  is_published: boolean;
  created_at: string;
};

export type AssignmentSubmission = {
  id: string;
  assignment_id: string;
  enrollment_id: string;
  body: string;
  link: string;
  state: SubmissionState;
  score: number | null;
  feedback: string;
  submitted_at: string;
  graded_at: string | null;
};

export type BatchReport = {
  id: string;
  batch_id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  summary: string;
  stats: Record<string, unknown>;
  created_at: string;
};

/** Shape returned by the batch_stats() database function. */
export type BatchStats = {
  active_students: number;
  sessions_held: number;
  attendance_rate: number | null;
  assignments_published: number;
  submissions_received: number;
  submissions_graded: number;
  average_score: number | null;
};

/** Shape returned by batch_student_stats(). */
export type BatchStudentStat = {
  enrollment_id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  sessions_marked: number;
  present_count: number;
  attendance_rate: number | null;
  submitted_count: number;
  average_score: number | null;
};
