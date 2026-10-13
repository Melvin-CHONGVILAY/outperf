import asyncio, subprocess, sys, time, datetime as dt, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8770','--bind','127.0.0.1'], cwd='/home/claude/outperf-gh', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
SH='/home/claude/outperf-gh/app/test/shots/dev_'
DEVICES = [('se', 375, 667, 20, 0), ('mini', 375, 812, 50, 34), ('i14', 390, 844, 47, 34), ('i16', 393, 852, 59, 34), ('i16pro', 402, 874, 62, 34), ('plus', 428, 926, 47, 34), ('promax', 440, 956, 62, 34)]
TABS = ['today','chrono','stats','journal','settings']
errors=[]
OVERFLOW = '''() => { const W = innerWidth, out = [];
  for (const el of document.querySelectorAll('#app *, #tabs *')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 0.5 || r.left < -0.5)) { const c = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className; out.push(el.tagName + '.' + c + ' ' + Math.round(r.left) + '-' + Math.round(r.right)); } }
  const app = document.getElementById('app'); return { hscroll: app.scrollWidth > app.clientWidth, n: out.length, sample: out.slice(0, 6) }; }'''
async def main():
    only = sys.argv[1:] 
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, w, hgt, sat, sab in DEVICES:
            if only and name not in only: continue
            ctx = await b.new_context(viewport={'width':w,'height':hgt}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme='light', timezone_id='Europe/Paris')
            page = await ctx.new_page()
            page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
            page.on('console', lambda m: errors.append((m.type, m.text)) if m.type == 'error' else None)
            await page.clock.install(time=dt.datetime(2026,10,13,18,0,0))
            await page.goto('http://localhost:8770/'); await page.wait_for_timeout(300)
            await page.add_style_tag(content=f':root{{--sat:{sat}px!important;--sab:{sab}px!important}}')
            await page.evaluate("window.__op.loadDemo(); document.querySelector('.onb')?.remove()"); await page.wait_for_timeout(300)
            res = {}
            for i, t in enumerate(TABS):
                await page.locator('#tabs .tab').nth(i).click(); await page.wait_for_timeout(450)
                res[t] = await page.evaluate(OVERFLOW)
                await page.screenshot(path=f'{SH}{name}_{t}.png')
                if t == 'stats':
                    h = await page.evaluate("document.getElementById('app').scrollHeight"); ch = await page.evaluate("document.getElementById('app').clientHeight")
                    y, k = ch - 60, 1
                    while y < h and k < 6:
                        await page.evaluate(f"document.getElementById('app').scrollTop={y}"); await page.wait_for_timeout(120)
                        await page.screenshot(path=f'{SH}{name}_stats{k}.png'); y += ch - 60; k += 1
                    await page.evaluate("document.getElementById('app').scrollTop=0")
            tb = await page.evaluate("(() => { const r = document.getElementById('tabs').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight]; })()")
            print(name, w, 'tabbar', tb, {k: (v['n'], v['hscroll'], v['sample'][:3]) for k, v in res.items() if v['n'] or v['hscroll']})
            await ctx.close()
        await b.close()
asyncio.run(main()); srv.terminate()
print('ERRORS', errors[:5])
