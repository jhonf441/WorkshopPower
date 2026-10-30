'use strict';

// Which view of the Power page to show, from the machine profile (vue/_shared/machine-profile.js). Pure function (no imports):
// test/meter-gate.test.js loads it in node.
//
//   available: workshopProfile.meterAvailable()  true = a meter is configured or declared, false = the machine has none,
//              null = not known yet (older service, or still loading): show the page as before, hide nothing.
export function powerView(available) {
	return available === false ? 'none' : 'full';
}

// The change that tells the profile "this machine has a Tuya meter" (the page then shows the meter settings to configure it).
export function enableMeterChange() {
	return { meter: { kind: 'tuya', params: {} } };
}
