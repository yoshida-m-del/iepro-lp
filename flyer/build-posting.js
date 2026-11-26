// ポスティングチラシ候補5案（A4両面）の HTML を組み立てる
// 使い方（このフォルダで）: node build-posting.js  → src/posting.html を書き出す
// その後 node render-posting.js で PDF と画像を作る。
//
// 方針：載せる内容（営業さんのラフ＋追加項目）は5案とも同じ。文言は下の CONTENT だけで管理する。
// 案ごとに変えるのはレイアウト・配色・見せ方（表裏とも全体）と、表面のキャッチ。
const fs = require('fs');
const path = require('path');

// ================= 内容（5案共通） =================
const TEL = '06-6185-1252';
const HOURS = '営業時間 9:00〜18:00（定休日：火・水）';
const AREA = '城東区・鶴見区・旭区';
const GH = '注文住宅のGハウスが手がける不動産売却サービス';
const SEAL = '地域密着 旭区新森の不動産会社';
const TYPES = [['house', '戸建て'], ['mansion', 'マンション'], ['land', '土地'], ['akiya', '空き家']];
const CONS = [
  '住み替えで、今の家を売りたい',
  '実家の管理・固定資産税の負担をなくしたい（施設入居・ご逝去）',
  '空き家の処分に困っている（遠方にお住まいの方も）',
  '住宅ローンの返済が気になる',
  '老後資金の確保・事業資金の調達・保有資産の組み替え',
  '財産分与・連帯保証・ペアローンを解消したい',
  '売るかどうか、まず金額を知りたい',
];
// 売り方の小見出し（キャッチではなくラベルとして小さく出す）
const WL = '<p class="wl"><b>売り方は、2つ</b>売るか決めていなくても、価格を知りたいだけでも大丈夫です。</p>';
const WAYS = [['できるだけ高く売りたい方', '仲介売却'], ['早く・確実に売却したい方', '直接買取']];
const BADGES = [['査定', '無料'], ['秘密', '厳守'], ['相談', '無料']];
const CHAIN = [
  ['金利が上昇', '住宅ローンの支払額がアップし、買い手の予算が下がる'],
  ['建築費が高騰', 'マンションの管理費・修繕積立金も値上げ'],
  ['売却物件が増加', '売りに出る物件が増え、供給過多に'],
  ['売値がダウン', '売却できる金額が下がる可能性があります'],
];
const PAT = [
  ['戸建て → 駅前のマンション', '階段のない、ワンフロアの暮らしへ', '年齢とともに2階への上り下りが負担に。駅やお店、病院に近いマンションなら、車がなくても暮らせます。'],
  ['マンション → 戸建て', '管理費・修繕積立金の負担を見直す', '建築費の高騰で管理費・修繕積立金の値上げが続いています。毎月の管理費・積立金がかからない戸建てへ。'],
];
const RNOTE = '※月々10万円・35年・元利均等返済・ボーナス払いなしで試算。金利の推移は目安で、将来の金利や価格を保証するものではありません。';
const CO = ['株式会社Gハウス いえプロ不動産　https://iepro-fudosan.com', '〒535-0022 大阪府大阪市旭区新森6-3-25 エクセレント新森1階', '宅地建物取引業免許 国土交通大臣（1）第11002号'];

