const { chromium } = require('playwright');
const SP=require('os').tmpdir()+'/';
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs=[]; pg.on('pageerror', e=>errs.push(String(e))); pg.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  const T = async () => (await pg.textContent('#toast-msg'));
  const st = async (name) => pg.evaluate(n => { const s = JSON.parse(localStorage.getItem('talenttrack.v2')); const c = s.candidates.find(x=>x.name===n); return c && c.stage; }, name);
  const inv = async (label) => { const bad = await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('talenttrack.v2')||'{"candidates":[]}'); return s.candidates.filter(c => ['offer','hired'].includes(c.stage) && (/driver|cdl|truck/i.test(c.role) && c.needsCdl!==false || c.needsCdl===true) && !c.licVerified).map(c=>c.name); }); console.log('invariant', label, bad.length ? 'FAIL '+bad : 'ok'); };
  console.log('totals:', await pg.textContent('#totals'), '|', await pg.textContent('#renege-total'), '|', await pg.textContent('#rc-total'), '|', await pg.textContent('#cdl-total'));
  console.log('footer:', (await pg.textContent('.site-foot')).replace(/\s+/g,' '));
  const card = n => pg.locator('.card', { hasText: n });
  console.log('Nguyen badges:', await card('Nguyen Thi Lan').locator('.c-meta').textContent());
  console.log('Nguyen rc line:', await card('Nguyen Thi Lan').locator('[data-rc-line]').textContent());
  console.log('Bui badges:', await card('Bui Van Duc').locator('.c-meta').textContent());
  console.log('Jake badges:', await card('Jake Turner').locator('.c-meta').textContent());
  console.log('Colin badges:', await card('Colin Murphy').locator('.c-meta').textContent());
  console.log('Rosa badges:', await card('Rosa Diaz').locator('.c-meta').textContent());
  await pg.screenshot({ path: SP+'desk-full.png', fullPage: false });
  // 1 Move button
  await card('Jake Turner').locator('.btn-next').click();
  console.log('move btn ->', await st('Jake Turner'), '|', await T(), '| alert:', await card('Jake Turner').locator('.c-block').count());
  await card('Jake Turner').screenshot({ path: SP+'jake-blocked.png' });
  // 2 dropdown offer and hired
  await card('Jake Turner').locator('.c-select').selectOption('offer');
  console.log('dropdown offer ->', await st('Jake Turner'), '|', await T());
  await card('Jake Turner').locator('.c-select').selectOption('hired');
  console.log('dropdown hired ->', await st('Jake Turner'));
  await inv('after manual');
  // 3 AI recruiter move all
  await pg.fill('#stuck-days', '1'); await pg.dispatchEvent('#stuck-days','change');
  await pg.click('#rec-run');
  console.log('rec list has Jake:', (await pg.textContent('#rec-out')).includes('Jake Turner'));
  // per-row button
  await pg.locator('#rec-out li', { hasText: 'Jake Turner' }).locator('button').click();
  console.log('rec row ->', await st('Jake Turner'), '|', await T());
  await pg.click('#rec-all');
  console.log('rec all ->', await st('Jake Turner'), '|', (await T()).slice(0,200));
  await inv('after recruiter');
  // undo of move-all
  if (await pg.isVisible('#toast-undo')) { await pg.click('#toast-undo'); }
  await inv('after undo');
  await pg.fill('#stuck-days', '5'); await pg.dispatchEvent('#stuck-days','change');
  // 4 AI agent
  await pg.selectOption('#ag-cand', { label: await pg.evaluate(()=>{ const o=[...document.querySelectorAll('#ag-cand option')].find(o=>o.textContent.includes('Jake')); return o && o.textContent; }) });
  await pg.click('#ag-start');
  for (let i=0;i<30;i++) {
    await pg.waitForTimeout(400);
    if (await pg.isVisible('#ag-input')) { await pg.click('#ag-sample'); await pg.click('#ag-send'); }
    if ((await pg.textContent('#ag-result')).trim()) break;
  }
  await pg.waitForTimeout(1500);
  console.log('ai agent ->', await st('Jake Turner'), '| result:', (await pg.textContent('#ag-result')).slice(0,160));
  console.log('log:', (await pg.textContent('#auto-log')).slice(0,300));
  await inv('after agent');
  // 5 verify then move works; untick bounces
  await card('Jake Turner').locator('.cdl-verified').check();
  console.log('verify ->', await T(), '| cdl total', await pg.textContent('#cdl-total'));
  await card('Jake Turner').locator('.btn-next').click();
  console.log('verified move ->', await st('Jake Turner'));
  await card('Jake Turner').locator('.cdl-verified').uncheck();
  await pg.waitForTimeout(50);
  console.log('untick at offer ->', await st('Jake Turner'), '|', await T());
  await inv('after untick');
  // Requires CDL toggle on a non-driver in offer (Nora)
  await card('Nora Lindqvist').locator('.cdl-need').check();
  await pg.waitForTimeout(50);
  console.log('Nora requires CDL ->', await st('Nora Lindqvist'), '|', await T());
  await pg.click('#toast-undo'); await pg.waitForTimeout(50);
  console.log('Nora undo ->', await st('Nora Lindqvist'));
  // 6 residence card change
  await card('Nguyen Thi Lan').locator('.rc-status').selectOption('submitted');
  console.log('rc change ->', await T(), '|', await pg.textContent('#rc-total'));
  // Rohan
  const rohan = async (d, n) => { await pg.fill('#f-name', 'Rohan Test '+n); await pg.fill('#f-accepted', d); await pg.fill('#f-notice', String(n)); await pg.click('#add-btn'); const c = card('Rohan Test '+n); return [await c.locator('[data-f="joining"]').textContent(), await c.locator('.badge-renege').count()]; };
  console.log('rohan 90:', await rohan('2026-10-05', 90));
  console.log('rohan 60:', await rohan('2026-10-05', 60));
  const c = card('Rohan Test 90'); await c.locator('.o-date').fill(''); await c.locator('.o-notice').fill('');
  console.log('rohan cleared:', await c.locator('[data-f="joining"]').textContent(), await c.locator('[data-f="notice"]').textContent(), await c.locator('.badge-renege').count(), await pg.textContent('#renege-total'));
  // mobile
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  m.on('pageerror', e=>errs.push('m:'+e));
  await m.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  console.log('mobile overflow:', await m.evaluate(()=>document.documentElement.scrollWidth));
  await m.locator('.card', {hasText:'Jake Turner'}).scrollIntoViewIfNeeded();
  await m.screenshot({ path: SP+'mobile-jake.png' });
  console.log('errors:', errs);
  await b.close();
})();

// Sabinal Freight: a tester adds their own driver and clicks straight through every stage.
(async () => {
  const b = await chromium.launch();
  for (const [name, role] of [['Test Driver', ''], ['Sam Hill', 'Delivery driver'], ['Pat Lee', 'CDL-A Truck Operator']]) {
    const pg = await b.newPage();
    await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
    await pg.fill('#f-name', name); await pg.fill('#f-role', role); await pg.click('#add-btn');
    const card = () => pg.locator('.card', { hasText: name });
    const vis = await card().locator('.cdl-verified').isVisible();
    for (let i = 0; i < 4; i++) { const btn = card().locator('.btn-next'); if (await btn.count()) await btn.click(); }
    const stage = await card().evaluate(el => el.closest('.lane').dataset.stage);
    await card().locator('.c-select').selectOption('offer');
    const stage2 = await card().evaluate(el => el.closest('.lane').dataset.stage);
    console.log('straight through', JSON.stringify(name), JSON.stringify(role), '| checkbox visible:', vis, '| stage after clicks:', stage, '| after dropdown:', stage2, '| toast:', await pg.textContent('#toast-msg'));
    await pg.close();
  }
  await b.close();
})();
