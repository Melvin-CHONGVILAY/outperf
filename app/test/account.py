import asyncio, subprocess, sys, time, datetime as dt, json, uuid
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8771','--bind','127.0.0.1'], cwd='/home/claude/outperf-gh', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
SH='/home/claude/outperf-gh/app/test/shots/acct_'
FAKE = open('/home/claude/outperf-gh/app/test/fake_supabase.js').read()
CFG = "window.OUTPERF_CONFIG = { supabaseUrl: 'https://fake.supabase.co', supabaseAnonKey: 'anon', privacyUrl: 'https://example.com/p', termsUrl: 'https://example.com/t', supportUrl: 'https://example.com/s', contactEmail: 'aide@example.com' };"
users, rows = {}, {}
def server(op, args):
    a = json.loads(args)
    if op == 'signUp':
        if a['email'] in users: return json.dumps({'exists': True})
        uid = str(uuid.uuid4()); users[a['email']] = {'id': uid, 'pw': a['password']}
        return json.dumps({'session': {'user': {'id': uid, 'email': a['email']}}})
    if op == 'signIn':
        u = users.get(a['email'])
        if not u or u['pw'] != a['password']: return json.dumps({'error': {'message': 'Invalid login credentials'}})
        return json.dumps({'session': {'user': {'id': u['id'], 'email': a['email']}}})
    if op == 'reset': return json.dumps({})
    if op == 'verify':
        u = users.get(a['email'])
        if not u or a['token'] != '123456': return json.dumps({'error': {'message': 'Token has expired or is invalid'}})
        return json.dumps({'session': {'user': {'id': u['id'], 'email': a['email']}}})
    if op == 'setpw':
        for e, u in users.items():
            if u['id'] == a['uid']: u['pw'] = a['password']
        return json.dumps({})
    if op == 'get': return json.dumps({'row': rows.get(a['uid'])})
    if op == 'put': rows[a['user_id']] = {'data': a['data'], 'updated_at': a['updated_at']}; return json.dumps({})
    if op == 'del':
        rows.pop(a['uid'], None)
        for e in [e for e, u in users.items() if u['id'] == a['uid']]: users.pop(e)
        return json.dumps({})
