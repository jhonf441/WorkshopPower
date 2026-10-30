// jobs.js -- pure logic of the "Recent jobs" card of Consumption.vue (no Vue, no i18n:
// texts come in as arguments), testable with node --test (vue/WorkshopPower/test).
// 2026-10-13: a file job and the live job that ran it were logged twice (the file
// entry with 0 s, the live entry with the real duration, both with the energy of the
// same period). mergeOverlaps joins them into one row and the totals count it once.

'use strict'

// Two entries are the same run if their end times are this close...
export const MERGE_END_MS = 3 * 60 * 1000;
// ...one of them has (almost) no duration...
export const MERGE_SHORT_S = 60;
// ...and their kWh differ by at most 15 % or 0.05 kWh.
export const MERGE_KWH_PCT = 0.15;
export const MERGE_KWH_ABS = 0.05;

// The project never names that third-party program in the UI.
const FILE_RE = /(^\d:\/)|(\.(gc|gcode|g|nc|ngc|tap|cnc)$)/i;
const ZONE_RE = /\bG5[4-9](?:\.[1-9])?\b/i;
const THICK_RE = /(\d+(?:[.,]\d+)?)\s*mm(?![a-z])/i;

export function pad(n) {
	return String(n).padStart(2, '0');
}

// "2026-10-11T23:32:05" or "2026-10-11 23:32:05" (local time) -> ms
export function parseTs(ts) {
	return new Date(String(ts).replace(' ', 'T')).getTime();
}

