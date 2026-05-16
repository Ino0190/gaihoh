// 外報電抄 - Cloudflare Worker
// RSS取得 → Claude API処理 → JSON返却

const RSS_SOURCES = [
  // 米国
  { url: 'https://feeds.apnews.com/rss/apf-topnews', region: 'us', name: 'AP News' },
  { url: 'https://rss.politico.com/politics-news.xml', region: 'us', name: 'Politico' },
  { url: 'https://feeds.feedburner.com/TechCrunch/', region: 'us', name: 'TechCrunch' },
  { url: 'https://feeds.npr.org/1004/rss.xml', region: 'us', name: 'NPR World' },
  // 欧州
  { url: 'https://www.euronews.com/rss?level=theme&name=news', region: 'eu', name: 'Euronews' },
  { url: 'https://rss.dw.com/rdf/rss-en-all', region: 'eu', name: 'DW' },
  { url: 'https://www.theguardian.com/world/rss', region: 'eu', name: 'The Guardian' },
  { url: 'https://www.politico.eu/feed/', region: 'eu', name: 'Politico EU' },
  // ロシア
  { url: 'https://www.themoscowtimes.com/rss/news', region: 'ru', name: 'Moscow Times' },
  // 中国
  { url: 'https://www.scmp.com/rss/91/feed', region: 'cn', name: 'SCMP' },
  // インド
  { url: 'https://www.thehindu.com/news/international/feeder/default.rss', region: 'in', name: 'The Hindu' },
  { url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', region: 'in', name: 'Economic Times India' },
  // 中東
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', region: 'me', name: 'Al Jazeera' },
  { url: 'https://www.middleeasteye.net/rss', region: 'me', name: 'Middle East Eye' },
  // 横断
  { url: 'https://feeds.reuters.com/reuters/worldNews', region: 'all', name: 'Reuters' },
];

const SYSTEM_PROMPT = `あなたは「外報電抄」の編集者です。
海外ニュース記事を日本語で再構成してください。

【出力形式】JSON配列で返してください。各記事は以下の構造:
{
  "headline": "見出し（主題\\n─ 副題）",
  "summary": "要約（200-300字）",
  "background": "背景・きっかけ（なぜ今これが起きているか）",
  "causal_chain": "因果連鎖（A→B→C→…→日本への着地）。該当しない場合はnull",
  "japan_impact": "日本への影響",
  "why_read": "なぜ読むべきか（日本メディアが報じない理由）",
  "opposing_views": "対立する見方がある場合のみ記述。ない場合はnull",
  "region": "us/eu/ru/cn/in/me",
  "category": "politics/diplomacy/economy/tech/trade/environment/sports",
  "source_name": "元メディア名",
  "source_url": "元記事URL",
  "published_at": "配信日時（ISO8601）"
}

【見出しルール】
- 「主題\\n─ 副題」の構成。\\nで改行
- 助詞（を/が/に/で/は）で行を終わらせない
- 主題20字以内なら1行で収める
- 固有名詞・数字は途中で切らない

【編集方針】
- 単なる翻訳ではなく「日本人が知るべき文脈」を付与
- 因果関係が複数ステップにわたる場合はA→B→C形式で明示
- 対立する見方がある場合は両論併記し、各ソースの立場・動機を明示
- 二項対立に見える問題は「誰が」「どの条件で」で条件分岐整理
- スポーツは結果ではなくビジネス・地政学の切り口
- 検証できない情報は「独立検証なし」と明記

【選定基準】
以下の優先度で記事を選んでください:
1. 日本のメディアが報じていない/報じにくい話題
2. 日本への影響が大きいが見えにくい話題
3. 因果連鎖が複雑で背景説明が必要な話題
4. 対立する見方があり両論を知るべき話題`;

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
    
    if (title) {
      articles.push({
        title: title.replace(/<[^>]*>/g, '').trim(),
        link: link.trim(),
        description: desc.replace(/<[^>]*>/g, '').trim().slice(0, 500),
        pubDate,
        source_name: source.name,
        region: source.region,
      });
    }
  }
  return articles;
}

