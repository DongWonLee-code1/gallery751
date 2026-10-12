/**
 * 작품 한 점 주소 (/work/작품ID) 와 주요 안내 화면 주소 (/buy /artists /records /how /about)
 *
 * 사이트 안에서는 이 화면들을 #/buy 같은 해시 주소로 오가는데, 해시 주소는 검색엔진이 따로 읽지 않습니다.
 * 그래서 같은 화면을 진짜 주소로도 열 수 있게 하고, 제목·설명·대표 사진·구조화 데이터를 미리 넣어 보냅니다.
 * 브라우저에서는 index.html 이 평소처럼 떠서 같은 화면(작품은 상세 창)을 그대로 엽니다.
 */
import { SITE, esc, abs, hasPrice, won, STATUS, AVAIL, isReal, load, liveWorks, setHead, leaveHome, noindex, send } from './_lib.js';
import { workCard } from './artist.js';

/* 해시 화면을 진짜 주소로 열 때 쓰는 제목·설명 */
export const PAGES = {
  buy: {
    title: '작품 구매하기 — 작가 원화 가격 공개 | Gallery 751',
    desc: '작가님이 직접 그린 원화를 가격을 모두 공개해 판매합니다. 크기(호수)와 호당 가격, 판매 기록을 보고 고르실 수 있고 진품증명서를 함께 보내드립니다.',
  },
  artists: {
    title: '작가 소개 — Gallery 751',
    desc: 'Gallery 751에 작품을 거는 작가님들을 소개합니다. 작가별 학력과 전시 이력, 작품과 판매 기록을 한곳에서 보실 수 있습니다.',
  },
  records: {
    title: '판매 기록 — 어떤 그림이 언제 얼마에 팔렸는지 | Gallery 751',
    desc: 'Gallery 751에서 팔린 그림은 모두 기록으로 남깁니다. 어떤 작가의 어떤 작품이 언제 얼마에 팔렸는지 누구나 확인하실 수 있습니다.',
  },
  how: {
    title: '구매 절차 — 원화 사는 법 | Gallery 751',
    desc: '처음 원화를 사시는 분도 어렵지 않도록 구매 신청부터 입금, 포장·발송, 진품증명서와 거래확인서를 받으시기까지의 과정을 안내합니다.',
  },
  about: {
    title: 'Gallery 751 소개 — 가격과 과정을 공개하는 갤러리',
    desc: 'Gallery 751는 작품 가격과 판매 기록을 투명하게 공개해, 그림을 사는 분과 그리는 분이 서로를 만날 수 있게 하는 온라인 갤러리입니다.',
  },
};

function workHTML(w, a) {
  const rows = [
    ['작가', a ? `<a href="/artist/${esc(a.id)}">${esc(a.name)}</a>` : ''],
    ['제작 연도', esc(w.year || '')],
    ['재료', esc(w.medium || '')],
    ['크기', esc(w.size || '') + (w.sizeHo ? ` (${esc(w.sizeHo)}호)` : '')],
    ['가격', esc(won(w))],
    ['상태', esc(STATUS[w.status] || '구매 가능')],
  ].filter(r => r[1]);
  return `<div class="wrap">
    <a class="a-back" href="/buy">← 작품 목록으로</a>
    <article class="w-ssr">
      ${w.images?.[0] ? `<img src="/${esc(w.images[0])}" alt="${esc(w.title)} — ${esc(a?.name || '')}" style="max-width:100%;height:auto">` : ''}
      <h1>${esc(w.title)}</h1>
      <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <p>진품증명서와 거래확인서를 함께 보내드립니다. <a href="/how">구매 절차 보기</a></p>
    </article>
  </div>`;
}

