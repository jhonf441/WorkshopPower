// money.js -- format of an amount of money in the language of DWC and the currency chosen in the tariff (tested in test/money.test.js)
'use strict';

// currencies that are shown without cents; any other one shows 2 decimals
const WHOLE_CURRENCIES = { COP: 0, CLP: 0, ARS: 0 };

export function currencyDecimals(currency) {
	return WHOLE_CURRENCIES[currency] != null ? WHOLE_CURRENCIES[currency] : 2;
}

// locale: the language of DWC (this.$i18n.locale); an empty one falls back to the browser's
export function formatMoney(value, currency, locale) {
	const dec = currencyDecimals(currency);
	return Number(value).toLocaleString(locale || undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// energy with two decimals, three below 0.1 kWh; "--" when there is no value
export function fmtKwh(v) {
	if (v == null || isNaN(v)) {
		return '--';
	}
	return v < 0.1 && v > 0 ? v.toFixed(3) : v.toFixed(2);
}

// "1,234 COP" / "12.50 EUR" for an energy in kWh with the tariff { currency, value_kwh } (no currency sign of its own: the code is the currency); null when there is no tariff or no value
export function costText(kwh, tariff, locale) {
	if (kwh == null || isNaN(kwh) || !tariff || !tariff.value_kwh) {
		return null;
	}
	return `${formatMoney(kwh * tariff.value_kwh, tariff.currency, locale)} ${tariff.currency}`.trim();
}