// ================= 部品 =================
const ICON = {
  house: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7v9H3z"/><path d="M10 20v-5h4v5"/></svg>',
  mansion: '<svg viewBox="0 0 24 24"><path d="M5 21V3h9v18M14 9h5v12M3 21h18"/><path d="M8 7h3M8 11h3M8 15h3M16 13h1M16 17h1"/></svg>',
  land: '<svg viewBox="0 0 24 24"><path d="M2 20 6 14h12l4 6z"/><path d="M12 13s-4-3.6-4-6.4a4 4 0 0 1 8 0C16 9.4 12 13 12 13z"/><circle cx="12" cy="6.6" r="1.3"/></svg>',
  akiya: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7v9H3z"/><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"/></svg>',
};
const types = () => TYPES.map(([k, t]) => `<div>${ICON[k]}<span>${t}</span></div>`).join('');
const cons = () => CONS.map(t => `<li>${t}</li>`).join('');
const ways = () => WAYS.map(([w, h], i) => `<div class="w${i}"><p class="who">${w}</p><h3>${h}</h3></div>`).join('');
const badges = () => BADGES.map(([a, b]) => `<span>${a}<br>${b}</span>`).join('');
const chain = () => CHAIN.map(([b, t]) => `<li><b>${b}</b><span>${t}</span></li>`).join('');
const pats = () => PAT.map(([w, h, t], i) => `<div class="p${i}"><p class="who">${w}</p><h3>${h}</h3><p class="t">${t}</p></div>`).join('');
const qr = (cap = 'WEBで予約・査定<br>24時間受付') => `<div class="qr"><div class="qrph">QRコード<br>（査定フォーム）</div><p>${cap}</p></div>`;
const tel = () => `<div class="tel"><span class="t">TEL</span><span class="no">${TEL}</span></div>`;
const company = (logo) => `<img class="logo" src="../img/logo-${logo}.png" alt="いえプロ不動産"><p class="info"><b>${CO[0].split('　')[0]}</b>　${CO[0].split('　')[1]}<br>${CO[1]}<br>${CO[2]}</p>`;
const strip = (logo) => `<img src="../img/logo-${logo}.png" alt="いえプロ不動産"><p>${GH.replace('手がける', '手がける<br>')}</p>`;
const loan = () => `<div class="loan">
        <div class="lr"><div><p class="r">金利 0.5%</p><p class="a">約<span class="num">3,850</span>万円</p></div><span class="arr">→</span><div><p class="r">金利 1.5%</p><p class="a">約<span class="num">3,270</span>万円</p></div></div>
        <p class="diff">金利が上がると、約<span class="num">580</span>万円も予算が減少</p>
      </div>`;