errors = []
async def device(b, name, minute=0):
    ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme='light', timezone_id='Europe/Paris')
    await ctx.expose_function('__srv', server)
    await ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=CFG))
    await ctx.route('**/vendor/supabase.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=FAKE))
    page = await ctx.new_page()
    page.on('pageerror', lambda e: errors.append((name, 'pageerror', str(e))))
    page.on('console', lambda m: errors.append((name, m.type, m.text)) if m.type == 'error' else None)
    await page.clock.install(time=dt.datetime(2026,10,13,18,minute,0))
    await page.goto('http://localhost:8771/'); await page.wait_for_timeout(500)
    return ctx, page
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # --- device A: onboarding with account creation
        ctxA, A = await device(b, 'A')
        await A.get_by_role('button', name='Commencer').click(); await A.get_by_role('button', name='Continuer').click(); await A.wait_for_timeout(200)
        await A.screenshot(path=SH+'01_onb_account.png')
        await A.get_by_role('button', name='Créer un compte').click(); await A.wait_for_timeout(400)
        await A.fill('#auth-email', 'mel@test.dev'); await A.fill('#auth-pass', 'court')
        await A.get_by_role('button', name='Créer mon compte').click(); await A.wait_for_timeout(200)
        print('short pw error:', await A.locator('.form-err').inner_text())
        await A.fill('#auth-pass', 'motdepasse123'); await A.screenshot(path=SH+'02_signup.png')
        await A.get_by_role('button', name='Créer mon compte').click(); await A.wait_for_timeout(800)
        print('A session:', await A.evaluate('window.__op.session && window.__op.session.user.email'))
        await A.get_by_role('button', name='Ajouter du temps à Révision cours').nth(1).click(); await A.wait_for_timeout(350)
        await A.get_by_role('button', name='+1 h', exact=True).click(); await A.wait_for_timeout(200)
        await A.get_by_role('button', name='Ajouter du temps à Lecture').nth(1).click(); await A.wait_for_timeout(350)
        await A.get_by_role('button', name='+30 min', exact=True).click()
        await A.clock.fast_forward(4000); await A.wait_for_timeout(600)
        uidA = list(rows.keys())[0] if rows else None
        print('server rows:', len(rows), 'entries on server:', len(rows[uidA]['data']['entries']) if uidA else None)
        await A.locator('#tabs .tab').nth(4).click(); await A.wait_for_timeout(300)
        await A.screenshot(path=SH+'03_settings_logged.png')
        # --- device B: onboarding, then sign in -> merge without duplicated categories
        ctxB, B = await device(b, 'B', 5)
        await B.get_by_role('button', name='Commencer').click(); await B.get_by_role('button', name='Continuer').click(); await B.wait_for_timeout(200)
        await B.get_by_role('button', name="J'ai déjà un compte").click(); await B.wait_for_timeout(300)
        await B.fill('#auth-email', 'mel@test.dev'); await B.fill('#auth-pass', 'mauvaismdp')
        await B.get_by_role('button', name='Me connecter').click(); await B.wait_for_timeout(300)
        print('wrong pw error:', await B.locator('.form-err').inner_text())
        await B.fill('#auth-pass', 'motdepasse123'); await B.get_by_role('button', name='Me connecter').click(); await B.wait_for_timeout(1000)
        st = await B.evaluate("(() => { const S = window.__op.S; return { cats: S.cats.map(c => c.name), n: S.entries.length, mins: S.entries.reduce((s, e) => s + e.m, 0) }; })()")
        print('B after login:', st['n'], 'entries', st['mins'], 'min, cats', len(st['cats']), 'unique', len(set(st['cats'])))
        # B deletes the Lecture session, A pulls and sees it gone
        await B.locator('.ent', has_text='Lecture').click(); await B.wait_for_timeout(300)
        await B.locator('.sheet').get_by_role('button', name='Supprimer').click(); await B.wait_for_timeout(200)
        print('B entries right after delete:', await B.evaluate('window.__op.S.entries.length'), 'tomb:', await B.evaluate('Object.keys(window.__op.S.tomb.e).length'))
        await B.clock.fast_forward(4000); await B.wait_for_timeout(600)
        uid = list(rows.keys())[0]; print('server entries after B push:', len(rows[uid]['data']['entries']), 'server tombs:', len(rows[uid]['data']['tomb']['e']))
        await A.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await A.wait_for_timeout(800)
        print('A entries after B deletion:', await A.evaluate('window.__op.S.entries.length'))
        # password reset on B with a code
        await B.locator('#tabs .tab').nth(4).click(); await B.wait_for_timeout(300)
        await B.get_by_role('button', name='Se déconnecter').click(); await B.wait_for_timeout(300)
        await B.locator('.sheet').get_by_role('button', name='Se déconnecter').click(); await B.wait_for_timeout(400)
        await B.get_by_role('button', name='Se connecter').click(); await B.wait_for_timeout(300)
        await B.get_by_role('button', name='Mot de passe oublié ?').click(); await B.wait_for_timeout(300)
        await B.locator('.sheet input[type=email]').fill('mel@test.dev'); await B.get_by_role('button', name='Recevoir un code').click(); await B.wait_for_timeout(300)
        await B.get_by_placeholder('Code reçu par email').fill('123456'); await B.get_by_placeholder('Nouveau mot de passe').fill('nouveaumdp99')
        await B.screenshot(path=SH+'04_reset.png')
        await B.get_by_role('button', name='Changer le mot de passe').click(); await B.wait_for_timeout(800)
        print('B after reset session:', await B.evaluate('!!window.__op.session'), 'pw updated:', users.get('mel@test.dev', {}).get('pw'))
        # delete account
        await B.locator('#tabs .tab').nth(4).click(); await B.wait_for_timeout(300)
        await B.get_by_role('button', name='Supprimer mon compte').click(); await B.wait_for_timeout(300)
        await B.screenshot(path=SH+'05_delete.png')
        await B.get_by_role('button', name='Supprimer définitivement').click(); await B.wait_for_timeout(800)
        print('after delete: users', len(users), 'rows', len(rows), 'B session', await B.evaluate('!!window.__op.session'), 'B local entries', await B.evaluate('window.__op.S.entries.length'))
        await B.screenshot(path=SH+'06_after_delete.png')
        await b.close()
asyncio.run(main()); srv.terminate()
print('ERRORS', errors)
