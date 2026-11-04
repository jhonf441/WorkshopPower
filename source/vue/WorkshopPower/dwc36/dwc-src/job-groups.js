// job-groups.js -- groups the finished jobs of WorkshopPower by the machine mode (CNC / Laser / FFF). Pure: no Vue, no texts.
// Where the mode of a job comes from: normalizeRow() of jobs.js reads it from the activity row of the service (r.mode, else
// detail.context.mode), i.e. the mode the machine had when the job ended. It is never derived from the file name: a job whose
// mode is missing or is not one of the three machine modes goes to the group "unknown" (nothing is guessed).

'use strict'

export const UNKNOWN = 'unknown'
// order of the groups on screen: CNC, Laser, FFF, then the jobs with no known mode
export const GROUP_ORDER = ['cnc', 'laser', 'fff', UNKNOWN]

// the names of MODE_NAMES in vue/_shared36/machine-modes.js (a test keeps them equal; shared files are only staged at build time)
const BY_NAME = { cnc: 'cnc', laser: 'laser', fff: 'fff' }

// job -> 'cnc' | 'laser' | 'fff' | 'unknown'
export function modeOf(job) {
	const s = String((job && job.mode) || '').trim().toLowerCase()
	return BY_NAME[s] || UNKNOWN
}

// no float noise in the sums (0.1 + 0.2): 4 decimals, the precision of the CSV export
const round4 = v => Math.round(v * 10000) / 10000

function sum(jobs) {
	const withKwh = jobs.filter(t => t.kwh != null)
	const kwh = round4(withKwh.reduce((s, t) => s + t.kwh, 0))
	return { n: jobs.length, kwh, avgKwh: withKwh.length ? round4(kwh / withKwh.length) : null }
}

// Only the groups that have jobs, in GROUP_ORDER: [{ id, n, kwh, avgKwh, items }] (items keep the order they came in).
// avgKwh is over the jobs that have a reading (null when none has one). The cost is costText(kwh, tariff) in the view.
export function groupJobs(jobs) {
	const list = jobs || []
	return GROUP_ORDER
		.map(id => ({ id, items: list.filter(t => modeOf(t) === id) }))
		.filter(g => g.items.length)
		.map(g => Object.assign({ id: g.id, items: g.items }, sum(g.items)))
}

// grand total of the jobs on screen: { n, kwh, avgKwh }
export function grandTotal(jobs) {
	return sum(jobs || [])
}

// quick filter: id = 'all' or a group id
export function filterByGroup(jobs, id) {
	return !id || id === 'all' ? (jobs || []) : (jobs || []).filter(t => modeOf(t) === id)
}
