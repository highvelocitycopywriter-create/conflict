import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const parser = new Parser({ timeout: 10000 });
const PORT = process.env.PORT || 3000;

// Fallback if we can't discover the liveblog automatically (or set LIVEBLOG_URL to disable auto-discovery)
const LIVEBLOG_URL_FALLBACK = process.env.LIVEBLOG_URL || 'https://www.aljazeera.com/news/liveblog/2026/3/8/iran-live-israel-bombs-tehran-oil-depots-attacks-on-gulf-states-continue';
const LIVEBLOG_TITLE = process.env.LIVEBLOG_TITLE || 'Iran war live';
const LIVEBLOG_DESC = process.env.LIVEBLOG_DESC || 'Real-time updates on the US-Israel war on Iran.';

const LIVEBLOG_CACHE_MS = 5 * 60 * 1000; // 5 minutes
const AL_JAZEERA_TAG_URL = 'https://www.aljazeera.com/tag/israel-iran-conflict/';

let liveblogCache = { url: null, title: LIVEBLOG_TITLE, description: LIVEBLOG_DESC, cachedAt: 0 };

/** Discover current Iran war liveblog URL from Al Jazeera tag page (so new date/slug is picked up automatically). */
async function discoverLiveblogUrl() {
  try {
    const res = await fetch(AL_JAZEERA_TAG_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConflictNewsBot/1.0)' } });
    const html = await res.text();
    // Match full URL or path: .../liveblog/2026/3/8/iran-live-... or /news/liveblog/...
    const fullUrlMatch = html.match(/https:\/\/www\.aljazeera\.com\/news\/liveblog\/[^"'\s<>]+/);
    if (fullUrlMatch) return fullUrlMatch[0];
    const pathMatch = html.match(/\/news\/liveblog\/[^"'\s<>]+/);
    if (pathMatch) return 'https://www.aljazeera.com' + pathMatch[0];
  } catch (err) {
    console.warn('Liveblog discovery failed:', err.message);
  }
  return null;
}

// Reputable sources: Al Jazeera (all + Middle East), BBC Middle East
const FEEDS = [
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
  { url: 'https://www.aljazeera.com/xml/rss/middleeast.xml', name: 'Al Jazeera Middle East' },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', name: 'BBC Middle East' },
];

// Keywords for Iran strikes on UAE / Gulf / US-Iran-Israel war (for relevance scoring)
const RELEVANCE_KEYWORDS = [
  'uae', 'emirates', 'dubai', 'abu dhabi', 'gulf', 'bahrain', 'saudi', 'qatar', 'oman', 'kuwait',
  'iran', 'iranian', 'tehran', 'strike', 'strikes', 'attack', 'drone', 'missile', 'desalination',
  'us-iran', 'israel-iran', 'middle east war', 'pezeshkian', 'irgc', 'houthi', 'yemen'
];

function scoreRelevance(title, description) {
  const text = `${(title || '')} ${(description || '')}`.toLowerCase();
  let score = 0;
  for (const kw of RELEVANCE_KEYWORDS) {
    if (text.includes(kw)) score += 1;
  }
  return score;
}

function parseDate(str) {
  if (!str) return 0;
  const d = new Date(str);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

async function fetchFeed(feedConfig) {
  try {
    const feed = await parser.parseURL(feedConfig.url);
    return (feed.items || []).map((item) => ({
      title: item.title || '',
      link: item.link || item.guid || '',
      description: item.contentSnippet || item.content || item.description || '',
      pubDate: item.pubDate || item.isoDate || '',
      pubTimestamp: parseDate(item.pubDate || item.isoDate),
      source: feedConfig.name,
      relevance: scoreRelevance(item.title, item.contentSnippet || item.content || item.description),
    }));
  } catch (err) {
    console.warn(`Feed failed ${feedConfig.name}:`, err.message);
    return [];
  }
}

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/liveblog', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const now = Date.now();
  if (!liveblogCache.url || now - liveblogCache.cachedAt > LIVEBLOG_CACHE_MS) {
    const discovered = await discoverLiveblogUrl();
    liveblogCache.url = discovered || LIVEBLOG_URL_FALLBACK;
    liveblogCache.title = LIVEBLOG_TITLE;
    liveblogCache.description = LIVEBLOG_DESC;
    liveblogCache.cachedAt = now;
  }
  res.json({
    url: liveblogCache.url,
    title: liveblogCache.title,
    description: liveblogCache.description,
  });
});

app.get('/api/news', async (req, res) => {
  // Prevent caching so every poll gets fresh RSS data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const all = await Promise.all(FEEDS.map(fetchFeed));
    const items = all.flat();
    const seen = new Set();
    const deduped = items.filter((item) => {
      const key = (item.link || item.title || '').trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    deduped.sort((a, b) => (b.pubTimestamp || 0) - (a.pubTimestamp || 0));
    res.json({ items: deduped, updated: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch news', items: [] });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`News aggregator running at http://localhost:${PORT}`);
});
