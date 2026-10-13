import asyncio, subprocess, sys, time, datetime as dt, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8766','--bind','127.0.0.1'], cwd='/home/claude/outperf-gh', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(timezone_id='Europe/Paris'); page = await ctx.new_page()
        await page.clock.install(time=dt.datetime(2026,10,6,9,0,0))
        await page.goto('http://localhost:8766/'); await page.wait_for_timeout(300)
        await page.evaluate('window.__op.loadDemo()')
        r = await page.evaluate('''() => { const S = window.__op.S; const cats = new Map(S.cats.map(c=>[c.id,c]));
          const by = {}; for (const e of S.entries) { if (!cats.get(e.c).counts) continue; by[e.d]=(by[e.d]||0)+e.m; }
          const sum=(a,b)=>Object.entries(by).filter(([k])=>k>=a&&k<=b).reduce((s,[,v])=>s+v,0);
          const m = window.__op.metrics();
          return {oct: sum('2026-10-01','2026-10-06'), sep: sum('2026-09-01','2026-09-06'), m_month: m.month, m_prev: m.monthPrev, week: m.week, wk_exp: sum('2026-10-05','2026-10-06'), weekPrev: m.weekPrev, wp_exp: sum('2026-09-28','2026-09-29'), today: m.today, yday: m.yday, by_sep: Object.entries(by).filter(([k])=>k<'2026-09-07'&&k>'2026-08-31')}; }''')
        print(json.dumps(r, indent=1))
        await b.close()
asyncio.run(main()); srv.terminate()
