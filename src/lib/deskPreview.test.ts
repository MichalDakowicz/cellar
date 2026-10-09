import { checksSummary, deployLine, pagePath, previewAddress, previewFrame, type PreviewCheck } from './deskPreview';

describe('previewFrame', () => {
  it('lays a phone out at the room when the room is narrower than a phone', () => {
    expect(previewFrame('phone', 358, 400)).toEqual({ width: 358, height: 400, scale: 1 });
  });

  it('keeps a phone at phone width in a wide room', () => {
    expect(previewFrame('phone', 900, 400)).toEqual({ width: 390, height: 400, scale: 1 });
  });

  it('scales a desktop page down into a phone and gives it the height to fill', () => {
    const frame = previewFrame('desktop', 320, 400);
    expect(frame.width).toBe(1280);
    expect(frame.scale).toBe(0.25);
    expect(frame.height).toBe(1600);
  });

  it('never scales up', () => {
    expect(previewFrame('tablet', 1200, 500).scale).toBe(1);
  });

  it('does not divide by an unmeasured room', () => {
    expect(previewFrame('tablet', 0, 500).scale).toBe(1);
  });
});

describe('previewAddress', () => {
  it('names the host and port', () => {
    expect(previewAddress('michu-pc', 8081)).toBe('michu-pc · lan :8081');
  });

  it('adds a path, with one slash', () => {
    expect(previewAddress('pc', 8081, 'inbox')).toBe('pc · lan :8081/inbox');
    expect(previewAddress('pc', 8081, '/inbox')).toBe('pc · lan :8081/inbox');
    expect(previewAddress('pc', 8081, '/')).toBe('pc · lan :8081');
  });
});

describe('pagePath', () => {
  it('keeps only the path', () => {
    expect(pagePath('http://192.168.1.4:51234/inbox?x=1#top')).toBe('/inbox');
  });

  it('is the root for a bare origin', () => {
    expect(pagePath('http://192.168.1.4:51234')).toBe('/');
  });
});

const check = (state: PreviewCheck['state']): PreviewCheck => ({ label: 'x', command: true, state, detail: '' });

describe('checksSummary', () => {
  it('ignores figures', () => {
    expect(checksSummary([check('measure')])).toBe('no checks');
    expect(checksSummary([check('passed'), check('measure')])).toBe('the check passed');
  });

  it('says checking while any runs', () => {
    expect(checksSummary([check('failed'), check('running')])).toBe('checking…');
  });

  it('counts failures', () => {
    expect(checksSummary([check('failed'), check('passed')])).toBe('1 check failed');
    expect(checksSummary([check('failed'), check('failed')])).toBe('2 checks failed');
  });

  it('says all passed', () => {
    expect(checksSummary([check('passed'), check('passed')])).toBe('all 2 checks passed');
  });
});

describe('deployLine', () => {
  it('is ready with its target', () => {
    expect(deployLine({ kind: 'ready', target: 'to firebase hosting · site' })).toEqual({
      label: 'deploy',
      meta: 'to firebase hosting · site · replaces what is live',
      enabled: true,
    });
  });

  it('is off while it deploys, and says you can leave', () => {
    const line = deployLine({ kind: 'deploying', command: 'firebase deploy', seconds: 12 });
    expect(line.enabled).toBe(false);
    expect(line.meta).toBe('firebase deploy · 12s so far · you can leave this screen');
  });

  it('is off with its reason when blocked', () => {
    expect(deployLine({ kind: 'blocked', reason: 'not yet' })).toEqual({ label: 'deploy', meta: 'not yet', enabled: false });
  });
});
