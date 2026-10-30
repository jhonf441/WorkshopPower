<template>
	<div>
		<div class="d-flex align-center flex-wrap mt-3 tariff-row">
			<v-icon size="small" class="mr-1" color="grey">mdi-cash</v-icon>
			<span v-if="tariff.value_kwh" class="text-body-medium">
				{{ $t('plugins.WorkshopPower.consumption.rate') }} <b>{{ money(tariff.value_kwh) }} {{ tariff.currency }}</b> {{ $t('plugins.WorkshopPower.consumption.per_kwh') }}
			</span>
			<span v-else class="text-body-medium text-warning">{{ $t(canChange ? 'plugins.WorkshopPower.consumption.no_rate_enter_the_kwh_cost' : 'plugins.WorkshopPower.consumption.no_rate_ask_technician') }}</span>
			<v-btn v-if="canChange" size="x-small" variant="text" color="primary" class="ml-1" @click="open = !open">
				{{ open ? $t('plugins.WorkshopPower.consumption.close') : $t('plugins.WorkshopPower.consumption.change') }}
			</v-btn>
		</div>
		<ExpandTransition>
			<div v-if="canChange" v-show="open">
				<v-row density="compact" class="mt-1 align-center">
					<v-col cols="5" sm="3">
						<v-select v-model="currency" :items="currencies" :label="$t('plugins.WorkshopPower.consumption.currency')" density="compact" hide-details variant="outlined" />
					</v-col>
					<v-col cols="7" sm="4">
						<v-text-field
							v-model="value" :label="$t('plugins.WorkshopPower.consumption.cost_per_kwh_from_your_bill')" type="number"
							step="0.01" min="0" density="compact" hide-details variant="outlined"
							@keyup.enter="save()"
						/>
					</v-col>
					<v-col cols="12" sm="3">
						<v-btn color="primary" size="small" :loading="saving" @click="save()">{{ $t('plugins.WorkshopPower.consumption.save') }}</v-btn>
					</v-col>
				</v-row>
				<error-notice :error="error" retry class="mt-2" @retry="save()" />
			</div>
		</ExpandTransition>
	</div>
</template>

<script setup>
import { ExpandTransition } from './expand-transition.js'

// The price of one kWh (API energy.rate_get / energy.rate_set): everybody who sees the page reads it, changing it is for a
// technician (the service refuses it to a lower role; here the editor is not even offered). A failed save says so, with the
// reason, instead of leaving the old value on screen as if nothing had happened.
//   <tariff-row :tariff="tariff" @saved="tariff = $event" />      tariff: { currency, value_kwh } as the service answers

import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import ErrorNotice from './ErrorNotice.vue' // vue/_shared
import { api } from './workshop-api.js'
import { useRole } from './use-role.js' // vue/_shared
import { formatMoney } from './money.js'

const props = defineProps({
	tariff: { type: Object, required: true }
})
const emit = defineEmits(['saved'])

const { atLeast } = useRole()
const currencies = ['ARS', 'BRL', 'CLP', 'COP', 'EUR', 'MXN', 'PEN', 'USD'] // choices only: the currency comes from the machine profile / the saved rate
const currency = ref(props.tariff.currency)
const value = ref(props.tariff.value_kwh ? String(props.tariff.value_kwh) : '')
const open = ref(false)
const saving = ref(false)
const error = ref(null)

const canChange = computed(() => atLeast('technician'))

// the service answered (first load, or a save): the editor shows what is stored
watch(() => props.tariff, t => {
	currency.value = t.currency
	value.value = t.value_kwh ? String(t.value_kwh) : ''
	if (!t.value_kwh) {
		open.value = true
	}
})

function money(v) {
	return formatMoney(v, props.tariff.currency, i18n.locale)
}
async function save() {
	saving.value = true
	error.value = null
	try {
		const data = await api('energy.rate_set', { currency: String(currency.value), value: Number(parseFloat(value.value)) || 0 })
		emit('saved', data)
		open.value = false
	} catch (e) {
		error.value = e
	} finally {
		saving.value = false
	}
}
</script>

<style scoped>
.tariff-row {
	border-top: 1px solid rgba(128, 128, 128, 0.2);
	padding-top: 8px;
}
</style>
