/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: AssignmentModel.js
 */
Ext.define("LeankorApp.model.AssignmentModel", {
	extend: "Gnt.model.Assignment",
	idProperty: 'Id',
	customizableFields: [
		/**
		 * @field EventId
		 * @hide
		 */
		/**
		 * @field TaskId
		 * The id of the task to which the resource is assigned
		 */
		{
			name: 'TaskId'
		},
		/**
		 * @field
		 * A float value representing the percent of how much of the resource's availability that is dedicated to this task
		 */
		{
			name: 'Units',
			type: 'float',
			defaultValue: 100
		}
	],
	fields: [{
			name: 'Id',
			type: 'string'
		}, {
			name: 'Name',
			type: 'string'
		}, {
			name: 'SACount',
			type: 'int',
			defaultValue: 0
		}, {
			name: 'hasEditAccess',
			type: 'boolean'
		}, {
			name: 'CustomTaskName',
			convert: function (value, record) {

				var taskData = Ext.getStore('taskStoreCustom').getById(record.get('TaskId'));

				if (taskData && record.get('Type') == 'FSL') {
					if (value && value.indexOf(taskData.get('ProjectRoomName')) !== -1) {
						return value;
					}
					return taskData.get('ProjectRoomName') + ' - SFS (' + taskData.get('saAppointmentNumber') + '), ' + taskData.get('Name');
				}
				if (taskData) {
					if (value && value.indexOf(taskData.get('ProjectRoomName')) !== -1) {
						return value;
					}
					return taskData.get('ProjectRoomName') + ' - ' + taskData.get('Name');
				}
				return '';

			}
		},
		/**
		 *@Add field  <24-05-18> Pankaj
		 *@Description:Add field "isLinked" for checking for task linked.
		 */
		{
			name: 'isLinked',
			convert: function (value, record) {

				var taskData = Ext.getStore('taskStoreCustom').getById(record.get('TaskId'));

				if (taskData && taskData.get('isLinked')) {
					return true;
				}
				return false;
			}
		},
		/**
		 *@Add field  <24-05-18> Pankaj
		 *@Description:Add field "parentProjectRoomName" for showing project name of linked card.
		 */
		{
			name: 'parentProjectRoomName',
			convert: function (value, record) {

				var taskData = Ext.getStore('taskStoreCustom').getById(record.get('TaskId'));

				if (taskData && taskData.get('isLinked')) {
					return taskData.get('parentProjectRoomName');
				}
				return '';

			}
		}
	]
});
