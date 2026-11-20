<template>
	<div>
		<v-container v-if="view === 'none'" fluid class="pa-0 consumption-page">
			<service-notice />
			<v-card class="mb-3">
				<v-card-text class="py-4">
					<div class="text-h6 d-flex align-center mb-2"><v-icon class="mr-2">mdi-gauge</v-icon>{{ $t('plugins.WorkshopPower.common.power_usage') }}</div>
					<div class="text-subtitle-1 font-weight-medium mb-1">{{ $t('plugins.WorkshopPower.noMeter.title') }}</div>
					<div class="text-body-2 mb-3">{{ $t('plugins.WorkshopPower.noMeter.text') }}</div>
					<v-btn small color="primary" :disabled="!canEnable" :loading="busy" @click="enable()">{{ $t('plugins.WorkshopPower.noMeter.enable') }}</v-btn>
					<lock-reason :ops="profileOps" min="admin" class="mt-2" :subject="$t('plugins.WorkshopPower.subjects.profile')" />
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
import LockReason from './LockReason.vue' // vue/_shared36
import { accessCanMixin } from './reason-mixin.js' // the answers of the service, by operation (vue/_shared36)
import { PROFILE_OPS, SCREEN_OPS } from './access-groups.js'
import { api } from './workshop-api.js'
import { workshopProfile } from './machine-profile.js'
import { powerView, enableMeterChange } from './meter-gate.js'

// Root of the Power page: when the machine profile says there is no meter, the consumption sections are not shown (they would
// only wait for readings that never come) and a clear message takes their place; otherwise the full page.
export default {
	mixins: [accessCanMixin],
	components: { ServiceNotice, Consumption, ErrorNotice, LockReason },
	data() {
		return { available: null, busy: false, error: null, profileOps: PROFILE_OPS }
	},
	computed: {
		view() { return powerView(this.available) },
		// the answer of the service for the operation (the table of the role until it answers)
		canEnable() { return PROFILE_OPS.every(op => this.canDo(op)) }
	},
	async created() {
		// ONE call to auth.can for every group of the page (the sections below ask the same cache)
		this.wantCan(SCREEN_OPS)
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
