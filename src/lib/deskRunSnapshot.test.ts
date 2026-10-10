import { readDeskRuns } from './deskRunSnapshot';

const run = { id: 'abcdef01', agent: 'claude', name: 'work', cwd: 'C:/ping/cellar', startedAt: 123, state: 'waiting', origin: 'phone', entryId: null };

it('accepts existing host payload and a confirmed empty list', () => {
  expect(readDeskRuns([run])).toEqual([run]);
  expect(readDeskRuns([])).toEqual([]);
});

it.each([undefined, null, {}, [null], [{ ...run, state: 'paused' }], [{ ...run, startedAt: NaN }], [{ ...run, origin: 'sample' }], [{ ...run, agent: 'unknown' }], [{ ...run, entryId: undefined }]])('does not invent an empty list for malformed host data: %j', (raw) => {
  expect(readDeskRuns(raw)).toBeNull();
});

it('accepts real jobs whose result became unknown after a host restart', () => {
  expect(readDeskRuns([{ ...run, agent: 'job', state: 'unknown' }])).toEqual([{ ...run, agent: 'job', state: 'unknown' }]);
});
