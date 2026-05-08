/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: DependencyModelCustom.js
 */
//custom  dependency Model
//fromfield is changed   from  'From'(default)  to 'FromId'
Ext.define('LeankorApp.model.DependencyModelCustom', {
	extend : 'Gnt.model.Dependency',
	fromField : 'FromId',
	customizableFields : [{
			name : 'From'
		}, {
			name : 'To'
		}, {
			name : 'FromVSID',
			type : 'string'
		}, {
			name : 'ToVSID',
			type : 'string'
		}
	]
});
