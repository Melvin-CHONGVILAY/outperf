// Minimal stand in for supabase-js, backed by a Python side store (window.__srv)
(function () {
  const call = (op, args) => window.__srv(op, JSON.stringify(args || {})).then(r => JSON.parse(r));
  const listeners = [];
  let session = null;
  const KEY = 'fake-session';
  const setS = (s, ev) => { session = s; try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} listeners.forEach(cb => cb(ev, s)); };
  const client = {
    auth: {
      onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() { try { session = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} return { data: { session } }; },
      async signUp({ email, password }) { const r = await call('signUp', { email, password }); if (r.error) return { data: {}, error: r.error }; if (r.exists) return { data: { user: { identities: [] }, session: null }, error: null }; setS(r.session, 'SIGNED_IN'); return { data: { user: r.session.user, session: r.session }, error: null }; },
      async signInWithPassword({ email, password }) { const r = await call('signIn', { email, password }); if (r.error) return { data: {}, error: r.error }; setS(r.session, 'SIGNED_IN'); return { data: { session: r.session }, error: null }; },
      async signOut() { setS(null, 'SIGNED_OUT'); return { error: null }; },
      async resetPasswordForEmail(email) { await call('reset', { email }); return { error: null }; },
      async verifyOtp({ email, token }) { const r = await call('verify', { email, token }); if (r.error) return { data: {}, error: r.error }; setS(r.session, 'SIGNED_IN'); return { data: { session: r.session }, error: null }; },
      async updateUser({ password }) { await call('setpw', { uid: session.user.id, password }); return { error: null }; },
    },
    from() {
      return {
        select() { return { eq(_, uid) { return { async maybeSingle() { const r = await call('get', { uid }); return { data: r.row, error: null }; } }; } }; },
        async upsert(row) { await call('put', row); return { error: null }; },
      };
    },
    async rpc(name) { if (name === 'delete_user') { await call('del', { uid: session.user.id }); return { error: null }; } return { error: { message: 'unknown rpc' } }; },
  };
  window.supabase = { createClient: () => client };
})();
