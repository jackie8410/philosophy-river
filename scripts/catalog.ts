import type { FeaturedProfile, Years } from './model.ts';

export const TOPICS = [
  { id: 'self', number: '01', name: '怎样少一点自我消耗', short: '自我与生活', line: '当评价、欲望和比较占据注意力，怎样把判断重新带回自己的生活？', color: 'olive', ids: ['005', '016', '123', '140', '100', '054'], prompt: '记录一次具体的比较。它描述的是可观察的事实，还是给自己设定的要求？把两个答案分开，再比较不同作者怎样理解需要、自由和关怀。' },
  { id: 'judgment', number: '02', name: 'AI时代怎样保留自己的判断', short: '经验与判断', line: '从证据、习惯与怀疑出发，检视流畅的回答能为判断提供多少支持。', color: 'blue', ids: ['065', '046', '086', '005', '130'], prompt: '拿一段言之凿凿的回答练习：标出可以核对的主张、能够反驳它的证据和暂时只能悬置的判断。再回到原典看作者的论证语境。' },
  { id: 'practice', number: '03', name: '为什么懂了很多仍然做不到', short: '学习与行动', line: '从知行、习惯和经验出发，理解知识如何在具体行动中接受检验。', color: 'clay', ids: ['040', '015', '114', '054'], prompt: '选一个迟迟没有实践的判断，描述阻碍和情境。依次阅读关于知行、德性和探究的文本，比较各自关注的行动条件。' },
  { id: 'organizations', number: '04', name: '组织为何如此运转', short: '规则与关系', line: '用权威、理性化、规则与对话理解组织内部的行动。', color: 'gold', ids: ['115', '114', '130', '086'], prompt: '选一项熟悉的组织流程，列出设计规则、执行规则和承受规则后果的人。用不同理论描述它，再说明理论解释不到的部分。' },
  { id: 'money', number: '05', name: '金钱改变了我们什么', short: '价值与交换', line: '辨认价格、价值和人的关系如何在交换中改变。', color: 'plum', ids: ['111', '068', '115', '016'], prompt: '比较一份礼物和一笔同等价格的交易。把方便交换、价值衡量和关系变化分开理解，再读不同作者对交换与现代生活的解释。' },
] as const;

const profiles: [string, string, string[]][] = [
  ['005', '功用评价与自由：逍遥、用与无用、自我与外部评价', ['逍遥', '齐物', '用与无用']],
  ['040', '知行与修养：知行合一、致良知、具体实践中的判断', ['知行合一', '致良知', '心即理']],
  ['123', '幸福与生活：竞争、兴趣、自我关注与公共关怀', ['幸福', '兴趣', '公共关怀']],
  ['140', '自我理解：理想化自我、内在要求及理论适用边界', ['理想化自我', '基本焦虑', '真实自我']],
  ['065', '经验与判断：因果推断、习惯、证据与怀疑的限度', ['因果推断', '习惯', '温和怀疑']],
  ['115', '组织与行动：官僚制、理性化、支配类型及其张力', ['官僚制', '理性化', '支配类型']],
  ['016', '欲望与幸福：快乐、需要、友谊及生活条件', ['快乐', '欲望分类', '友谊']],
  ['046', '自我观察与判断：随笔、经验、怀疑与理解他人', ['经验', '自我观察', '怀疑']],
  ['100', '价值与自我超越：价值来源、谱系式追问与常见误读', ['价值重估', '谱系', '自我超越']],
  ['054', '情感与自由：因果理解、情感的形成及行动能力', ['情感', '因果理解', '行动能力']],
  ['015', '德性与实践智慧：习惯、中道、具体情境中的选择', ['德性', '中道', '实践智慧']],
  ['114', '经验与教育：探究、反思、行动反馈与学习', ['经验', '探究', '反思']],
  ['111', '货币与现代生活：价格、价值、距离与社会关系', ['交换', '货币', '社会距离']],
  ['068', '道德与经济生活：同情、公正旁观者、利益与合作', ['同情', '公正旁观者', '交换']],
  ['086', '自由与个性：思想讨论、伤害原则与判断责任', ['伤害原则', '思想自由', '个性']],
  ['130', '关系与对话：我与你、我与它、相遇及其哲学语境', ['我与你', '我与它', '对话']],
];

