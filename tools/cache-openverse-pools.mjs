/**
 * One-shot, slow sequential Openverse pulls (single page each) → data/openverse-pools.cached.json
 * Avoids rapid pagination bursts that trigger Cloudflare.
 *
 * Usage (from project/): node tools/cache-openverse-pools.mjs
 */

import fs from 'fs';
import path from 'path';
import { spawnSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(PROJECT, 'data', 'openverse-pools.cached.json');
const API = 'https://api.openverse.org/v1/images/';

function curlJson(searchParams) {
  const u =
    API
    + '?'
    + new URLSearchParams({
      license_type: 'modification',
      page_size: '18',
      page: '1',
      ...searchParams,
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
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      u,
    ],
    { encoding: 'utf8', maxBuffer: 6 * 1024 * 1024 },
  );
  const body = res.stdout || '';
  const trimmed = body.trimStart();
  if (trimmed.charAt(0) === '<' || /^<!DOCTYPE/i.test(trimmed)) {
    return { blocked: true, url: u, bodySnippet: body.slice(0, 120) };
  }
  try {
    return JSON.parse(body);
  } catch (err) {
    return { blocked: true, url: u, parseError: String(err.message || err) };
  }
}

function sleep(sec) {
  try {
    execSync('sleep ' + sec, { stdio: 'ignore' });
  } catch (ignore) {}
}

function uniqPush(target, creditsByUrl, item) {
  if (!item.url || item.mature) return;
  if (target.set.has(item.url)) return;
  target.set.add(item.url);
  target.urls.push(item.url);
  if (!creditsByUrl[item.url]) {
    creditsByUrl[item.url] = {
      url: item.url,
      title: item.title,
      creator: item.creator,
      license: [item.license, item.license_version].filter(Boolean).join(' '),
      license_url: item.license_url,
      foreign_landing_url: item.foreign_landing_url,
      attribution: item.attribution,
      sourceQuery: item.sourceQuery,
    };
  }
}

async function main() {
  /** [bucket, Openverse q-string] — tuned for coursework demo */
  /** Short queries match Openverse better; very long phrases often return 0 hits. */
  const JOBS = [
    ['beans', 'coffee beans roasted'],
    ['beans', 'green coffee beans'],
    ['beans', 'mixed roasted green coffee beans'],
    ['equipment', 'french press coffee'],
    ['equipment', 'hario v60 coffee'],
    ['equipment', 'aeropress coffee'],
    ['equipment', 'espresso machine portafilter'],
    ['equipment', 'batch brew coffee machine'],
    ['equipment', 'burr coffee grinder'],
    ['equipment', 'chemex coffee'],
    ['equipment', 'moka pot coffee'],
    ['people', 'portrait person smiling'],
    ['people', 'headshot portrait indoors'],
    ['events', 'coffee cupping people'],
    ['events', 'coffee roastery factory people'],
    ['events', 'barista latte art class people'],
    ['drinks', 'latte art coffee cup'],
    ['drinks', 'iced coffee cappuccino glass'],
    ['drinks', 'espresso tonic coffee'],
  ];

  const buckets = {
    beans: { set: new Set(), urls: [] },
    equipment: { set: new Set(), urls: [] },
    people: { set: new Set(), urls: [] },
    events: { set: new Set(), urls: [] },
    drinks: { set: new Set(), urls: [] },
  };
  const creditsByUrl = {};
  let blocked = [];

  for (let i = 0; i < JOBS.length; i++) {
    const [bucketKey, query] = JOBS[i];
    const data = curlJson({ q: query });

    if (data.blocked) {
      blocked.push({ query, bucket: bucketKey, ...data });
      console.warn('Skipping (blocked?):', query);
    } else {
      const rows = data.results || [];
      for (const row of rows) {
        uniqPush(buckets[bucketKey], creditsByUrl, { ...row, sourceQuery: query });
      }
    }

    sleep(10);
    if ((i + 1) % 4 === 0) {
      console.log('progress', i + 1, '/', JOBS.length);
    }
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    openverseBrowseTemplate:
      'https://openverse.org/search/image?q=YOUR_QUERY&license_type=modification',
    buckets: Object.fromEntries(
      ['beans', 'equipment', 'people', 'events', 'drinks'].map(function (k) {
        return [k, buckets[k].urls];
      }),
    ),
    credits: Object.values(creditsByUrl),
    blockedQueries: blocked,
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log('Wrote', OUT);
  console.log(
    'Counts:',
    Object.entries(payload.buckets)
      .map(function (e) {
        return e[0] + '=' + e[1].length;
      })
      .join(', '),
  );
  if (blocked.length) {
    console.warn('Blocked or failed pulls:', blocked.length, '(retry later or widen queries)');
  }
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
