// 外報電抄 - Cloudflare Worker
// RSS取得 → Claude API処理 → JSON返却

const RSS_SOURCES_TECH = [
  // Tier 1: 総合テック
  { url: 'https://feeds.feedburner.com/TechCrunch/', tag: 'bigtech', name: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', tag: 'bigtech', name: 'The Verge' },
  { url: 'https://arstechnica.com/feed/', tag: 'bigtech', name: 'Ars Technica' },
  { url: 'https://www.wired.com/feed/rss', tag: 'bigtech', name: 'Wired' },
  // Tier 2: AI特化
  { url: 'https://openai.com/blog/rss.xml', tag: 'ai', name: 'OpenAI Blog' },
  { url: 'https://blog.google/technology/ai/rss/', tag: 'ai', name: 'Google AI Blog' },
  { url: 'https://venturebeat.com/feed/', tag: 'ai', name: 'VentureBeat' },
  { url: 'https://www.technologyreview.com/feed/', tag: 'ai', name: 'MIT Tech Review' },
  // Tier 3: 半導体・ハードウェア
  { url: 'https://semianalysis.com/feed/', tag: 'semiconductor', name: 'SemiAnalysis' },
  { url: 'https://www.tomshardware.com/feeds/all', tag: 'semiconductor', name: "Tom's Hardware" },
  // Tier 4: 中国テック・OSS・コミュニティ
  { url: 'https://technode.com/feed/', tag: 'china', name: 'TechNode' },
  { url: 'https://hnrss.org/frontpage', tag: 'oss', name: 'Hacker News' },
  // Tier 5: ファンディング・ビジネス
  { url: 'https://www.theinformation.com/feed', tag: 'funding', name: 'The Information' },
  // Tier 6: スポーツテック
  { url: 'https://sporttechie.com/feed', tag: 'sportstech', name: 'SportTechie' },
  { url: 'https://www.sportsbusinessjournal.com/rss/feed.aspx', tag: 'sportstech', name: 'Sports Business Journal' },
  { url: 'https://www.sportico.com/feed/', tag: 'sportstech', name: 'Sportico' },
  // Tier 7: 一次ソース（総合メディアのテック面）
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', tag: 'bigtech', name: 'BBC Technology' },
  { url: 'https://feeds.reuters.com/reuters/technologyNews', tag: 'bigtech', name: 'Reuters Technology' },
];

const RSS_SOURCES_UIUX = [
  // 海外: UXリサーチ・専門
  { url: 'https://www.nngroup.com/feed/rss/', tag: 'research', name: 'Nielsen Norman Group' },
  { url: 'https://uxdesign.cc/feed', tag: 'design', name: 'UX Collective' },
  { url: 'https://www.smashingmagazine.com/feed/', tag: 'design', name: 'Smashing Magazine' },
  { url: 'https://alistapart.com/main/feed/', tag: 'design', name: 'A List Apart' },
  { url: 'https://baymard.com/blog.rss', tag: 'ecommerce', name: 'Baymard Institute' },
  { url: 'https://www.lukew.com/ff/rss.asp', tag: 'product', name: 'LukeW' },
  // 海外: デザイン・テック・プロダクト
  { url: 'https://www.fastcompany.com/section/design/rss', tag: 'product', name: 'Fast Company Design' },
  { url: 'https://www.creativebloq.com/feed', tag: 'design', name: 'Creative Bloq' },
  { url: 'https://www.designboom.com/feed/', tag: 'physical', name: 'Designboom' },
  { url: 'https://techcrunch.com/tag/design/feed/', tag: 'product', name: 'TechCrunch Design' },
  { url: 'https://www.theverge.com/rss/reviews/index.xml', tag: 'review', name: 'The Verge Reviews' },
  { url: 'https://www.itsnicethat.com/rss/all', tag: 'design', name: "It's Nice That" },
  // 国内: UI/UXまとめ・SNS話題・ニュース
  { url: 'https://coliss.com/feed', tag: 'japan', name: 'コリス' },
  { url: 'https://photoshopvip.net/feed', tag: 'japan', name: 'PhotoshopVIP' },
  { url: 'https://note.com/topic/design/rss', tag: 'japan', name: 'note デザイン' },
  { url: 'https://b.hatena.ne.jp/hotentry/it.rss', tag: 'sns話題', name: 'はてブ IT' },
  { url: 'https://togetter.com/rss/hot', tag: 'sns話題', name: 'Togetter' },
  { url: 'https://news.yahoo.co.jp/rss/topics/it.xml', tag: 'japan', name: 'Yahoo IT' },
  { url: 'https://gigazine.net/news/rss_2.0/', tag: 'japan', name: 'GIGAZINE' },
  { url: 'https://www.gizmodo.jp/feed', tag: 'japan', name: 'Gizmodo Japan' },
  { url: 'https://zenn.dev/feed', tag: 'japan', name: 'Zenn' },
  { url: 'https://uxmilk.jp/feed', tag: 'design', name: 'UX MILK' },
];

const RSS_SOURCES_SUSTAIN = [
  // 海外: 気候・エネルギー・資源
  { url: 'https://www.carbonbrief.org/feed/', tag: 'climate', name: 'Carbon Brief' },
  { url: 'https://www.climatechangenews.com/feed/', tag: 'climate', name: 'Climate Home News' },
  { url: 'https://cleantechnica.com/feed/', tag: 'energy', name: 'CleanTechnica' },
  { url: 'https://www.greenbiz.com/rss/all', tag: 'corporate', name: 'GreenBiz' },
  { url: 'https://www.theguardian.com/environment/rss', tag: 'climate', name: 'The Guardian Environment' },
  { url: 'https://www.reuters.com/sustainability/rss', tag: 'corporate', name: 'Reuters Sustainability' },
  // 海外: エネルギー安全保障・地政学
  { url: 'https://oilprice.com/rss/main', tag: 'energy', name: 'OilPrice' },
  { url: 'https://feeds.reuters.com/reuters/energyNews', tag: 'energy', name: 'Reuters Energy' },
  { url: 'https://ieefa.org/feed', tag: 'energy', name: 'IEEFA' },
  // 国内: ESG・環境政策
  { url: 'https://sustainablejapan.jp/feed', tag: 'japan', name: 'Sustainable Japan' },
  { url: 'https://www.kankyo-business.jp/rss/news.xml', tag: 'japan', name: '環境ビジネスオンライン' },
  { url: 'https://www.enecho.meti.go.jp/about/special/shared/rss.xml', tag: 'japan', name: '資源エネルギー庁' },
];

const SYSTEM_PROMPT_TECH = `あなたは「外報電抄」の編集者です。海外テック業界のニュースを「構造化」して日本語で再構成してください。
単なる翻訳ではなく、「何が変化しているのか」を読者に伝えることが最重要です。

【出力形式】JSON配列で返してください。各記事は以下の構造:
{
  "headline": "見出し（1行で完結。30字以内目安）",
  "summary": "要約（200-300字。冒頭1文で主語となる企業・人物・技術を簡潔に説明すること。例: 『Fiskerは2020年創業のEVスタートアップで、2024年に経営破綻した。』のように、読者が知らない固有名詞は最初に解説する）",
  "signal": "この記事が示す業界の変化・方向性（1-2文）",
  "shift": "変化の構造（例: 性能競争 → インフラ戦争）",
  "background": "経緯（この話題はいつ頃から騒がれ始め、何が明らかになってきたか。時系列で2-3ステップで記述。例: 2024年末にX社が構想発表→2025年3月にSDK公開→今回、企業向け本格展開）",
  "japan_impact": "日本のエンジニア・ビジネスへの影響",
  "tag": "bigtech/ai/semiconductor/china/funding/oss/research/robotics/sportstech",
  "source_name": "元メディア名",
  "source_url": "元記事URL",
  "company_url": "記事の主題となる企業・サービス・プロジェクト・論文の公式URL（例: https://intercom.com, https://github.com/xxx, https://arxiv.org/abs/xxx）。読者が詳細を調べられるリンク。該当しない場合はnull",
  "related_tags": ["関連キーワード2-4個。例: OpenAI, エージェント, SaaS, カスタマーサポート"],
  "editorial": "【1本目の記事のみ】編集論評。なぜこの記事を一面に選んだか、何が面白い/深刻か、今後どのような影響をもたらすか、を3-5文で書く。2本目以降はnull",
  "published_at": "配信日時（ISO8601）",
  "image_url": "候補にImage URLが記載されていればそのまま転記する。なければnull"
}

【見出しルール】
- 体言止めで書く（新聞見出しスタイル）。良い例:「マスクのOpenAI提訴棄却」「Google、検索AIを全面刷新」「EU炭素国境税の前倒し施行」
- 主題は必ず「何が起きたか（結果・結論）」を含める。悪い例:「マスクのOpenAI提訴」（結果がない）。良い例:「マスクのOpenAI提訴棄却 2時間未満の審議で全員一致」
- 助詞（を/が/に/で/は/と）や動詞の連用形で終わるのは禁止。名詞・漢語・サ変名詞で止める
- 文節の途中で切らない。悪い例:「中国がGPUなしで」（「なしで」で切れている）
- 30字以内を目安に簡潔に書く

【編集方針 — "Signal"を伝える】
- 「何が発表された」ではなく「何が変わろうとしているか」を書く
- "shift"フィールドで変化の方向を「A → B」形式で明示する
- 因果関係が複数ステップにわたる場合はA→B→C形式で明示
- 対立する見方がある場合は両論併記
- 【重要】抽象的なバズワードで逃げない。読者が具体的に何が起きているか想像できる粒度で書く
- 技術用語を使う場合は必ず「つまり何ができるようになるのか」を1文で補足する

【選定基準】
1. 業界の構造的変化を示すニュース（最優先）
2. 日本では報じられていない/文脈が伝わっていない話題
3. エンジニアの仕事・キャリアに影響する変化
4. 資金の流れが変わる兆候（M&A、大型調達、撤退）

【除外】
- 単なる製品アップデート（新機能追加レベル）
- 決算の数字だけの報道
- 人事異動（構造的意味がない場合）`;

const SYSTEM_PROMPT_SUSTAIN = `あなたは「外報電抄」のサステナビリティ版の編集者です。環境・資源・エネルギー分野のニュースを「構造化」して日本語で再構成してください。
単なる翻訳ではなく、「何が変化しているのか」を読者に伝えることが最重要です。

【出力形式】JSON配列で返してください。各記事は以下の構造:
{
  "headline": "見出し（主題\\n─ 副題）",
  "summary": "要約（200-300字。冒頭1文で主語となる企業・組織・制度を簡潔に説明すること。読者が知らない固有名詞は最初に解説する）",
  "signal": "この記事が示す業界・政策の変化方向（1-2文）",
  "shift": "変化の構造（例: 自主的ESG開示 → 法的義務化）",
  "background": "経緯（時系列で2-3ステップ）",
  "japan_impact": "日本企業・政策への影響",
  "tag": "climate/energy/resource/corporate/regulation/biodiversity/japan",
  "source_name": "元メディア名",
  "source_url": "元記事URL",
  "company_url": "関連する企業・機関・法令の公式URL。該当しない場合はnull",
  "related_tags": ["関連キーワード2-4個"],
  "editorial": "【1本目の記事のみ】編集論評。2本目以降はnull",
  "published_at": "配信日時（ISO8601）",
  "image_url": "候補にImage URLが記載されていればそのまま転記する。なければnull"
}

【見出しルール】
【見出しルール】
- 「主題\\n─ 副題」の構成。\\nで改行
- 体言止めで書く（新聞見出しスタイル）。良い例:「EU炭素国境税の前倒し施行」「トヨタ、全車種EV化を撤回」
- 主題は必ず「何が起きたか（結果・結論）」を含める。悪い例:「EUの炭素規制」（結果がない）
- 助詞（を/が/に/で/は/と）や動詞の連用形で終わるのは禁止。名詞・漢語・サ変名詞で止める
- 文節の途中で切らない

【編集方針】
- 「何が発表された」ではなく「何が変わろうとしているか」を書く
- 規制・政策の変化は「いつから」「誰が対象」「罰則は」を明示
- 抽象的なバズワードで逃げない。具体的に何が起きているか想像できる粒度で書く
- 海外の動きが日本にどう波及するかを必ず書く

【選定基準 — 5本中、海外2本＋国内3本の比率を守る】
1. 海外: 規制・政策の構造的変化（EU/米国/中国の環境規制）
2. 海外: エネルギー転換・資源争奪の兆候
3. 国内: 日本企業のサステナビリティ戦略変更
4. 国内: 日本の環境政策・規制動向
5. 国内: 再エネ・脱炭素の具体的進展

【除外】
- 単なるCSR報告書の発表
- 具体性のないSDGs宣言
- 環境団体の声明のみ（政策変更を伴わない場合）`;

const SYSTEM_PROMPT_UIUX = `あなたは「外報電抄」のUI/UX版の編集者です。デジタル・物理を問わず「使いやすさ」「使いにくさ」に関するニュースや話題を日本語で再構成してください。

【対象範囲】
- Webサイト・アプリのUI改善/改悪
- セルフレジ・注文端末・券売機などの物理UIデザイン
- ネット配信サービスのUX変更
- アクセシビリティの取り組み
- デザインシステムの公開・更新
- ユーザーリサーチの知見・手法
- SNSで話題になった「使いにくい」「使いやすい」事例

【出力形式】JSON配列で返してください。各記事は以下の構造:
{
  "headline": "見出し（主題\\n副題）",
  "summary": "要約（200-300字。どんなサービス/製品で、誰向けに、何が変わったか/何が問題かを具体的に書く）",
  "signal": "この事例が示すUI/UXのトレンドや方向性（1-2文）",
  "shift": "変化の構造（例: 機能追加優先 → ユーザー負荷削減優先）",
  "background": "経緯（なぜこの変更が行われたか、ユーザーの反応はどうだったか）",
  "japan_impact": "日本のデザイナー・開発者・サービス運営者への示唆",
  "tag": "app/web/physical/accessibility/designsystem/research/sns話題",
  "source_name": "元メディア名",
  "source_url": "元記事URL",
  "company_url": "関連するサービス・企業の公式URL。該当しない場合はnull",
  "related_tags": ["関連キーワード2-4個"],
  "editorial": "【1本目の記事のみ】編集論評。2本目以降はnull",
  "published_at": "配信日時（ISO8601）",
  "image_url": "候補にImage URLが記載されていればそのまま転記する。なければnull"
}

【見出しルール】
- 「主題\\n副題」の構成。\\nで改行
- 体言止めで書く（新聞見出しスタイル）。良い例:「Spotify、歌詞表示の有料限定化」「セルフレジ廃止のスーパー続出」
- 主題は必ず「何が起きたか（結果・結論）」を含める。悪い例:「Spotifyのアプリ改修」（結果がない）
- 助詞（を/が/に/で/は/と）や動詞の連用形で終わるのは禁止。名詞・漢語・サ変名詞で止める
- 文節の途中で切らない

【編集方針 — "体験の変化"を伝える】
- 「何がリリースされた」ではなく「ユーザーの体験がどう変わるか」を書く
- 良い事例も悪い事例も取り上げる（炎上・批判も重要な情報）
- 「誰のために」「どんな場面で」「何が改善/悪化したか」を必ず明示
- 抽象的な「UXを改善」ではなく、具体的に何が変わったかを書く

【選定基準 — 0-5本（該当なしなら0本でOK）】
1. ユーザー体験の具体的な変化が明確な事例（最優先）
2. SNSで話題になった使いにくい/使いやすいUI事例
3. デザインシステムやアクセシビリティの構造的な取り組み
4. ユーザーリサーチの新しい知見や手法

【重要】
- 該当する記事がなければ空配列 [] を返してください。無理に5本埋めない。
- 純粋なビジュアルデザイン（ロゴ変更、ブランディング）はUI/UX観点がない限り除外
- 開発者向けツールの新機能紹介は、エンドユーザーのUXに影響しない限り除外`;

// RSS XMLをパースして記事リストを返す
function parseRSS(xml, source) {
  const articles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '';
    const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/) || [])[1] || '';
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
    // 画像URL抽出: media:content > enclosure > description内のimg
    let image = null;
    const mediaMatch = item.match(/<media:content[^>]+url=["']([^"']+)["']/);
    if (mediaMatch) image = mediaMatch[1];
    if (!image) {
      const encMatch = item.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/);
      if (encMatch) image = encMatch[1];
    }
    if (!image) {
      const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/);
      if (imgMatch) image = imgMatch[1];
    }
    
    if (title) {
      articles.push({
        title: title.replace(/<[^>]*>/g, '').trim(),
        link: link.trim(),
        description: desc.replace(/<[^>]*>/g, '').trim().slice(0, 500),
        pubDate,
        image,
        source_name: source.name,
        tag: source.tag,
      });
    }
  }
  return articles;
}

