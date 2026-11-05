import assert from 'node:assert/strict';
import test from 'node:test';
import { era, extractMetadata, parseYears } from '../scripts/catalog.ts';
import { safeSource, mediaValid } from '../scripts/model.ts';
import type { Article, Person } from '../scripts/model.ts';
import { mediaPanel, renderArticleBody } from '../scripts/views.ts';
import { canRequestAd } from '../public/ad-policy.js';

test('公元前、跨纪元、约数和未知独立处理', () => {
  assert.deepEqual(parseYears('孔子，传统纪年为公元前551年至前479年').birth, -551);
  assert.equal(parseYears('约公元前10年至公元30年').death, 30);
  assert.equal(parseYears('约公元前10年至公元30年').precision, 'approximate');
  assert.equal(parseYears('生卒年未知').birth, null);
  assert.equal(parseYears('0—68年').birth, null);
  assert.equal(parseYears('约翰·杜威（1859—1952）').precision, 'source');
  assert.equal(extractMetadata('庄子是先秦道家人物。', '庄子', 'zhuangzi',
    '## 二、生平记事\n\n庄子约公元前369年至前286年，宋国蒙地人。').years.birth, -369);
  assert.equal(era(null), '年代待核实');
});

test('安全输入路径与 Markdown 防注入', () => {
  assert.throws(() => safeSource('../.git/config'), /路径越界/);
  assert.throws(() => safeSource('C:\\secret.txt'), /路径越界/);
  const article: Article = {
    kind: 'A', title: '示例', source: 'fixture.md', hash: '', sourceDate: '',
    body: '## 正文\n\n一段话〔1〕。\n\n<script>alert(1)</script>\n\n[点击](javascript:alert(1))\n\n## 尾注与来源\n\n[1] 测试',
    sources: [{ key: '1', title: '测试' }],
  };
  const content = renderArticleBody(article);
  assert.match(content.html, /&lt;script&gt;/);
  assert.doesNotMatch(content.html, /<script|href="javascript:/);
  assert.match(content.html, /href="#source-1"/);
  assert.equal(content.back.get('1'), 'ref-1');
});

test('三种媒体状态保持封面与许可门槛', () => {
  const person = { name: '测试', featured: { order: 1 }, assets: [], media: {
    display_state: 'placeholder', aspect_ratio: '16:9', video_url: null, duration_seconds: null,
  } } as Person;
  assert.doesNotMatch(mediaPanel(person), /<video|iframe|data-play|VideoObject/);
  assert.match(mediaPanel(person), /测试/);
  person.media!.display_state = 'video_ready';
  assert.equal(mediaValid(person.media), false);
  assert.doesNotMatch(mediaPanel(person), /data-play/);
  Object.assign(person.media!, { video_url: 'assets/media/test.webm', permission: '本地测试', duration_seconds: 5 });
  assert.equal(mediaValid(person.media), true);
  assert.match(mediaPanel(person), /data-play/);
  assert.doesNotMatch(mediaPanel(person), /<video|iframe/);
  person.media!.display_state = 'hidden';
  assert.equal(mediaPanel(person), '');
  person.media!.display_state = 'placeholder';
  assert.doesNotMatch(mediaPanel(person), /data-video|test\.webm/);
});

test('广告仅在生产、页面资格、地区和 CMP 同时满足时允许', () => {
  const config = { production: true, siteEnabled: true, providerEnabled: true, provider: 'adsense',
    pageEligible: true, publisherId: 'ca-pub-0123456789012345', slot: '01234', countries: ['DE'] };
  const allowed = { cmpReady: true, adConsent: 'allowed', country: 'DE' };
  assert.equal(canRequestAd(config, allowed), true);
  for (const diff of [{ production: false }, { siteEnabled: false }, { providerEnabled: false },
    { provider: 'none' }, { pageEligible: false }, { publisherId: '' }, { slot: '' }, { countries: [] }]) {
    assert.equal(canRequestAd({ ...config, ...diff }, allowed), false);
  }
  for (const consent of [undefined, { ...allowed, cmpReady: false }, { ...allowed, country: 'ZZ' },
    { ...allowed, adConsent: 'denied' }, { ...allowed, adConsent: 'withdrawn' }, { ...allowed, adConsent: 'unknown' }]) {
    assert.equal(canRequestAd(config, consent), false);
  }
});
