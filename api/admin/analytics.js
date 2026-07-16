// /api/admin/analytics : agrege les evenements du Blob en KPIs
// Retourne : totals (pageviews, uniques, clicks, conversions),
//            top_pages, top_targets, last7days, recent_events

import { list } from '@vercel/blob';
import { requireAdmin } from '../_auth.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Methode non autorisee' });
  }
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ ok: false, error: 'Stockage non configure' });
  }

  // Periode : 7 derniers jours par defaut
  const days = Math.max(1, Math.min(60, parseInt(req.query.days, 10) || 7));
  const cutoff = Date.now() - days * DAY_MS;

  try {
    const events = [];
    let cursor;
    do {
      const r = await list({ prefix: 'analytics/', cursor, limit: 500 });
      for (const blob of r.blobs) {
        try {
          const f = await fetch(blob.url);
          if (!f.ok) continue;
          const t = await f.text();
          const obj = JSON.parse(t);
          const ts = Date.parse(obj.ts);
          if (!isNaN(ts) && ts >= cutoff) events.push(obj);
        } catch(e){}
      }
      cursor = r.cursor;
    } while (cursor);

    // Agregations
    const totals = { pageviews: 0, clicks: 0, conversions: 0, uniques: new Set() };
    const pageCounts = new Map();
    const targetCounts = new Map();
    const refCounts = new Map();
    const dayCounts = new Map();
    const sessions = new Set();

    for (const e of events){
      if (e.type === 'pageview'){
        totals.pageviews++;
        sessions.add(e.session || 'anon');
        pageCounts.set(e.path, (pageCounts.get(e.path) || 0) + 1);
        const day = (e.ts || '').slice(0, 10);
        if (day) dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      } else if (e.type === 'click'){
        totals.clicks++;
        if (e.target) targetCounts.set(e.target, (targetCounts.get(e.target) || 0) + 1);
      } else if (e.type === 'conversion'){
        totals.conversions++;
      }
      if (e.ref) refCounts.set(e.ref, (refCounts.get(e.ref) || 0) + 1);
      if (e.session) totals.uniques.add(e.session);
    }

    function topN(map, n){
      return Array.from(map.entries()).sort((a,b) => b[1] - a[1]).slice(0, n).map(([k,v]) => ({ key:k, count:v }));
    }

    // Construire la serie 7 jours (avec zero si pas de donnees)
    const today = new Date();
    const series = [];
    for (let i = days - 1; i >= 0; i--){
      const d = new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10);
      series.push({ day: d, count: dayCounts.get(d) || 0 });
    }

    const recent = events
      .filter(e => e.type === 'pageview' || e.type === 'click' || e.type === 'conversion')
      .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
      .slice(0, 25);

    return res.status(200).json({
      ok: true,
      period_days: days,
      totals: {
        pageviews: totals.pageviews,
        clicks: totals.clicks,
        conversions: totals.conversions,
        uniques: totals.uniques.size
      },
      top_pages: topN(pageCounts, 10),
      top_targets: topN(targetCounts, 10),
      top_refs: topN(refCounts, 5),
      series,
      recent
    });
  } catch (err) {
    console.error('admin/analytics error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
}
