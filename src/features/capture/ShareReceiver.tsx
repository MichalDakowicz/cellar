import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { nativeCapture } from './nativeCapture';
import { useSharedCapture } from '@/store/sharedCapture';
import { useAuth } from '@/features/auth/AuthProvider';
export function ShareReceiver() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => {
    if (!nativeCapture || !user) return;
    const owner = user.id;
    function receive(text: string) { if (!text.trim()) return; useSharedCapture.getState().receive(owner, text); nativeCapture!.clearSharedText(); router.push('/desk/share'); }
    const pending = nativeCapture.getSharedText(); if (pending) receive(pending);
    const listener = nativeCapture.addListener('onSharedText', (event) => receive(event.text));
    return () => listener.remove();
  }, [router, user]);
  return null;
}
