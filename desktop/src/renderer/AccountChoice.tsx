import { useEffect, useState } from 'react';
import type { DeskAgent } from '@/lib/deskProtocol';
import { calls } from './client';
import { save, saved, useSaved } from './preferences';
export function AccountChoice({ agent, disabled }: { agent: DeskAgent; disabled: boolean }) {
  useSaved(); const [rows, setRows] = useState<Awaited<ReturnType<typeof calls.providerAccounts>>>([]);
  useEffect(() => { let active = true; void calls.providerAccounts().then((r) => { if (active) setRows(r); }).catch(() => {}); return () => { active = false; }; }, []);
  return <label>provider account<select disabled={disabled} value={saved('desktop-new-task', `account:${agent}`, '')} onChange={(e) => save('desktop-new-task', `account:${agent}`, e.target.value)}><option value="">existing provider sign-in</option>{rows.filter((r) => r.agent === agent).map((r) => <option key={r.id} value={r.id}>{r.label} · API</option>)}</select></label>;
}