// 全RSSソースから記事を取得
async function fetchAllRSS(sources, cutoffHours = 48) {
  const allArticles = [];
  const cutoff = Date.now() - cutoffHours * 60 * 60 * 1000;
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      try {
        const res = await fetch(source.url, {
          headers: { 'User-Agent': 'GaihodenBot/1.0' },
          cf: { cacheTtl: 300 },
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSS(xml, source);
      } catch (e) {
        return [];
      }
    })
  );
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      for (const article of result.value) {
        // 48時間以内の記事のみ採用
        if (article.pubDate) {
          const pubTime = new Date(article.pubDate).getTime();
          if (pubTime && pubTime < cutoff) continue;
        }
        allArticles.push(article);
      }
    }
  }
  return allArticles;
}

// 重複排除（タイトルの類似度で）
function deduplicateArticles(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// タグバランスを取って候補を選定
function selectDiverseCandidates(articles, maxTotal = 18) {
  const byTag = {};
  for (const a of articles) {
    if (!byTag[a.tag]) byTag[a.tag] = [];
    byTag[a.tag].push(a);
  }
  const tags = Object.keys(byTag);
  const perTag = Math.max(2, Math.floor(maxTotal / tags.length));
  const selected = [];
  for (const tag of tags) {
    selected.push(...byTag[tag].slice(0, perTag));
  }
  if (selected.length < maxTotal) {
    const selectedSet = new Set(selected.map(a => a.link));
    for (const a of articles) {
      if (selected.length >= maxTotal) break;
      if (!selectedSet.has(a.link)) {
        selected.push(a);
        selectedSet.add(a.link);
      }
    }
  }
  return selected.slice(0, maxTotal);
}

// Claude APIで記事を処理
async function processWithClaude(articles, apiKey, pastArticleTitles, systemPrompt, channelLabel) {
  const candidates = selectDiverseCandidates(articles, 21);
  const articleTexts = candidates.map((a, i) => 
    `[${i+1}] ${a.source_name} [${a.tag}]\nTitle: ${a.title}\nURL: ${a.link}${a.image ? '\nImage: ' + a.image : ''}`
  ).join('\n\n');

  const userPrompt = `以下の${channelLabel}記事から、構造的変化を示す重要な記事を5本選び、日本語で再構成してください。

【重要】
- 5本の中に同じソース（source_name）が2本以上入らないようにしてください。tagも最低3種類以上カバーしてください。
- 分析や説明は一切書かず、JSON配列のみを出力してください。

${pastArticleTitles.length > 0 ? `【過去記事（重複回避用）】\n${pastArticleTitles.slice(0,10).join('\n')}\n\n` : ''}【候補】
${articleTexts}

JSON配列のみを出力してください。他のテキストは不要です。`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.content[0].text;
  
  // JSONを抽出（```json ... ``` で囲まれている場合も対応）
  // まず```json...```を除去
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  // 空配列チェック（UI/UXで該当記事なしの場合）
  if (cleaned === '[]' || cleaned.match(/^\[\s*\]$/)) {
    return [];
  }
  
  // JSON配列を検出: [{ で始まるパターンを探す（[1][2]のような参照番号を除外）
  const jsonStart = cleaned.indexOf('[{');
  if (jsonStart === -1 && cleaned.indexOf('[\n{') === -1 && cleaned.indexOf('[\n  {') === -1) {
    // [{が見つからない場合、[ + 改行 + { のパターンも試す
    const altStart = cleaned.search(/\[\s*\{/);
    if (altStart >= 0) {
      cleaned = cleaned.slice(altStart);
    } else {
      throw new Error('Claude response did not contain JSON array starting with [{. Raw: ' + text.slice(0, 500));
    }
  } else {
    const actualStart = cleaned.search(/\[\s*\{/);
    if (actualStart >= 0) {
      cleaned = cleaned.slice(actualStart);
    }
  }
  
  // 最後の ] を見つけてJSON配列を抽出
  const lastBracket = cleaned.lastIndexOf(']');
  if (lastBracket > 0) {
    cleaned = cleaned.slice(0, lastBracket + 1);
  }
  
  try {
    return JSON.parse(cleaned);
  } catch(e) {
    // 途中で切れたJSONを修復: 最後の完全なオブジェクトまでで閉じる
    const lastComplete = cleaned.lastIndexOf('},');
    if (lastComplete > 0) {
      const truncated = cleaned.slice(0, lastComplete + 1) + ']';
      try { return JSON.parse(truncated); } catch(e2) {}
    }
    // さらにフォールバック: 最後の } を探して閉じる
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > 0) {
      const truncated = cleaned.slice(0, lastBrace + 1) + ']';
      try { return JSON.parse(truncated); } catch(e3) {}
    }
    throw new Error('JSON parse failed: ' + e.message + ' | Raw start: ' + cleaned.slice(0, 200));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // GET /api/latest - 最新号を返す（?ch=tech or ?ch=sustain）
    if (url.pathname === '/api/latest') {
      try {
        const ch = url.searchParams.get('ch') || 'tech';
        const kvKey = ch === 'sustain' ? 'latest_sustain' : ch === 'uiux' ? 'latest_uiux' : 'latest';
        const cached = await env.GAIHODEN_KV.get(kvKey, 'json');
        if (cached) {
          return new Response(JSON.stringify(cached), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ articles: [], date: new Date().toISOString(), edition: '準備中' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // GET /api/generate - 全チャンネルを順番に生成（個別エンドポイントを内部呼び出し）
    if (url.pathname === '/api/generate') {
      try {
        const techResult = await generateChannel(env, 'tech');
        const sustainResult = await generateChannel(env, 'sustain');
        const uiuxResult = await generateChannel(env, 'uiux');
        return new Response(JSON.stringify({ tech: techResult, sustain: sustainResult, uiux: uiuxResult }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { 
          status: 500, headers: corsHeaders 
        });
      }
    }

    // GET /api/generate-uiux - UI/UXチャンネルのみ生成
    if (url.pathname === '/api/generate-uiux') {
      try {
        const result = await generateChannel(env, 'uiux');
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { 
          status: 500, headers: corsHeaders 
        });
      }
    }

    // GET /api/pin?url=...&ch=tech - 編集長ピック（URLを構造化してKV保存）
    if (url.pathname === '/api/pin') {
      try {
        const pinUrl = url.searchParams.get('url');
        const ch = url.searchParams.get('ch') || 'tech';
        if (!pinUrl) return new Response(JSON.stringify({ error: 'url parameter required' }), { status: 400, headers: corsHeaders });
        const pinResult = await pinArticle(pinUrl, ch, env);
        return new Response(JSON.stringify(pinResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // GET /api/archive?date=2026-05-18&ch=tech - 過去号を取得
    if (url.pathname === '/api/archive') {
      try {
        const date = url.searchParams.get('date');
        const ch = url.searchParams.get('ch') || 'tech';
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return new Response(JSON.stringify({ error: 'date parameter required (YYYY-MM-DD)' }), { status: 400, headers: corsHeaders });
        }
        const prefix = ch === 'sustain' ? 'archive_sustain_' : ch === 'uiux' ? 'archive_uiux_' : 'archive_tech_';
        let archived = null;

        // 1. JST日付キーで探す（新方式: デプロイ後に保存されたデータ）
        const candidate1 = await env.GAIHODEN_KV.get(prefix + date, 'json');
        if (candidate1) {
          const jst1 = new Date(new Date(candidate1.date).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
          if (jst1 === date) archived = candidate1;
        }

        // 2. フォールバック: UTC日付（1日前）で探す（旧方式: UTC日付で保存されたデータ）
        if (!archived) {
          const prev = new Date(date + 'T00:00:00Z');
          prev.setUTCDate(prev.getUTCDate() - 1);
          const prevStr = prev.toISOString().slice(0, 10);
          const candidate2 = await env.GAIHODEN_KV.get(prefix + prevStr, 'json');
          if (candidate2) {
            const jst2 = new Date(new Date(candidate2.date).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
            if (jst2 === date) archived = candidate2;
          }
        }
        if (archived) {
          return new Response(JSON.stringify(archived), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'not_found', message: `No archive for ${date}` }), {
          status: 404, headers: corsHeaders,
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // GET /api/tickers - 株価・為替データ
    if (url.pathname === '/api/tickers') {
      try {
        const cached = await env.GAIHODEN_KV.get('tickers', 'json');
        if (cached) {
          return new Response(JSON.stringify(cached), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // キャッシュなければ即時取得
        const tickers = await fetchTickers();
        await env.GAIHODEN_KV.put('tickers', JSON.stringify(tickers), { expirationTtl: 3600 });
        return new Response(JSON.stringify(tickers), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // GET /api/rss-test - RSS取得テスト
    if (url.pathname === '/api/rss-test') {
      try {
        const ch = url.searchParams.get('ch') || 'tech';
        const sources = ch === 'sustain' ? RSS_SOURCES_SUSTAIN : ch === 'uiux' ? RSS_SOURCES_UIUX : RSS_SOURCES_TECH;
        const articles = await fetchAllRSS(sources);
        const deduped = deduplicateArticles(articles);
        return new Response(JSON.stringify({ 
          total_fetched: articles.length, 
          after_dedup: deduped.length,
          sample: deduped.slice(0, 5),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response('外報電抄 API\n\nEndpoints:\n- /api/latest?ch=tech|sustain\n- /api/archive?date=YYYY-MM-DD&ch=tech|sustain\n- /api/pin?url=...&ch=tech|sustain\n- /api/generate\n- /api/tickers\n- /api/rss-test?ch=tech|sustain', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },

  // Cron trigger: チャンネルごとに5分ずらして実行
  // UTC 20:00 (JST 5:00) = テック
  // UTC 20:05 (JST 5:05) = サステナ
  // UTC 20:10 (JST 5:10) = UI/UX
  // 設定: Cron Triggers に 0 20 * * *, 5 20 * * *, 10 20 * * * を登録
  async scheduled(event, env, ctx) {
    const minute = new Date(event.scheduledTime).getUTCMinutes();
    let ch;
    if (minute < 3) ch = 'tech';
    else if (minute < 8) ch = 'sustain';
    else ch = 'uiux';

    ctx.waitUntil((async () => {
      await generateChannel(env, ch);
      if (ch === 'tech') {
        try { const t = await fetchTickers(); await env.GAIHODEN_KV.put('tickers', JSON.stringify(t), { expirationTtl: 3600 }); } catch(e) {}
      }
    })());
  },
};

async function fetchTickers() {
  const symbols = [
    { id: 'USDJPY=X', key: 'usdjpy', label: 'USD/JPY' },
    { id: '^N225', key: 'nikkei', label: '日経平均' },
    { id: '^DJI', key: 'dow', label: 'NYダウ' },
    { id: 'CL=F', key: 'wti', label: '原油WTI' },
  ];
  const tickers = {};
  await Promise.allSettled(symbols.map(async (sym) => {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym.id)}?interval=1d&range=2d`,
        { headers: { 'User-Agent': 'GaihodenBot/1.0' }, cf: { cacheTtl: 600 } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) return;
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose;
      const change = prevClose ? ((price - prevClose) / prevClose * 100) : 0;
      tickers[sym.key] = {
        label: sym.label,
        price: sym.key === 'wti' ? `$${price.toFixed(1)}` : sym.key === 'usdjpy' ? price.toFixed(2) : price.toLocaleString('en-US', { maximumFractionDigits: 0 }),
        change: change.toFixed(1),
        direction: change >= 0 ? 'up' : 'down',
      };
    } catch (e) { /* skip */ }
  }));
  tickers.updated_at = new Date().toISOString();
  return tickers;
}

// UI/UX関連キーワードフィルタ（タイトル・説明文にキーワードが含まれる記事を優先）
const UIUX_KEYWORDS = [
  '使いにくい', '使いやすい', '間違えやすい', '不満', 'わかりにくい', 'わかりやすい',
  'UI', 'UX', 'デザイン', 'ユーザー体験', 'ユーザビリティ', 'アクセシビリティ',
  'セルフレジ', '券売機', '注文端末', 'タッチパネル', 'アプリ', 'リニューアル',
  '改悪', '改善', 'ダークパターン', '誤操作', '誤タップ', '押し間違', '見づらい',
  'フォーム', 'ボタン', 'ナビゲーション', '導線', '離脱', 'コンバージョン',
  'usability', 'accessibility', 'user experience', 'dark pattern', 'redesign',
  'checkout', 'onboarding', 'friction', 'intuitive', 'confusing',
  'design system', 'component', 'interaction', 'responsive', 'mobile-first',
];

function filterUiuxRelevant(articles) {
  const keywordMatched = [];
  const rest = [];
  for (const a of articles) {
    const text = (a.title + ' ' + a.description).toLowerCase();
    const matched = UIUX_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
    if (matched) keywordMatched.push(a);
    else rest.push(a);
  }
  return [...keywordMatched, ...rest];
}

// コラムテキストからMarkdown記法を除去
function sanitizeColumn(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **太字** → 太字
    .replace(/\*(.*?)\*/g, '$1')      // *斜体* → 斜体
    .replace(/^#+\s*/gm, '')          // ## 見出し → 見出し
    .replace(/^[-*]\s+/gm, '')        // - リスト → リスト
    .trim();
}

// 座談会テキストを「名前: セリフ」の配列にパース
function parseRoundtable(text, names) {
  const cleaned = sanitizeColumn(text);
  const turns = [];
  for (const raw of cleaned.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    // 「名前: セリフ」または「名前：セリフ」
    const m = line.match(/^([^\s:：]{1,8})\s*[:：]\s*(.+)$/);
    if (m && names.includes(m[1])) {
      turns.push({ speaker: m[1], text: m[2].trim() });
    } else if (turns.length > 0) {
      // 改行で折り返された継続行は直前の発言に連結
      turns[turns.length - 1].text += ' ' + line;
    }
  }
  return turns;
}

// 編集長ピック: URLをClaude APIで構造化してKVに保存
async function pinArticle(pinUrl, ch, env) {
  const systemPrompt = ch === 'sustain' ? SYSTEM_PROMPT_SUSTAIN : SYSTEM_PROMPT_TECH;
  const channelLabel = ch === 'sustain' ? 'サステナビリティ' : 'テック';

  const userPrompt = `以下のURLの記事を1本だけ構造化してください。出力はJSON配列（要素1つ）で返してください。

URL: ${pinUrl}

この記事を${channelLabel}チャンネルの記事として構造化してください。JSON配列のみを出力してください。`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3000, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  let text = data.content[0].text;
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = text.search(/\[\s*\{/);
  if (start >= 0) text = text.slice(start);
  const end = text.lastIndexOf(']');
  if (end > 0) text = text.slice(0, end + 1);
  const articles = JSON.parse(text);
  const pinned = articles[0];

  // KVに保存（次回生成時に使う）
  const kvKey = ch === 'sustain' ? 'pinned_sustain' : 'pinned_tech';
  await env.GAIHODEN_KV.put(kvKey, JSON.stringify(pinned), { expirationTtl: 86400 * 2 }); // 2日で自動消滅

  return { status: 'pinned', channel: ch, article: pinned };
}

// 1チャンネルずつ生成（サブリクエスト制限回避）
async function generateChannel(env, ch) {
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;
  const edition = jstHour < 12 ? '朝刊' : '夕刊';
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dayIndex = now.getDate() % 3;

  const columnists = [
    { name: '黒田', persona: 'あなたは「黒田」。50代男性の元エンジニア。エンジン至上主義で内燃機関への愛が深い。AIを基本的に信用していない。「人間の判断を機械に委ねるな」が口癖。怖い先輩的な口調で、断定的に書く。趣味はクラシックカーのレストア。テック記事に対して「本当にそれで良いのか」と問いかける視点で書く。' },
    { name: '朝比奈', persona: 'あなたは「朝比奈」。30代男性。テクノロジーが社会に与える影響を構造的に考えるのが好きな楽観派。ただし能天気ではない。「これが一般化したら、こういうことができる世の中になる」「そうなると、こんな良い変化と、こんな副作用が同時に起きるかもしれない」と、技術の普及がもたらす未来を解像度高く想像して語る。口調は柔らかく「面白いのは〜」「これ、広まったら〜」「逆に〜という人も出てくるかも」。禁止: 「すごい」「やばい」など中身のない感嘆だけで終わること。必ず①誰の何ができるようになるか ②普及した先の社会の変化 ③良い面と悪い面の両方、のどれかに踏み込む。例: 「これが当たり前になったら、地方の小さな会社でも東京の大企業と同じ武器を持てる。一方で、差を生んでいた職人技みたいなものの価値が消えるかもしれない」。スポーツや日常の例え話で技術を噛み砕くのも得意。' },
    { name: '南', persona: 'あなたは「南」。40代女性。SaaS業界出身でガジェット好き。実務的な視点で「で、これ使えるの？」「導入するなら何から？」を考える。簡潔で歯切れの良い口調。新しいツールやサービスをすぐ試したがる。「つまりこういうことです」と整理するのが得意。' },
  ];
  const noMarkdown = ' 絶対ルール: Markdown記法は一切使わないでください。**太字**、*斜体*、##見出し、- リスト、全て禁止。冒頭にタイトルや見出しを付けないでください。いきなり本文から始めてください。プレーンテキストのみで出力すること。';

  let sources, systemPrompt, channelLabel, cutoffHours, pastKey, latestKey, archivePrefix, columnistIdx, pinnedKey;

  if (ch === 'tech') {
    sources = RSS_SOURCES_TECH; systemPrompt = SYSTEM_PROMPT_TECH; channelLabel = '海外テックニュース';
    cutoffHours = 48; pastKey = 'past_titles_tech'; latestKey = 'latest'; archivePrefix = 'archive_tech_';
    columnistIdx = dayIndex; pinnedKey = 'pinned_tech';
  } else if (ch === 'sustain') {
    sources = RSS_SOURCES_SUSTAIN; systemPrompt = SYSTEM_PROMPT_SUSTAIN; channelLabel = 'サステナビリティ・環境・資源';
    cutoffHours = 48; pastKey = 'past_titles_sustain'; latestKey = 'latest_sustain'; archivePrefix = 'archive_sustain_';
    columnistIdx = (dayIndex + 1) % 3; pinnedKey = 'pinned_sustain';
  } else {
    sources = RSS_SOURCES_UIUX; systemPrompt = SYSTEM_PROMPT_UIUX; channelLabel = 'UI/UXデザイン';
    cutoffHours = 168; pastKey = 'past_titles_uiux'; latestKey = 'latest_uiux'; archivePrefix = 'archive_uiux_';
    columnistIdx = (dayIndex + 2) % 3; pinnedKey = 'pinned_uiux';
  }

  // RSS取得
  const raw = await fetchAllRSS(sources, cutoffHours);
  let articles = deduplicateArticles(raw);
  if (ch === 'uiux') articles = filterUiuxRelevant(articles);

  // 過去タイトル
  let pastTitles = [];
  try { const p = await env.GAIHODEN_KV.get(pastKey, 'json'); if (p) pastTitles = p; } catch(e) {}

  // Claude処理
  const processed = await processWithClaude(articles, env.ANTHROPIC_API_KEY, pastTitles, systemPrompt, channelLabel);

  // URL検証（Claudeがハルシネーションで架空URLを生成した場合のみ除去）
  // ドメインレベルで検証（末尾スラッシュやパラメータの差異を許容）
  const validDomains = new Set(articles.map(a => { try { return new URL(a.link).hostname; } catch(e) { return ''; } }));
  for (const a of processed) {
    if (a.source_url) {
      try {
        const domain = new URL(a.source_url).hostname;
        if (!validDomains.has(domain)) { a.source_url = null; a.source_name = null; }
      } catch(e) { a.source_url = null; a.source_name = null; }
    }
  }

  // ピン差し替え
  try {
    const pinned = await env.GAIHODEN_KV.get(pinnedKey, 'json');
    if (pinned) {
      if (processed.length > 0) { processed[processed.length - 1] = pinned; }
      else { processed.push(pinned); }
      await env.GAIHODEN_KV.delete(pinnedKey);
    }
  } catch (e) {}

  // 座談会コラム生成（記事がある場合のみ）
  // 編集部員3人が一面記事を中心に語り合う。最後に不採用候補の記事にも触れる。
  let column = null;
  if (processed.length > 0) {
    try {
      const lead = processed[0];
      const leadText = `${(lead.headline||'').replace(/\\n|\n/g,' ')}${lead.summary ? '\n' + lead.summary : ''}`;
      const otherHeadlines = processed.slice(1).map((a,i) => `${i+2}. ${(a.headline||'').replace(/\\n|\n/g,' ')}`).join('\n');
      // 不採用候補（採用5本から漏れた元記事）を「気になった記事」用に渡す
      const usedUrls = new Set(processed.map(a => a.source_url).filter(Boolean));
      const notUsed = articles.filter(a => !usedUrls.has(a.link)).slice(0, 6);
      const notUsedText = notUsed.map((a,i) => `[${i+1}] ${a.title}（${a.source_name}）`).join('\n');
      const cast = columnists.map(c => `${c.name}: ${c.persona}`).join('\n');

      const colPrompt = `あなたは外報電抄編集部の座談会を再現します。3人の編集部員が今日の記事について短く語り合います。

【登場人物】
${cast}

【今日の一面記事】
${leadText}

【今日のその他の記事】
${otherHeadlines || '（なし）'}

【今回は載せなかったが候補にあった記事】
${notUsedText || '（なし）'}

【ルール】
- 一面記事を中心に、3人が自然に掛け合う。合計4〜6発言。
- 黒田は懐疑・問題提起、朝比奈は楽観だが能天気ではなく「これが一般化したらどんな世の中になるか」を良い面と悪い面の両方から具体的に想像する、南は実務視点（で、使えるの？導入するなら何から？）で締める流れを基本に、会話として自然につなげる。
- 朝比奈は「すごい」「やばい」で終わらせない。必ず「これが当たり前になったら誰の何ができるようになるか」「その先に起きる良い変化と副作用」のどちらかに踏み込んで語る。
- 最後に誰か1人が「今回は載せなかったけど、この記事も気になった」と、候補記事の中から1本を挙げて一言触れる。候補がなければ省略。
- 各発言は40〜80字。全体で250〜350字に収める。
- 出力は「名前: セリフ」を1行ずつ。名前は黒田・朝比奈・南のいずれか。それ以外の地の文・見出し・説明は一切書かない。
- 候補記事に触れた場合は、座談会の最後に改行して「PICKUP: 番号」（触れた候補記事の[番号]）を1行だけ書く。触れなかった場合はPICKUP行を書かない。${noMarkdown}`;

      const colRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, messages: [{ role: 'user', content: colPrompt }] }),
      });
      if (colRes.ok) {
        const d = await colRes.json();
        let colText = d.content[0].text.trim();
        // PICKUP行を抽出して候補記事リンクを紐付け
        let pickup = null;
        const pm = colText.match(/PICKUP:\s*(\d+)/i);
        if (pm) {
          const idx = parseInt(pm[1], 10) - 1;
          if (notUsed[idx] && notUsed[idx].link) {
            pickup = { title: notUsed[idx].title, url: notUsed[idx].link, source_name: notUsed[idx].source_name };
          }
          colText = colText.replace(/PICKUP:\s*\d+/i, '').trim();
        }
        const turns = parseRoundtable(colText, columnists.map(c => c.name));
        if (turns.length > 0) column = { type: 'roundtable', turns, pickup };
      }
    } catch (e) {}
  }

  // KV保存
  const editionData = { date: now.toISOString(), edition, channel: ch, articles: processed, column, generated_at: now.toISOString() };
  await env.GAIHODEN_KV.put(latestKey, JSON.stringify(editionData));
  await env.GAIHODEN_KV.put(`${archivePrefix}${jstDate}`, JSON.stringify(editionData));

  // 過去タイトル更新
  const newMeta = processed.map(a => `[${a.tag}] ${a.headline.replace('\\n', ' ')} (${jstDate})`);
  await env.GAIHODEN_KV.put(pastKey, JSON.stringify([...newMeta, ...pastTitles].slice(0, 70)));

  return editionData;
}