// 金利グラフ（2022〜2025年は営業ラフの曲線に合わせた目安）
function chart(c) {
  const pts = [[8, .5], [23, .6], [38, .8], [53, 1.0], [68, 1.25], [83, 1.5]].map(([x, r]) => [x, +(32 - (r - .5) * 24).toFixed(1)]);
  const line = pts.map(p => p.join(',')).join(' ');
  const years = ['2021', '2022', '2023', '2024', '2025', '2026（予測）'];
  return `<svg class="chart" viewBox="0 0 92 46" font-family="Zen Kaku Gothic New, sans-serif">
        <g stroke="${c.grid}" stroke-width=".25"><path d="M2 8 H90 M2 20 H90 M2 32 H90"/></g>
        <polygon points="${pts[0][0]},38 ${line} ${pts[5][0]},38" fill="${c.fill}" opacity="${c.op ?? .22}"/>
        <polyline points="${line}" fill="none" stroke="${c.line}" stroke-width=".7"/>
        ${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${c.dot ?? '#fff'}" stroke="${c.line}" stroke-width=".5"/>`).join('')}
        <text x="8" y="27.5" font-size="3.8" font-weight="700" fill="${c.lo}" text-anchor="middle">約0.5%</text>
        <text x="83" y="4.6" font-size="3.8" font-weight="700" fill="${c.hi}" text-anchor="middle">約1.5%</text>
        ${years.map((t, i) => `<text x="${pts[i][0]}" y="44" font-size="2.9" fill="${c.txt}" text-anchor="middle">${t}</text>`).join('')}
      </svg>`;
}
const LIGHT = { grid: '#E4DED3', fill: '#E8A57C', line: '#1F3346', lo: '#1F3346', hi: '#B04A12', txt: '#4E5862' };

// ================= 05 雑誌風（写真＋2段組・生成り） =================
const d05 = {
  front: `
  <!-- 写真：flyer/img/consult.jpg（既存チラシ素材） -->
  <div class="photo" style="left:100mm;top:0;width:116mm;height:150mm"><img src="../img/consult.jpg" alt="" style="object-position:44% 30%"></div>
  <div class="plane" style="left:100mm;top:150mm;width:116mm;height:4mm;background:var(--accent)"></div>
  <div class="pad strip" style="right:120mm">${strip('blue')}</div>
  <div class="pad hero" style="top:38mm;right:122mm">
    <p class="label">Life Change</p>
    <h1 class="mincho">お子さまが<br>巣立ったら、<br>その家、<br>広すぎませんか。</h1>
    <div class="rooms"><span class="on">リビング<b>毎日使う</b></span><span>子ども部屋<b>物置に</b></span><span>子ども部屋<b>使っていない</b></span><span>2階<b>上がらない</b></span></div>
  </div>
  <div class="boshu"><p class="ar">${AREA} 限定</p><p class="bt">住み替え・売却の<br>ご相談を承ります</p></div>
  <div class="seal">${SEAL.replace(' ', '<br>').replace('の', 'の<br>')}</div>
  <div class="pad mid" style="top:162mm">
    <div><p class="ttl">取り扱い物件</p><div class="types">${types()}</div></div>
    <div><p class="ttl">このようなご相談が増えています</p><ul class="cons">${cons()}</ul></div>
  </div>
  <div class="pad ask" style="top:209mm">
    ${WL}
    <div class="ways">${ways()}<div class="badges">${badges()}</div></div>
  </div>
  <div class="fc">
    <div class="pad main"><div>${tel()}<p class="hours">${HOURS}</p></div>${qr()}</div>
    <div class="pad company">${company('blue')}</div>
  </div>`,
  back: `
  <div class="pad head" style="top:14mm"><p class="label">Why Now</p><h2 class="mincho">住み替えの前に知っておきたい、<em>相場</em>の話</h2></div>
  <ol class="pad tl" style="top:38mm;right:112mm">${chain()}</ol>
  <div class="pad rcol" style="top:38mm;left:110mm">
    <div class="box"><p class="ct">住宅ローン金利の推移（目安）</p>${chart(LIGHT)}</div>
    <div class="box"><p class="ct">同じ月々の返済額（10万円・35年）で借りられる金額の目安</p>${loan()}</div>
  </div>
  <p class="pad kari" style="top:124mm">${RNOTE}</p>
  <div class="pad pat" style="top:134mm"><p class="ttl">よくある住み替えのかたち</p><div class="g2">${pats()}</div></div>
  <div class="pad ctah" style="top:186mm"><h2 class="mincho">住み替えのご相談は、<em>いえプロ</em>へ。</h2></div>
  <div class="fc" style="top:212mm">
    <div class="pad main"><div>${tel()}<p class="hours">${HOURS}</p><p class="gh">${GH}｜${AREA} 限定｜仲介売却・直接買取</p></div><div class="badges">${badges()}</div>${qr()}</div>
    <div class="pad company" style="top:44mm">${company('blue')}</div>
  </div>`,
};

// ================= 06 紺の高級感（全面紺×金） =================
const DARK = { grid: 'rgba(255,255,255,.14)', fill: '#E8A57C', op: .25, line: '#E8C98F', dot: '#182A3A', lo: '#fff', hi: '#E8C98F', txt: '#C9D2DB' };
const d06 = {
  front: `
  <!-- 写真：images/hero-street.jpg（LP素材） -->
  <div class="photo" style="left:0;top:0;width:216mm;height:130mm"><img src="../../images/hero-street.jpg" alt="" style="object-position:72% 40%"></div>
  <div class="shade"></div>
  <div class="pad strip">${strip('white')}</div>
  <div class="pad hero" style="top:60mm">
    <p class="label">Inheritance &amp; Vacant House</p>
    <h1 class="mincho">ご実家、<br>このままで大丈夫ですか。</h1>
    <p class="lead">相続した家、誰も住んでいない実家、遠方の空き家。<br>売るかどうか決まっていなくても大丈夫です。</p>
  </div>
  <div class="pad boshu" style="top:134mm"><p class="ar">${AREA} 限定</p><p class="bt">相続・空き家のご相談窓口</p></div>
  <div class="seal">${SEAL.replace(' ', '<br>').replace('の', 'の<br>')}</div>
  <div class="pad types" style="top:154mm">${types()}</div>
  <div class="pad consw" style="top:170mm"><p class="ttl">このようなご相談が増えています</p><ul class="cons">${cons()}</ul></div>
  <div class="pad ask" style="top:205mm">
    ${WL}
    <div class="ways">${ways()}<div class="badges">${badges()}</div></div>
  </div>
  <div class="fc">
    <div class="pad main"><div>${tel()}<p class="hours">${HOURS}</p></div>${qr()}</div>
    <div class="pad company">${company('white')}</div>
  </div>`,
  back: `
  <div class="bkh"></div>
  <div class="pad head" style="top:14mm"><p class="label">Why Now</p><h2 class="mincho">持ち続けるほど、<em>売りにくく</em>なることも</h2></div>
  <ol class="pad chain" style="top:37mm">${chain()}</ol>
  <div class="pad rg" style="top:76mm">
    <div class="box"><p class="ct">住宅ローン金利の推移（目安）</p>${chart(LIGHT)}</div>
    <div class="box"><p class="ct">同じ月々の返済額（10万円・35年）で借りられる金額の目安</p>${loan()}</div>
  </div>
  <p class="pad kari" style="top:121mm">${RNOTE}</p>
  <div class="pad pat" style="top:130mm"><p class="ttl">よくある住み替えのかたち</p><div class="g2">${pats()}</div></div>
  <div class="cta">
    <div class="pad ctah"><h2 class="mincho">ご実家のこと、<em>まずはご相談</em>ください。</h2></div>
    <div class="pad main"><div>${tel()}<p class="hours">${HOURS}</p><p class="gh">${GH}｜${AREA} 限定｜仲介売却・直接買取</p></div><div class="badges">${badges()}</div>${qr()}</div>
    <div class="pad company">${company('white')}</div>
  </div>`,
};

// ================= 10 図解（白地×青・矢印と囲み） =================
const d10 = {
  front: `
  <div class="ban"><div class="pad">
    <div class="strip">${strip('white')}</div>
    <div class="bs"><p class="ar">${AREA} 限定</p><p class="bt">売却のご相談・無料査定</p></div>
  </div></div>
  <div class="pad hero" style="top:44mm;text-align:center">
    <p class="label" style="justify-content:center">Self Check</p>
    <h1 class="mincho">YES / NO で分かる、わが家の「売り時」</h1>
  </div>
  <div class="chart10">
    <svg viewBox="0 0 190 104" font-family="Shippori Mincho B1, serif" font-weight="600">
      <g stroke="#3E6582" stroke-width=".7" fill="none">
        <path d="M95 20 V28 M40 28 H150 M40 28 V36 M150 28 V36"/>
        <path d="M40 56 V64 M20 64 H60 M20 64 V74 M60 64 V74"/>
        <path d="M150 56 V64 M130 64 H170 M130 64 V74 M170 64 V74"/>
      </g>
      <g font-family="Cormorant Garamond, serif" font-style="italic" font-size="6" fill="#B04A12" font-weight="600">
        <text x="43" y="34.5">YES</text><text x="138" y="34.5">NO</text>
        <text x="23" y="72">YES</text><text x="63" y="72">NO</text>
        <text x="133" y="72">YES</text><text x="172" y="72">NO</text>
      </g>
      <rect x="30" y="0" width="130" height="20" rx="3" fill="#EEF3F7" stroke="#3E6582" stroke-width=".8"/>
      <text x="95" y="12.6" text-anchor="middle" font-size="7.2" fill="#1F2A33">家を建てて（買って）15年以上たつ</text>
      <rect x="2" y="36" width="76" height="20" rx="3" fill="#EEF3F7" stroke="#3E6582" stroke-width=".8"/>
      <text x="40" y="48.4" text-anchor="middle" font-size="6.8" fill="#1F2A33">使っていない部屋がある</text>
      <rect x="112" y="36" width="76" height="20" rx="3" fill="#EEF3F7" stroke="#3E6582" stroke-width=".8"/>
      <text x="150" y="44.6" text-anchor="middle" font-size="6.4" fill="#1F2A33">近所で新築や</text>
      <text x="150" y="52.2" text-anchor="middle" font-size="6.4" fill="#1F2A33">建て替えが増えている</text>
      <g font-family="Cormorant Garamond, serif" font-size="15" fill="#fff" text-anchor="middle">
        <circle cx="20" cy="88" r="13" fill="#B04A12"/><text x="20" y="93">A</text>
        <circle cx="60" cy="88" r="13" fill="#3E6582"/><text x="60" y="93">B</text>
        <circle cx="130" cy="88" r="13" fill="#3E6582"/><text x="130" y="93">B</text>
        <circle cx="170" cy="88" r="13" fill="#1F3346"/><text x="170" y="93">C</text>
      </g>
    </svg>
  </div>
  <div class="pad res10" style="top:106mm">
    <div class="ra"><p class="rh"><i>A</i>今が検討どき</p><p class="rt">住み替え・売却の選択肢が広い時期。まずは今の価格を知って計画を。</p><p class="go">おすすめ<b>訪問査定</b></p></div>
    <div class="rb"><p class="rh"><i>B</i>情報を集める時期</p><p class="rt">急ぐ必要はありません。相場の動きを定期的にチェックしましょう。</p><p class="go">おすすめ<b>机上査定</b></p></div>
    <div class="rc"><p class="rh"><i>C</i>今はじっくり</p><p class="rt">資産としての価値の目安だけでも、知っておくと安心です。</p><p class="go">おすすめ<b>机上査定</b></p></div>
  </div>
  <p class="pad resn" style="top:133mm">どの結果でも査定は無料です。お電話・QRで<b>診断結果（A・B・C）</b>をお伝えいただければ、合った方法をご案内します。</p>
  <div class="seal">${SEAL.replace(' ', '<br>').replace('の', 'の<br>')}</div>
  <div class="pad mid" style="top:143mm">
    <div class="rbox"><p class="tab">取り扱い物件</p><div class="types">${types()}</div></div>
    <div class="rbox"><p class="tab">このようなご相談が増えています</p><ul class="cons">${cons()}</ul></div>
  </div>
  <div class="pad ask" style="top:194mm">
    ${WL}
    <div class="ways">${ways().replace('</div><div class="w1">', '</div><span class="or">or</span><div class="w1">')}</div>
    <div class="badges">${badges()}</div>
  </div>
  <div class="fc">
    <div class="pad main"><div>${tel()}<p class="hours">${HOURS}</p></div>${qr()}</div>
    <div class="pad company">${company('blue')}</div>
  </div>`,
  back: `
  <div class="pad head" style="top:14mm"><p class="label">Why Now</p><h2 class="mincho">「売り時」を左右する、<em>4つの変化</em></h2></div>
  <ol class="pad chain" style="top:37mm">${chain()}</ol>
  <div class="pad rg" style="top:66mm">
    <div class="rbox"><p class="tab">住宅ローン金利の推移（目安）</p>${chart({ ...LIGHT, grid: '#DCE5EC', line: '#3E6582', lo: '#3E6582' })}</div>
    <div class="rbox"><p class="tab">同じ月々の返済額で借りられる金額</p>${loan()}</div>
  </div>
  <p class="pad kari" style="top:121mm">${RNOTE}</p>
  <div class="pad pat" style="top:131mm"><p class="tab">よくある住み替えのかたち</p><div class="g2">${pats()}</div></div>
  <div class="cta">
    <div class="pad ctah"><h2 class="mincho">わが家の<em>売り時</em>、一緒に確かめましょう。</h2></div>
    <div class="pad main"><div>${tel()}<p class="hours">${HOURS}</p><p class="gh">${GH}｜${AREA} 限定｜仲介売却・直接買取</p></div><div class="badges">${badges()}</div>${qr()}</div>
    <div class="pad company">${company('white')}</div>
  </div>`,
};

// ================= 29 ミニマル（縦書き＋罫線） =================
const MIN = { grid: '#E6E3DD', fill: '#B04A12', op: .08, line: '#1F2A33', lo: '#1F2A33', hi: '#B04A12', txt: '#6B737B' };
const d29 = {
  front: `
  <div class="pad strip">${strip('blue')}</div>
  <p class="vq">その家に、あと何年住みますか。</p>
  <div class="vrule"></div>
  <div class="pad lead29" style="top:62mm;right:72mm">
    <p class="ar">${AREA} 限定</p>
    <div class="poem"><p>5年なら、今のうちに準備を。</p><p>20年なら、価値を知っておくと安心です。</p><p>まだ決めていないなら、</p><p>一度だけ、話を聞いてみてください。</p></div>
    <p class="sealt">${SEAL}</p>
  </div>
  <div class="pad rows" style="top:156mm">
    <div class="row"><p class="k">取り扱い物件</p><p class="v tp">${TYPES.map(t => t[1]).join('<i>／</i>')}</p></div>
    <div class="row"><p class="k">このような<br>ご相談が<br>増えています</p><ul class="v cons">${cons()}</ul></div>
    <div class="row"><p class="k">売り方</p><div class="v ways">${ways()}</div></div>
    <div class="row"><p class="k">ご相談</p><div class="v"><p class="sub">売るか決めていなくても、価格を知りたいだけでも大丈夫です。</p><div class="badges" style="margin-top:2mm">${badges()}</div></div></div>
  </div>
  <div class="pad contact" style="top:238mm">
    <div>${tel()}<p class="hours">${HOURS}</p></div>${qr()}
  </div>
  <div class="pad co" style="top:272mm">${company('blue')}</div>`,
  back: `
  <div class="pad head" style="top:18mm"><p class="label">Why Now</p><h2 class="mincho">これから、<em>相場</em>はどう動くのか</h2></div>
  <ol class="pad chain" style="top:42mm">${chain()}</ol>
  <div class="pad rg" style="top:95mm">
    <div><p class="ct">住宅ローン金利の推移（目安）</p>${chart(MIN)}</div>
    <div><p class="ct">同じ月々の返済額（10万円・35年）で借りられる金額の目安</p>${loan()}</div>
  </div>
  <p class="pad kari" style="top:138mm">${RNOTE}</p>
  <div class="pad pat" style="top:148mm"><p class="ct">よくある住み替えのかたち</p><div class="g2">${pats()}</div></div>
  <div class="pad contact" style="top:198mm">
    ${qr()}<div>${tel()}<p class="hours">${HOURS}</p><p class="gh">${GH}｜${AREA} 限定｜仲介売却・直接買取</p><div class="badges">${badges()}</div></div>
  </div>
  <div class="pad co" style="top:256mm">${company('blue')}</div>`,
};

// ================= 30 数字を大きく（紺×オレンジの面） =================
const NAVYC = { grid: 'rgba(255,255,255,.14)', fill: '#6F8FA8', op: .55, line: '#fff', dot: '#1F3346', lo: '#fff', hi: '#E8A57C', txt: '#C9D2DB' };
const d30 = {
  front: `
  <div class="top30"></div>
  <div class="pad strip">${strip('white')}</div>
  <div class="pad hero" style="top:32mm"><p class="label">Numbers</p><h1 class="mincho">数字で見る、いえプロの売却サポート</h1></div>
  <div class="pad nums" style="top:52mm">
    <div><p class="big"><span class="num">127</span><span class="unit">件</span></p><p class="cap">売却をお手伝いした件数</p></div>
    <div><p class="big"><span class="num">2.8</span><span class="unit">か月</span></p><p class="cap">売り出しから成約までの平均期間</p></div>
    <div><p class="big"><span class="num">96</span><span class="unit">%</span></p><p class="cap">売り出し価格に対する成約価格</p></div>
  </div>
  <p class="pad kari" style="top:99mm;color:#9FB0C0">※数字は検討用の仮の値です（2021〜2026年）。</p>
  <div class="band"><div class="pad"><span class="ar">${AREA} 限定</span><span class="bt">不動産売却のご相談受付中</span></div></div>
  <div class="seal">${SEAL.replace(' ', '<br>').replace('の', 'の<br>')}</div>
  <div class="pad mid" style="top:138mm">
    <div class="cnt"><p class="n">4</p><p class="nl">種類の不動産に対応</p><div class="types">${types()}</div></div>
    <div><p class="ttl">このようなご相談が増えています</p><ul class="cons">${cons()}</ul></div>
  </div>
  <div class="pad ask" style="top:200mm">
    ${WL}
    <div class="ways">${ways()}<div class="badges">${badges()}</div></div>
  </div>
  <div class="fc">
    <div class="pad main"><div>${tel()}<p class="hours">${HOURS}</p></div>${qr()}</div>
    <div class="pad company">${company('blue')}</div>
  </div>`,
  back: `
  <div class="pad head" style="top:14mm"><p class="label">Why Now</p><h2 class="mincho">数字で見る、<em>今の住宅市場</em></h2></div>
  <div class="pad b580" style="top:34mm">
    <p class="big"><small>約</small>580<small>万円</small></p>
    <div><p class="cap">金利が0.5%から1.5%に上がると、同じ月々の返済額（10万円・35年）で借りられる金額が、これだけ減ります。</p>
      <p class="lr2"><span>金利0.5%　約<b>3,850</b>万円</span><span class="arr">→</span><span>金利1.5%　約<b>3,270</b>万円</span></p></div>
  </div>
  <ol class="pad chain" style="top:76mm">${chain()}</ol>
  <div class="pad cbox" style="top:118mm"><p class="ct">住宅ローン金利の推移（目安）</p>${chart(NAVYC)}</div>
  <p class="pad kari" style="top:162mm">${RNOTE}</p>
  <div class="pad pat" style="top:170mm"><div class="g2">${pats()}</div></div>
  <div class="cta">
    <div class="pad main"><div><h2 class="mincho">次は、<em>あなたのお家</em>で。</h2>${tel()}<p class="hours">${HOURS}</p><p class="gh">${GH}｜${AREA} 限定｜仲介売却・直接買取</p></div><div class="badges">${badges()}</div>${qr()}</div>
    <div class="pad company">${company('white')}</div>
  </div>`,
};

// ================= 00 営業ラフ清書版（紺×金・写真で安心感） =================
// 営業さんのラフの構成と文言をそのまま清書し、反響の出やすい要素（エリアを大きく・実際の店舗と人の写真・
// 電話とQRを目立たせる・無料特典・理由の図解）で整えた版。
const GOLDC = { grid: '#E4DED3', fill: '#D4B072', op: .3, line: '#1F3346', lo: '#1F3346', hi: '#9A7432', txt: '#4E5862' };
const ICON3 = {
  up: '<svg viewBox="0 0 48 40"><path d="M6 34h8V24H6zM18 34h8V18h-8zM30 34h8V11h-8z" fill="#C9A35C" opacity=".55"/><path d="M4 26 18 15l8 5 16-14" fill="none" stroke="#1F3346" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 6h6v6" fill="none" stroke="#1F3346" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  people: '<svg viewBox="0 0 48 40"><circle cx="17" cy="11" r="6" fill="#1F3346"/><path d="M5 36c0-8 5-13 12-13s12 5 12 13z" fill="#1F3346"/><circle cx="33" cy="14" r="5" fill="#C9A35C"/><path d="M24 36c0-7 4-11 9-11s9 4 9 11z" fill="#C9A35C"/><path d="M36 3c3 0 5 2 5 4s-2 3-3 4" fill="none" stroke="#1F3346" stroke-width="1.6" stroke-linecap="round"/><circle cx="38" cy="14" r=".1"/></svg>',
  down: '<svg viewBox="0 0 48 40"><path d="M5 19 20 7l15 12v17H5z" fill="none" stroke="#1F3346" stroke-width="2.4" stroke-linejoin="round"/><path d="M15 26h4v4h-4zM21 26h4v4h-4z" fill="#1F3346"/><path d="M33 8l10 14M43 22h-6M43 22v-6" fill="none" stroke="#C0563A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const PHONE = '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" fill="currentColor"/></svg>';
const d00 = {
  front: `
  <!-- 写真：モデルハウス写真/本社/240809_shop_004.jpg → img/shop-interior-004.jpg -->
  <div class="photo" style="left:0;top:0;width:216mm;height:128mm"><img src="../img/shop-interior-004.jpg" alt="" style="object-position:50% 50%"></div>
  <div class="shade"></div>
  <div class="pad strip">${strip('white')}</div>
  <div class="seal"><span>地域密着</span>旭区新森の<br>不動産会社</div>
  <div class="pad h00" style="top:34mm">
    <p class="en">Joto / Tsurumi / Asahi</p>
    <p class="area">${AREA} 限定</p>
    <div class="mainrow"><p class="lead">ご自宅の<br>売却を<br>お考えの方へ</p><h1>不動産売却</h1></div>
    <p class="boshu">大募集！</p>
  </div>
  <!-- 写真：スタッフ・事務所写真/office/250227_office_001.jpg → img/office-front-01.jpg -->
  <figure class="store"><img src="../img/office-front-01.jpg" alt=""><figcaption>ご来店でのご相談も承ります</figcaption></figure>
  <div class="pad row00" style="top:134mm">
    <div class="types">${types()}</div>
    <div class="consb"><p class="ttl">このようなご相談が増えています</p><ul class="cons">${cons()}</ul></div>
  </div>
  <div class="pad ask" style="top:180mm">
    <h2 class="mincho">あなたの不動産、<em>今いくら</em>で売れるかご存じですか？</h2>
    <p class="sub">売るか決めていなくても大丈夫です。<br>「価格を知りたい」「相談だけしたい」でも、お気軽にご連絡ください。</p>
  </div>
  <div class="pad ways" style="top:206mm">
    <!-- 写真：スタッフ・事務所写真/image/250227_image_046.jpg・250227_image_085.jpg -->
    <div class="w0"><img src="../img/staff-document-046.jpg" alt=""><p class="who">できるだけ<br>高く売りたい方</p><h3>仲介売却</h3></div>
    <div class="w1"><img src="../img/staff-consult-085.jpg" alt=""><p class="who">早く・確実に<br>売却したい方</p><h3>直接買取</h3></div>
    <div class="badges">${badges()}</div>
  </div>
  <div class="fc">
    <div class="pad main">
      <img class="lg" src="../img/logo-white.png" alt="いえプロ不動産">
      <div class="mid"><p class="msg">地域の不動産は、私たちにお任せください！</p><div class="tel"><span class="ic">${PHONE}</span><span class="no">${TEL}</span></div><p class="hours"><span>営業時間</span>9:00〜18:00　｜　定休日　火・水</p></div>
      <div class="qrbox"><p>WEBからも<br>ご予約・無料査定<br>（24時間受付）</p><div class="qrph">QRコード</div></div>
    </div>
    <p class="pad co">${CO[0].replace('　', '　')}　${CO[1]}<br>${CO[2]}</p>
  </div>`,
  back: `
  <!-- 写真：スタッフ・事務所写真/office/250227_office_004.jpg → img/office-interior-04.jpg -->
  <div class="photo" style="left:0;top:0;width:216mm;height:60mm"><img src="../img/office-interior-04.jpg" alt="" style="object-position:50% 60%"></div>
  <div class="bshade"></div>
  <div class="pad strip">${strip('white')}</div>
  <div class="pad bh" style="top:26mm"><p class="pre">不動産のご売却をお考えの方へ</p><h2>今、不動産を<em>早めに売る</em>ことを<br>おすすめする理由</h2></div>
  <div class="pad c3" style="top:66mm">
    <div>${ICON3.up}<p>住宅ローンの<br><mark>金利が上昇中</mark><small>支払額がアップ</small></p></div>
    <span class="ar"></span>
    <div>${ICON3.people}<p>買い手の<br><mark class="y">予算が下がる</mark></p></div>
    <span class="ar"></span>
    <div>${ICON3.down}<p>売却できる<br><mark>金額が下がる</mark><small>可能性があります</small></p></div>
  </div>
  <div class="pad more" style="top:106mm"><b>さらに</b><span>建築費の高騰で、マンションの管理費・修繕積立金も値上げ</span><span>売却物件が増え、物件が供給過多に</span></div>
  <div class="pad data" style="top:117mm">
    <div class="box"><p class="pill">住宅ローン金利の推移（目安）</p>${chart(GOLDC)}</div>
    <div class="box"><p class="pill g">同じ月々の返済額（10万円・35年）の場合<br>借入できる金額の目安</p>${loan()}</div>
  </div>
  <p class="pad kari" style="top:158mm">${RNOTE}</p>
  <div class="pad pat" style="top:165mm"><p class="pt">よくある住み替えのかたち</p><div class="g2">${pats()}</div></div>
  <div class="cta">
    <!-- 写真：スタッフ・事務所写真/image/250227_image_194.jpg → img/staff-guide-194.jpg -->
    <div class="photo" style="left:0;top:0;width:74mm;height:100%"><img src="../img/staff-guide-194.jpg" alt="" style="object-position:38% 30%"></div>
    <div class="right">
      <p class="dk">だからこそ、</p>
      <h2><em>今のうちに</em>売却のご相談を！</h2>
      <div class="row"><div><div class="tel"><span class="ic">${PHONE}</span><span class="no">${TEL}</span></div><p class="hours">${HOURS}</p><div class="badges">${badges()}</div></div>${qr()}</div>
      <p class="co">${GH}｜${AREA} 限定｜仲介売却・直接買取<br>${CO[0]}<br>${CO[1]}　${CO[2]}</p>
    </div>
  </div>`,
};

const LIST = [['05', '雑誌風（住み替え）', 'd05', d05], ['06', '紺の高級感（相続・空き家）', 'd06', d06], ['10', '図解（売り時診断）', 'd10', d10], ['29', 'ミニマル（問いかけ）', 'd29', d29], ['30', '数字を大きく', 'd30', d30], ['00', '営業ラフ清書版', 'd00', d00]];
// QRコード：予約フォーム（sell-form/）へ。URL末尾の ?f=案番号 でどのチラシから来たかを記録する
// 画像は img/qr-form-<案番号>.svg（https://yoshida-m-del.github.io/iepro-lp/sell-form/?f=<案番号>）
const withQr = (html, id) => html.replace(/<div class="qrph">[^<]*(?:<br>[^<]*)?<\/div>/g, '<img class="qrimg" src="../img/qr-form-' + id + '.svg" alt="予約フォームのQRコード">');
const sheets = LIST.map(([id, name, cls, d]) => `
<!-- ==================== ${id} ${name}：表 ==================== -->
<section class="sheet fr ${cls}">${withQr(d.front, id)}
</section>
<!-- ==================== ${id} ${name}：裏 ==================== -->
<section class="sheet bk ${cls}">${withQr(d.back, id)}
</section>`).join('\n');

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>いえプロ不動産 ポスティングチラシ 候補5案（A4両面）</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&amp;family=Shippori+Mincho+B1:wght@600;700&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700&amp;display=swap">
<link rel="stylesheet" href="flyer.css">
<link rel="stylesheet" href="posting.css">
<!-- このファイルは build-posting.js で自動生成しています。直接は編集しないでください。 -->
</head>
<body>
<script>
if(location.search.indexOf('guides')>-1)document.documentElement.classList.add('guides');
(function(){var m=location.search.match(/page=(\\d+)/);if(!m)return;document.documentElement.classList.add('one-page');
document.addEventListener('DOMContentLoaded',function(){var s=document.querySelectorAll('.sheet')[+m[1]-1];if(s)s.classList.add('show');});})();
</script>
${sheets}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'src', 'posting.html'), html);
console.log('wrote src/posting.html (' + LIST.length * 2 + ' pages)');