async function renderWork(id) {
  const [tpl, artists, works] = await load('index.html', 'artists.json', 'works.json');
  const w = liveWorks(works, artists).find(x => x.id === id);
  let html = leaveHome(tpl);
  if (!w) {
    html = noindex(setHead(html, { title: '작품 — Gallery 751', desc: '찾는 작품이 없습니다.', url: `${SITE}/buy` }))
      .replace('<main class="page" id="page-buy" hidden>', '<main class="page" id="page-buy">');
    return { status: 404, html };
  }
  const a = artists.find(x => x.id === w.artistId);
  const url = `${SITE}/work/${encodeURIComponent(w.id)}`;
  const image = w.images?.[0] ? abs(w.images[0]) : '';
  const spec = [w.medium, w.size && (w.size + (w.sizeHo ? `(${w.sizeHo}호)` : '')), w.year && `${w.year}년`].filter(Boolean).join(', ');
  const priceLine = hasPrice(w) ? ` 가격 ${won(w)}.` : '';
  const desc = `${a.name} 작가의 원화 〈${w.title}〉. ${spec}.${priceLine} 진품증명서와 거래확인서를 함께 보내드립니다.`;
  html = setHead(html, {
    title: `${w.title} — ${a.name} 작가 원화 | Gallery 751`, desc, url, image, type: 'product',
    jsonld: {
      '@context': 'https://schema.org', '@type': ['VisualArtwork', 'Product'],
      name: w.title, url, image: image || undefined, description: desc,
      creator: { '@type': 'Person', name: a.name, url: `${SITE}/artist/${a.id}` },
      artMedium: w.medium || undefined, dateCreated: w.year ? String(w.year) : undefined,
      brand: { '@type': 'Brand', name: 'Gallery 751' },
      offers: hasPrice(w) ? {
        '@type': 'Offer', price: Number(w.price), priceCurrency: 'KRW', url,
        availability: AVAIL[w.status] || 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'Gallery 751', url: SITE },
      } : undefined,
    },
  });
  html = html.replace('<main class="artist-view" id="artist-view" hidden></main>',
    `<main class="artist-view" id="artist-view">${workHTML(w, a)}</main>`);
  return { status: 200, html };
}

async function renderPage(p) {
  const [tpl, artists, works] = await load('index.html', 'artists.json', 'works.json');
  const meta = PAGES[p];
  let html = setHead(leaveHome(tpl), { ...meta, url: `${SITE}/${p}` })
    .replace(`<main class="page" id="page-${p}" hidden>`, `<main class="page" id="page-${p}">`);
  const real = artists.filter(isReal);
  const live = liveWorks(works, artists);
  /* 목록 화면에는 작품·작가 링크를 미리 넣어 검색엔진이 따라 들어갈 수 있게 합니다 */
  if (p === 'buy') {
    html = html.replace('<div id="by-artist"></div>',
      `<div id="by-artist"><div class="grid">${live.map(w => workCard(w, real.find(a => a.id === w.artistId))).join('')}</div></div>`);
  }
  if (p === 'artists') {
    const withWorks = real.filter(a => live.some(w => w.artistId === a.id));
    html = html.replace('<div class="alist" id="alist"></div>', `<div class="alist" id="alist">${withWorks.map(a => `<a class="acard" href="/artist/${esc(a.id)}">
      <span class="acard-img">${a.portrait ? `<img src="/${esc(a.portrait)}" alt="${esc(a.name)} 작가" loading="lazy">` : ''}</span>
      <span class="acard-n">${esc(a.name)}</span>${a.tagline ? `<span class="acard-t">${esc(a.tagline)}</span>` : ''}
      ${a.education ? `<span class="acard-e">${esc(a.education)}</span>` : ''}</a>`).join('')}</div>`);
  }
  return { status: 200, html };
}

export async function render(p, id) {
  if (p === 'work') return renderWork(id);
  if (PAGES[p]) return renderPage(p);
  const [tpl] = await load('index.html');
  return { status: 404, html: noindex(tpl) };
}

export default async function handler(req, res) {
  const p = typeof req.query?.p === 'string' ? req.query.p : '';
  const id = typeof req.query?.id === 'string' ? req.query.id : '';
  try { send(res, await render(p, id)); }
  catch (e) { console.error('page', e); res.status(500).send('페이지를 불러오지 못했습니다.'); }
}
