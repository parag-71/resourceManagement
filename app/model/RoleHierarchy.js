/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: RoleHierarchy.js
 */
Ext.define("LeankorApp.model.RoleHierarchy", {
	extend: 'Ext.data.TreeModel',
	// idProperty: 'Id',
	fields: [{
			name: 'Name',
			type: 'string'
		}, {
			name: "RoleId",
			type: 'string'
		}
	]
});
