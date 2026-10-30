// plugin-data.js -- one field of the data a plugin publishes in the object model. On DWC 3.6 plugin.data is a plain object (a Map on 3.7 and in
// some test fixtures); both are read here. (3.7 has the same helper as dataOf() in workshop-ids.js of vue/_shared.)
'use strict';

export function dataOf(plugin, field) {
	const d = plugin && plugin.data;
	if (!d) return undefined;
	return typeof d.get === 'function' ? d.get(field) : d[field];
}
