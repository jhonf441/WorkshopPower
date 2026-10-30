<template>
	<div>
		<v-container v-if="view === 'none'" fluid class="pa-0 consumption-page">
			<service-notice />
			<v-card class="mb-3">
				<v-card-text class="py-4">
					<div class="text-h6 d-flex align-center mb-2"><v-icon class="mr-2">mdi-gauge</v-icon>{{ $t('plugins.WorkshopPower.common.power_usage') }}</div>
					<div class="text-subtitle-1 font-weight-medium mb-1">{{ $t('plugins.WorkshopPower.noMeter.title') }}</div>
					<div class="text-body-2 mb-3">{{ $t('plugins.WorkshopPower.noMeter.text') }}</div>
					<v-btn v-if="atLeast('admin')" small color="primary" :loading="busy" @click="enable()">{{ $t('plugins.WorkshopPower.noMeter.enable') }}</v-btn>
					<div v-else class="text-caption">{{ $t('plugins.WorkshopPower.noMeter.admin_hint') }}</div>
					<error-notice :error="error" class="mt-2" />
				</v-card-text>
			</v-card>
		</v-container>
		<consumption v-else />
	</div>
</template>

<script>
import ServiceNotice from './ServiceNotice.vue'
import Consumption from './Consumption.vue'
import ErrorNotice from './ErrorNotice.vue' // vue/_shared
import { roleMixin } from './role-mixin.js' // vue/_shared
import { api } from './workshop-api.js'
import { workshopProfile } from './machine-profile.js'
import { powerView, enableMeterChange } from './meter-gate.js'

// Root of the Power page: when the machine profile says there is no meter, the consumption sections are not shown (they would
// only wait for readings that never come) and a clear message takes their place; otherwise the full page.
export default {
	mixins: [roleMixin],
	components: { ServiceNotice, Consumption, ErrorNotice },
	data() {
		return { available: null, busy: false, error: null }
	},
	computed: {
		view() { return powerView(this.available) }
	},
	async created() {
		await workshopProfile.get()
		this.available = workshopProfile.meterAvailable()
	},
	methods: {
		async enable() {
			this.busy = true
			this.error = null
			try {
				await api('profile.set', { changes: enableMeterChange() })
				await workshopProfile.get(true)
				this.available = workshopProfile.meterAvailable()
			} catch (e) {
				this.error = e
			} finally {
				this.busy = false
			}
		}
	}
}
</script>