export function featured(id: string): FeaturedProfile | null {
  const order = profiles.findIndex(profile => profile[0] === id);
  if (order === -1) return null;
  return { order: order + 1, direction: profiles[order][1], concepts: profiles[order][2] };
}

const regionCues: [string, RegExp][] = [
  ['东亚', /中国|日本|朝鲜|东亚|先秦|春秋|战国|汉代|唐代|宋代|南宋|明代|清代|鲁国|北宋|日本佛教/],
  ['南亚', /印度|南亚|婆罗门|吠陀|锡兰|尼泊尔/],
  ['西亚及北非', /伊朗|波斯|阿拉伯|埃及|北非|伊斯兰|犹太|中东|奥斯曼|巴格达/],
  ['欧洲', /欧洲|古希腊|希腊|法国|德国|苏格兰|英国|英格兰|意大利|奥地利|荷兰|俄国|俄罗斯|西班牙|丹麦|瑞士|古罗马|葡萄牙|爱尔兰/],
  ['美洲', /美国|加拿大|墨西哥|古巴|拉丁美洲|拉美|乌拉圭|加勒比|北美/],
  ['撒哈拉以南非洲', /南非|西非|加纳|非洲大陆/],
];
const traditionCues: [string, RegExp][] = [
  ['儒学', /儒家|儒学|理学|心学/], ['道家', /道家|道教/], ['佛学', /佛教|佛学|禅宗/],
  ['宗教思想', /神学家|宗教思想家|伊斯兰哲学|婆罗门|吠陀|宗教改革家/],
  ['社会与政治思想', /政治思想家|社会思想家|政治哲学家|经济学家|社会学家|女权主义者|社会改革家/],
  ['心理思想', /精神分析家|心理学家/], ['科学与逻辑', /物理学家|逻辑学家|科学家|生物学家|数学家/],
  ['哲学', /哲学家|哲学流派|哲学的|怀疑主义|思想家/],
];

export function extractMetadata(intro: string, name: string, slug: string) {
  const opening = intro.split(/[。！？]/, 1)[0].slice(0, 200);
  const match = opening.match(/[（(]([^）)]+)[）)]/);
  const fullName = match?.[1].split(/[，,；;]/)[0].trim() || '';
  const originalName = /\p{Letter}/u.test(fullName) && !/\d|[\u3400-\u9fff]/.test(fullName) ? fullName : '';
  const aliases = [...new Set([
    ...(slug ? [slug.replaceAll('-', ' ')] : []),
    ...Array.from(opening.matchAll(/(?:又称|又译|亦译|别名|名为|字)([\u3400-\u9fff·]{2,12})(?=[，、；（。])/g), m => m[1]),
  ])].filter(value => value !== name);
  const tags = regionCues.filter(([, cue]) => cue.test(opening)).map(([label]) => label);
  return {
    originalName,
    aliases,
    years: parseYears(opening),
    region: tags.length === 1 ? tags[0] : tags.length > 1 ? '跨地区' : '',
    tradition: traditionCues.find(([, cue]) => cue.test(opening))?.[0] || '',
  };
}

