<template>
	<div>
		<v-container v-if="view === 'none'" fluid class="pa-0 consumption-page">
			<service-notice />
			<v-card class="mb-3">
				<v-card-text class="py-4">
					<div class="text-title-large d-flex align-center mb-2"><v-icon class="mr-2">mdi-gauge</v-icon>{{ $t('plugins.WorkshopPower.common.power_usage') }}</div>
					<div class="text-title-medium font-weight-medium mb-1">{{ $t('plugins.WorkshopPower.noMeter.title') }}</div>
					<div class="text-body-medium mb-3">{{ $t('plugins.WorkshopPower.noMeter.text') }}</div>
					<v-btn v-if="atLeast('admin')" size="small" color="primary" :loading="busy" @click="enable()">{{ $t('plugins.WorkshopPower.noMeter.enable') }}</v-btn>
					<div v-else class="text-body-small">{{ $t('plugins.WorkshopPower.noMeter.admin_hint') }}</div>
					<error-notice :error="error" class="mt-2" />
				</v-card-text>
			</v-card>
		</v-container>
		<consumption v-else />
	</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ServiceNotice from './ServiceNotice.vue'
import Consumption from './Consumption.vue'
import ErrorNotice from './ErrorNotice.vue' // vue/_shared
import { useRole } from './use-role.js' // vue/_shared
import { api } from './workshop-api.js'
import { workshopProfile } from './machine-profile.js'
import { powerView, enableMeterChange } from './meter-gate.js'

// Root of the Power page: when the machine profile says there is no meter, the consumption sections are not shown (they would
// only wait for readings that never come) and a clear message takes their place; otherwise the full page.
const { atLeast } = useRole()
const available = ref(null)
const busy = ref(false)
const error = ref(null)
const view = computed(() => powerView(available.value))

onMounted(async () => {
	await workshopProfile.get()
	available.value = workshopProfile.meterAvailable()
})

async function enable() {
	busy.value = true
	error.value = null
	try {
		await api('profile.set', { changes: enableMeterChange() })
		await workshopProfile.get(true)
		available.value = workshopProfile.meterAvailable()
	} catch (e) {
		error.value = e
	} finally {
		busy.value = false
	}
}
</script>
