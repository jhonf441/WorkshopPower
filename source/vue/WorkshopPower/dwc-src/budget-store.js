// budget-store.js -- the monthly energy limit (kWh) of this browser. There is no service operation for it yet, so it lives in localStorage
// (the page says so); every access is guarded because the storage can be blocked.
'use strict';

export const BUDGET_KEY = 'workshopPowerBudgetKwh';

// a positive number or 0 (none)
export function loadLimit() {
	try {
		const v = Number(localStorage.getItem(BUDGET_KEY));
		return v > 0 && isFinite(v) ? v : 0;
	} catch (e) {
		return 0;
	}
}

export function saveLimit(kwh) {
	try {
		if (kwh > 0) {
			localStorage.setItem(BUDGET_KEY, String(kwh));
		} else {
			localStorage.removeItem(BUDGET_KEY);
		}
	} catch (e) {
		// not critical: the limit lasts until the page is closed
	}
}

// text typed by the user ("120", "120,5") -> positive number or null
export function parseLimit(text) {
	const v = Number(String(text == null ? '' : text).trim().replace(',', '.'));
	return v > 0 && isFinite(v) ? v : null;
}