export function localIso(ms) {
	const d = new Date(ms);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function localDay(ms) {
	return localIso(ms).slice(0, 10);
}

// 19740 -> "5 h 29 min"; 720 -> "12 min"; 4 -> "4 s"
export function fmtDur(s) {
	s = Math.max(0, Number(s) || 0);
	if (s >= 3600) {
		let h = Math.floor(s / 3600);
		let m = Math.round((s % 3600) / 60);
		if (m === 60) {
			h += 1;
			m = 0;
		}
		return `${h} h ${m} min`;
	}
	return s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`;
}

// "Trabajo terminado: Trabajo en vivo, G56 (12.0 min, ...)" -> { name: "Trabajo en vivo, G56", cancelled: false }
export function cleanDescription(desc) {
	let name = String(desc || '').replace(/\s*\([^()]*\)\s*$/, '').trim();
	const cancelled = /^(Trabajo cancelado|Job cancelled|Job canceled)/i.test(name);
	name = name.replace(/^(Trabajo|Job) [^:]*:\s*/i, '').trim();
	if (name === '(sin nombre)') {
		name = '';
	}
	return { name, cancelled };
}

// "G56 MDF 6mm" / "Live job, G56 MDF 6mm" / "arbol_5.8mm.gc" -> { zone, material, thicknessMm }
export function parseZoneMaterial(text, removeWords) {
	let s = String(text || '');
	(removeWords || []).forEach(w => {
		if (w) {
			s = s.split(w).join(' ');
		}
	});
	const out = { zone: null, material: null, thicknessMm: null };
	const th = s.match(THICK_RE);
	if (th) {
		out.thicknessMm = parseFloat(th[1].replace(',', '.'));
	}
	const z = s.match(ZONE_RE);
	if (z) {
		out.zone = z[0].toUpperCase();
		// the text after the zone code, up to the next comma: "MDF 6mm"
		const rest = s.slice(z.index + z[0].length).split(',')[0].replace(/\s+/g, ' ').trim();
		if (rest) {
			out.material = rest;
		}
	}
	if (!out.material && out.thicknessMm != null) {
		out.material = `${out.thicknessMm} mm`;
	}
	return out;
}

function originText(detail) {
	const o = detail && detail.origin;
	return typeof o === 'string' ? o : (o ? JSON.stringify(o) : '');
}

// Activity row (activity.list, type job_end) -> job item. ts is the END time.
export function normalizeRow(r) {
	const { name, cancelled } = cleanDescription(r.description);
	const end = parseTs(r.ts);
	const dur = Math.max(0, Number(r.duration_s) || 0);
	const det = r.detail && typeof r.detail === 'object' ? r.detail : {};
	const ctx = det.context || {};
	const org = originText(det);
	const live = /job_live/.test(org) || /trabajo en vivo|live job/i.test(name);
	const firstPart = name.split(',')[0].trim();
	const fileName = FILE_RE.test(firstPart) ? firstPart : (ctx.job && FILE_RE.test(ctx.job) && !live ? ctx.job : null);
	const file = !live && (!!fileName || /job_poller/.test(org));
	return {
		id: r.id,
		ids: [r.id],
		name,
		end,
		start: end - dur * 1000,
		durationS: dur,
		kwh: r.consumption_kwh != null && !isNaN(r.consumption_kwh) ? Number(r.consumption_kwh) : null,
		mode: r.mode || ctx.mode || null,
		origin: live ? 'live' : (file ? 'file' : 'other'),
		cancelled,
		file: fileName,
		ctxZone: ctx.zone || null
	};
}

function kwhClose(a, b) {
	if (a == null || b == null) {
		return false;
	}
	const d = Math.abs(a - b);
	return d <= MERGE_KWH_ABS || d <= MERGE_KWH_PCT * Math.max(Math.abs(a), Math.abs(b));
}

// Is "short" (0 s or nearly) the same run as "full"?
export function sameRun(short, full) {
	return short !== full
		&& short.durationS < MERGE_SHORT_S
		&& full.durationS >= short.durationS
		&& Math.abs(short.end - full.end) <= MERGE_END_MS
		&& kwhClose(short.kwh, full.kwh);
}

function mergeInto(full, short) {
	const origins = [full.origin, short.origin];
	const both = origins.includes('live') && origins.includes('file');
	return Object.assign({}, full, {
		ids: full.ids.concat(short.ids),
		origin: both ? 'both' : full.origin,
		file: full.file || short.file,
		mode: full.mode || short.mode,
		cancelled: full.cancelled && short.cancelled ? true : full.cancelled,
		ctxZone: full.ctxZone || short.ctxZone,
		// the name of the live job is the readable one; the file goes in the details
		name: full.origin === 'live' || !short.name ? full.name : (full.name || short.name),
		mergedName: short.name
	});
}

// items (normalizeRow) -> merged list, newest first. Each short entry is merged
// into the closest-ending longer entry; one entry is merged once at most.
export function mergeOverlaps(items) {
	const list = items.slice().sort((a, b) => b.durationS - a.durationS);
	const used = new Set();
	const out = [];
	for (const it of list) {
		if (used.has(it)) {
			continue;
		}
		used.add(it);
		let cur = it;
		// only an entry with a real duration absorbs the short ones
		if (it.durationS >= MERGE_SHORT_S) {
			const cands = list.filter(o => !used.has(o) && sameRun(o, it))
				.sort((a, b) => Math.abs(a.end - it.end) - Math.abs(b.end - it.end));
			if (cands.length) {
				used.add(cands[0]);
				cur = mergeInto(it, cands[0]);
			}
		}
		out.push(cur);
	}
	return out.sort((a, b) => b.end - a.end);
}

export function totalKwh(items) {
	return items.reduce((s, t) => s + (t.kwh || 0), 0);
}

// Merged items -> [{ day, end, n, kwh, items }] newest day first.
export function groupByDay(items) {
	const map = new Map();
	items.forEach(t => {
		const k = localDay(t.end);
		if (!map.has(k)) {
			map.set(k, { day: k, end: t.end, n: 0, kwh: 0, items: [] });
		}
		const g = map.get(k);
		g.n += 1;
		g.kwh += t.kwh || 0;
		g.items.push(t);
	});
	return Array.from(map.values()).sort((a, b) => b.end - a.end);
}

// Average power in W from kWh and seconds (null if it cannot be computed).
export function averageW(kwh, durationS) {
	if (kwh == null || !durationS || durationS < 1) {
		return null;
	}
	return kwh * 1000 / (durationS / 3600);
}

// Power series [{ ts, power_w }] -> SVG polyline points in a w x h box (at most maxPts points).
export function sparkPoints(serial, w, h, maxPts) {
	const pts = (serial || []).map(p => ({ t: parseTs(p.ts), y: p.power_w }))
		.filter(p => !isNaN(p.t) && p.y != null && !isNaN(p.y));
	if (pts.length < 2) {
		return '';
	}
	const step = Math.max(1, Math.ceil(pts.length / (maxPts || 80)));
	const sel = [];
	for (let i = 0; i < pts.length; i += step) {
		// keep the peak of each block so short spikes are not lost
		const blk = pts.slice(i, i + step);
		sel.push(blk.reduce((m, p) => (p.y > m.y ? p : m), blk[0]));
	}
	const t0 = pts[0].t;
	const t1 = pts[pts.length - 1].t;
	const ymax = Math.max(1, ...sel.map(p => p.y));
	const span = Math.max(1, t1 - t0);
	return sel.map(p => `${((p.t - t0) / span * w).toFixed(1)},${(h - 1 - p.y / ymax * (h - 2)).toFixed(1)}`).join(' ');
}
