<template>
	<div class="meter-config">
		<!-- Meters: one card each, the editor is a block of its own -->
		<div class="meter-current">
			<v-icon :color="live ? 'success' : 'grey'" class="mr-2" aria-hidden="true">mdi-meter-electric-outline</v-icon>
			<div class="flex-grow-1 text-body-2" :class="!meters.length && queried ? 'warning--text' : ''">
				{{ querying ? $t('plugins.WorkshopPower.meterConfig.querying') : meters.length ? (meters.length === 1 ? $t('plugins.WorkshopPower.meterConfig.one_meter') : $t('plugins.WorkshopPower.meterConfig.n_meters', { n: meters.length })) : (queried ? $t('plugins.WorkshopPower.meterConfig.no_meter_is_configured_add_one') : $t('plugins.WorkshopPower.meterConfig.couldn_t_query_the_meter')) }}
			</div>
			<v-btn small color="primary" outlined :disabled="open && isNew" @click="newMeter()"><v-icon small left>mdi-plus</v-icon>{{ $t('plugins.WorkshopPower.meterConfig.add_meter') }}</v-btn>
		</div>
		<div class="mlist">
			<meter-card
				v-for="(m, i) in meters" :key="m.key" :meter="m" :reading="readingOf(m)" :selected="open && sel === m.key"
				:inside-name="m.inside_of ? nameOf(m.inside_of) : ''" :style="{ order: i * 2 }" @edit="edit(m)"
			/>
			<!-- the editor sits right under the card being edited, or at the end for a new meter -->
			<v-expand-transition>
				<div v-show="open" class="editor-wrap" :style="{ order: editorOrder }">
					<div v-if="isNew && meters.length" class="editor-divider"><span>{{ $t('plugins.WorkshopPower.meterConfig.divider_new') }}</span></div>
					<v-card outlined class="editor pa-0" :class="isNew ? 'editor-new' : 'editor-edit'">
						<!-- the editor is its own card: a new meter must not look like part of the one already added -->
						<div class="editor-head">
							<v-icon :color="isNew ? 'primary' : ''" aria-hidden="true">{{ isNew ? 'mdi-plus-circle-outline' : 'mdi-pencil' }}</v-icon>
							<div class="editor-titles">
								<div class="editor-title">
									<span class="text-subtitle-1">{{ isNew ? $t('plugins.WorkshopPower.meterConfig.new_meter_title') : $t('plugins.WorkshopPower.meterConfig.edit_meter_title', { name: currentSel ? currentSel.name : '' }) }}</span>
									<v-chip x-small :color="isNew ? 'primary' : ''">{{ isNew ? $t('plugins.WorkshopPower.meterConfig.new_badge') : $t('plugins.WorkshopPower.meterConfig.editing_badge') }}</v-chip>
								</div>
								<div class="text-caption grey--text">{{ isNew ? $t('plugins.WorkshopPower.meterConfig.new_meter_sub') : $t('plugins.WorkshopPower.meterConfig.edit_meter_sub') }}</div>
							</div>
							<v-btn icon small text :aria-label="$t('plugins.WorkshopPower.meterConfig.close_editor')" @click="closeEditor()"><v-icon>mdi-close</v-icon></v-btn>
						</div>
						<div class="editor-body">
							<!-- guide: where the ID and the local key come from (open for a new meter, closed for an existing one) -->
							<v-btn small text color="primary" class="px-0 mb-1" :aria-expanded="guideOpen ? 'true' : 'false'" @click="guideOpen = !guideOpen">
								<v-icon small left>{{ guideOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>{{ $t(guideOpen ? 'plugins.WorkshopPower.meterConfig.guide_hide' : 'plugins.WorkshopPower.meterConfig.guide_show') }}
							</v-btn>
							<div v-show="guideOpen">
				<!-- Paso 1 -->
				<div class="step">
					<div class="step-num">1</div>
					<div class="step-body">
						<div class="step-title">{{ $t('plugins.WorkshopPower.meterConfig.which_device_works') }}</div>
						<div class="text-body-2">
							{{ $t('plugins.WorkshopPower.meterConfig.a_smart_meter_breaker_or_plug') }} <b>Tuya / Smart Life</b> {{ $t('plugins.WorkshopPower.meterConfig.that_shows_in_the_app') }}
							<b>{{ $t('plugins.WorkshopPower.meterConfig.power_w_voltage_v_and_current') }}</b>{{ $t('plugins.WorkshopPower.meterConfig.it_must_be_on_the_same') }} <b>{{ $t('plugins.WorkshopPower.meterConfig.fixed_ip') }}</b> {{ $t('plugins.WorkshopPower.meterConfig.on_the_router_dhcp_reservation_if') }}
						</div>
					</div>
				</div>

				<!-- Paso 2 -->
				<div class="step">
					<div class="step-num">2</div>
					<div class="step-body">
						<div class="step-title">{{ $t('plugins.WorkshopPower.meterConfig.get_the_id_and_local_key') }}</div>
						<div class="text-body-2">
							{{ $t('plugins.WorkshopPower.meterConfig.tuya_doesn_t_show_the') }} <b>{{ $t('plugins.WorkshopPower.meterConfig.local_key') }}</b> {{ $t('plugins.WorkshopPower.meterConfig.in_the_app_you_have_to') }} <code>tinytuya</code>:
						</div>
						<ol class="text-body-2 steps-list">
							<li>{{ $t('plugins.WorkshopPower.meterConfig.create_a_free_account_at') }} <b>iot.tuya.com</b> &rarr; <i>{{ $t('plugins.WorkshopPower.meterConfig.cloud_create_cloud_project') }}</i>
								{{ $t('plugins.WorkshopPower.meterConfig.your_account_s_region_e_g') }} <i>Western America</i>).</li>
							<li>{{ $t('plugins.WorkshopPower.meterConfig.in_the_project') }} <i>Devices &rarr; Link App Account</i> {{ $t('plugins.WorkshopPower.meterConfig.and_scan_the_qr_with_the') }}</li>
							<li>{{ $t('plugins.WorkshopPower.meterConfig.copy_the') }} <b>Access ID</b> {{ $t('plugins.WorkshopPower.meterConfig.and_the') }} <b>Access Secret</b> {{ $t('plugins.WorkshopPower.meterConfig.of_the_project_tab') }} <i>Overview</i>).</li>
							<li>{{ $t('plugins.WorkshopPower.meterConfig.on_the_system_ssh_run_the') }}
								<div class="command">
									<code>cd ~ &amp;&amp; python3 -m tinytuya wizard</code>
									<v-btn :aria-label="$t('plugins.WorkshopPower.shared.aria_copy')" x-small icon @click="copy('cd ~ && python3 -m tinytuya wizard')"><v-icon x-small>mdi-content-copy</v-icon></v-btn>
								</div>
							</li>
							<li>{{ $t('plugins.WorkshopPower.meterConfig.when_done_the_file') }} <code>~/devices.json</code> {{ $t('plugins.WorkshopPower.meterConfig.has_for_each_device_its') }} <b>id</b> {{ $t('plugins.WorkshopPower.meterConfig.and_its') }} <b>key</b> {{ $t('plugins.WorkshopPower.meterConfig.local_key_2') }}</li>
						</ol>
						<div class="text-caption warning--text">
							{{ $t('plugins.WorkshopPower.meterConfig.if_you_re_pair_the_device') }}
						</div>
					</div>
				</div>

				<!-- Paso 3 -->
				<div class="step">
					<div class="step-num">3</div>
					<div class="step-body">
						<div class="step-title">{{ $t('plugins.WorkshopPower.meterConfig.find_the_device_on_the_network') }}</div>
						<div class="text-body-2 mb-2">{{ $t('plugins.WorkshopPower.meterConfig.finds_the_ip_and_protocol_version') }}</div>
						<v-btn small outlined color="primary" :loading="searching" @click="search()">
							<v-icon small left>mdi-radar</v-icon>{{ $t('plugins.WorkshopPower.meterConfig.search_the_network_10_s') }}
						</v-btn>
						<div v-if="searchError" class="text-caption error--text mt-1">{{ searchError }}</div>
						<div v-if="found" class="mt-2">
							<div v-if="!found.length" class="text-caption grey--text">
								{{ $t('plugins.WorkshopPower.meterConfig.none_found_check_that_it_s') }}
							</div>
							<div
								v-for="d in found" :key="d.ip + d.id"
								class="encontrado" :class="{ 'found-sel': form.id === d.id }"
								@click="use(d)"
							>
								<v-icon small class="mr-2">mdi-wifi</v-icon>
								<span class="text-body-2">{{ d.ip }}</span>
								<span class="text-caption grey--text ml-2 meter-data">{{ d.id }} &middot; v{{ d.version || '?' }}</span>
								<v-chip v-if="d.current" x-small class="ml-2" color="success" text-color="white">{{ $t('plugins.WorkshopPower.meterConfig.in_use') }}</v-chip>
							</div>
						</div>
					</div>
				</div>

							</div>
				<!-- Paso 4 -->
				<div class="step">
					<div class="step-num">4</div>
					<div class="step-body">
						<div class="step-title">{{ $t('plugins.WorkshopPower.meterConfig.meter_data') }}</div>
						<v-row dense>
							<v-col cols="12" sm="6">
								<v-text-field
									v-model.trim="form.id" :label="$t('plugins.WorkshopPower.meterConfig.device_id')" dense outlined hide-details="auto"
									:hint="$t('plugins.WorkshopPower.meterConfig.id_field_hint')" persistent-hint
								/>
							</v-col>
							<v-col cols="12" sm="6">
								<v-text-field v-model.trim="form.ip" label="IP" placeholder="192.168.1.50" dense outlined hide-details="auto" />
							</v-col>
							<v-col cols="12" sm="8">
								<v-text-field
									v-model="form.key" :label="$t('plugins.WorkshopPower.meterConfig.local_key_3')" dense outlined hide-details="auto"
									:type="viewKey ? 'text' : 'password'" autocomplete="off"
									:append-icon="viewKey ? 'mdi-eye-off' : 'mdi-eye'" @click:append="viewKey = !viewKey"
									:hint="sameId ? $t('plugins.WorkshopPower.meterConfig.leave_empty_to_keep_key') : $t('plugins.WorkshopPower.meterConfig.key_field_hint')" persistent-hint
								/>
							</v-col>
							<v-col cols="12" sm="4">
								<v-select v-model="form.version" :items="versions" :label="$t('plugins.WorkshopPower.meterConfig.version')" dense outlined hide-details="auto" />
							</v-col>
						</v-row>

						<div class="actions">
								<v-btn small text @click="closeEditor()">{{ $t('plugins.WorkshopPower.meterConfig.cancel_editor') }}</v-btn>
								<v-spacer />
								<v-btn small outlined :loading="testing" :disabled="!canTest" @click="test()">
									<v-icon small left>mdi-connection</v-icon>{{ $t('plugins.WorkshopPower.meterConfig.test_connection') }}
								</v-btn>
								<v-btn small color="primary" :loading="saving" :disabled="!testOk" @click="save()">
									<v-icon small left>mdi-content-save</v-icon>{{ $t('plugins.WorkshopPower.meterConfig.save_and_use') }}
								</v-btn>
							</div>
							<div v-if="!testOk && canTest && !testing" class="text-caption grey--text mt-1 text-right">{{ $t('plugins.WorkshopPower.meterConfig.test_the_connection_first') }}</div>
							<div v-if="testResult" class="mt-3 result" :class="testResult.ok ? 'result-ok' : 'result-error'">
							<template v-if="testResult.ok">
								<v-icon small color="success" class="mr-1">mdi-check-circle</v-icon>
								<b>{{ $t('plugins.WorkshopPower.meterConfig.responds') }}</b>
								{{ testResult.reading.power_w.toFixed(0) }} W &middot; {{ testResult.reading.voltage_v.toFixed(1) }} V &middot;
								{{ testResult.reading.current_a.toFixed(2) }} A &middot; {{ $t('plugins.WorkshopPower.meterConfig.counter_kwh', { kwh: testResult.reading.energy_kwh.toFixed(2) }) }}
								<div v-if="savedMsg" class="mt-1">{{ savedMsg }}</div>
							</template>
							<template v-else>
								<v-icon small color="error" class="mr-1">mdi-alert-circle</v-icon>{{ testResult.error }}
							</template>
						</div>

						<div class="text-caption grey--text mt-3">
							{{ $t('plugins.WorkshopPower.meterConfig.changing_meters_doesn_t_lose_the') }} <b>{{ $t('plugins.WorkshopPower.meterConfig.shut_everything_down') }}</b> {{ $t('plugins.WorkshopPower.meterConfig.to_cut_the_power') }}
						</div>
						<v-btn v-if="currentSel" x-small text :color="forgetArmed ? 'error' : 'grey'" class="mt-1 px-0" :loading="restoring" @click="forget()">
							{{ forgetArmed ? $t('plugins.WorkshopPower.meterConfig.tap_again_to_remove', { name: currentSel.name }) : $t('plugins.WorkshopPower.meterConfig.remove_this_meter') }}
						</v-btn>
					</div>
				</div>

				<!-- Paso 5: papel del medidor -->
				<div v-if="currentSel" class="step">
					<div class="step-num">5</div>
					<div class="step-body">
						<div class="step-title">{{ $t('plugins.WorkshopPower.meterConfig.how_it_is_connected_and_what') }}</div>
						<v-row dense>
							<v-col cols="12" sm="6"><v-text-field v-model.trim="aj.name" :label="$t('plugins.WorkshopPower.meterConfig.name')" dense outlined hide-details /></v-col>
							<v-col cols="12" sm="6">
								<v-select v-model="aj.inside_of" :items="optionsInside" :label="$t('plugins.WorkshopPower.meterConfig.connection')" dense outlined hide-details />
							</v-col>
						</v-row>
						<div class="text-caption grey--text mt-1">
							{{ $t('plugins.WorkshopPower.meterConfig.own_line_its_consumption_adds_to') }}
						</div>
						<v-checkbox v-model="aj.feeds_pi" dense hide-details :label="$t('plugins.WorkshopPower.meterConfig.powers_the_system_cutting_it_shuts')" />
						<div class="d-flex align-center flex-wrap" style="gap:8px">
							<v-checkbox v-model="aj.short" dense hide-details :label="$t('plugins.WorkshopPower.meterConfig.cut_on_shutdown_shut_down_when')" />
							<v-text-field v-if="aj.short && !aj.feeds_pi" v-model.number="aj.order" type="number" :label="$t('plugins.WorkshopPower.meterConfig.order')" dense outlined hide-details style="max-width:90px" />
						</div>
						<div class="text-caption grey--text">{{ $t('plugins.WorkshopPower.meterConfig.the_ones_that_don_t_power') }}</div>
						<div class="d-flex align-center flex-wrap mt-2" style="gap:8px">
							<v-select v-model="aj.watchesCal" :items="optionsWatches" :label="$t('plugins.WorkshopPower.meterConfig.watch_a_heater')" dense outlined hide-details style="max-width:230px" />
							<v-text-field v-if="aj.watchesCal" v-model.number="aj.threshold" type="number" :label="$t('plugins.WorkshopPower.meterConfig.alert_above_w')" dense outlined hide-details style="max-width:150px" />
							<v-checkbox v-if="aj.watchesCal" v-model="aj.cutSiAlarm" dense hide-details :label="$t('plugins.WorkshopPower.meterConfig.and_cut_this_meter')" />
						</div>
						<div class="text-caption grey--text">
							{{ $t('plugins.WorkshopPower.meterConfig.safety_alarm_if_this_meter_draws') }}
						</div>
						<v-btn small color="primary" outlined class="mt-2" :loading="savingAj" @click="saveSettings()"><v-icon small left>mdi-content-save</v-icon>{{ $t('plugins.WorkshopPower.meterConfig.save_settings') }}</v-btn>
						<span v-if="ajMsg" class="text-caption ml-2">{{ ajMsg }}</span>
					</div>
				</div>
						</div>
					</v-card>
				</div>
			</v-expand-transition>
		</div>
		<div v-if="orderCut.length" class="text-caption mt-2">
			<v-icon x-small class="mr-1" aria-hidden="true">mdi-power</v-icon>{{ $t('plugins.WorkshopPower.meterConfig.on_shutdown_it_cuts') }} <b>{{ orderCut.join(' → ') }}</b>
			<span class="grey--text">{{ $t('plugins.WorkshopPower.meterConfig.the_one_powering_the_system_always') }}</span>
		</div>

		<meter-health v-if="meter && !open" />
	</div>
