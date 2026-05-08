/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: FolderProjectTreeModel.js
 */
Ext.define("LeankorApp.model.FolderProjectTreeModel", {
	extend: 'Ext.data.TreeModel',
	// idProperty: 'Id',
	fields: [{
			name: "Id",
		}, {
			name: "Name",
			type: 'string'//,
			// mapping: 'Name'
		}, {
			name: "RoomType",
			// convert: undefined
		}, {
			name: "ParentPortfolio",
			// convert: undefined
		}, {
			name: "DueDate",
			type: 'date',
			dateFormat: 'timestamp'
		}, {
			name: "StartDate",
			type: 'date',
			dateFormat: 'timestamp'	
		}, {
			name: "BoardMaxDueDate",
			type: 'date',
			dateFormat: 'timestamp'
		}, {
			name: "OwnerId",
			// convert: undefined
		}, {
			name: "OwnerName",
			// convert: undefined,
			type: 'string'
		}
	]

});
