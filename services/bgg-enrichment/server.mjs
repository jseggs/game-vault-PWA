import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8787);
const BGG_BASE_URL = process.env.BGG_BASE_URL || 'https://boardgamegeek.com/xmlapi2';
const BGG_BEARER_TOKEN = process.env.BGG_BEARER_TOKEN || '';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || '';
const cache = new Map();

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    writeJson(res, 204, {});
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    writeJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/enrich') {
    try {
      authorize(req);
      const body = await readJson(req);
      const key = JSON.stringify(body);
      if (cache.has(key)) {
        writeJson(res, 200, cache.get(key));
        return;
      }

      const enriched = body.bggId
        ? await fetchThing(body.bggId)
        : await searchAndFetch(body.title);

      cache.set(key, enriched);
      writeJson(res, 200, enriched);
      return;
    } catch (error) {
      writeJson(res, error.statusCode || 500, { error: error.message || 'Unknown error' });
      return;
    }
  }

  writeJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Game Vault BGG enrichment listening on http://localhost:${PORT}`);
});

function authorize(req) {
  if (!SERVICE_TOKEN) return;
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${SERVICE_TOKEN}`) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function searchAndFetch(title) {
  if (!title) throw Object.assign(new Error('Missing title'), { statusCode: 400 });
  const searchUrl = new URL('/search', BGG_BASE_URL);
  searchUrl.searchParams.set('query', title);
  searchUrl.searchParams.set('type', 'boardgame');
  const searchText = await fetchText(searchUrl.toString());
  const idMatch = searchText.match(/<item id="(\d+)"/);
  if (!idMatch) throw Object.assign(new Error('No BGG match found'), { statusCode: 404 });
  return fetchThing(idMatch[1]);
}

async function fetchThing(id) {
  const thingUrl = new URL('/thing', BGG_BASE_URL);
  thingUrl.searchParams.set('id', id);
  thingUrl.searchParams.set('stats', '1');
  const text = await fetchText(thingUrl.toString());

  const result = {
    bggId: id,
    matchName: extractAttr(text, /<name[^>]+type="primary"[^>]+value="([^"]+)"/),
    playersManufacturer: joinRange(extractAttr(text, /<minplayers[^>]+value="([^"]+)"/), extractAttr(text, /<maxplayers[^>]+value="([^"]+)"/)),
    playersCommunity: joinRange(extractAttr(text, /<minplayers[^>]+value="([^"]+)"/), extractAttr(text, /<maxplayers[^>]+value="([^"]+)"/)),
    bestAt: extractBestPlayers(text),
    goodSoloOption: hasSolo(text) ? 'Yes' : 'No',
    bggScore: extractAttr(text, /<average[^>]+value="([^"]+)"/),
    bggCategory: extractCategories(text),
    expansion: /<link[^>]+type="boardgameexpansion"/.test(text),
    age: extractAttr(text, /<minage[^>]+value="([^"]+)"/),
    bggUrl: `https://boardgamegeek.com/boardgame/${id}`,
    thumbnail: extractText(text, /<thumbnail>([^<]+)</)
  };

  return result;
}

async function fetchText(url) {
  const headers = {
    Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8'
  };
  if (BGG_BEARER_TOKEN) headers.Authorization = `Bearer ${BGG_BEARER_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw Object.assign(new Error(`BGG request failed: ${response.status}`), { statusCode: 502 });
  return response.text();
}

function extractAttr(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : '';
}

function extractText(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : '';
}

function extractCategories(text) {
  return [...text.matchAll(/<link[^>]+type="boardgamecategory"[^>]+value="([^"]+)"/g)].map(match => match[1]).slice(0, 4).join(', ');
}

function extractBestPlayers(text) {
  const bestVotes = [...text.matchAll(/<results numplayers="([^"]+)"[^>]*>[\s\S]*?<result value="Best" numvotes="(\d+)"/g)];
  if (!bestVotes.length) return '';
  bestVotes.sort((a, b) => Number(b[2]) - Number(a[2]));
  return bestVotes[0][1];
}

function hasSolo(text) {
  return /numplayers="1"/.test(text);
}

function joinRange(min, max) {
  if (min && max && min !== max) return `${min}-${max}`;
  return min || max || '';
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}
