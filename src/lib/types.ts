export type Role = "admin" | "client";
export type AdminScope = "full" | "clients";

export type ClientStatus = "pending" | "active" | "inactive" | "suspended";

export type PlanKind = "nutrition" | "workout";

export type FileCategory =
  | "nutrition"
  | "workout"
  | "progress"
  | "exercise"
  | "supplements"
  | "other";

export type NotificationType =
  | "nutrition"
  | "workout"
  | "file"
  | "chat"
  | "account"
  | "announcement";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  email: string;
  role: Role;
  admin_scope: AdminScope | null;
  display_name: string | null;
  created_at: string;
}

export interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  country: string | null;
  goal: string | null;
  avatar_path: string | null;
  status: ClientStatus;
  coach_notes: string | null;
  subscription_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRow extends ClientProfile {
  email: string;
  user_created_at: string;
  onboarding_submitted_at: string | null;
  client_manager_names: string | null;
  client_manager_user_id: string | null;
  subscription_due_at: string | null;
  days_until_subscription_due: number | null;
}

export interface ClientOnboarding {
  client_id: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  experience: "beginner" | "some" | "experienced";
  goal: string;
  training_days: number;
  training_location: "gym" | "home" | "other";
  health_flag: "yes" | "no";
  health_notes: string;
  dietary_notes: string;
  photo_front: string;
  photo_side: string;
  photo_back: string;
  photo_consent_at: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface MealItem {
  id: string;
  meal_id: string;
  food_name: string;
  quantity: string;
  sort_order: number;
}

export interface NutritionMeal {
  id: string;
  plan_id: string;
  meal_number: number;
  title: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  items: MealItem[];
}

export interface NutritionPlan {
  id: string;
  title: string;
  description: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  notes: string | null;
  is_template: 0 | 1;
  source_plan_id: string | null;
  created_at: string;
  updated_at: string;
  meals?: NutritionMeal[];
}

export interface Exercise {
  id: string;
  day_id: string;
  name: string;
  sets: string | null;
  reps: string | null;
  rest_seconds: number | null;
  video_url: string | null;
  video_stored_name: string | null;
  video_original_name: string | null;
  video_mime_type: string | null;
  video_size_bytes: number | null;
  image_path: string | null;
  instructions: string | null;
  coach_notes: string | null;
  sort_order: number;
}

export interface WorkoutDay {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  focus: string | null;
  notes: string | null;
  sort_order: number;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  title: string;
  description: string | null;
  split_type: string | null;
  notes: string | null;
  is_template: 0 | 1;
  source_plan_id: string | null;
  created_at: string;
  updated_at: string;
  days?: WorkoutDay[];
}

export interface Assignment {
  id: string;
  client_id: string;
  kind: PlanKind;
  plan_id: string;
  assigned_at: string;
  is_active: 0 | 1;
}

export interface FileRow {
  id: string;
  title: string;
  description: string | null;
  category: FileCategory;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  link: string | null;
  is_read: 0 | 1;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_active: 0 | 1;
  created_by: string;
  created_at: string;
}

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  nutrition: "خطط التغذية",
  workout: "خطط التمارين",
  progress: "صور التقدم",
  exercise: "فيديوهات التمارين",
  supplements: "المكملات",
  other: "ملفات أخرى",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  pending: "قيد المراجعة",
  active: "نشط",
  inactive: "غير نشط",
  suspended: "موقوف",
};
