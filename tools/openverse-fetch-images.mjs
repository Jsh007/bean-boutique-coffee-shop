/**
 * Fetch image URLs from the Openverse API (CC licenses that permit modification).
 * Run from project/: node tools/openverse-fetch-images.mjs
 *
 * By default reads data/openverse-pools.cached.json (build with
 * node tools/cache-openverse-pools.mjs) to avoid Cloudflare bursts.
 * Pass --fresh-api to query the API directly instead of the cache.
 *
 * Writes demo-data URLs + attribution sidecar JSON.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(PROJECT, 'data', 'openverse-pools.cached.json');
const API = 'https://api.openverse.org/v1/images/';
const USE_FRESH_API = process.argv.includes('--fresh-api');

function fetchPage(params, attempt) {
  const u =
    API
    + '?'
    + new URLSearchParams({
      license_type: 'modification',
      page_size: '20',
      ...params,
    });
  const res = spawnSync(
    'curl',
    [
      '-sS',
      '-L',
      '--compressed',
      '--max-time',
      '55',
      '-H',
      'Accept: application/json',
      '-H',
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      u,
    ],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error('curl exited ' + res.status + ': ' + (res.stderr || res.stdout || ''));
  }
  const body = res.stdout || '';
  const trimmed = body.trimStart();
  if (trimmed.charAt(0) === '<' && (attempt || 0) < 6) {
    try {
      execSync('sleep 5', { stdio: 'ignore' });
    } catch (ignore) {}
    return fetchPage(params, (attempt || 0) + 1);
  }
  if (trimmed.charAt(0) === '<') {
    throw new Error('Openverse returned HTML (blocked or rate-limited) for ' + u);
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    throw new Error('Openverse JSON parse failed for ' + u + ': ' + String(e.message || e));
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('Unexpected Openverse body for ' + u);
  }
  return data;
}

function pauseMs(ms) {
  const t = Date.now() + ms;
  while (Date.now() < t) {
    /* rate-limit friendly pause between Openverse pagination calls */
  }
}

