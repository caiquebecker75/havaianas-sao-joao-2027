// Gera o PDF do deck: cada página é a tela exata (1600x900, em 2x), no estado final (?pdf=1).
//   node fonte/gerar-pdf.mjs [endereço do deck] [saída.pdf]
// O endereço padrão é a prévia local (python3 -m http.server 4703 na cópia do deck).
import { chromium } from '/Volumes/hd caique becker/Mac Caique/Projetos/ariuno-videos/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:4703/';
const SAIDA = process.argv[3] || new URL('../havaianas-sao-joao-2027-75lab.pdf', import.meta.url).pathname;
const PASTA = process.env.PASTA_PAGINAS || '';   // se definida, guarda os JPG de cada página para revisar
const QUALIDADE = 86;

const navegador = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await navegador.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
pg.on('pageerror', (e) => console.log('erro na página:', e.message));
await pg.goto(BASE.replace(/#.*$/, '') + (BASE.includes('?') ? '&' : '?') + 'pdf=1#1', { waitUntil: 'networkidle' });
await pg.evaluate(() => document.fonts.ready);
const total = await pg.evaluate(() => document.querySelectorAll('.tela').length);
if (PASTA) mkdirSync(PASTA, { recursive: true });

const paginas = [];
for (let n = 1; n <= total; n++) {
  await pg.evaluate((n) => { location.hash = '#' + n; }, n);
  await pg.waitForFunction((n) => document.querySelector('#cont').textContent.startsWith(String(n).padStart(2, '0')), n);
  // espera as imagens da tela e, na tela de AR, os modelos 3D
  await pg.evaluate(async () => {
    const t = document.querySelector('.tela.ativa');
    // imagem escondida com loading=lazy nunca carrega: só espera as visíveis, e no máximo 15 s
    const vis = [...t.querySelectorAll('img')].filter((i) => i.offsetParent !== null);
    vis.forEach((i) => { i.loading = 'eager'; });
    await Promise.race([Promise.all(vis.map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 15000))]);
    const mvs = [...t.querySelectorAll('model-viewer')];
    if (mvs.length) {
      const ate = Date.now() + 30000;
      while (Date.now() < ate && !mvs.every((m) => m.loaded)) await new Promise((r) => setTimeout(r, 300));
      await new Promise((r) => setTimeout(r, 1500));
    }
  });
  await pg.waitForTimeout(700);
  const jpg = await pg.screenshot({ type: 'jpeg', quality: QUALIDADE, timeout: 180000 });
  if (PASTA) writeFileSync(`${PASTA}/${String(n).padStart(2, '0')}.jpg`, jpg);
  paginas.push(jpg);
  console.log('página', n, Math.round(jpg.length / 1024) + ' KB');
}
await navegador.close();

// PDF mínimo: uma imagem JPEG (DCTDecode, sem recompressão) por página de 960 x 540 pt (16:9, tamanho de slide)
const W = 960, H = 540, PX = 3200, PY = 1800;
const partes = [], offs = [];
let tam = 0;
const poe = (b) => { const buf = Buffer.isBuffer(b) ? b : Buffer.from(b, 'binary'); partes.push(buf); tam += buf.length; };
const obj = (id, corpo) => { offs[id] = tam; poe(`${id} 0 obj\n`); corpo(); poe('\nendobj\n'); };
poe('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
const n = paginas.length, idPag = (i) => 3 + i * 3;
obj(1, () => poe('<< /Type /Catalog /Pages 2 0 R >>'));
obj(2, () => poe(`<< /Type /Pages /Count ${n} /Kids [${paginas.map((_, i) => `${idPag(i)} 0 R`).join(' ')}] >>`));
paginas.forEach((jpg, i) => {
  const p = idPag(i);
  const conteudo = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  obj(p, () => poe(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`));
  obj(p + 1, () => poe(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`));
  obj(p + 2, () => { poe(`<< /Type /XObject /Subtype /Image /Width ${PX} /Height ${PY} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); poe(jpg); poe('\nendstream'); });
});
const xref = tam, ult = 2 + n * 3;
poe(`xref\n0 ${ult + 1}\n0000000000 65535 f \n`);
for (let i = 1; i <= ult; i++) poe(`${String(offs[i]).padStart(10, '0')} 00000 n \n`);
poe(`trailer\n<< /Size ${ult + 1} /Root 1 0 R /Info << /Title (Havaianas Sao Joao 2027 - campanha demo 75 LAB) /Author (75 LAB) >> >>\nstartxref\n${xref}\n%%EOF\n`);
writeFileSync(SAIDA, Buffer.concat(partes));
console.log('PDF', SAIDA, Math.round(tam / 1024 / 1024 * 10) / 10 + ' MB,', n, 'páginas');
