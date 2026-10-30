'use strict'

// WorkshopPower -- "Consumption" page (formerly inside WorkshopService, split off 2026-10-08).
// Reads the data published by the WorkshopService backend
// (machine.model.plugins.get('WorkshopService').data) and asks it for things with
// its API (POST /machine/WorkshopService/api), so it needs that backend installed to show data.
// The route is /Plugins/Power.

import './i18n-register.js'
import { registerCategory, registerRoute } from '../../routes'
import './safe-saving.js' // power cut: save with a backup and in one step (vue/_shared)

import consumption from './PowerPage.vue'
import './theme.css'

// The three monitoring pages (Activity, Power, Pi health) share one menu group, "Monitor" (F3-V, 2026-10-21). The first one that
// loads creates it, the others find it; the addresses of the pages did not change. The group name is a text of the shared catalog.
registerCategory('Monitor', 'mdi-monitor-dashboard', 'plugins.WorkshopPower.shared.monitor_group').then(() => registerRoute(consumption, {
	Monitor: {
		WorkshopPower: {
			icon: 'mdi-gauge',
			caption: 'plugins.WorkshopPower.common.power_usage',
			path: '/Plugins/Power'
		}
	}
}));

// a bookmark or a link to the old Spanish address keeps working