function gather(query, needed, extras = {}) {
  const urls = [];
  const credits = [];
  const seen = new Set();
  let page = 1;

  while (urls.length < needed && page <= 80) {
    const data = fetchPage({
      q: query,
      page: String(page),
      ...extras,
    });
    const rows = data.results || [];
    if (!rows.length) break;

    for (const item of rows) {
      if (item.mature) continue;
      const u = item.url;
      if (!u || seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      credits.push({
        sourceQuery: query,
        url: u,
        title: item.title,
        creator: item.creator,
        license: [item.license, item.license_version].filter(Boolean).join(' '),
        license_url: item.license_url,
        foreign_landing_url: item.foreign_landing_url,
        attribution: item.attribution,
      });
      if (urls.length >= needed) break;
    }
    pauseMs(500);
    page += 1;
  }

  return { urls, credits };
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

/** Merge adjacent gather batches, dedupe by URL while keeping paired credits aligned. */
function mergeBatches(batches) {
  const seen = new Set();
  const urls = [];
  const credits = [];
  for (const b of batches) {
    for (let i = 0; i < b.urls.length; i++) {
      const u = b.urls[i];
      if (!u || seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      credits.push(b.credits[i]);
    }
  }
  return { urls, credits };
}

/** Prefer globally unique URLs; if the pool is short, cycle URLs to fill slots (demo fallback). */
function takePreferUnique(poolUrls, globallyUsed, n) {
  const pool = poolUrls.filter(Boolean);
  const out = [];
  for (let i = 0; i < pool.length && out.length < n; i++) {
    const u = pool[i];
    if (!globallyUsed.has(u)) {
      globallyUsed.add(u);
      out.push(u);
    }
  }
  let j = 0;
  while (out.length < n && pool.length) {
    const u = pool[j % pool.length];
    j += 1;
    out.push(u);
    if (!globallyUsed.has(u)) globallyUsed.add(u);
  }
  return out;
}

function readCacheAsBatches() {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (ignore) {
    return null;
  }
  const buckets = raw.buckets || {};
  const creditsArr = raw.credits || [];
  const byUrl = {};
  for (let i = 0; i < creditsArr.length; i++) {
    const c = creditsArr[i];
    if (!c || !c.url) continue;
    byUrl[c.url] = {
      sourceQuery: c.sourceQuery || '(cached pools)',
      url: c.url,
      title: c.title,
      creator: c.creator,
      license: c.license || '',
      license_url: c.license_url,
      foreign_landing_url: c.foreign_landing_url,
      attribution: c.attribution,
    };
  }
  function batchFrom(list) {
    const urls = Array.isArray(list) ? list.filter(Boolean) : [];
    const credits = urls.map(function (u) {
      return (
        byUrl[u] || {
          sourceQuery: '(cached pools)',
          url: u,
          title: null,
          creator: null,
          license: '',
          license_url: '',
          foreign_landing_url: '',
          attribution: '',
        }
      );
    });
    return { urls, credits };
  }
  return {
    coffeeBat: batchFrom(buckets.beans || []),
    equipBat: batchFrom(buckets.equipment || []),
    userBat: batchFrom(buckets.people || []),
    eventBat: batchFrom(buckets.events || []),
    planBat: batchFrom(buckets.drinks || []),
  };
}

async function main() {
  async function g(query, n) {
    const b = gather(query, n);
    await sleep(2800);
    return b;
  }

  const cached = !USE_FRESH_API ? readCacheAsBatches() : null;

  let coffeeBat;
  let equipBat;
  let userBat;
  let eventBat;
  let planBat;

  const cacheTotals = cached
    ? cached.coffeeBat.urls.length
      + cached.equipBat.urls.length
      + cached.userBat.urls.length
      + cached.eventBat.urls.length
      + cached.planBat.urls.length
    : 0;

  if (!USE_FRESH_API && cached && cacheTotals > 0) {
    console.log(
      'Using data/openverse-pools.cached.json — run node tools/cache-openverse-pools.mjs to refresh,'
        + ' or pass --fresh-api to query Openverse directly.',
    );
    coffeeBat = cached.coffeeBat;
    equipBat = cached.equipBat;
    userBat = cached.userBat;
    eventBat = cached.eventBat;
    planBat = cached.planBat;
  } else {
    if (!USE_FRESH_API && (!cached || cacheTotals === 0)) {
      console.warn(
        'No usable buckets in openverse-pools.cached.json — using live Openverse API (prefer: cache then fetch).',
      );
    }
    /** Short phrases match Openverse search; very long queries often yield 0 results. */
    coffeeBat = mergeBatches([
      await g('coffee beans roasted', 40),
      await g('green coffee beans', 30),
      await g('mixed roasted green coffee beans', 20),
    ]);

    equipBat = mergeBatches([
      await g('french press coffee', 16),
      await g('hario v60 coffee', 16),
      await g('aeropress coffee', 16),
      await g('espresso machine portafilter', 20),
      await g('batch brew coffee machine', 16),
      await g('burr coffee grinder chemex', 18),
      await g('moka pot coffee', 12),
    ]);

    userBat = mergeBatches([
      await g('portrait person smiling', 25),
      await g('headshot portrait indoors', 20),
    ]);

    eventBat = mergeBatches([
      await g('coffee cupping people', 25),
      await g('coffee roastery factory people', 20),
      await g('barista latte art class people', 20),
    ]);

    planBat = mergeBatches([
      await g('latte art coffee cup', 20),
      await g('iced coffee cappuccino glass', 20),
    ]);
  }

  const usedGlobal = new Set();

  const warnShort = function (label, avail, needed) {
    if (avail < needed) {
      console.warn(`${label}: only ${avail}/${needed} unique URLs — add queries to openverse-fetch-images.mjs.`);
    }
  };

  warnShort('Coffee pool', coffeeBat.urls.length, 30);
  warnShort('Equipment pool', equipBat.urls.length, 30);
  warnShort('User pool', userBat.urls.length, 15);
  warnShort('Event pool', eventBat.urls.length, 15);
  warnShort('Plan pool', planBat.urls.length, 15);

  const coffeeMain = takePreferUnique(coffeeBat.urls, usedGlobal, 15);
  const coffeeAlt = takePreferUnique(coffeeBat.urls, usedGlobal, 15);
  const equipMain = takePreferUnique(equipBat.urls, usedGlobal, 15);
  const equipAlt = takePreferUnique(equipBat.urls, usedGlobal, 15);
  const userImg = takePreferUnique(userBat.urls, usedGlobal, 15);
  const eventImg = takePreferUnique(eventBat.urls, usedGlobal, 15);
  const planImg = takePreferUnique(planBat.urls, usedGlobal, 15);

  function firstUnused(poolUrls, fallback) {
    for (let i = 0; i < poolUrls.length; i++) {
      const u = poolUrls[i];
      if (u && !usedGlobal.has(u)) {
        usedGlobal.add(u);
        return u;
      }
    }
    return fallback;
  }

  const heroBeans =
    coffeeMain[0] || coffeeBat.urls[0];
  const heroGear = equipMain[0] || equipBat.urls[0];
  const heroLab = eventImg[0] || eventBat.urls[0];
  const homeIntro =
    firstUnused(equipBat.urls, heroGear)
    || equipMain[1]
    || heroGear;

  const mergedAllCredits = mergeBatches([
    coffeeBat,
    equipBat,
    userBat,
    eventBat,
    planBat,
  ]);

  const payload = {
    fetchedAt: new Date().toISOString(),
    openverseBrowseBase: 'https://openverse.org/',
    credits: mergedAllCredits.credits,
    bundles: {
      coffeeMain,
      coffeeAlt,
      equipMain,
      equipAlt,
      userImg,
      eventImg,
      planImg,
      hero: { heroBeans, heroGear, heroLab, homeIntro },
    },
  };

  const dataPath = path.join(PROJECT, 'data', 'demo-data.json');
  const raw = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(raw);

  if (data.meta) {
    data.meta.imageLicenseNote =
      'Images are Openverse-hosted file URLs (licenses that permit modification). See data/openverse-image-credits.json. Typical refresh: node tools/cache-openverse-pools.mjs then node tools/openverse-fetch-images.mjs; or node tools/openverse-fetch-images.mjs --fresh-api for live API.';
  }

  function assignUsers() {
    (data.user || []).forEach(function (row, i) {
      if (userImg[i]) row.imageUrl = userImg[i];
    });
  }

  function assignCoffee() {
    (data.coffee || []).forEach(function (row, i) {
      const a = coffeeMain[i];
      const b = coffeeAlt[i];
      if (a) {
        row.imageUrl = a;
        row.images = [a, b || a];
      }
    });
  }

  function assignEquipment() {
    (data.equipment || []).forEach(function (row, i) {
      const a = equipMain[i];
      const b = equipAlt[i];
      if (a) {
        row.imageUrl = a;
        row.images = [a, b || a];
      }
    });
  }

  function assignCart() {
    (data.cart || []).forEach(function (line) {
      const sku = line.sku || '';
      const cof = sku.match(/^CF-(\d{4})$/i);
      const eq = sku.match(/^EQ-(\d{4})$/i);
      let prodId = '';
      if (cof) {
        prodId =
          'coffee-'
          + String(Number.parseInt(cof[1], 10)).padStart(2, '0');
      } else if (eq) {
        prodId =
          'equipment-'
          + String(Number.parseInt(eq[1], 10)).padStart(2, '0');
      }
      if (!prodId) return;
      const prod =
        prodId.startsWith('coffee-')
          ? (data.coffee || []).find(function (r) {
            return r.id === prodId;
          })
          : (data.equipment || []).find(function (r) {
            return r.id === prodId;
          });
      if (prod && prod.imageUrl) {
        line.imageUrl = prod.imageUrl;
      }
    });
  }

  function assignEvents() {
    (data.event || []).forEach(function (row, i) {
      row.imageUrl = eventImg[i] || row.imageUrl;
    });
  }

  function assignPlans() {
    (data.subscriptionPlan || []).forEach(function (row, i) {
      if (planImg[i]) row.imageUrl = planImg[i];
    });
  }

  assignUsers();
  assignCoffee();
  assignEquipment();
  assignCart();
  assignEvents();
  assignPlans();

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

  const creditsPath = path.join(PROJECT, 'data', 'openverse-image-credits.json');
  fs.writeFileSync(creditsPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const homePath = path.join(PROJECT, 'script', 'home-page.js');
  let hp = fs.readFileSync(homePath, 'utf8');
  hp = hp.replace(
    /(\{ title: 'Neighbour roast lab', subtitle: 'Single-origin tastings every Thursday', image: ')('.*?)(', href: 'products\/coffee\/coffees\.html' \})/,
    '$1' + heroBeans.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '$3',
  );
  hp = hp.replace(
    /(\{ title: 'Bench rentals', subtitle: 'Try gear before committing', image: ')('.*?)(', href: 'products\/equipment\/equipment\.html' \})/,
    '$1' + heroGear.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '$3',
  );
  hp = hp.replace(
    /(\{ title: 'Community tables', subtitle: 'Workshops curated with guest roasters', image: ')('.*?)(', href: 'pages\/events\/events\.html' \})/,
    '$1' + heroLab.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '$3',
  );
  fs.writeFileSync(homePath, hp, 'utf8');

  const indexPath = path.join(PROJECT, 'index.html');
  let ix = fs.readFileSync(indexPath, 'utf8');
  ix = ix.replace(
    /(<img\b[^>]*\bdata-home-intro-visual\b[^>]*\bsrc=")([^"]+)(")/,
    '$1' + homeIntro.replace(/"/g, '&quot;') + '$3',
  );
  fs.writeFileSync(indexPath, ix, 'utf8');

  console.log('Patched data/demo-data.json, script/home-page.js, index.html');
  console.log('Wrote data/openverse-image-credits.json');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
