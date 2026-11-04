// job-groups-store.js -- what this browser remembers of the grouped job list: the grouping ('none' | 'mode') and the collapsed
// groups. Like budget-store.js it lives in localStorage (a view preference of this screen, not shared with the others);
// every access is guarded because the storage can be blocked.
'use strict';

import { GROUP_ORDER } from './job-groups.js';

export const GROUPING_KEY = 'workshopPowerJobsGrouping';
export const COLLAPSED_KEY = 'workshopPowerJobsCollapsed';

export function loadGrouping() {
	try {
		return localStorage.getItem(GROUPING_KEY) === 'mode' ? 'mode' : 'none';
	} catch (e) {
		return 'none';
	}
}

export function saveGrouping(value) {
	try {
		localStorage.setItem(GROUPING_KEY, value === 'mode' ? 'mode' : 'none');
	} catch (e) {
		// not critical: the choice lasts until the page is closed
	}
}

// -> array of group ids (unknown ids are dropped)
export function loadCollapsed() {
	try {
		const v = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]');
		return Array.isArray(v) ? v.filter(id => GROUP_ORDER.includes(id)) : [];
	} catch (e) {
		return [];
	}
}

export function saveCollapsed(ids) {
	try {
		localStorage.setItem(COLLAPSED_KEY, JSON.stringify((ids || []).filter(id => GROUP_ORDER.includes(id))));
	} catch (e) {
		// not critical
	}
}
