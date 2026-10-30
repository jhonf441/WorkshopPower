'use strict';

// Rows of the start-up card of Power (vue/_shared/StartupPanel.vue). Pure function (no imports): tests/startup-plugins.test.js
// loads it in node. The labels are keys of plugins.WorkshopPower.startup.*.
//
// The power meter is hardware of the person: a machine without one has nothing to read here, so "no meter yet" is
// orange (still to configure; "Do not use" turns it off for good), never red.
//
// c = { hayDatos: bool,           the service published consumptionCurrent (a reading arrived)
//       medidores: [{ ok }],      meters of consumptionCurrent (empty = a service with a single meter)
//       edadS: number | null }    seconds since the last reading reached this page
const OLD_S = 90; // same limit as the live dot of the page

export function rowsConsumption(c) {
	const meters = (c && c.meters) || [];
	const has = !!(c && c.hasData);
	const buenos = meters.filter(m => m && m.ok).length;
	const noneAnswers = has && meters.length > 0 && buenos === 0;
	const old = !!(c && c.ageS !== null && c.ageS !== undefined && c.ageS > OLD_S);
	return [
		{
			id: 'meter',
			state: !has ? 'example' : noneAnswers ? 'missing' : 'configured',
			label: 'row_meter', what: 'row_meter_what', why: 'row_meter_for', ifMissing: 'row_meter_missing',
			help: 'row_meter_tip',
			params: { n: buenos, total: meters.length },
			texts: { configured: meters.length > 1 ? 'meter_ok_n' : 'meter_ok', example: 'meter_none', missing: 'meter_silent' }
		},
		// a fresh reading only means something when there is a meter
		{
			id: 'reading',
			applies: has && !noneAnswers,
			state: old ? 'missing' : 'configured',
			label: 'row_reading', what: 'row_reading_what', why: 'row_reading_for', ifMissing: 'row_reading_missing',
			help: 'row_reading_tip',
			params: { min: old ? Math.max(1, Math.round(c.ageS / 60)) : 0 },
			texts: { configured: 'reading_ok', missing: 'reading_old', na: 'state_na' }
		}
	];
}
