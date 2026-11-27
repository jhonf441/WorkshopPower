<template>
	<div>
		<div class="d-flex align-center flex-wrap tariff-row">
			<v-icon small class="mr-1" color="grey">mdi-cash</v-icon>
			<span v-if="tariff.value_kwh" class="text-body-2">
				{{ $t('plugins.WorkshopPower.consumption.rate') }} <b>{{ money(tariff.value_kwh) }} {{ tariff.currency }}</b> {{ $t('plugins.WorkshopPower.consumption.per_kwh') }}
			</span>
			<span v-else-if="!readFailed" class="text-body-2">{{ $t(canChange ? 'plugins.WorkshopPower.consumption.no_rate_enter_the_kwh_cost' : 'plugins.WorkshopPower.consumption.no_rate_set') }}</span>
			<v-btn small text color="primary" class="ml-2" :disabled="!canChange" @click="open = !open">
				{{ open ? $t('plugins.WorkshopPower.consumption.close') : $t('plugins.WorkshopPower.consumption.change') }}
			</v-btn>
			<!-- below technician the button is disabled and ONE reason says why (session = blue, role = gray, naming the role) -->
			<lock-reason :ops="tariffOps" min="technician" class="ml-2" :subject="$t('plugins.WorkshopPower.subjects.tariff')" />
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
						<wf-action-button :action="saveAct" main :label="$t('plugins.WorkshopPower.consumption.save')" @run="save()" />
					</v-col>
				</v-row>
				<wf-result v-if="saveAct.state !== 'error' || saveAct.error.code === 'unverified'" class="mt-2" :action="saveAct" @retry="saveAct.retry()" />
				<!-- a refusal is told by its cause (no session / role) by the error notice -->
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
import WfActionButton from './WfActionButton.vue' // vue/_shared36 (FASE2)
import WfResult from './WfResult.vue' // vue/_shared36 (FASE2)
import { createAction } from './workshop-action.js' // vue/_shared36 (FASE2)
import { api } from './workshop-api.js'
import { accessCanMixin } from './reason-mixin.js' // the answers of the service, by operation (vue/_shared36)
import { TARIFF_OPS } from './access-groups.js'
import { formatMoney } from './money.js'
import LockReason from './LockReason.vue' // vue/_shared36

export default {
	components: { LockReason, ErrorNotice, WfActionButton, WfResult },
	mixins: [accessCanMixin],
	sessionData: ['open'],
	props: {
		tariff: { type: Object, required: true },
		readFailed: { type: Boolean, default: false } // the page could not read the rate: it says why, so this row does not say "no rate"
	},
	data() {
		return {
			currencies: ['USD', 'EUR', 'COP', 'MXN', 'ARS', 'CLP', 'PEN', 'BRL'], // choices only: the currency comes from the machine profile / the saved rate
			currency: this.tariff.currency,
			value: this.tariff.value_kwh ? String(this.tariff.value_kwh) : '',
			open: false,
			// the save (workshop-action.js): sending, done / refused, one request at a time
			saveAct: createAction({ run: () => this.doSave() }),
			tariffOps: TARIFF_OPS
		};
	},
	computed: {
		// the refusal of the last save, told by its cause by the error notice (the unconfirmed one is told by the result line)
		error() {
			return this.saveAct.state === 'error' && this.saveAct.error.code !== 'unverified' ? this.saveAct.error : null;
		},
		// the answer of the service for the operation (the table of the role until it answers)
		canChange() {
			return TARIFF_OPS.every(op => this.canDo(op));
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
		save() {
			this.saveAct.run({});
		},
		async doSave() {
			const data = await api('energy.rate_set', { currency: String(this.currency), value: Number(parseFloat(this.value)) || 0 });
			this.$emit('saved', data);
			this.open = false;
		},
		// the person signed in / out or the role changed: what was in the air belonged to the person who left
		onSessionChange() {
			this.saveAct.reset();
		}
	}
};
</script>

<style scoped>
/* the divider above the rate is the one of its group (.wf-group in Consumption.vue) */
.tariff-row {
	gap: 4px 0;
}
</style>
