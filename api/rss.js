/**
 * /rss.xml — 저널 글 피드
 * 네이버 서치어드바이저의 'RSS 제출'에 이 주소를 등록하면 새 글이 올라올 때마다 네이버가 빨리 가져갑니다.
 * date 가 아직 오지 않은 글(예약 발행)은 넣지 않습니다.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://www.gallery751.com';
const x = (v) => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const abs = (u) => /^https?:\/\//.test(u) ? u : SITE + '/' + String(u).replace(/^\/+/, '');

export async function build(now = new Date()) {
  const list = JSON.parse(await readFile(path.join(process.cwd(), 'journal.json'), 'utf8'))
    .filter(p => p && p.id && p.title && (!p.date || new Date(p.date) <= now))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const items = list.map(p => {
    const url = `${SITE}/journal/${encodeURIComponent(p.id)}`;
    const desc = p.summary || (p.body || []).find(b => b.lead || b.p)?.lead || '';
    const hero = p.hero || p.images?.[0];
    return `  <item>
    <title>${x(p.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    ${p.date ? `<pubDate>${new Date(p.date).toUTCString()}</pubDate>` : ''}
    ${p.series ? `<category>${x(p.series)}</category>` : ''}
    <description>${x(desc)}</description>
    ${hero ? `<enclosure url="${x(abs(hero))}" type="image/jpeg" length="0"/>` : ''}
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Gallery 751 저널</title>
  <link>${SITE}/journal</link>
  <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
  <description>그림을 처음 사는 분을 위한 안내와 입점 작가의 이야기, Gallery 751의 소식을 전합니다.</description>
  <language>ko</language>
  ${list[0]?.date ? `<lastBuildDate>${new Date(list[0].date).toUTCString()}</lastBuildDate>` : ''}
${items}
</channel>
</rss>`;
}

export default async function handler(req, res) {
  try {
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.status(200).send(await build());
  } catch (e) {
    console.error('rss', e);
    res.status(500).send('');
  }
}
