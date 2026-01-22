import { supabase } from "@/integrations/supabase/client";
import { getProcessedWhatsAppTemplate, TemplateData } from "./templateService";

interface SendMessageParams {
  barbershopId: string;
  phone: string;
  message: string;
  instanceName?: string;
  clientName?: string;
  serviceName?: string;
  bookingDate?: string;
  bookingTime?: string;
}

export interface BookingNotificationParams {
  barbershopId: string;
  barbershopName: string;
  barbershopLogoUrl?: string;
  barbershopAddress?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceName: string;
  servicePrice: number;
  professionalName: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
}

export interface ConnectionStatus {
  state: "open" | "close" | "connecting" | "connected" | "disconnected" | "error" | string;
  message?: string;
  phoneNumber?: string;
}

interface EvolutionApiSettings {
  whatsapp_enabled: boolean;
  whatsapp_send_booking_confirmation: boolean;
  whatsapp_send_booking_reminder: boolean;
}

/**
 * Get WhatsApp settings from notification_settings table
 * Falls back to default values if table/columns don't exist
 */
export async function getWhatsAppSettings(barbershopId: string): Promise<EvolutionApiSettings | null> {
  try {
    const { data, error } = await supabase
      .from("notification_settings")
      .select("send_whatsapp, enabled")
      .eq("barbershop_id", barbershopId)
      .maybeSingle();

    if (error || !data) {
      // Return default settings if no record found
      return {
        whatsapp_enabled: false,
        whatsapp_send_booking_confirmation: false,
        whatsapp_send_booking_reminder: false,
      };
    }

    return {
      whatsapp_enabled: data.send_whatsapp ?? false,
      whatsapp_send_booking_confirmation: data.enabled ?? false,
      whatsapp_send_booking_reminder: data.enabled ?? false,
    };
  } catch {
    return {
      whatsapp_enabled: false,
      whatsapp_send_booking_confirmation: false,
      whatsapp_send_booking_reminder: false,
    };
  }
}

/**
 * Get the barbershop slug (used as Evolution API instance name)
 */
async function getBarbershopSlug(barbershopId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("barbershops")
    .select("slug")
    .eq("id", barbershopId)
    .single();

  if (error) {
    console.error("Error fetching barbershop slug:", error);
    return null;
  }

  return data?.slug || null;
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Add Brazil country code if not present
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  return cleaned;
}

export async function sendWhatsAppMessage({ 
  barbershopId, 
  phone, 
  message,
  instanceName,
  clientName,
  serviceName,
  bookingDate,
  bookingTime,
}: SendMessageParams): Promise<boolean> {
  const settings = await getWhatsAppSettings(barbershopId);
  
  if (!settings || !settings.whatsapp_enabled) {
    console.log("WhatsApp not enabled for this barbershop");
    return false;
  }

  const formattedPhone = formatPhoneNumber(phone);

  // Get instance name from slug if not provided
  let finalInstanceName = instanceName;
  if (!finalInstanceName) {
    finalInstanceName = await getBarbershopSlug(barbershopId) || undefined;
  }

  try {
    // Use n8n webhook for WhatsApp via send-whatsapp-webhook edge function
    const { data, error } = await supabase.functions.invoke("send-whatsapp-webhook", {
      body: {
        barbershopId,
        phone: formattedPhone,
        message,
        instanceName: finalInstanceName,
        clientName,
        serviceName,
        bookingDate,
        bookingTime,
      },
    });

    if (error) {
      console.error("Error sending WhatsApp message via webhook:", error);
      return false;
    }

    return data?.success ?? false;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

export async function sendBookingConfirmationWhatsApp(params: BookingNotificationParams): Promise<boolean> {
  const settings = await getWhatsAppSettings(params.barbershopId);
  
  if (!settings?.whatsapp_enabled || !settings?.whatsapp_send_booking_confirmation) {
    return false;
  }

  if (!params.clientPhone) {
    console.log("No phone number provided for WhatsApp notification");
    return false;
  }

  // Prepare template data
  const templateData: TemplateData = {
    clientName: params.clientName,
    clientPhone: params.clientPhone,
    clientEmail: params.clientEmail,
    serviceName: params.serviceName,
    servicePrice: params.servicePrice,
    professionalName: params.professionalName,
    bookingDate: params.bookingDate,
    bookingTime: params.bookingTime,
    barbershopName: params.barbershopName,
    barbershopLogoUrl: params.barbershopLogoUrl,
    barbershopAddress: params.barbershopAddress,
    notes: params.notes,
  };

  // Try to get template from database
  let message = await getProcessedWhatsAppTemplate(params.barbershopId, "booking_confirmation", templateData);

  // Fallback to default message if no template found
  if (!message) {
    const formattedDate = new Date(params.bookingDate + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    message = `✅ *Agendamento Confirmado!*

Olá ${params.clientName}! 👋

Seu agendamento na *${params.barbershopName}* foi confirmado:

📋 *Serviço:* ${params.serviceName}
💇 *Profissional:* ${params.professionalName}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${params.bookingTime}
💰 *Valor:* R$ ${params.servicePrice.toFixed(2)}
${params.notes ? `\n📝 *Obs:* ${params.notes}` : ""}

Esperamos você! 😊`;
  }

  return sendWhatsAppMessage({
    barbershopId: params.barbershopId,
    phone: params.clientPhone,
    message,
    clientName: params.clientName,
    serviceName: params.serviceName,
    bookingDate: params.bookingDate,
    bookingTime: params.bookingTime,
  });
}

export async function sendBookingReminderWhatsApp(params: BookingNotificationParams): Promise<boolean> {
  const settings = await getWhatsAppSettings(params.barbershopId);
  
  if (!settings?.whatsapp_enabled || !settings?.whatsapp_send_booking_reminder) {
    return false;
  }

  if (!params.clientPhone) {
    return false;
  }

  // Prepare template data
  const templateData: TemplateData = {
    clientName: params.clientName,
    clientPhone: params.clientPhone,
    clientEmail: params.clientEmail,
    serviceName: params.serviceName,
    servicePrice: params.servicePrice,
    professionalName: params.professionalName,
    bookingDate: params.bookingDate,
    bookingTime: params.bookingTime,
    barbershopName: params.barbershopName,
    barbershopLogoUrl: params.barbershopLogoUrl,
    notes: params.notes,
  };

  // Try to get template from database
  let message = await getProcessedWhatsAppTemplate(params.barbershopId, "booking_reminder", templateData);

  // Fallback to default message if no template found
  if (!message) {
    const formattedDate = new Date(params.bookingDate + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    message = `⏰ *Lembrete de Agendamento*

Olá ${params.clientName}! 👋

Este é um lembrete do seu agendamento na *${params.barbershopName}*:

📋 *Serviço:* ${params.serviceName}
💇 *Profissional:* ${params.professionalName}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${params.bookingTime}

Contamos com sua presença! 😊

_Caso precise cancelar ou reagendar, entre em contato conosco._`;
  }

  return sendWhatsAppMessage({
    barbershopId: params.barbershopId,
    phone: params.clientPhone,
    message,
    clientName: params.clientName,
    serviceName: params.serviceName,
    bookingDate: params.bookingDate,
    bookingTime: params.bookingTime,
  });
}
