/**
 * /sitemap.xml — 사이트 첫 화면, 공개된 저널 글, 작가·작품 페이지, 주요 안내 화면 목록
 * 검색엔진(구글 서치 콘솔, 네이버 서치어드바이저)에 이 주소를 등록합니다.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://www.gallery751.com';

export default async function handler(req, res) {
  try {
    const read = (f) => readFile(path.join(process.cwd(), f), 'utf8').then(JSON.parse);
    const [raw, artists, works] = await Promise.all(['journal.json', 'artists.json', 'works.json'].map(read));
    const now = new Date();
    const posts = raw
      .filter(p => p && p.id && p.title && (!p.date || new Date(p.date) <= now))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const url = (loc, lastmod) => `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`;
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      url(`${SITE}/`),
      url(`${SITE}/journal`, posts[0]?.date),
      ...posts.map(p => url(`${SITE}/journal/${encodeURIComponent(p.id)}`, p.date)),
      /* 작품이 올라간 작가 페이지 — 가장 최근에 올린 작품 날짜를 lastmod 로 */
      ...artists.filter(a => a && a.id && a.name && !String(a.id).startsWith('sample')).map(a => {
        const last = works.filter(w => w.artistId === a.id).map(w => String(w.listedAt || '')).sort().pop();
        return last !== undefined ? url(`${SITE}/artist/${encodeURIComponent(a.id)}`, last || null) : '';
      }).filter(Boolean),
      /* 주요 안내 화면과 작품 한 점 페이지 */
      ...['buy', 'artists', 'records', 'how', 'about'].map(p => url(`${SITE}/${p}`)),
      ...works.filter(w => w && w.id && w.title && artists.some(a => a.id === w.artistId && !String(a.id).startsWith('sample')))
        .map(w => url(`${SITE}/work/${encodeURIComponent(w.id)}`, w.listedAt || null)),
      '</urlset>',
    ].join('\n');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.status(200).send(xml);
  } catch (e) {
    console.error('sitemap', e);
    res.status(500).send('');
  }
}
