// job-insights.js -- pure logic of the job view of WorkshopPower: filters, order, energy per process, comparison with similar jobs,
// CSV, idle (standby) consumption, the running job and the monthly budget. No Vue and no texts (labels come in as arguments), so it is
// the same file on both DWC lines and testable with node --test (vue/WorkshopPower/test/job-insights.test.js).

'use strict'

const DAY_MS = 86400000

// A job with a "mode" of the machine (Laser, CNC, FFF...) keeps its own name; no mode is grouped under ''.
export const NO_MODE = ''

// ---- filters and order -------------------------------------------------------------------------

// jobs: merged list of jobs.js. opts: { days, mode, hideCancelled, now }. A missing option does not filter.
export function filterJobs(jobs, opts) {
	const o = opts || {}
	const now = o.now != null ? o.now : Date.now()
	return (jobs || []).filter(t => {
		if (o.days && t.end < now - o.days * DAY_MS) return false
		if (o.mode != null && o.mode !== 'all' && (t.mode || NO_MODE) !== o.mode) return false
		if (o.hideCancelled && t.cancelled) return false
		return true
	})
}

// key: recent | energy | duration | power (average W). Returns a new array; ties keep the newest first.
export function sortJobs(jobs, key) {
	const value = {
		recent: t => t.end,
		energy: t => (t.kwh != null ? t.kwh : -1),
		duration: t => t.durationS || 0,
		power: t => avgW(t) == null ? -1 : avgW(t)
	}[key] || (t => t.end)
	return (jobs || []).slice().sort((a, b) => (value(b) - value(a)) || (b.end - a.end))
}

export function avgW(t) {
	if (!t || t.kwh == null || !t.durationS || t.durationS < 1) return null
	return t.kwh * 1000 / (t.durationS / 3600)
}

// distinct modes of the list, most used first
export function modesOf(jobs) {
	const n = {}
	;(jobs || []).forEach(t => { const m = t.mode || NO_MODE; n[m] = (n[m] || 0) + 1 })
	return Object.keys(n).sort((a, b) => n[b] - n[a] || (a === NO_MODE) - (b === NO_MODE) || a.localeCompare(b))
}

// ---- totals and energy per process ---------------------------------------------------------------

// [{ mode, n, kwh, durationS, share }] by energy (share 0..1 of the energy of the jobs that have a reading)
export function modeBreakdown(jobs) {
	const map = {}
	;(jobs || []).forEach(t => {
		const m = t.mode || NO_MODE
		const g = map[m] || (map[m] = { mode: m, n: 0, kwh: 0, durationS: 0 })
		g.n += 1
		g.kwh += t.kwh || 0
		g.durationS += t.durationS || 0
	})
	const rows = Object.keys(map).map(k => map[k])
	const total = rows.reduce((s, g) => s + g.kwh, 0)
	rows.forEach(g => { g.share = total > 0 ? g.kwh / total : 0 })
	return rows.sort((a, b) => b.kwh - a.kwh || b.n - a.n)
}

export function totals(jobs) {
	const list = jobs || []
	const withKwh = list.filter(t => t.kwh != null)
	const kwh = withKwh.reduce((s, t) => s + t.kwh, 0)
	const durationS = list.reduce((s, t) => s + (t.durationS || 0), 0)
	return {
		n: list.length,
		kwh,
		durationS,
		avgKwh: withKwh.length ? kwh / withKwh.length : null,
		maxKwh: withKwh.length ? Math.max(...withKwh.map(t => t.kwh)) : null
	}
}

// ---- comparison between jobs --------------------------------------------------------------------