export function parseYears(opening: string): Years {
  const range = opening.match(/((?:约|大约|传统纪年为)?\s*(?:公元前|公元|前)?\s*\d{1,4}\s*年?\s*(?:至|到|—+|–|-|~|～)\s*(?:约\s*)?(?:公元前|公元|前)?\s*\d{1,4}\s*年?)/);
  if (!range) return { birth: null, death: null, label: '年代待核实', precision: 'unknown' };
  const text = range[1].trim();
  const dates = text.match(/(公元前|公元|前)?\s*(\d{1,4})\s*年?\s*(?:至|到|—+|–|-|~|～)\s*(?:约\s*)?(公元前|公元|前)?\s*(\d{1,4})/);
  if (!dates) return { birth: null, death: null, label: '年代待核实', precision: 'unknown' };
  const [, firstEra, firstYear, secondEra, secondYear] = dates;
  const isBce = (era: string | undefined) => era?.includes('前') ?? false;
  const birth = (isBce(firstEra) ? -1 : 1) * Number(firstYear);
  const death = ((secondEra ? isBce(secondEra) : isBce(firstEra)) ? -1 : 1) * Number(secondYear);
  if (!birth || !death || birth >= death || death - birth > 130) {
    return { birth: null, death: null, label: '年代待核实', precision: 'unknown' };
  }
  const approximate = /约|传统|争议/.test(opening);
  const year = (value: number) => value < 0 ? '前' + -value : String(value);
  return {
    birth, death,
    label: (approximate ? '约' : '') + (birth < 0 ? '公元' : '') + year(birth) + '—' + year(death) + ' 年',
    precision: approximate ? 'approximate' : 'source',
  };
}

export function era(birth: number | null): string {
  if (birth === null) return '年代待核实';
  if (birth < 0) return '公元前';
  if (birth < 1000) return '1–999 年';
  if (birth < 1500) return '1000–1499 年';
  if (birth < 1800) return '1500–1799 年';
  return '1800 年以后';
}

export const ERAS = ['公元前', '1–999 年', '1000–1499 年', '1500–1799 年', '1800 年以后', '年代待核实'];

export const BOOKS = [
  { person: '005', name: '庄子', work: '《庄子》内篇', category: '原著', difficulty: '入门至深入', why: '先选读《逍遥游》和《齐物论》，对照不同段落怎样讨论尺度、立场和语言。', url: 'https://zh.wikisource.org/wiki/莊子' },
  { person: '040', name: '王阳明', work: '《传习录》', category: '原著', difficulty: '入门至深入', why: '从问答读起，辨认“知行合一”回应的修养问题。', url: 'https://zh.wikisource.org/wiki/傳習錄' },
  { person: '065', name: '大卫·休谟', work: '《人类理解研究》', category: '原著', difficulty: '深入', why: '对照第四、五节，读出对归纳的疑问和以习惯为线索的解释。', url: 'https://www.gutenberg.org/ebooks/9662' },
  { person: '086', name: '约翰·斯图亚特·密尔', work: '《论自由》', category: '原著', difficulty: '入门至深入', why: '从讨论自由的一章开始，再把伤害原则放回全书的问题。', url: 'https://www.gutenberg.org/ebooks/34901' },
  { person: '068', name: '亚当·斯密', work: '《道德情操论》', category: '原著', difficulty: '深入', why: '把同情与公正旁观者连在一起读，便于辨认判断和行动之间的距离。', url: 'https://www.gutenberg.org/ebooks/67363' },
  { person: '114', name: '约翰·杜威', work: '《民主与教育》', category: '原著', difficulty: '深入', why: '对照经验、思维与教育方法各章，体会探究怎样依赖可检验的情境。', url: 'https://www.gutenberg.org/ebooks/852' },
  { person: '065', name: 'Stanford Encyclopedia of Philosophy', work: 'David Hume', category: '导读', difficulty: '深入', why: '按认识论、道德与宗教等主题梳理论证，适合作为原典阅读地图。', url: 'https://plato.stanford.edu/entries/hume/' },
  { person: '140', name: 'Boston Psychoanalytic Society and Institute', work: 'Karen Horney Collection', category: '延伸', difficulty: '深入', why: '从档案条目定位传记、机构史与作品材料。', url: 'https://bpsi.org/library/archives/collections/horney-karen-1885-1952/' },
];
