// Appointment types and interfaces

export interface AppointmentFormData {
  clientId: string;
  professionalId: string;
  serviceId: string;
  date: Date;
  startTime: string;
  duration: number;
  price: number;
  notes: string;
  status: AppointmentStatus;
  sendNotification: boolean;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  barbershopId: string;
  clientId: string | null;
  professionalId: string | null;
  serviceId: string | null;
  bookingDate: string;
  bookingTime: string;
  price: number | null;
  notes: string | null;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingAppointment?: {
    id: string;
    startTime: string;
    endTime: string;
    clientName?: string;
    serviceName?: string;
  };
  suggestedSlots?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface Client {
  id: string;
  userId: string;
  name: string | null;
  phone: string | null;
  email?: string | null;
}

export interface Professional {
  id: string;
  name: string;
  photoUrl: string | null;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface ExistingBooking {
  id: string;
  booking_time: string;
  booking_date: string;
  status: string;
  service?: {
    duration_minutes: number;
    name: string;
  } | null;
  client?: {
    name: string | null;
  } | null;
}
