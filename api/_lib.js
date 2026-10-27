/**
 * 검색엔진용으로 index.html 을 미리 채워 보내는 함수들(artist·page)이 같이 쓰는 도구
 * (파일 이름이 _ 로 시작하면 Vercel 이 주소로 열지 않습니다)
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SITE = 'https://www.gallery751.com';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const abs = (u) => /^https?:\/\//.test(u) ? u : SITE + '/' + String(u).replace(/^\/+/, '');
export const hasPrice = (w) => w.price !== null && w.price !== undefined && w.price !== '';
export const won = (w) => hasPrice(w) ? Number(w.price).toLocaleString('ko-KR') + '원' : (w.priceLabel || '가격 준비 중');
export const STATUS = { sold: '판매됨', reserved: '예약중' };
export const AVAIL = { sold: 'https://schema.org/SoldOut', reserved: 'https://schema.org/LimitedAvailability' };
export const isReal = (a) => a && a.id && a.name && !String(a.id).startsWith('sample');

export async function load(...files) {
  const root = process.cwd();
  return Promise.all(files.map(f => readFile(path.join(root, f), 'utf8')
    .then(t => f.endsWith('.json') ? JSON.parse(t) : t)));
}

/* 실제로 사이트에 걸린 작품 — 작가가 실제 입점 작가인 것만 */
export const liveWorks = (works, artists) => {
  const ok = new Set(artists.filter(isReal).map(a => a.id));
  return works.filter(w => w && w.id && w.title && ok.has(w.artistId));
};


/* 네이버 서치어드바이저 기준: 제목 40자, 설명 80자 이내.
   설명은 80자 안에서 마지막 문장 끝에서 자르고, 제목은 넘치면 " | Gallery 751" 꼬리를 뗍니다 */
export function clipDesc(s, max = 80) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('다. '), cut.lastIndexOf('요. '), cut.lastIndexOf('. '));
  return end > 20 ? cut.slice(0, end + 2).trim() : cut.slice(0, max - 1).trim() + '…';
}
export function clipTitle(t, max = 40) {
  t = String(t || '');
  if (t.length <= max) return t;
  const bare = t.replace(/\s*[|—]\s*(Gallery 751|갤러리751)$/, '');
  return bare.length <= max ? bare : bare.slice(0, max - 1) + '…';
}

/* <head> 의 제목·설명·공유 태그를 바꿉니다 */
export function setHead(html, { title, desc, url, image, type = 'website', jsonld }) {
  title = clipTitle(title); desc = clipDesc(desc);
  const rep = (re, val) => { html = html.replace(re, val); };
  rep(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  rep(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  rep(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`);
  rep(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
  rep(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  rep(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${esc(type)}">`);
  rep(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`);
  if (image) {
    rep(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`);
    rep(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${esc(image)}">`);
    rep(/<meta property="og:image:width" content="[^"]*">\n?/, '');
    rep(/<meta property="og:image:height" content="[^"]*">\n?/, '');
  }
  if (jsonld) html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>\n</head>`);
  return html;
}

/* 홈 대신 다른 화면이 보이는 상태로 바꿉니다 */
export const leaveHome = (tpl) => tpl
  .replace('<main class="page" id="page-home">', '<main class="page" id="page-home" hidden>')
  .replace('<body>', '<body class="subpage">');

export const noindex = (html) => html.replace('<head>', '<head>\n<meta name="robots" content="noindex">');

export function send(res, { status, html }) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  res.status(status).send(html);
}

/* 상황별 작품 모음(/buy/모음ID) — collections.json 의 조건으로 작품을 거릅니다.
   작품이 새로 올라오면 조건에 맞는 모음에 자동으로 들어가고, 작품이 MIN_COL 점 미만인 모음은 주소를 열지 않습니다.
   같은 조건 함수가 index.html(colMatch)에도 있으니 바꿀 때 둘 다 고칩니다 */
export const MIN_COL = 3;
export function colMatch(w, f = {}) {
  if (w.status === 'sold') return false;
  const p = Number(w.price), h = Number(w.sizeHo);
  if (f.priceMax != null && !(hasPrice(w) && p <= f.priceMax)) return false;
  if (f.priceMin != null && !(hasPrice(w) && p >= f.priceMin)) return false;
  if (f.hoMax != null && !(h > 0 && h <= f.hoMax)) return false;
  if (f.hoMin != null && !(h >= f.hoMin)) return false;
  if (f.medium && !f.medium.some(s => String(w.medium || '').includes(s))) return false;
  return true;
}
/* 작품이 충분한 모음만 [{ ...모음, works }] 로 돌려줍니다 */
export const liveCols = (cols, works) => (Array.isArray(cols) ? cols : [])
  .map(c => ({ ...c, works: works.filter(w => colMatch(w, c.filter)) }))
  .filter(c => c.slug && c.works.length >= MIN_COL);
