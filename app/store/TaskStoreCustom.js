/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: TaskStoreCustom.js
 */
Ext.define("LeankorApp.store.TaskStoreCustom", {
	extend : 'Gnt.data.TaskStore',
	storeId: 'taskStoreCustom',
	model: 'LeankorApp.model.TaskModelCustom',
	/**
	@Author : Sheetal
	@method : sortByType
	@Description - This method will sort items on the basis of Type. Leankor Type will come first and then FSL. They will sorted  again alphabetically
	 */
	sortByType : function(){
		this.sort(function(a, b){
			return a.data.CustomTaskName.localeCompare(b.data.CustomTaskName);
		    
		});
		this.sort(function(a, b){
		    if(a.data.Type == 'Leankor' && b.data.Type == 'FSL') return -1;
		    if(a.data.Type == 'FSL' && b.data.Type == 'Leankor') return 1;
		    return 0;
		});
		
	} 
});
