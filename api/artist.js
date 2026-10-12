/**
 * 작가 페이지 주소 (/artist/작가ID)
 *
 * 사이트는 index.html 한 장이라 작가 페이지가 자바스크립트로 그려집니다.
 * 검색엔진(특히 네이버)이 "작가 이름"으로 찾을 수 있도록,
 * 여기서 index.html 에 작가 소개·전시 이력·작품 목록·가격을 미리 넣어서 보냅니다.
 * 브라우저에서는 index.html 이 평소처럼 뜨고 같은 작가 페이지를 다시 그립니다.
 */
import { SITE, esc, abs, hasPrice, won, STATUS, AVAIL, isReal, load, setHead, leaveHome, noindex, send } from './_lib.js';

export const workCard = (w, a) => `<a class="card" href="/work/${esc(w.id)}" data-id="${esc(w.id)}">
      <span class="card-img">${STATUS[w.status] ? `<span class="badge">${STATUS[w.status]}</span>` : ''}<img src="/${esc(w.images?.[0] || '')}" alt="${esc(w.title)} — ${esc(a?.name || '')}" loading="lazy"></span>
      <span class="card-meta"><span class="card-title">${esc(w.title)}</span><span class="card-artist">${esc(a?.name || '')}</span>
      <span class="card-sub">${esc([w.year, w.medium, w.size].filter(Boolean).join(' · '))}</span>
      <span class="card-price">${esc(won(w))}</span></span></a>`;

function artistHTML(a, works) {
  const meta = [a.activity, a.region, (a.materials || []).join(', ')].filter(Boolean).join(' · ');
  const exh = (a.exhibitions || []).length
    ? `<div class="a-exh"><span class="label">전시</span><ul>${a.exhibitions.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : '';
  const press = (a.press || []).length
    ? `<div class="a-exh"><span class="label">인터뷰 · 기사</span><ul>${a.press.map(x => `<li><a href="${esc(x.url)}" rel="noopener">${esc(x.label)}</a></li>`).join('')}</ul></div>` : '';
  return `<div class="wrap">
    <a class="a-back" href="/artists">← 작가 목록으로</a>
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
    <div class="a-works"><h2 class="label">${esc(a.name)} 작가의 작품</h2><div class="grid" style="margin-top:24px">${works.map(w => workCard(w, a)).join('')}</div></div>
  </div>`;
}

export async function render(id) {
  const [tpl, artists, allWorks] = await load('index.html', 'artists.json', 'works.json');
  const a = artists.filter(isReal).find(x => x.id === id);
  let html = leaveHome(tpl);

  if (!a) {
    html = noindex(setHead(html, { title: '작가 — Gallery 751', desc: '찾는 작가 페이지가 없습니다.', url: `${SITE}/artists` }))
      .replace('<main class="page" id="page-artists" hidden>', '<main class="page" id="page-artists">');
    return { status: 404, html };
  }

  const works = allWorks.filter(w => w.artistId === a.id);
  const url = `${SITE}/artist/${encodeURIComponent(a.id)}`;
  const image = a.portrait ? abs(a.portrait) : (works[0]?.images?.[0] ? abs(works[0].images[0]) : '');
  const priced = works.filter(hasPrice).map(w => Number(w.price));
  const range = priced.length ? ` 작품 가격 ${Math.min(...priced).toLocaleString('ko-KR')}원부터.` : '';
  const lead = a.tagline || String(a.story || '').split('\n')[0];
  const desc = `${a.name} 작가의 원화 ${works.length}점을 가격과 함께 소개합니다.${range} ${lead}`.trim();

  html = setHead(html, {
    title: `${a.name} 작가 — 작품·가격 | Gallery 751`, desc, url, image, type: 'profile',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'ProfilePage', url,
      mainEntity: {
        '@type': 'Person', name: a.name, jobTitle: '작가', url,
        description: lead || undefined, image: a.portrait ? abs(a.portrait) : undefined,
        sameAs: a.instagram ? [`https://www.instagram.com/${String(a.instagram).replace(/^@/, '')}/`] : undefined,
      },
      hasPart: works.map(w => ({
        '@type': 'VisualArtwork', name: w.title, url: `${SITE}/work/${w.id}`,
        image: w.images?.[0] ? abs(w.images[0]) : undefined,
        dateCreated: w.year ? String(w.year) : undefined, artMedium: w.medium || undefined,
        creator: { '@type': 'Person', name: a.name },
        offers: hasPrice(w) ? {
          '@type': 'Offer', price: Number(w.price), priceCurrency: 'KRW',
          availability: AVAIL[w.status] || 'https://schema.org/InStock', url: `${SITE}/work/${w.id}`,
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
  try { send(res, await render(id)); }
  catch (e) { console.error('artist', e); res.status(500).send('작가 페이지를 불러오지 못했습니다.'); }
}
