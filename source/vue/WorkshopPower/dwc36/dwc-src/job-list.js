// job-list.js -- turns the rows of activity.list (type job_end) into the jobs the job view shows, and builds the label / value pairs of an
// opened job. Pure: texts come in as `t(key)` (keys of plugins.WorkshopPower.consumption.*), so it is the same file on both DWC lines
// and testable with node --test (vue/WorkshopPower/test/job-list.test.js).

'use strict'

import * as jobsLib from './jobs.js'
import { fmtKwh, costText } from './money.js'

const pad = n => String(n).padStart(2, '0')

// "Sat 11 Oct" (local)
export function fmtDay(ms, t) {
	const d = new Date(ms)
	const days = String(t('weekdays_short')).split(',')
	const months = String(t('months_short')).split(',')
	return `${days[d.getDay()] || ''} ${d.getDate()} ${months[d.getMonth()] || ''}`.trim()
}

// "Sat 11 Oct 23:32"
export function fmtDateHour(ms, t) {
	const d = new Date(ms)
	return `${fmtDay(ms, t)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// rows of activity.list -> merged jobs, newest first, each with the texts the list needs
export function buildJobs(rows, t) {
	const live = t('live_job')
	return jobsLib.mergeOverlaps((rows || []).map(jobsLib.normalizeRow)).map(it => {
		let name = it.name
		if (it.origin === 'file' && it.file && name === it.file) {
			name = it.file.split('/').pop()
		}
		let zm = jobsLib.parseZoneMaterial(name, [live])
		if (!zm.material && it.file) {
			zm = Object.assign({}, jobsLib.parseZoneMaterial(it.file), zm.zone ? { zone: zm.zone } : {})
		}
		return Object.assign({}, it, {
			key: it.ids.join('-'),
			name: name || t('job'),
			date: fmtDateHour(it.end, t),
			startText: it.durationS > 0 ? fmtDateHour(it.start, t) : null,
			endText: fmtDateHour(it.end, t),
			duration: jobsLib.fmtDur(it.durationS),
			zone: zm.zone || it.ctxZone || null,
			material: zm.material
		})
	})
}

export function originText(job, t) {
	const k = { both: 'origin_both', file: 'origin_file', live: 'live_job' }[job.origin] || 'origin_other'
	const txt = t(k)
	return job.cancelled ? `${txt} (${String(t('cancelled')).toLowerCase()})` : txt
}

// label / value pairs of an opened job (only the ones with a value)
export function jobDetails(job, t, tariff, locale) {
	const avg = jobsLib.averageW(job.kwh, job.durationS)
	const perHour = avg != null ? costText(avg / 1000, tariff, locale) : null
	const out = [
		{ k: 'start', label: t('job_start'), value: job.startText },
		{ k: 'end', label: t('job_end'), value: job.endText },
		{ k: 'dur', label: t('job_duration'), value: job.duration },
		{ k: 'kwh', label: t('job_energy'), value: job.kwh != null ? fmtKwh(job.kwh) + ' kWh' : null },
		{ k: 'cost', label: t('job_cost'), value: costText(job.kwh, tariff, locale) },
		{ k: 'avg', label: t('job_avg_power'), value: avg != null ? Math.round(avg) + ' W' : null },
		{ k: 'cph', label: t('job_cost_per_hour'), value: perHour ? perHour + ' / h' : null },
		{ k: 'mode', label: t('job_mode'), value: job.mode },
		{ k: 'zone', label: t('job_zone'), value: job.zone },
		{ k: 'mat', label: t('job_material'), value: job.material },
		{ k: 'orig', label: t('job_origin'), value: originText(job, t) },
		{ k: 'file', label: t('job_file'), value: job.file, width: true }
	]
	return out.filter(d => d.value != null && d.value !== '')
}

// More than `limit` jobs: grouped per day (the header carries the totals of the whole day, also when only some are shown);
// otherwise one group without header. `shown` is the part of `all` on screen.
export function dayGroups(all, shown, limit, t) {
	if (all.length <= limit) {
		return [{ day: null, items: shown }]
	}
	const tot = {}
	jobsLib.groupByDay(all).forEach(g => { tot[g.day] = g })
	return jobsLib.groupByDay(shown).map(g => ({
		day: g.day,
		date: fmtDay(g.end, t),
		n: tot[g.day].n,
		kwh: tot[g.day].kwh,
		items: g.items
	}))
}
