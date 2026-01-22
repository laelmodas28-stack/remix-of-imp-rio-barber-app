// Appointment validation utilities

import { startOfDay, isAfter, isBefore, parseISO, format, addMinutes } from "date-fns";
import type { 
  AppointmentFormData, 
  ValidationResult, 
  ValidationError,
  ConflictResult,
  ExistingBooking 
} from "./types";

/**
 * Validates appointment form data
 */
export function validateAppointment(data: Partial<AppointmentFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required field checks
  if (!data.clientId?.trim()) {
    errors.push({ field: "clientId", message: "Cliente é obrigatório" });
  }

  if (!data.professionalId?.trim()) {
    errors.push({ field: "professionalId", message: "Profissional é obrigatório" });
  }

  if (!data.serviceId?.trim()) {
    errors.push({ field: "serviceId", message: "Serviço é obrigatório" });
  }

  if (!data.date) {
    errors.push({ field: "date", message: "Data é obrigatória" });
  } else {
    // Date cannot be in the past
    const today = startOfDay(new Date());
    const selectedDate = startOfDay(data.date);
    
    if (isBefore(selectedDate, today)) {
      errors.push({ field: "date", message: "Data não pode ser no passado" });
    }
  }

  if (!data.startTime?.trim()) {
    errors.push({ field: "startTime", message: "Horário é obrigatório" });
  } else {
    // Validate time format (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.startTime)) {
      errors.push({ field: "startTime", message: "Formato de horário inválido" });
    }
  }

  // Duration check
  if (data.duration !== undefined && data.duration <= 0) {
    errors.push({ field: "duration", message: "Duração deve ser maior que zero" });
  }

  // Price check (can be 0 but not negative)
  if (data.price !== undefined && data.price < 0) {
    errors.push({ field: "price", message: "Preço não pode ser negativo" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Parses time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to time string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Checks for conflicts with existing appointments
 */
export function checkConflicts(
  professionalId: string,
  date: Date,
  startTime: string,
  durationMinutes: number,
  existingBookings: ExistingBooking[],
  excludeBookingId?: string
): ConflictResult {
  const dateStr = format(date, "yyyy-MM-dd");
  
  // Filter bookings for the same professional and date
  const relevantBookings = existingBookings.filter(
    (booking) =>
      booking.booking_date === dateStr &&
      booking.status !== "cancelled" &&
      booking.id !== excludeBookingId
  );

  const newStartMinutes = timeToMinutes(startTime);
  const newEndMinutes = newStartMinutes + durationMinutes;

  for (const booking of relevantBookings) {
    const existingStartMinutes = timeToMinutes(booking.booking_time.substring(0, 5));
    const existingDuration = booking.service?.duration_minutes || 30;
    const existingEndMinutes = existingStartMinutes + existingDuration;

    // Check for overlap (allowing exact end-to-start)
    // Overlap exists if: newStart < existingEnd AND newEnd > existingStart
    if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
      // Find suggested slots
      const suggestedSlots = findAvailableSlots(
        existingBookings,
        dateStr,
        durationMinutes,
        startTime
      );

      return {
        hasConflict: true,
        conflictingAppointment: {
          id: booking.id,
          startTime: booking.booking_time.substring(0, 5),
          endTime: minutesToTime(existingEndMinutes),
          clientName: booking.client?.name || undefined,
          serviceName: booking.service?.name || undefined,
        },
        suggestedSlots,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Finds available time slots for the given date and duration
 */
function findAvailableSlots(
  existingBookings: ExistingBooking[],
  dateStr: string,
  durationMinutes: number,
  preferredTime: string,
  openHour: number = 8,
  closeHour: number = 19
): string[] {
  const bookedSlots: Array<{ start: number; end: number }> = [];
  
  // Get all booked time ranges
  for (const booking of existingBookings) {
    if (booking.booking_date === dateStr && booking.status !== "cancelled") {
      const start = timeToMinutes(booking.booking_time.substring(0, 5));
      const duration = booking.service?.duration_minutes || 30;
      bookedSlots.push({ start, end: start + duration });
    }
  }
  
  // Sort by start time
  bookedSlots.sort((a, b) => a.start - b.start);
  
  const availableSlots: string[] = [];
  const preferredMinutes = timeToMinutes(preferredTime);
  const slotIncrement = 30; // 30-minute increments
  
  // Check each potential slot
  for (let minutes = openHour * 60; minutes + durationMinutes <= closeHour * 60; minutes += slotIncrement) {
    const slotEnd = minutes + durationMinutes;
    
    // Check if this slot conflicts with any booked slot
    const hasConflict = bookedSlots.some(
      (booked) => minutes < booked.end && slotEnd > booked.start
    );
    
    if (!hasConflict) {
      availableSlots.push(minutesToTime(minutes));
    }
  }
  
  // Sort by proximity to preferred time
  availableSlots.sort((a, b) => {
    const aDiff = Math.abs(timeToMinutes(a) - preferredMinutes);
    const bDiff = Math.abs(timeToMinutes(b) - preferredMinutes);
    return aDiff - bDiff;
  });
  
  // Return top 5 suggestions
  return availableSlots.slice(0, 5);
}

/**
 * Validates that the selected time is not in the past (for today's date)
 */
export function isTimeInPast(date: Date, time: string): boolean {
  const now = new Date();
  const today = startOfDay(now);
  const selectedDate = startOfDay(date);
  
  // If not today, time is not in past
  if (!isBefore(selectedDate, today) && !isAfter(selectedDate, today)) {
    // It's today, check the time
    const [hours, minutes] = time.split(":").map(Number);
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    return isBefore(selectedDateTime, now);
  }
  
  return false;
}
