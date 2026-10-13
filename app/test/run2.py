import asyncio, subprocess, sys, time, datetime as dt, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8767','--bind','127.0.0.1'], cwd='/home/claude/outperf-gh', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
SH='/home/claude/outperf-gh/app/test/shots/'
errors=[]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme='dark', timezone_id='Europe/Paris')
        page = await ctx.new_page()
        page.on('console', lambda m: errors.append((m.type,m.text)) if m.type in ('error','warning') else None)
        page.on('pageerror', lambda e: errors.append(('pageerror',str(e))))
        await page.clock.install(time=dt.datetime(2026,10,6,9,0,0))
        await page.goto('http://localhost:8767/'); await page.wait_for_timeout(300)
        # onboarding: deselect some, add custom
        await page.get_by_role('button', name='Commencer').click()
        await page.get_by_role('button', name='Code').click()
        await page.get_by_placeholder('Ta catégorie perso').fill('Échecs')
        await page.get_by_role('button', name='Ajouter', exact=True).click()
        await page.get_by_role('button', name='Continuer').click()
        cats = await page.evaluate('window.__op.S.cats.map(c=>c.name)')
        print('cats', cats)
        # one manual entry then stats/journal for a brand new user
        await page.get_by_role('button', name='Ajouter du temps à Révision cours').nth(1).click()
        await page.wait_for_timeout(300)
        await page.get_by_role('button', name='+30 min', exact=True).click()
        for i in (2,3,4,1,0):
            await page.locator('#tabs .tab').nth(i).click(); await page.wait_for_timeout(350)
        await page.locator('#tabs .tab').nth(2).click(); await page.wait_for_timeout(400)
        await page.screenshot(path=SH+'20_stats_newuser.png', full_page=True)
        # import from notes
        await page.locator('#tabs .tab').nth(4).click(); await page.wait_for_timeout(300)
        await page.get_by_role('button', name=lambda n: False) if False else None
        await page.locator('.row', has_text='Importer depuis Notes ou Excel').click(); await page.wait_for_timeout(350)
        await page.locator('textarea').fill("Date\tRévision cours\tProjets\tSport\tTotal\n01/10\t2h30\t1h\t45min\t4h15\n02/10\t3h\t1,5\t\t4,5\n03/10\t\t2h\t1h\t")
        await page.wait_for_timeout(200)
        await page.screenshot(path=SH+'21_import.png')
        await page.locator('.sheet').get_by_role('button', name='Importer', exact=True).click(); await page.wait_for_timeout(300)
        r = await page.evaluate('''() => { const S=window.__op.S; return {cats:S.cats.map(c=>[c.name,c.counts]), n:S.entries.length, imp:S.entries.filter(e=>e.src==='import').map(e=>[e.d,S.cats.find(c=>c.id===e.c).name,e.m])}; }''')
        print('import', json.dumps(r, ensure_ascii=False))
        # create, archive, delete category
        await page.locator('.row', has_text='Nouvelle catégorie').click(); await page.wait_for_timeout(300)
        await page.get_by_placeholder('Ex. Révision cours').fill('Certif AMF')
        await page.get_by_role('button', name='Créer la catégorie').click(); await page.wait_for_timeout(300)
        await page.locator('.row-main', has_text='Certif AMF').click(); await page.wait_for_timeout(300)
        await page.get_by_role('button', name='Archiver').click(); await page.wait_for_timeout(300)
        arch = await page.evaluate('window.__op.S.cats.filter(c=>c.archived).map(c=>c.name)')
        print('archived', arch)
        await page.locator('.row', has_text='Certif AMF').click(); await page.wait_for_timeout(300)
        await page.locator('.sheet').get_by_role('button', name='Supprimer').click(); await page.wait_for_timeout(350)
        await page.locator('.sheet').last.get_by_role('button', name='Supprimer').click(); await page.wait_for_timeout(300)
        print('after delete', await page.evaluate('window.__op.S.cats.map(c=>c.name)'))
        # reorder
        await page.get_by_role('button', name='Descendre Révision cours').click(); await page.wait_for_timeout(200)
        print('order', await page.evaluate('window.__op.S.cats.slice(0,3).map(c=>c.name)'))
        # day end at 4h: chrono 23:30 -> 01:00 counts entirely for the 6th
        await page.evaluate('''() => { const S=window.__op.S; S.settings.dayEnd=4; const a=new Date(2026,9,6,23,30).getTime(), b=new Date(2026,9,7,1,0).getTime(); return null; }''')
        sp = await page.evaluate('''() => { const s=window.__op.S; s.settings.dayEnd=4; const a=new Date(2026,9,6,23,30).getTime(), b=new Date(2026,9,7,5,0).getTime(); return [...window.__op.splitSegs([[a,b]])].map(([k,v])=>[k,v/60000]); }''')
        print('split dayEnd=4', sp)
        await page.screenshot(path=SH+'22_settings_after.png', full_page=True)
        # edit an entry from today
        await page.evaluate('''() => { const s=window.__op.S; s.settings.dayEnd=0; window.__op.S = s; }''')
        await page.locator('#tabs .tab').nth(0).click(); await page.wait_for_timeout(300)
        await page.locator('.ent').first.click(); await page.wait_for_timeout(300)
        await page.screenshot(path=SH+'23_edit_entry.png')
        await b.close()
asyncio.run(main()); srv.terminate()
print('ERRORS', errors)
