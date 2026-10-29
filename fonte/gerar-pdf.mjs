// Gera o PDF do deck: cada página é a tela exata (1600x900, em 2x), no estado final (?pdf=1).
//   node fonte/gerar-pdf.mjs [endereço do deck] [saída.pdf]
// O endereço padrão é a prévia local (python3 -m http.server 4703 na cópia do deck).
// Página 1: capa do PDF (pdf-capa.html) com link para a versão em HTML, a apresentação completa.
// Tela com botões (temporizador em deck.js): uma página por botão, para o PDF ler cada estado.
import { chromium } from '/Volumes/hd caique becker/Mac Caique/Projetos/ariuno-videos/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] || 'http://localhost:4703/').replace(/#.*$/, '');
const SAIDA = process.argv[3] || fileURLToPath(new URL('../havaianas-sao-joao-2027-75lab.pdf', import.meta.url));
const LINK = 'https://projetos.75lab.com.br/havaianas-sao-joao-2027/';
const TITULO = 'Havaianas Sao Joao 2027 - campanha demo 75 LAB';
const PASTA = process.env.PASTA_PAGINAS || '';   // se definida, guarda os JPG de cada página para revisar
const QUALIDADE = 86;
// MONTAR=1 só monta o PDF com os JPG já fotografados em PASTA_PAGINAS (a página 1 é a capa com link)
const MONTAR = !!process.env.MONTAR;

const paginas = [];   // { jpg, link }
if (MONTAR) readdirSync(PASTA).filter((f) => f.endsWith('.jpg')).sort().forEach((f, i) => paginas.push({ jpg: readFileSync(`${PASTA}/${f}`), link: i === 0 ? LINK : '' }));
else {
const navegador = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await navegador.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
pg.on('pageerror', (e) => console.log('erro na página:', e.message));
if (PASTA) mkdirSync(PASTA, { recursive: true });

const esperaImagens = () => pg.evaluate(async () => {
  const t = document.querySelector('.tela.ativa') || document.body;
  // imagem escondida com loading=lazy nunca carrega: só espera as visíveis, e no máximo 15 s
  const vis = [...t.querySelectorAll('img')].filter((i) => i.offsetParent !== null);
  vis.forEach((i) => { i.loading = 'eager'; });
  await Promise.race([Promise.all(vis.map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 15000))]);
  const mvs = [...t.querySelectorAll('model-viewer')].filter((m) => m.offsetParent !== null);
  if (mvs.length) {
    const ate = Date.now() + 30000;
    while (Date.now() < ate && !mvs.every((m) => m.loaded)) await new Promise((r) => setTimeout(r, 300));
    await new Promise((r) => setTimeout(r, 1500));
  }
});
async function foto(rotulo, link) {
  await pg.waitForTimeout(700);
  const jpg = await pg.screenshot({ type: 'jpeg', quality: QUALIDADE, timeout: 180000 });
  paginas.push({ jpg, link });
  if (PASTA) writeFileSync(`${PASTA}/${String(paginas.length).padStart(2, '0')}.jpg`, jpg);
  console.log('página', paginas.length, rotulo, Math.round(jpg.length / 1024) + ' KB');
}

// capa do PDF
await pg.goto(BASE + 'pdf-capa.html', { waitUntil: 'networkidle' });
await pg.evaluate(() => document.fonts.ready);
await foto('capa do PDF', LINK);

await pg.goto(BASE + '?pdf=1#1', { waitUntil: 'networkidle' });
await pg.evaluate(() => document.fonts.ready);
const total = await pg.evaluate(() => document.querySelectorAll('.tela').length);
for (let n = 1; n <= total; n++) {
  await pg.evaluate((n) => { location.hash = '#' + n; }, n);
  await pg.waitForFunction((n) => document.querySelector('#cont').textContent.startsWith(String(n).padStart(2, '0')), n);
  await esperaImagens();
  const estados = await pg.evaluate(() => (window.__pdfEstados ? window.__pdfEstados() : 0));
  if (!estados) { await foto('tela ' + n); continue; }
  await pg.evaluate(() => document.documentElement.classList.add('estados'));
  for (let k = 0; k < estados; k++) {
    await pg.evaluate((k) => window.__pdfEstado(k), k);
    await pg.waitForTimeout(500);
    await esperaImagens();
    await foto(`tela ${n} botão ${k + 1}/${estados}`);
  }
  await pg.evaluate(() => document.documentElement.classList.remove('estados'));
}
await navegador.close();
}

// PDF mínimo: uma imagem JPEG (DCTDecode, sem recompressão) por página de 960 x 540 pt (16:9, tamanho de slide)
// A página com link ganha uma anotação /Link cobrindo a página toda.
const W = 960, H = 540;
// largura e altura do JPEG (marcador SOF), porque as páginas podem ter sido reduzidas antes de montar
const tamJpg = (b) => { for (let i = 2; i < b.length;) { const m = b[i + 1], l = b.readUInt16BE(i + 2); if (m >= 0xC0 && m <= 0xC3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + l; } return [3200, 1800]; };
const partes = [], offs = [];
let tam = 0;
const poe = (b) => { const buf = Buffer.isBuffer(b) ? b : Buffer.from(b, 'binary'); partes.push(buf); tam += buf.length; };
const obj = (id, corpo) => { offs[id] = tam; poe(`${id} 0 obj\n`); corpo(); poe('\nendobj\n'); };
poe('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
const n = paginas.length, idPag = (i) => 3 + i * 3;
obj(1, () => poe('<< /Type /Catalog /Pages 2 0 R >>'));
obj(2, () => poe(`<< /Type /Pages /Count ${n} /Kids [${paginas.map((_, i) => `${idPag(i)} 0 R`).join(' ')}] >>`));
paginas.forEach(({ jpg, link }, i) => {
  const p = idPag(i);
  const conteudo = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  const annot = link ? ` /Annots [<< /Type /Annot /Subtype /Link /Rect [0 0 ${W} ${H}] /Border [0 0 0] /A << /S /URI /URI (${link}) >> >>]` : '';
  obj(p, () => poe(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R${annot} >>`));
  obj(p + 1, () => poe(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`));
  obj(p + 2, () => { const [PX, PY] = tamJpg(jpg); poe(`<< /Type /XObject /Subtype /Image /Width ${PX} /Height ${PY} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); poe(jpg); poe('\nendstream'); });
});
const xref = tam, ult = 2 + n * 3;
poe(`xref\n0 ${ult + 1}\n0000000000 65535 f \n`);
for (let i = 1; i <= ult; i++) poe(`${String(offs[i]).padStart(10, '0')} 00000 n \n`);
poe(`trailer\n<< /Size ${ult + 1} /Root 1 0 R /Info << /Title (${TITULO}) /Author (75 LAB) >> >>\nstartxref\n${xref}\n%%EOF\n`);
writeFileSync(SAIDA, Buffer.concat(partes));
console.log('PDF', SAIDA, Math.round(tam / 1024 / 1024 * 10) / 10 + ' MB,', n, 'páginas');
