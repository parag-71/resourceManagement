/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: TaskModelCustom.js
 */
Ext.define("LeankorApp.model.TaskModelCustom", {
	extend: "Gnt.model.Task",
	endDateField: 'DueDate',
	durationUnitField: 'DurationUnits',
	//durationField: 'EstimatedDuration',
	cascadeChanges: true,
	//convertEmptyParentToLeaf : false,

	// 	autoCalculatePercentDoneForParentTask : false,
	isBaseline: false,
	// Some additional fields for baseline calculation
	fields: [{
			name: 'Title',
			type: 'string'
		}, {
			name: 'GUID',
			type: 'string'
		}, {
			name: 'OwnerID',
			type: 'string'
		}, {
			name: 'OwnerName',
			type: 'string'
		}, , {
			name: 'ValueStreamID',
			type: 'string'
		}, {
			name: 'ItemType',
			type: 'string'
		}, {
			name: 'BoardType',
			type: 'string'
		}, {
			name: 'PercentDone',
			type: 'int'
		}, {
			name: 'ToolTip',
			type: 'string'
		}, {
			name: 'Type',
			type: 'string'
		}, {
			name: 'isLinked',
			type: 'boolean'
		}, {
			name: 'parentProjectRoomName',
			type: 'string'
		}, {
			name: 'saAppointmentNumber',
			type: 'string'
		}, {
			name: 'hasEditAccess',
			type: 'boolean'
		}, {
			name: 'SACount',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'CustomTaskName',
			convert: function (value, record) {

				//var taskData = Ext.getStore('taskStoreCustom').getById(record.get('TaskId'));

				if (record.get('Type') == 'FSL') {
					if (value && value.indexOf(record.get('ProjectRoomName')) !== -1) {
						return value;
					}
					return record.get('ProjectRoomName') + ' - SFS (' + record.get('saAppointmentNumber') + '), ' + record.get('Name');
				}
				//if (taskData) {
				if (value && value.indexOf(record.get('ProjectRoomName')) !== -1) {
					return value;
				}
				return record.get('ProjectRoomName') + ' - ' + record.get('Name');
				//}
				return '';

			}
		}
	]

});
