/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ViewStore.js
 */
Ext.define('LeankorApp.store.ViewStore', {
	extend : 'Ext.data.Store',
	fields : ['name', 'value'],
	storeId : 'viewStore',
	data : [{
			"name" : "Resource Schedule",
			"value" : "unchecked",
			"id" : 'resourceschedule'
		}, {
			"name" : "Resource Utilization",
			"value" : "unchecked",
			"id" : 'resourceutilization'
		},
	]
});