// 全RSSソースから記事を取得
async function fetchAllRSS() {
  const allArticles = [];
  const results = await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
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
      allArticles.push(...result.value);
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

// Claude APIで記事を処理
async function processWithClaude(articles, apiKey, pastArticleTitles) {
  const articleTexts = articles.slice(0, 18).map((a, i) => 
    `[${i+1}] ${a.source_name} (${a.region})\nTitle: ${a.title}\nURL: ${a.link}`
  ).join('\n\n');

  const userPrompt = `以下の海外ニュース記事から、日本人が知るべき重要な記事を7本選び、日本語で再構成してください。
地域が偏らないよう、できるだけ多様なソースから選んでください。

${pastArticleTitles.length > 0 ? `【過去記事】\n${pastArticleTitles.slice(0,10).join('\n')}\n\n` : ''}【候補】
${articleTexts}

JSON配列で7本返してください。`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
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
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // JSONが途中で切れている場合、最後の完全なオブジェクトまでで閉じる
    const partialMatch = cleaned.match(/\[[\s\S]*\}/);
    if (partialMatch) {
      const fixed = partialMatch[0] + ']';
      try { return JSON.parse(fixed); } catch(e) {}
      // 最後の不完全なオブジェクトを除去して再試行
      const lastComplete = fixed.lastIndexOf('},');
      if (lastComplete > 0) {
        const truncated = fixed.slice(0, lastComplete + 1) + ']';
        try { return JSON.parse(truncated); } catch(e2) {}
      }
    }
    throw new Error('Claude response did not contain valid JSON array. Raw: ' + text.slice(0, 300));
  }
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch(e) {
    // 途中で切れたJSONを修復
    const str = jsonMatch[0];
    const lastComplete = str.lastIndexOf('},');
    if (lastComplete > 0) {
      const truncated = str.slice(0, lastComplete + 1) + ']';
      return JSON.parse(truncated);
    }
    throw new Error('JSON parse failed: ' + e.message);
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

    // GET /api/latest - 最新号を返す
    if (url.pathname === '/api/latest') {
      try {
        const cached = await env.GAIHODEN_KV.get('latest', 'json');
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

    // GET /api/generate - 手動で記事生成（テスト用）
    if (url.pathname === '/api/generate') {
      try {
        const result = await generateEdition(env);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { 
          status: 500, headers: corsHeaders 
        });
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
        const articles = await fetchAllRSS();
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

    return new Response('外報電抄 API\n\nEndpoints:\n- /api/latest\n- /api/generate\n- /api/rss-test', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },

  // Cron trigger: 毎日 5:00/17:00 JST (20:00/08:00 UTC)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateEdition(env));
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

async function generateEdition(env) {
  // 1. RSS取得
  const rawArticles = await fetchAllRSS();
  const articles = deduplicateArticles(rawArticles);

  // 2. 過去記事タイトル取得（関連記事リンク用）
  let pastTitles = [];
  try {
    const past = await env.GAIHODEN_KV.get('past_titles', 'json');
    if (past) pastTitles = past;
  } catch (e) {}

  // 3. Claude APIで処理
  const processed = await processWithClaude(articles, env.ANTHROPIC_API_KEY, pastTitles);

  // 4. 号データを構成
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;
  const edition = jstHour < 12 ? '朝刊' : '夕刊';
  
  const editionData = {
    date: now.toISOString(),
    edition,
    articles: processed,
    generated_at: now.toISOString(),
  };

  // 5. KVに保存
  await env.GAIHODEN_KV.put('latest', JSON.stringify(editionData));
  
  // 過去タイトルを更新（最新10本追加、最大70本保持=7日分）
  const newTitles = processed.map(a => a.headline.replace('\n', ' '));
  const updatedTitles = [...newTitles, ...pastTitles].slice(0, 70);
  await env.GAIHODEN_KV.put('past_titles', JSON.stringify(updatedTitles));

  // アーカイブ保存（日付キー）
  const dateKey = `archive_${now.toISOString().slice(0, 10)}_${edition}`;
  await env.GAIHODEN_KV.put(dateKey, JSON.stringify(editionData), { expirationTtl: 7 * 24 * 60 * 60 });

  // 6. 株価ティッカー更新
  try {
    const tickers = await fetchTickers();
    await env.GAIHODEN_KV.put('tickers', JSON.stringify(tickers), { expirationTtl: 3600 });
  } catch (e) { /* ticker fetch failure is non-critical */ }

  return editionData;
}
