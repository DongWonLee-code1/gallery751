/**
 * 작가 페이지 주소 (/artist/작가ID)
 *
 * 사이트는 index.html 한 장이라 작가 페이지가 자바스크립트로 그려집니다.
 * 검색엔진(특히 네이버)이 "작가 이름"으로 찾을 수 있도록,
 * 여기서 index.html 에 작가 소개·전시 이력·작품 목록·가격을 미리 넣어서 보냅니다.
 * 브라우저에서는 index.html 이 평소처럼 뜨고 같은 작가 페이지를 다시 그립니다.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://www.gallery751.com';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = (u) => /^https?:\/\//.test(u) ? u : SITE + '/' + String(u).replace(/^\/+/, '');
const hasPrice = (w) => w.price !== null && w.price !== undefined && w.price !== '';
const won = (w) => hasPrice(w) ? Number(w.price).toLocaleString('ko-KR') + '원' : (w.priceLabel || '가격 준비 중');
const STATUS = { sold: '판매됨', reserved: '예약중' };
const AVAIL = { sold: 'https://schema.org/SoldOut', reserved: 'https://schema.org/LimitedAvailability' };

export const isReal = (a) => a && a.id && a.name && !String(a.id).startsWith('sample');

function setHead(html, { title, desc, url, image, jsonld }) {
  const rep = (re, val) => { html = html.replace(re, val); };
  rep(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  rep(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  rep(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`);
  rep(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
  rep(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  rep(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="profile">`);
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

function artistHTML(a, works) {
  const meta = [a.activity, a.region, (a.materials || []).join(', ')].filter(Boolean).join(' · ');
  const exh = (a.exhibitions || []).length
    ? `<div class="a-exh"><span class="label">전시</span><ul>${a.exhibitions.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : '';
  const press = (a.press || []).length
    ? `<div class="a-exh"><span class="label">인터뷰 · 기사</span><ul>${a.press.map(x => `<li><a href="${esc(x.url)}" rel="noopener">${esc(x.label)}</a></li>`).join('')}</ul></div>` : '';
  const cards = works.map(w => `<a class="card" href="/#${esc(w.id)}" data-id="${esc(w.id)}">
      <span class="card-img">${STATUS[w.status] ? `<span class="badge">${STATUS[w.status]}</span>` : ''}<img src="/${esc(w.images?.[0] || '')}" alt="${esc(w.title)} — ${esc(a.name)}" loading="lazy"></span>
      <span class="card-meta"><span class="card-title">${esc(w.title)}</span><span class="card-artist">${esc(a.name)}</span>
      <span class="card-sub">${esc([w.year, w.medium, w.size].filter(Boolean).join(' · '))}</span>
      <span class="card-price">${esc(won(w))}</span></span></a>`).join('');
  return `<div class="wrap">
    <a class="a-back" href="/#/artists">← 작가 목록으로</a>
    <div class="a-head${a.portrait ? '' : ' noportrait'}">
      ${a.portrait ? `<img class="a-portrait" src="/${esc(a.portrait)}" alt="${esc(a.name)} 작가">` : ''}
      <div>
        <div class="a-name"><h1>${esc(a.name)}</h1></div>
        ${a.tagline ? `<p class="a-tag">${esc(a.tagline)}</p>` : ''}
        ${a.education ? `<p class="a-edu">${esc(a.education)}</p>` : ''}
        ${meta ? `<p class="a-meta">${esc(meta)}</p>` : ''}
      </div>
    </div>
    ${a.story ? `<p class="a-story">${esc(a.story)}</p>` : ''}
    ${exh}${press}
    <div class="a-works"><h2 class="label">${esc(a.name)} 작가의 작품</h2><div class="grid" style="margin-top:24px">${cards}</div></div>
  </div>`;
}

export async function render(id) {
  const root = process.cwd();
  const [tpl, ar, wk] = await Promise.all(['index.html', 'artists.json', 'works.json']
    .map(f => readFile(path.join(root, f), 'utf8')));
  const a = JSON.parse(ar).filter(isReal).find(x => x.id === id);
  let html = tpl
    .replace('<main class="page" id="page-home">', '<main class="page" id="page-home" hidden>')
    .replace('<body>', '<body class="subpage">');

  if (!a) {
    html = setHead(html, { title: '작가 — Gallery 751', desc: '찾는 작가 페이지가 없습니다.', url: `${SITE}/` });
    html = html.replace('<head>', '<head>\n<meta name="robots" content="noindex">')
      .replace('<main class="page" id="page-artists" hidden>', '<main class="page" id="page-artists">');
    return { status: 404, html };
  }

  const works = JSON.parse(wk).filter(w => w.artistId === a.id);
  const url = `${SITE}/artist/${encodeURIComponent(a.id)}`;
  const image = a.portrait ? abs(a.portrait) : (works[0]?.images?.[0] ? abs(works[0].images[0]) : '');
  const priced = works.filter(hasPrice).map(w => Number(w.price));
  const range = priced.length
    ? ` 작품 가격 ${Math.min(...priced).toLocaleString('ko-KR')}원부터.` : '';
  const lead = a.tagline || String(a.story || '').split('\n')[0];
  const desc = `${a.name} 작가의 원화 ${works.length}점을 가격과 함께 소개합니다.${range} ${lead}`.trim().slice(0, 160);

  html = setHead(html, {
    title: `${a.name} 작가 — 작품·가격 | Gallery 751`, desc, url, image,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'ProfilePage', url,
      mainEntity: {
        '@type': 'Person', name: a.name, jobTitle: '작가', url,
        description: lead || undefined, image: a.portrait ? abs(a.portrait) : undefined,
        sameAs: a.instagram ? [`https://www.instagram.com/${String(a.instagram).replace(/^@/, '')}/`] : undefined,
      },
      hasPart: works.map(w => ({
        '@type': 'VisualArtwork', name: w.title, image: w.images?.[0] ? abs(w.images[0]) : undefined,
        dateCreated: w.year ? String(w.year) : undefined, artMedium: w.medium || undefined,
        creator: { '@type': 'Person', name: a.name },
        offers: hasPrice(w) ? {
          '@type': 'Offer', price: Number(w.price), priceCurrency: 'KRW',
          availability: AVAIL[w.status] || 'https://schema.org/InStock', url: `${SITE}/#${w.id}`,
        } : undefined,
      })),
    },
  });
  html = html.replace('<main class="artist-view" id="artist-view" hidden></main>',
    `<main class="artist-view" id="artist-view">${artistHTML(a, works)}</main>`);
  return { status: 200, html };
}

export default async function handler(req, res) {
  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  try {
    const { status, html } = await render(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.status(status).send(html);
  } catch (e) {
    console.error('artist', e);
    res.status(500).send('작가 페이지를 불러오지 못했습니다.');
  }
}
