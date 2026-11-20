'use strict'

// The operations each group of sensitive buttons of the Power page asks of the service (auth.can), so ONE sentence under the group says why it is locked
// (reason-mixin.js, access-reason.js). Pure: no imports. The names are the ones of dsf/permissions.json; a test compares both and the API contract.
//
//   METER_OPS     find, test, save, forget and settings of the meter (the buttons that open the meter settings)
//   TARIFF_OPS    the cost of the kWh
//   PROFILE_OPS   "this machine has a meter" (the profile of the machine)
//   READ_OPS      the readings (history, period, rate, jobs): no group of buttons, asked once so the page opens with one call
//   SCREEN_OPS    everything the page asks when it opens, in one call

export const METER_OPS = Object.freeze(['meter.search', 'meter.test', 'meter.save', 'meter.forget', 'meter.settings', 'meter.get'])
export const TARIFF_OPS = Object.freeze(['energy.rate_set'])
export const PROFILE_OPS = Object.freeze(['profile.set'])
export const READ_OPS = Object.freeze(['energy.history', 'energy.period', 'energy.rate_get', 'activity.list'])
export const SCREEN_OPS = Object.freeze([].concat(METER_OPS, TARIFF_OPS, PROFILE_OPS, READ_OPS))

// the groups that carry a sentence, by name: the structure test walks this list
export const GROUPS = Object.freeze({ meter: METER_OPS, tariff: TARIFF_OPS, profile: PROFILE_OPS })
