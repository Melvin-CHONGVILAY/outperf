import asyncio, subprocess, sys, time, datetime as dt, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8768','--bind','127.0.0.1'], cwd='/home/claude/outperf-gh', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
SH='/home/claude/outperf-gh/app/test/shots/'
errors=[]
SWIPE = '''(dx) => { const el = document.querySelector('.pcard'); const r = el.getBoundingClientRect(); const x = r.left + r.width/2, y = r.top + 200;
  el.dispatchEvent(new PointerEvent('pointerdown', {pointerType:'touch', clientX:x, clientY:y, bubbles:true}));
  el.dispatchEvent(new PointerEvent('pointerup', {pointerType:'touch', clientX:x+dx, clientY:y+5, bubbles:true})); }'''
async def shots(page, name, n=4):
    h = await page.evaluate("document.getElementById('app').scrollHeight")
    ch = await page.evaluate("document.getElementById('app').clientHeight")
    i=0; y=0
    while y < h and i < n:
        await page.evaluate(f"document.getElementById('app').scrollTop={y}"); await page.wait_for_timeout(150)
        await page.screenshot(path=f'{SH}{name}_{i}.png'); i+=1; y += ch-60
    await page.evaluate("document.getElementById('app').scrollTop=0")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme='dark', timezone_id='Europe/Paris')
        page = await ctx.new_page()
        page.on('console', lambda m: errors.append((m.type,m.text)) if m.type in ('error','warning') else None)
        page.on('pageerror', lambda e: errors.append(('pageerror',str(e))))
        await page.clock.install(time=dt.datetime(2026,10,6,15,0,0))
        await page.goto('http://localhost:8768/'); await page.wait_for_timeout(300)
        await page.evaluate("window.__op.loadDemo(); document.querySelector('.onb')?.remove()"); await page.wait_for_timeout(300)
        # tab bar position after scroll on today
        await page.evaluate("document.getElementById('app').scrollTop=600"); await page.wait_for_timeout(200)
        r = await page.evaluate("(() => { const t=document.getElementById('tabs').getBoundingClientRect(); return [t.top, t.bottom, innerHeight, document.scrollingElement.scrollTop]; })()")
        print('tabbar after scroll', r)
        await page.locator('#tabs .tab').nth(2).click(); await page.wait_for_timeout(500)
        await shots(page, '40_stats_week', 6)
        await page.evaluate(SWIPE, 120); await page.wait_for_timeout(500)
        print('after swipe right:', await page.locator('.pnav-title').inner_text(), '|', await page.locator('.pnav-sub').inner_text())
        await page.screenshot(path=SH+'41_week_prev.png')
        await page.evaluate(SWIPE, -120); await page.wait_for_timeout(400)
        print('after swipe left:', await page.locator('.pnav-title').inner_text())
        await page.get_by_role('tab', name='Mois').click(); await page.wait_for_timeout(500)
        await shots(page, '42_stats_month', 2)
        await page.get_by_role('button', name='Période précédente').click(); await page.wait_for_timeout(400)
        print('month prev:', await page.locator('.pnav-title').inner_text(), '|', await page.locator('.ptotal').inner_text())
        await page.screenshot(path=SH+'43_month_prev.png')
        await page.get_by_role('tab', name='Jour').click(); await page.wait_for_timeout(500)
        print('day from past month:', await page.locator('.pnav-title').inner_text())
        await page.locator('.linkbtn').click(); await page.wait_for_timeout(400)
        await shots(page, '44_stats_day', 1)
        # 12-month pick
        await page.get_by_role('tab', name='Semaine').click(); await page.wait_for_timeout(300)
        btns = page.locator('.chart [role=button]')
        print('month buttons', await btns.count())
        await btns.nth(10).click(); await page.wait_for_timeout(400)
        print('picked:', await page.locator('.pnav-title').inner_text())
        # tabbar with sheet open
        await page.locator('#tabs .tab').nth(0).click(); await page.wait_for_timeout(300)
        await page.get_by_role('button', name='Ajouter du temps à Révision cours').nth(1).click(); await page.wait_for_timeout(400)
        r = await page.evaluate("(() => { const s=document.querySelector('.sheet').getBoundingClientRect(); return [s.bottom, innerHeight]; })()")
        print('sheet bottom', r)
        await page.screenshot(path=SH+'45_sheet.png')
        # light theme stats
        await page.keyboard.press('Escape')
        await page.evaluate("(() => { const s = window.__op.S; s.settings.theme='light'; window.__op.S = s; })()")
        await page.locator('#tabs .tab').nth(2).click(); await page.wait_for_timeout(500)
        await shots(page, '46_light', 2)
        # new user: one entry only
        await page.evaluate("(() => { const s = window.__op.S; s.entries = [{id:'x', d: window.__op.today(), c: s.cats[0].id, m: 75, src:'manual', t: Date.now()}]; window.__op.S = s; })()")
        await page.wait_for_timeout(500)
        await shots(page, '47_newuser', 3)
        await b.close()
asyncio.run(main()); srv.terminate()
print('ERRORS', errors)
