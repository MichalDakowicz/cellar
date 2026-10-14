import { parseOrchestration, orchestrationSummary } from './deskOrchestration';
const request = { commandId: '10000000-0000-4000-8000-000000000001', kind: 'race', prompt: 'Compare approaches', projectIds: ['10000000-0000-4000-8000-000000000002'], agents: ['codex', 'codex'], mode: 'ask' };
test('race needs one project and two agents; no arbitrary settings cross boundary', () => {
  expect(parseOrchestration(request).agents).toEqual(['codex', 'codex']);
  expect(() => parseOrchestration({ ...request, agents: ['codex'] })).toThrow();
  expect(() => parseOrchestration({ ...request, projectIds: [...request.projectIds, '20000000-0000-4000-8000-000000000002'] })).toThrow();
  expect(parseOrchestration({ ...request, afterCommands: ['deploy'] })).not.toHaveProperty('afterCommands');
});
test('night validates real bounded times, permission and morning reserve', () => {
  const night = { ...request, kind: 'night', agents: ['codex'], startsAt: 1000, endsAt: 10000, maxRuns: 2, reservePercent: 20 };
  expect(parseOrchestration(night, 0).maxRuns).toBe(2);
  for (const patch of [{ mode: 'full' }, { endsAt: 0 }, { reservePercent: 0 }, { startsAt: NaN }, { maxRuns: 99 }]) expect(() => parseOrchestration({ ...night, ...patch }, 0)).toThrow();
});
test('digest uses durable agent text, never raw provider envelopes', () => {
  expect(orchestrationSummary([{ id: 'x', kind: 'assistant_message', text: 'Actual summary', status: 'completed' }], [{ who: 'agent', text: '{"type":"tool"}' }])).toBe('Actual summary');
  const raw = JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Done' } });
  expect(orchestrationSummary([], [{ who: 'agent', text: raw }, { who: 'agent', text: raw }])).toBe('Done');
});
