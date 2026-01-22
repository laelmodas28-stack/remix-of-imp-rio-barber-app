import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "confirmation" | "cancellation" | "reminder";

interface BookingNotificationData {
  bookingId: string;
  barbershopId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  serviceName: string;
  professionalName: string;
  bookingDate: string;
  bookingTime: string;
  price?: number;
  notificationType: NotificationType;
}

/**
 * Sends booking notifications via webhooks
 */
export async function sendBookingNotifications(data: BookingNotificationData): Promise<{
  emailSent: boolean;
  whatsappSent: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let emailSent = false;
  let whatsappSent = false;

  console.log(`[BookingNotifications] Sending ${data.notificationType} notification`, {
    bookingId: data.bookingId,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
  });

  // Fetch barbershop info
  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("slug, name, address")
    .eq("id", data.barbershopId)
    .single();

  const instanceName = barbershop?.slug || `barbershop-${data.barbershopId.substring(0, 8)}`;
  const barbershopAddress = barbershop?.address || "";
  const barbershopName = barbershop?.name || "Barbearia";

  const typeLabels: Record<NotificationType, string> = {
    confirmation: "Confirmação de Agendamento",
    cancellation: "Cancelamento de Agendamento",
    reminder: "Lembrete de Agendamento",
  };

  // Send Email webhook notification
  try {
    const emailContent = `${typeLabels[data.notificationType]}: ${data.serviceName} em ${data.bookingDate} às ${data.bookingTime}`;
    const emailSubject = typeLabels[data.notificationType];

    console.log(`[BookingNotifications] Calling EMAIL webhook for ${data.notificationType}`);

    const { error } = await supabase.functions.invoke("send-email-webhook", {
      body: {
        barbershopId: data.barbershopId,
        payload: {
          notification_type: data.notificationType,
          client_name: data.clientName,
          client_email: data.clientEmail,
          client_phone: data.clientPhone,
          service_name: data.serviceName,
          professional_name: data.professionalName,
          booking_date: data.bookingDate,
          booking_time: data.bookingTime,
          barbershop_name: barbershopName,
          price: data.price,
          email_subject: emailSubject,
          email_content: emailContent,
        },
      },
    });

    if (error) {
      console.error(`[BookingNotifications] Email webhook error:`, error);
      errors.push(`Email: ${error.message}`);
    } else {
      emailSent = true;
      console.log(`[BookingNotifications] Email webhook called successfully`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[BookingNotifications] Email webhook exception:`, err);
    errors.push(`Email: ${message}`);
  }

  // Send WhatsApp webhook notification
  try {
    let phone = data.clientPhone ? data.clientPhone.replace(/\D/g, "") : null;
    if (phone && !phone.startsWith("55")) {
      phone = `55${phone}`;
    }

    console.log(`[BookingNotifications] Calling WHATSAPP webhook for ${data.notificationType}`);

    const whatsappContent = `*${typeLabels[data.notificationType]}*\n\n` +
      `👤 Cliente: ${data.clientName}\n` +
      `✂️ Serviço: ${data.serviceName}\n` +
      `👨‍💼 Profissional: ${data.professionalName}\n` +
      `📅 Data: ${data.bookingDate}\n` +
      `⏰ Horário: ${data.bookingTime}`;

    const { error } = await supabase.functions.invoke("send-whatsapp-webhook", {
      body: {
        barbershopId: data.barbershopId,
        instanceName,
        phone: phone || "unknown",
        message: whatsappContent,
        clientName: data.clientName,
        serviceName: data.serviceName,
        bookingDate: data.bookingDate,
        bookingTime: data.bookingTime,
        barbershopName,
        barbershopAddress,
      },
    });

    if (error) {
      console.error(`[BookingNotifications] WhatsApp webhook error:`, error);
      errors.push(`WhatsApp: ${error.message}`);
    } else {
      whatsappSent = true;
      console.log(`[BookingNotifications] WhatsApp webhook called successfully`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[BookingNotifications] WhatsApp webhook exception:`, err);
    errors.push(`WhatsApp: ${message}`);
  }

  return { emailSent, whatsappSent, errors };
}

/**
 * Helper to fetch booking details and send notifications
 */
export async function sendNotificationForBooking(
  bookingId: string,
  notificationType: NotificationType
): Promise<{ success: boolean; errors: string[] }> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      id,
      barbershop_id,
      booking_date,
      booking_time,
      total_price,
      client_id,
      service:services(name),
      professional:professionals(name)
    `)
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return { success: false, errors: ["Booking not found"] };
  }

  // Fetch client profile
  let clientData = { name: "Cliente", email: null as string | null, phone: null as string | null };
  if (booking.client_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", booking.client_id)
      .maybeSingle();
    
    if (profile) {
      clientData = {
        name: profile.full_name || "Cliente",
        email: null,
        phone: profile.phone,
      };
    }
  }

  const result = await sendBookingNotifications({
    bookingId: booking.id,
    barbershopId: booking.barbershop_id,
    clientName: clientData.name,
    clientEmail: clientData.email,
    clientPhone: clientData.phone,
    serviceName: (booking.service as any)?.name || "Serviço",
    professionalName: (booking.professional as any)?.name || "Profissional",
    bookingDate: booking.booking_date,
    bookingTime: booking.booking_time,
    price: booking.total_price || undefined,
    notificationType,
  });

  return {
    success: result.emailSent || result.whatsappSent,
    errors: result.errors,
  };
}