const { chromium } = require('playwright');
const N = ['Maya Okafor','Daniel Reyes','Hana Suzuki'];
const cases = {
  'fill \\n': async pg => { await pg.fill('#f-name', N.join('\n')); await pg.click('#add-btn'); },
  'fill \\r\\n': async pg => { await pg.fill('#f-name', N.join('\r\n')); await pg.click('#add-btn'); },
  'type \\n then click': async pg => { await pg.click('#f-name'); await pg.type('#f-name', N.join('\n')); await pg.click('#add-btn'); },
  'type \\n then Enter': async pg => { await pg.click('#f-name'); await pg.type('#f-name', N.join('\n')); await pg.press('#f-name','Enter'); },
  'pressSequentially \\n + click': async pg => { await pg.locator('#f-name').pressSequentially(N.join('\n')); await pg.click('#add-btn'); },
  'insertText + click': async pg => { await pg.focus('#f-name'); await pg.keyboard.insertText(N.join('\n')); await pg.click('#add-btn'); },
  'clipboard paste + click': async pg => { await pg.focus('#f-name'); await pg.evaluate(t => { const dt = new DataTransfer(); dt.setData('text/plain', t); document.querySelector('#f-name').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, N.join('\n')); await pg.keyboard.insertText(''); await pg.click('#add-btn'); },
  'real ctrl+v': async pg => { await pg.evaluate(t => navigator.clipboard.writeText(t), N.join('\n')); await pg.focus('#f-name'); await pg.keyboard.press('Control+V'); await pg.click('#add-btn'); },
  'fill commas': async pg => { await pg.fill('#f-name', N.join(', ')); await pg.click('#add-btn'); },
  'fill single-word commas': async pg => { await pg.fill('#f-name', 'Maya, Daniel, Hana'); await pg.click('#add-btn'); },
  'fill semicolons': async pg => { await pg.fill('#f-name', N.join('; ')); await pg.click('#add-btn'); },
  'fill tabs': async pg => { await pg.fill('#f-name', N.join('\t')); await pg.click('#add-btn'); },
  'fill two-space': async pg => { await pg.fill('#f-name', N.join('  ')); await pg.click('#add-btn'); },
  'fill Lopez, Maria': async pg => { await pg.fill('#f-name', 'Lopez, Maria'); await pg.click('#add-btn'); },
  'fill 3 single-word commas': async pg => { await pg.fill('#f-name', 'Maya, Daniel, Hana'); await pg.click('#add-btn'); },
  'fill Name tab Role': async pg => { await pg.fill('#f-name', 'Maya Okafor\tSupport Agent'); await pg.click('#add-btn'); },
  'fill lines Lopez, Maria': async pg => { await pg.fill('#f-name', 'Lopez, Maria\nSmith, John\nDaniel Reyes, Line Cook'); await pg.click('#add-btn'); },
  'bulk panel fill': async pg => { await pg.click('#bulk-toggle'); await pg.fill('#b-list', N.join('\n')); await pg.click('#b-add'); },
  'bulk panel type': async pg => { await pg.click('#bulk-toggle'); await pg.type('#b-list', N.join('\n')); await pg.click('#b-add'); },
};
(async () => {
  const b = await chromium.launch();
  for (const [name, fn] of Object.entries(cases)) {
    const ctx = await b.newContext({ permissions: ['clipboard-read','clipboard-write'] });
    const pg = await ctx.newPage(); const errs=[]; pg.on('pageerror', e=>errs.push(String(e)));
    await pg.goto('file://' + require('path').resolve(__dirname, '../index.html'));
    const before = await pg.evaluate(() => JSON.parse(localStorage.getItem('talenttrack.v2')||'null'));
    const cnt = async () => Number(await pg.textContent('.lane[data-stage="applied"] .count'));
    const c0 = await cnt();
    try { await fn(pg); } catch(e) { errs.push('step:'+e.message.split('\n')[0]); }
    await pg.waitForTimeout(150);
    const c1 = await cnt();
    const names = await pg.$$eval('.lane[data-stage="applied"] .c-name', ns => ns.map(n=>n.textContent));
    const field = await pg.inputValue('#f-name');
    const bl = await pg.inputValue('#b-list').catch(()=> '');
    console.log(name.padEnd(28), 'delta', c1-c0, '| new:', JSON.stringify(names.slice(0, Math.max(0,c1-c0))), '| field:', JSON.stringify(field), bl?('| bulk:'+JSON.stringify(bl)):'', errs.length?errs:'');
    await ctx.close();
  }
  await b.close();
})();
