// Core domain types matching backend models

export type UserRole = 'STUDENT' | 'CLINIC_STAFF' | 'ADVISER' | 'ADMIN';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export type ServiceCode = 'CLINIC' | 'ADVISING';

export interface ServiceType {
  id: number;
  code: ServiceCode;
  display_name: string;
  description: string | null;
  active: boolean;
  default_duration_minutes: number;
  cancellation_cutoff_hours: number;
  creates_queue_entry: boolean;
  allowed_roles: string[];
}

export interface Provider {
  id: number;
  user_id: number | null;
  display_name: string;
  service_type_id: number;
  service_type_code: ServiceCode | null;
  service_type_name: string | null;
  location_label: string | null;
  is_active: boolean;
}

export interface AvailabilitySlot {
  id: number;
  provider_id: number;
  provider_name: string | null;
  service_type_id: number;
  service_type_code: ServiceCode | null;
  start_at: string; // ISO8601
  end_at: string;   // ISO8601
  state: 'AVAILABLE' | 'BLOCKED';
  is_booked: boolean;
}

export type AppointmentStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type QueueStatus = 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'SKIPPED';

export interface QueueEntry {
  id: number;
  appointment_id: number;
  service_date: string;
  ticket_number: string;
  status: QueueStatus;
  sequence: number;
  ahead?: number;
  patient_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string; // public UUID
  internal_id: number;
  user_id: number;
  user_name: string | null;
  provider_id: number;
  provider_name: string | null;
  service_type_id: number;
  service_type_code: ServiceCode | null;
  service_type_name: string | null;
  slot_id: number;
  start_at: string | null;
  end_at: string | null;
  status: AppointmentStatus;
  notes: string | null;
  outcome_notes: string | null;
  cancellation_reason: string | null;
  queue_entry: QueueEntry | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  read_at: string | null;
  appointment_id: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: number;
  actor_user_id: number | null;
  actor_name: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  outcome: string;
  safe_metadata: Record<string, unknown>;
  correlation_id: string | null;
  created_at: string;
}

export interface RequestTraceStep {
  id: number;
  correlation_id: string;
  sequence: number;
  service_name: string;
  operation: string;
  outcome: string;
  duration_ms: number | null;
  safe_metadata: Record<string, unknown>;
  created_at: string;
}

export interface ServiceMetadata {
  id: number;
  service_name: string;
  description: string | null;
  version: string;
  base_path: string | null;
  owning_module: string | null;
  health_check_description: string | null;
  active: boolean;
  health_status?: string;
  last_checked?: string;
  updated_at: string;
}

// API response shapes
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  correlation_id: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

// Form shapes
export interface LoginForm {
  email: string;
  password: string;
}

export interface BookingForm {
  service_type: ServiceCode;
  provider_id: number;
  slot_id: number;
  notes?: string;
  request_id?: string;
}
