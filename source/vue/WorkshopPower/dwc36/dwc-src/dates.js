// dates.js -- LOCAL date and time as text (not UTC): Bogota is UTC-5, toISOString() falls on the next day a good part of the night.
'use strict';

export function pad(n) {
	return String(n).padStart(2, '0');
}

// "2026-10-19"
export function asDateLocal(d) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-10-19T23:05:00"
export function asDateHourLocal(d) {
	return `${asDateLocal(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
