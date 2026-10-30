<template>
	<div>
		<div class="d-flex align-center flex-wrap mt-3 tariff-row">
			<v-icon small class="mr-1" color="grey">mdi-cash</v-icon>
			<span v-if="tariff.value_kwh" class="text-body-2">
				{{ $t('plugins.WorkshopPower.consumption.rate') }} <b>{{ money(tariff.value_kwh) }} {{ tariff.currency }}</b> {{ $t('plugins.WorkshopPower.consumption.per_kwh') }}
			</span>
			<span v-else class="text-body-2 warning--text">{{ $t(canChange ? 'plugins.WorkshopPower.consumption.no_rate_enter_the_kwh_cost' : 'plugins.WorkshopPower.consumption.no_rate_ask_technician') }}</span>
			<v-btn v-if="canChange" x-small text color="primary" class="ml-1" @click="open = !open">
				{{ open ? $t('plugins.WorkshopPower.consumption.close') : $t('plugins.WorkshopPower.consumption.change') }}
			</v-btn>
		</div>
		<v-expand-transition>
			<div v-if="canChange" v-show="open">
				<v-row dense class="mt-1 align-center">
					<v-col cols="5" sm="3">
						<v-select v-model="currency" :items="currencies" :label="$t('plugins.WorkshopPower.consumption.currency')" dense hide-details outlined />
					</v-col>
					<v-col cols="7" sm="4">
						<v-text-field
							v-model="value" :label="$t('plugins.WorkshopPower.consumption.cost_per_kwh_from_your_bill')" type="number"
							step="0.01" min="0" dense hide-details outlined
							@keyup.enter="save()"
						/>
					</v-col>
					<v-col cols="12" sm="3">
						<v-btn color="primary" small :loading="saving" @click="save()">{{ $t('plugins.WorkshopPower.consumption.save') }}</v-btn>
					</v-col>
				</v-row>
				<error-notice :error="error" retry class="mt-2" @retry="save()" />
			</div>
		</v-expand-transition>
	</div>
</template>

<script>
'use strict'

// The price of one kWh (API energy.rate_get / energy.rate_set): everybody who sees the page reads it, changing it is for a
// technician (the service refuses it to a lower role; here the editor is not even offered). A failed save says so, with the
// reason, instead of leaving the old value on screen as if nothing had happened.
//   <tariff-row :tariff="tariff" @saved="tariff = $event" />      tariff: { currency, value_kwh } as the service answers

import ErrorNotice from './ErrorNotice.vue' // vue/_shared
import { api } from './workshop-api.js'
import { roleMixin } from './role-mixin.js' // vue/_shared
import { formatMoney } from './money.js'

export default {
	components: { ErrorNotice },
	mixins: [roleMixin],
	props: {
		tariff: { type: Object, required: true }
	},
	data() {
		return {
			currencies: ['USD', 'EUR', 'COP', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL'], // choices only: the currency comes from the machine profile / the saved rate
			currency: this.tariff.currency,
			value: this.tariff.value_kwh ? String(this.tariff.value_kwh) : '',
			open: false,
			saving: false,
			error: null
		};
	},
	computed: {
		canChange() {
			return this.atLeast('technician');
		}
	},
	watch: {
		// the service answered (first load, or a save): the editor shows what is stored
		tariff(t) {
			this.currency = t.currency;
			this.value = t.value_kwh ? String(t.value_kwh) : '';
			if (!t.value_kwh) {
				this.open = true;
			}
		}
	},
	methods: {
		money(v) {
			return formatMoney(v, this.tariff.currency, this.$i18n.locale);
		},
		async save() {
			this.saving = true;
			this.error = null;
			try {
				const data = await api('energy.rate_set', { currency: String(this.currency), value: Number(parseFloat(this.value)) || 0 });
				this.$emit('saved', data);
				this.open = false;
			} catch (e) {
				this.error = e;
			} finally {
				this.saving = false;
			}
		}
	}
};
</script>

<style scoped>
.tariff-row {
	border-top: 1px solid rgba(128, 128, 128, 0.2);
	padding-top: 8px;
}
</style>