</template>

<script>
import i18n from '../../i18n'

'use strict'

import { mapActions } from 'vuex'
import { api } from './workshop-api.js'
import { pluginOf } from './workshop-ids.js' // Id nuevo o viejo del plugin
import { dataOf } from './plugin-data.js'
import MeterCard from './MeterCard.vue'
import MeterHealth from './MeterHealth.vue'

export default {
	components: { MeterCard, MeterHealth },
	props: {
		live: { type: Boolean, default: false },
		openEditor: { type: Boolean, default: false }
	},
	data() {
		return {
			meter: null,
			meters: [],
			orderCut: [],
			sel: null, // key of the meter being edited
			newName: null,
			aj: { name: '', inside_of: null, feeds_pi: false, short: true, order: 0, watchesCal: null, threshold: 40, cutSiAlarm: false },
			savingAj: false,
			ajMsg: null,
			querying: false,
			queried: false,
			forgetArmed: false,
			open: this.openEditor,
			versions: ['3.1', '3.2', '3.3', '3.4', '3.5'],
			form: { id: '', ip: '', key: '', version: '3.3' },
			viewKey: false,
			searching: false,
			found: null,
			searchError: null,
			testing: false,
			testResult: null,
			testedWith: null,
			saving: false,
			savedMsg: null,
			restoring: false,
			guideOpen: true // step by step guide to the ID and the local key: open for a new meter, closed for an existing one
		};
	},
	computed: {
		currentSel() {
			return this.meters.find(m => m.key === this.sel) || null;
		},
		// the editor is for a meter that does not exist yet (Add) or for one of the cards (Edit)
		isNew() {
			return !this.currentSel;
		},
		// the cards have order 0, 2, 4...; the editor goes right after the card being edited, or at the end for a new meter
		editorOrder() {
			const i = this.meters.findIndex(m => m.key === this.sel);
			return i >= 0 ? i * 2 + 1 : this.meters.length * 2 + 1;
		},
		optionsInside() {
			return [{ text: i18n.t('plugins.WorkshopPower.meterConfig.own_line_adds_to_the_total'), value: null }].concat(this.meters.filter(m => m.key !== this.sel).map(m => ({ text: i18n.t('plugins.WorkshopPower.meterConfig.inside_not_added', { name: m.name }), value: m.key })));
		},
		optionsWatches() {
			const hs = ((this.$store.state.machine.model.heat || {}).heaters || []).map((h, i) => h ? { text: i18n.t('plugins.WorkshopPower.meterConfig.heater_n', { n: i }), value: 'H' + i } : null).filter(Boolean);
			return [{ text: i18n.t('plugins.WorkshopPower.meterConfig.none'), value: null }, { text: i18n.t('plugins.WorkshopPower.meterConfig.heated_bed'), value: 'bed' }, { text: i18n.t('plugins.WorkshopPower.meterConfig.heated_chamber'), value: 'camera' }].concat(hs);
		},
		sameId() {
			const m = this.currentSel;
			return !!(m && this.form.id && this.form.id === m.id);
		},
		canTest() {
			return !!(this.form.id && this.form.ip && (this.form.key || this.sameId));
		},
		signature() {
			return JSON.stringify(this.form);
		},
		// "Save" only with a successful test of EXACTLY this data
		testOk() {
			return !!(this.testResult && this.testResult.ok && this.testedWith === this.signature);
		}
	},
	watch: {
		openEditor(v) {
			if (v) {
				this.open = true;
			}
		}
	},
	mounted() {
		this.query();
	},
	methods: {
		applyState(r) {
			this.meter = r.meter || null;
			this.meters = r.meters || [];
			this.orderCut = r.order_cut || [];
		},
		nameOf(key) {
			const m = this.meters.find(x => x.key === key);
			return m ? m.name : key;
		},
		// live state of a card: { state: 'ok' | 'bad' | 'none', text }
		readingOf(m) {
			const pl = pluginOf(this.$store.state.machine.model.plugins, 'service');
			const ca = dataOf(pl, 'consumptionCurrent');
			const x = ca && (ca.meters || []).find(y => y.key === m.key);
			if (!x) return { state: 'none', text: '--' };
			return x.ok ? { state: 'ok', text: Math.round(x.power_w) + ' W' } : { state: 'bad', text: i18n.t('plugins.WorkshopPower.common.no_reading') };
		},
		edit(m) {
			this.sel = m.key;
			this.newName = null;
			this.form = { id: m.id, ip: m.ip, key: '', version: m.version || '3.3' };
			this.testResult = null;
			this.savedMsg = null;
			this.ajMsg = null;
			this.loadSettings();
			this.guideOpen = false;
			this.open = true;
		},
		// closes the editor and forgets what was typed (the list of meters stays as it was)
		closeEditor() {
			this.open = false;
			this.sel = null;
			this.newName = null;
			this.form = { id: '', ip: '', key: '', version: '3.3' };
			this.testResult = null;
			this.savedMsg = null;
			this.ajMsg = null;
			this.forgetArmed = false;
			this.$emit('closed');
		},
		newMeter() {
			let n = this.meters.length + 1;
			while (this.meters.some(m => m.key === 'm' + n)) n++;
			this.sel = this.meters.length ? 'm' + n : 'general';
			this.newName = this.meters.length ? i18n.t('plugins.WorkshopPower.meterConfig.meter_n', { n }) : i18n.t('plugins.WorkshopPower.meterConfig.general_name');
			this.form = { id: '', ip: '', key: '', version: '3.3' };
			this.testResult = null;
			this.savedMsg = null;
			this.guideOpen = true;
			this.open = true;
			this.$nextTick(() => { const e = this.$el.querySelector('.editor'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
		},
		loadSettings() {
			const m = this.currentSel;
			if (!m) return;
			this.aj = {
				name: m.name, inside_of: m.inside_of, feeds_pi: m.feeds_pi, short: m.short, order: m.order,
				watchesCal: m.watches ? m.watches.heater : null, threshold: m.watches ? m.watches.threshold_w : 40, cutSiAlarm: m.watches ? !!m.watches.cut : false
			};
		},
		async saveSettings() {
			const a = this.aj;
			const cambios = {
				name: a.name || this.sel, inside_of: a.inside_of || null, feeds_pi: !!a.feeds_pi, short: !!a.short, order: Number(a.order) || 0,
				watches: a.watchesCal ? { heater: a.watchesCal, threshold_w: Number(a.threshold) || 40, cut: !!a.cutSiAlarm } : null
			};
			this.savingAj = true;
			this.ajMsg = null;
			try {
				const r = await this.m9003('settings', { meter: String(this.sel || ''), changes: cambios });
				if (r.ok === false) throw new Error(r.error || 'error');
				this.applyState(r);
				this.loadSettings();
				this.ajMsg = i18n.t('plugins.WorkshopPower.meterConfig.saved');
				this.$emit('changed');
			} catch (e) {
				this.ajMsg = i18n.t('plugins.WorkshopPower.meterConfig.not_saved') + (e.message || e);
			} finally {
				this.savingAj = false;
			}
		},
		...mapActions('machine', ['sendCode']),
		// API of WorkshopService: meter.<op> -> the JSON of the service
		async m9003(op, args) {
			return await api('meter.' + op, args || {});
		},
		params() {
			const f = this.form;
			const nombre = this.currentSel ? this.currentSel.name : this.newName || this.sel || '';
			// the local key goes as plain text (the API takes any character)
			return { meter: String(this.sel || ''), name: String(nombre), id: String(f.id || ''), ip: String(f.ip || ''), key: String(f.key || ''), version: String(f.version || '') };
		},
		async query() {
			this.querying = true;
			try {
				const r = await this.m9003('get');
				this.applyState(r);
				this.queried = true;
				if (!this.meters.length) {
					this.newMeter();
				}
			} catch (e) {
				this.meter = null;
			} finally {
				this.querying = false;
			}
		},
		async search() {
			this.searching = true;
			this.searchError = null;
			try {
				const r = await this.m9003('search');
				if (r.ok) {
					this.found = r.devices || [];
				} else {
					this.searchError = r.error;
				}
			} catch (e) {
				this.searchError = i18n.t('plugins.WorkshopPower.meterConfig.the_search_didn_t_respond') + (e.message || e);
			} finally {
				this.searching = false;
			}
		},
		use(d) {
			if (d.id !== this.form.id) {
				this.form.key = '';
			}
			this.form.id = d.id;
			this.form.ip = d.ip;
			if (this.versions.includes(d.version)) {
				this.form.version = d.version;
			}
			this.testResult = null;
		},
		async test() {
			this.testing = true;
			this.savedMsg = null;
			const signature = this.signature;
			try {
				this.testResult = await this.m9003('test', this.params());
				this.testedWith = signature;
			} catch (e) {
				this.testResult = { ok: false, error: i18n.t('plugins.WorkshopPower.meterConfig.no_response') + (e.message || e) };
			} finally {
				this.testing = false;
			}
		},
		async save() {
			this.saving = true;
			try {
				const r = await this.m9003('save', this.params());
				this.testResult = r;
				if (r.ok) {
					this.applyState(r);
					this.newName = null;
					this.form.key = '';
					this.testedWith = this.signature;
					this.savedMsg = i18n.t('plugins.WorkshopPower.meterConfig.saved_live_readings_use_this_meter');
					this.loadSettings();
					this.$emit('changed');
				}
			} catch (e) {
				this.testResult = { ok: false, error: i18n.t('plugins.WorkshopPower.meterConfig.could_not_save') + (e.message || e) };
			} finally {
				this.saving = false;
			}
		},
		async forget() {
			if (!this.forgetArmed) {
				this.forgetArmed = true;
				setTimeout(() => { this.forgetArmed = false; }, 4000);
				return;
			}
			this.forgetArmed = false;
			this.restoring = true;
			try {
				const r = await this.m9003('forget', { meter: String(this.sel || '') });
				this.applyState(r);
				this.testResult = null;
				this.sel = null;
				this.open = false;
				this.$emit('changed');
			} finally {
				this.restoring = false;
			}
		},
		// navigator.clipboard only exists on https or localhost; DWC on the workshop network is plain http, so the
		// hidden textarea is the way that works there
		copy(txt) {
			try {
				if (navigator.clipboard && window.isSecureContext) {
					navigator.clipboard.writeText(txt).catch(() => this.copyOld(txt));
					return;
				}
			} catch (e) {
				// the old way below
			}
			this.copyOld(txt);
		},
		copyOld(txt) {
			try {
				const ta = document.createElement('textarea');
				ta.value = String(txt);
				ta.setAttribute('readonly', '');
				ta.style.cssText = 'position:fixed;left:-1000px;top:0;opacity:0;';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
			} catch (e) {
				// nothing works: the text can be selected by hand
			}
		}
	}
};
</script>

<style scoped>
.meter-current {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 12px;
}
.mlist {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.meter-data {
	overflow-wrap: anywhere;
}
/* the editor is a block of its own: more air above it, a labelled divider for a new meter, an accent border and a tinted header */
.editor-wrap {
	margin-top: 8px;
}
.editor-divider {
	display: flex;
	align-items: center;
	gap: 12px;
	margin: 16px 0 12px;
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--tp-faint, #9e9e9e);
}
.editor-divider::before,
.editor-divider::after {
	content: '';
	flex: 1 1 0;
	height: 1px;
	background: rgba(128, 128, 128, 0.4);
}
.editor {
	border-radius: 10px;
	overflow: hidden;
}
.editor-new {
	border: 1px solid var(--wf-sec, #7E57C2) !important;
}
.editor-edit {
	border: 1px solid rgba(128, 128, 128, 0.5) !important;
}
.editor-head {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 12px 14px;
	background: transparent;
	border-bottom: 1px solid rgba(128, 128, 128, 0.25);
}
.editor-titles {
	flex: 1 1 auto;
	min-width: 0;
}
.editor-title {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px 8px;
}
.editor-body {
	padding: 8px 14px 14px;
}
.actions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid rgba(128, 128, 128, 0.25);
}
.step {
	display: flex;
	gap: 12px;
	padding: 12px 0;
	border-top: 1px solid rgba(128, 128, 128, 0.18);
}
.step-num {
	flex: 0 0 26px;
	height: 26px;
	border-radius: 50%;
	background: #1976d2;
	color: #fff;
	font-weight: 600;
	font-size: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
}
.step-body {
	flex: 1 1 auto;
	min-width: 0;
}
.step-title {
	font-weight: 500;
	margin-bottom: 4px;
}
.steps-list {
	padding-left: 18px;
	margin: 4px 0;
}
.steps-list li {
	margin-bottom: 4px;
}
.command {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin-top: 2px;
}
.encontrado {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	padding: 8px 10px;
	border-radius: 6px;
	cursor: pointer;
	border: 1px solid rgba(128, 128, 128, 0.25);
	margin-bottom: 6px;
}
.encontrado:hover {
	background: rgba(128, 128, 128, 0.1);
}
.found-sel {
	border-color: #2196f3;
	background: rgba(33, 150, 243, 0.12);
}
.result {
	padding: 8px 12px;
	border-radius: 6px;
	font-size: 13px;
}
.result-ok {
	background: rgba(102, 187, 106, 0.14);
}
.result-error {
	background: rgba(239, 83, 80, 0.14);
}
@media (max-width: 480px) {
	.editor-head,
	.editor-body {
		padding-left: 10px;
		padding-right: 10px;
	}
	.actions .v-btn {
		flex: 1 1 auto;
	}
}
</style>
