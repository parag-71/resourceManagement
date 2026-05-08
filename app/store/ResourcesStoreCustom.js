/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ResourcesStoreCustom.js
 */
Ext.define("LeankorApp.store.ResourcesStoreCustom", {
	extend : 'Gnt.data.ResourceStore',
	storeId: 'resourcesStoreCustom',
	model: 'LeankorApp.model.ResourcesModelCustom',
	sorters: [{
     property: 'Name',
     direction: 'ASC' 
   }]
});
