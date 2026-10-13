import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { notificationAction, noticeRoute } from '@/lib/deskNotificationAction';
import type { NoticePayload } from '@/lib/deskNotificationRouting';
import { useNoticeResponses } from '@/store/noticeResponses';
import { useToast } from '@/components/ui/Toast';

const useLastResponse = Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse;
export function useNoticeActions(owner: string | null) {
  const response = useLastResponse();
  const router = useRouter();
  const { say } = useToast();
  const handling = useRef<string | null>(null);
  useEffect(() => {
    if (!owner || !response) return;
    const payload = response.notification.request.content.data as NoticePayload & { ownerId?: string; noticeId?: string; generation?: number };
    if (!payload.noticeId || payload.ownerId !== owner || !payload.note) return;
    const key = `${owner}:${payload.noticeId}:${payload.generation}:${payload.requestId}:${response.actionIdentifier}`;
    if (handling.current === key) return; handling.current = key;
    const saved = useNoticeResponses.getState().responses[key];
    if (saved?.state === 'confirmed' || saved?.state === 'failed') return;
    const commandId = saved?.commandId ?? Crypto.randomUUID();
    useNoticeResponses.getState().set(key, { commandId, state: 'pending' });
    let active = true;
    void (async () => {
      try {
        const action = notificationAction(payload, response.actionIdentifier);
        if (action.kind === 'question' && payload.requestId) {
          const line = payload.note.body[action.index];
          const option = typeof line === 'string' ? line.slice(3) : null;
          if (!option) throw new Error('Question option unavailable. Open the question.');
          const result = await supabase.rpc('cellar_answer_notice_question', { p_command: commandId, p_question: payload.requestId, p_picks: [option], p_note: '' });
          if (result.error) throw result.error;
        } else if (action.kind === 'approval' && payload.requestId && payload.deskId) {
          const request = { commandId, requestId: payload.requestId, decision: action.decision, source: 'phone' };
          const existing = await supabase.from('cellar_notice_actions').select('payload,receipt').eq('id', commandId).maybeSingle();
          if (existing.error) throw existing.error;
          if (existing.data && JSON.stringify(existing.data.payload) !== JSON.stringify(request)) {
            // JSONB key ordering is unspecified; compare each semantic field instead.
            if (Object.entries(request).some(([k,v]) => existing.data!.payload[k] !== v)) throw new Error('Saved notification action differs.');
          }
          if (!existing.data) {
            const result = await supabase.from('cellar_notice_actions').insert({ id: commandId, desk_id: payload.deskId, payload: request });
            if (result.error && result.error.code !== '23505') throw result.error;
          }
          const result = await supabase.from('cellar_notice_actions').select('receipt').eq('id', commandId).single();
          if (result.error) throw result.error;
          if (result.data.receipt?.state === 'failed' || result.data.receipt?.state === 'unknown') throw new Error(result.data.receipt.error ?? 'Decision not confirmed by PC.');
          if (result.data.receipt?.state !== 'confirmed') {
            if (active) say('Decision queued for PC. Check original notification receipt in settings.');
            const route = noticeRoute(payload); if (active && route) router.navigate(route as never); return;
          }
        } else if (['finished', 'checksFailed'].includes(payload.kind)) {
          const result = await supabase.rpc('cellar_close_finished_notice', { p_id: payload.noticeId }); if (result.error) throw result.error;
        }
        useNoticeResponses.getState().set(key, { commandId, state: 'confirmed' });
        const route = noticeRoute(payload); if (active && route) router.navigate(route as never);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        // Keep original ID on failed/uncertain delivery; a retry cannot authorize another choice.
        useNoticeResponses.getState().set(key, { commandId, state: 'pending', error });
        if (active) { say(error); const route = noticeRoute(payload); if (route) router.navigate(route as never); }
      }
    })();
    return () => { active = false; handling.current = null; };
  }, [owner, response, router, say]);
}
