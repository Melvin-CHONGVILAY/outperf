import asyncio, subprocess, sys, time, datetime as dt, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8769','--bind','127.0.0.1'], cwd='/home/claude/outperf-gh', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
SH='/home/claude/outperf-gh/app/test/shots/'
errors=[]
async def shots(page, name, n=6):
    h = await page.evaluate("document.getElementById('app').scrollHeight"); ch = await page.evaluate("document.getElementById('app').clientHeight")
    i=0; y=0
    while y < h and i < n:
        await page.evaluate(f"document.getElementById('app').scrollTop={y}"); await page.wait_for_timeout(150)
        await page.screenshot(path=f'{SH}{name}_{i}.png'); i+=1; y += ch-60
    await page.evaluate("document.getElementById('app').scrollTop=0")
async def titles(page):
    return await page.evaluate("[...document.querySelectorAll('.pnav-title')].map(e=>e.textContent)")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme='light', timezone_id='Europe/Paris')
        page = await ctx.new_page()
        page.on('console', lambda m: errors.append((m.type,m.text)) if m.type in ('error','warning') else None)
        page.on('pageerror', lambda e: errors.append(('pageerror',str(e))))
        await page.clock.install(time=dt.datetime(2026,10,6,15,0,0))
        await page.goto('http://localhost:8769/'); await page.wait_for_timeout(300)
        print('status meta', await page.evaluate("document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]').content"))
        # new user, data only today
        await page.get_by_role('button', name='Commencer').click(); await page.get_by_role('button', name='Continuer').click(); await page.wait_for_timeout(200)
        await page.evaluate("(() => { const s = window.__op.S; s.entries = [{id:'x', d: window.__op.today(), c: s.cats[0].id, m: 95, src:'manual', t: Date.now()}]; window.__op.S = s; })()")
        await page.locator('#tabs .tab').nth(2).click(); await page.wait_for_timeout(400)
        print('prev buttons disabled:', await page.evaluate("[...document.querySelectorAll('.pnav')].map(n=>n.querySelector('button').disabled)"))
        await page.locator('.pnav').first.locator('button').first.click(); await page.wait_for_timeout(300)
        await page.locator('.pnav').first.locator('button').first.click(); await page.wait_for_timeout(300)
        print('period after 2x prev (new user):', (await titles(page))[0], '|', await page.locator('.pdelta').inner_text())
        await shots(page, '50_newuser', 2)
        # demo data
        await page.evaluate("window.__op.loadDemo(); document.querySelector('.onb')?.remove()"); await page.wait_for_timeout(300)
        await page.locator('#tabs .tab').nth(0).click(); await page.locator('#tabs .tab').nth(2).click(); await page.wait_for_timeout(500)
        print('titles', await titles(page))
        await shots(page, '51_stats', 7)
        # click prev on each secondary card
        navs = page.locator('.pnav.sm')
        for i in range(await navs.count()):
            await page.locator('.pnav.sm').nth(i).locator('button').first.click(); await page.wait_for_timeout(300)
        print('after prev on each card', await titles(page))
        await shots(page, '52_stats_prev', 7)
        await page.locator('.pnav.sm').nth(1).locator('button').last.click(); await page.wait_for_timeout(300)
        print('regularity next', (await titles(page))[2])
        await b.close()
asyncio.run(main()); srv.terminate()
print('ERRORS', errors)
