/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: FolderProjectTree.js
 */
Ext.define('LeankorApp.store.FolderProjectTree', {
	extend: 'Ext.data.TreeStore',
	storeId: 'folderProjectTree',
	defaultRootProperty: 'ChildRecords',
	model: 'LeankorApp.model.FolderProjectTreeModel',
	//autoLoad: true,
	proxy: {
		type: 'memory',
		reader: {
			//typeProperty: 'mtype'
		}
	}
});
