/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ResourcesModelCustom.js
 */
Ext.define("LeankorApp.model.ResourcesModelCustom", {
	extend: "Gnt.model.Resource",
	idProperty: 'Id',
	fields: [{
			name: 'Id',
			type: 'string'
		},
		/**
		 *@Modified <24-05-18> Pankaj
		 *@Description: IsActive is boolean value so change type "string" to "boolean".
		 */
		{
			name: 'IsActive',
			type: 'boolean'
		}

	],
	getProjectCalendar:function() {
	  return this.getTaskStore() ? this.getTaskStore().getCalendar() : LeankorApp.Gantt.gantt.taskStore.getCalendar();
	}
});
