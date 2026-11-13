#!/usr/bin/env node
/* 작가 추천 코드 만들기 — node scripts/promo-code.mjs "작가 이름" [작가ID]
   - 작가ID가 artists.json 에 있으면 그 작가에 promoHash 를 넣고,
   - 없으면(사이트에 아직 안 올라간 해외 작가 등) promo.json 에 이름과 promoHash 를 추가합니다.
   코드 원문은 화면에만 출력되고 어디에도 저장되지 않습니다. 따로 적어 두세요. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash, randomInt } from 'node:crypto';

const [name, id] = process.argv.slice(2);
if (!name) { console.error('사용법: node scripts/promo-code.mjs "작가 이름" [작가ID]'); process.exit(1); }

const AL = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';           /* 헷갈리는 0·O·1·I·L 제외 */
const code = '751-' + Array.from({ length: 5 }, () => AL[randomInt(AL.length)]).join('');
const hash = createHash('sha256').update(code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()).digest('hex').slice(0, 24);

const artists = JSON.parse(readFileSync('artists.json', 'utf8'));
const a = id && artists.find((x) => x.id === id);
if (a) {
  a.promoHash = hash;
  writeFileSync('artists.json', JSON.stringify(artists, null, 2) + '\n');
} else {
  const list = existsSync('promo.json') ? JSON.parse(readFileSync('promo.json', 'utf8')) : [];
  list.push({ name, nameEn: name, promoHash: hash });
  writeFileSync('promo.json', JSON.stringify(list, null, 2) + '\n');
}
console.log(`${name}\t${code}\thttps://gallery751.com/?code=${code}`);
