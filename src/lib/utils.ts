import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBrazilianWhatsApp(phone: string): string {
  // Remove tudo que não é número
  let cleanNumber = phone.replace(/\D/g, '');
  
  // Remove +55 se já tiver para evitar duplicação
  if (cleanNumber.startsWith('55') && cleanNumber.length > 11) {
    cleanNumber = cleanNumber.substring(2);
  }
  
  // Adiciona 55 no início
  return '55' + cleanNumber;
}