function norm(s) {
	return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// Jobs that are comparable with t: same mode and, when t knows its material, the same material. Cancelled runs and runs
// without a reading are not a reference. t itself is never in the list.
export function similarJobs(t, jobs) {
	if (!t) return []
	const mat = norm(t.material)
	return (jobs || []).filter(o => o !== t && o.key !== t.key && o.kwh != null && !o.cancelled
		&& (o.mode || NO_MODE) === (t.mode || NO_MODE)
		&& (!mat || norm(o.material) === mat))
}

// How t compares with its peers: { n, avgKwh, minKwh, maxKwh, pct } (pct = % above/below the average, whole number) or null
export function compareJob(t, jobs) {
	if (!t || t.kwh == null || t.cancelled) return null
	const peers = similarJobs(t, jobs)
	if (!peers.length) return null
	const vals = peers.map(o => o.kwh)
	const avg = vals.reduce((s, v) => s + v, 0) / vals.length
	return {
		n: peers.length,
		avgKwh: avg,
		minKwh: Math.min(...vals),
		maxKwh: Math.max(...vals),
		pct: avg > 0.0005 ? Math.round((t.kwh - avg) / avg * 100) : null
	}
}

// ---- CSV ------------------------------------------------------------------------------------------

// One field: quotes when needed; a text that a spreadsheet would run as a formula gets a leading apostrophe.
export function csvField(v) {
	if (v == null) return ''
	let s = String(v)
	if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s
	return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function csv(rows) {
	return rows.map(r => r.map(csvField).join(',')).join('\r\n') + '\r\n'
}

function iso(ms) {
	const d = new Date(ms)
	const p = n => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// labels: { start, end, name, mode, zone, material, duration_s, kwh, avg_w, cost, origin, cancelled, file, yes, no }
// rate: price per kWh (0 or missing = no cost column value)
export function jobsCsv(jobs, labels, rate) {
	const L = labels || {}
	const head = ['start', 'end', 'name', 'mode', 'zone', 'material', 'duration_s', 'kwh', 'avg_w', 'cost', 'origin', 'cancelled', 'file'].map(k => L[k] || k)
	const rows = (jobs || []).map(t => {
		const w = avgW(t)
		return [
			t.durationS > 0 ? iso(t.start) : '', iso(t.end), t.name, t.mode || '', t.zone || '', t.material || '', Math.round(t.durationS || 0),
			t.kwh != null ? Number(t.kwh.toFixed(4)) : '', w != null ? Math.round(w) : '',
			t.kwh != null && rate ? Number((t.kwh * rate).toFixed(2)) : '', t.origin || '', t.cancelled ? (L.yes || 'yes') : (L.no || 'no'), t.file || ''
		]
	})
	return csv([head].concat(rows))
}

// buckets of energy.period: [{ label, tooltip, kwh }]
export function periodCsv(buckets, labels, rate) {
	const L = labels || {}
	const rows = (buckets || []).map(b => [b.tooltip || b.label, b.kwh != null ? Number(b.kwh.toFixed(4)) : '', b.kwh != null && rate ? Number((b.kwh * rate).toFixed(2)) : ''])
	return csv([[L.period || 'period', L.kwh || 'kwh', L.cost || 'cost']].concat(rows))
}

// ---- idle (standby) consumption ----------------------------------------------------------------------

// serial: [{ power_w }] of energy.history. The idle power is the 10th percentile of the readings: the level the machine returns to
// when nothing works. Needs at least 20 readings. Returns { w, kwhDay } or null.
export function baseload(serial) {
	const vals = (serial || []).map(p => p.power_w).filter(v => v != null && !isNaN(v) && v >= 0).sort((a, b) => a - b)
	if (vals.length < 20) return null
	const w = vals[Math.floor((vals.length - 1) * 0.1)]
	return { w, kwhDay: w * 24 / 1000 }
}

// ---- the job that is running now -------------------------------------------------------------------

const PROCESSING = ['processing', 'simulating', 'resuming', 'pausing', 'paused']

// liveJob: data "liveJob" of the service ({ active, name, since (epoch s), file }); model: object model of the machine
// ({ state: { status }, job: { duration, file: { fileName } } }). Returns { kind, name, startMs } or null.
export function runningJob(liveJob, model, nowMs) {
	const now = nowMs != null ? nowMs : Date.now()
	if (liveJob && liveJob.active) {
		const s = Number(liveJob.since)
		const startMs = s > 0 ? (s < 1e11 ? s * 1000 : s) : null
		if (startMs && startMs <= now + 600000) return { kind: 'live', name: liveJob.name || null, file: liveJob.file || null, startMs }
	}
	const status = model && model.state && model.state.status
	const dur = model && model.job && Number(model.job.duration)
	if (PROCESSING.includes(status) && dur >= 0) {
		const f = model.job.file && model.job.file.fileName
		return { kind: 'file', name: f ? String(f).split('/').pop() : null, file: f || null, startMs: now - dur * 1000 }
	}
	return null
}

// ---- monthly budget ----------------------------------------------------------------------------------

// limitKwh: the monthly limit chosen by the user (0 = none); monthKwh: so far; projectionKwh: end of the month at this pace.
// level: 'none' | 'ok' | 'near' (80 % reached or the projection passes the limit) | 'over'
export function budgetState(limitKwh, monthKwh, projectionKwh) {
	const limit = Number(limitKwh)
	if (!(limit > 0) || monthKwh == null) return { level: 'none', limit: limit > 0 ? limit : 0, pct: null, projPct: null, left: null }
	const pct = monthKwh / limit * 100
	const projPct = projectionKwh != null ? projectionKwh / limit * 100 : null
	let level = 'ok'
	if (pct >= 100) level = 'over'
	else if (pct >= 80 || (projPct != null && projPct > 100)) level = 'near'
	return { level, limit, pct, projPct, left: Math.max(0, limit - monthKwh) }
}
