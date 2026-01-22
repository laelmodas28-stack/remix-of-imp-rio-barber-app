import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppConnectionStatus {
  state: "open" | "close" | "connecting" | "connected" | "disconnected" | "not_found" | "error" | string;
  message?: string;
  phoneNumber?: string;
  instanceName?: string;
}

export interface WhatsAppConnectResult {
  success: boolean;
  message?: string;
  qrCode?: string;
  instanceName?: string;
  state?: string;
  phoneNumber?: string;
}

/**
 * Generate a unique instance name for a barbershop using slug
 */
export function generateInstanceName(slug: string): string {
  return slug;
}

/**
 * Create or get existing WhatsApp instance
 */
export async function createWhatsAppInstance(barbershopId: string, instanceName: string): Promise<WhatsAppConnectResult> {
  const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
    body: { action: "create", barbershopId, instanceName },
  });

  if (error) {
    console.error("Error creating instance:", error);
    return { success: false, message: "Erro ao criar instância" };
  }

  return data;
}

/**
 * Get WhatsApp connection status
 */
export async function getWhatsAppStatus(barbershopId: string, instanceName: string): Promise<WhatsAppConnectionStatus> {
  const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
    body: { action: "status", barbershopId, instanceName },
  });

  if (error) {
    console.error("Error getting status:", error);
    return { state: "error", message: "Erro ao verificar status" };
  }

  return data;
}

/**
 * Connect WhatsApp and get QR code
 */
export async function connectWhatsApp(barbershopId: string, instanceName: string): Promise<WhatsAppConnectResult> {
  const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
    body: { action: "connect", barbershopId, instanceName },
  });

  if (error) {
    console.error("Error connecting:", error);
    return { success: false, message: "Erro ao conectar" };
  }

  return data;
}

/**
 * Disconnect WhatsApp
 */
export async function disconnectWhatsApp(barbershopId: string, instanceName: string): Promise<WhatsAppConnectResult> {
  const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
    body: { action: "logout", barbershopId, instanceName },
  });

  if (error) {
    console.error("Error disconnecting:", error);
    return { success: false, message: "Erro ao desconectar" };
  }

  return data;
}

/**
 * Delete WhatsApp instance
 */
export async function deleteWhatsAppInstance(barbershopId: string, instanceName: string): Promise<WhatsAppConnectResult> {
  const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
    body: { action: "delete", barbershopId, instanceName },
  });

  if (error) {
    console.error("Error deleting instance:", error);
    return { success: false, message: "Erro ao remover instância" };
  }

  return data;
}
