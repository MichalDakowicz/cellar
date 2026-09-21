import { LOGIN_ROUTE, redirectForSession } from './authRoute';

describe('redirectForSession', () => {
  it('leaves a resolving session alone', () => {
    expect(redirectForSession({ loading: true, signedIn: false, segment: 'settings' })).toBeNull();
  });

  it('leaves a signed-in session alone', () => {
    expect(redirectForSession({ loading: false, signedIn: true, segment: 'settings' })).toBeNull();
  });

  it('sends a signed-out session on a screen outside the tabs to login', () => {
    expect(redirectForSession({ loading: false, signedIn: false, segment: 'settings' })).toBe(LOGIN_ROUTE);
    expect(redirectForSession({ loading: false, signedIn: false, segment: 'entry' })).toBe(LOGIN_ROUTE);
    expect(redirectForSession({ loading: false, signedIn: false, segment: 'project' })).toBe(LOGIN_ROUTE);
    expect(redirectForSession({ loading: false, signedIn: false, segment: 'search' })).toBe(LOGIN_ROUTE);
  });

  it('sends a signed-out session inside the tabs to login too', () => {
    expect(redirectForSession({ loading: false, signedIn: false, segment: '(tabs)' })).toBe(LOGIN_ROUTE);
    expect(redirectForSession({ loading: false, signedIn: false, segment: undefined })).toBe(LOGIN_ROUTE);
  });

  it('does not bounce the login screen off itself', () => {
    expect(redirectForSession({ loading: false, signedIn: false, segment: 'login' })).toBeNull();
  });
});
