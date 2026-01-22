import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePushNotifications = (barbershopId?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications não são suportadas neste navegador');
      return false;
    }

    // Check if already denied
    if (Notification.permission === 'denied') {
      toast.error('Notificações bloqueadas', {
        description: 'Clique no ícone de cadeado na barra de endereço do navegador e permita notificações para este site.',
        duration: 8000,
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notificações ativadas!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notificações bloqueadas', {
          description: 'Para ativar, clique no ícone de cadeado na barra de endereço e permita notificações.',
          duration: 8000,
        });
        return false;
      } else {
        toast.info('Permissão pendente', {
          description: 'Você pode ativar notificações a qualquer momento.',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erro ao solicitar permissão');
      return false;
    }
  };

  const subscribeToPush = async (): Promise<PushSubscription | null> => {
    try {
      const registration = await registerServiceWorker();
      if (!registration) return null;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
      });

      setSubscription(sub);
      console.log('Push subscription:', sub);
      
      // Salvar subscription no backend se necessário
      if (barbershopId) {
        // Aqui você pode salvar a subscription no Supabase se quiser
      }

      return sub;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Erro ao ativar notificações push');
      return null;
    }
  };

  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      toast.error('Você precisa permitir notificações primeiro');
      return;
    }

    try {
      // Criar notificação de teste
      new Notification('Notificação de Teste', {
        body: 'As notificações estão funcionando!',
        icon: '/icon-192.png',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Erro ao enviar notificação de teste');
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribeToPush,
    sendTestNotification,
  };
};

// Função auxiliar para converter VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
