/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: RoleHierarchy.js
 */
Ext.define('LeankorApp.store.RoleHierarchy', {
	extend: 'Ext.data.TreeStore',
	storeId: 'roleHierarchy',
	model: 'LeankorApp.model.RoleHierarchy',
	defaultRootProperty: 'SubordinateRoles',	
	autoLoad: true,
	proxy: {
		type: 'memory',
		reader: {
			typeProperty: 'mtype'
		}
	}
});
