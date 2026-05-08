/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: DependencyEditor.js
 */
Ext.define('LeankorApp.plugin.DependencyEditor', {
	extend : 'Gnt.plugin.DependencyEditor',
	hideOnBlur : true,
	xtype           : 'app_dependencyeditor',

	    buttons : [
		{
		    text    : Locale.LocaleName.Update,
			tooltip: Locale.LocaleName.Update,
		    scope   : this,
		    itemId : 'depUpdate',
		    cls : 'saveBtnClss',
		    handler : function () {
			_LOG && console.log('Update Dependency');
			var formPanel = Ext.ComponentQuery.query('app_dependencyeditor')[0],
			dependencyData=[];
			formPanel.getForm().updateRecord(formPanel.dependencyRecord);
			var record=LeankorApp.Gantt.gantt.dependencyStore.findRecord('Id',formPanel.dependencyRecord.data.Id);
			if(record){
				record.set(formPanel.dependencyRecord.data);
			}
			LeankorApp.Gantt.gantt.updateAllDependentCards();
			var tempRecord = JSON.parse(JSON.stringify(formPanel.dependencyRecord.data)),
				jasonArray = LeankorApp.Gantt.gantt.taskStore.getById(formPanel.dependencyRecord.data.FromId),
				toRecord = LeankorApp.Gantt.gantt.taskStore.getById(formPanel.dependencyRecord.data.To);
			tempRecord.FromId = jasonArray.data.Id,
			tempRecord.To = toRecord.data.Id,
			dependencyData.push(JSON.stringify(tempRecord));
			var onsuccess=function(result){
				_LOG && console.log('ManageDependency > Success',result);
			};
			/** Update Dependency on force.com
			*@param {array of stringify record}        dependencyData
			*@param {Call back function Success}       onsuccess
			*/
			glueforce.ManageDependency(dependencyData, onsuccess);
			onsuccess=function(result){
				_LOG && console.log('DependencyStreaming > UpdateDependency>onsuccess',result);
			}
			glueforce.DependencyStreaming(dependencyData,"UpdateDependency",onsuccess);
			var dependencyObj={
				"Id" : jasonArray.data.Id,
				"GUID" :jasonArray.data.GUID,
				"ValueStream" : jasonArray.data.ValueStreamID
			},
			onSuccess=function(result){
				_LOG && console.log('kanbanStateChange> ManageDependency >onsuccess',result);
			},
			onfailure=function(result){
				_LOG && console.log('kanbanStateChange> ManageDependency >onfailure',result);
			}
			glueforce.kanbanStateChange("ManageDependency", JSON.stringify(dependencyObj), onSuccess, onfailure);
			/*We may have case when we collapsed some nodes and in this case those nodes get filtered from store and 
			* becomes invisible in search from store , so in this case we first need to store all the collapsed node in a global array (collapsedNode)
			* then we will expand all the nodes so that they can not create problems due to their invisibility
			* And after performing all the operations , we will do a qiuck loop on this array and collapse all those nodes again.
			*/
			  LeankorApp.Gantt.gantt.taskStore.each(function(eachRecord){
				  if(!eachRecord.data.expanded && eachRecord.data.ItemType != 'KC' && eachRecord.data.ItemType != 'Task'){
				  collapsedNode.push(eachRecord.data.Id);
				  }
			  });
			  LeankorApp.Gantt.gantt.expandAll();
			  LeankorApp.Gantt.gantt.taskStore.clearTreeFilter();
			LeankorApp.Gantt.gantt.dependencyStore.commitChanges();
			/*After performing all the operations , we will apply all the filters again.
			* And will do a quick loop on a global array (collapsedNode -, which stores all the collapsed node before expanding them)
			* to collapse all those nodes again.
			* And then wll make that array empty
			*/
			LeankorApp.Gantt.gantt.applyFilters();
			for(var i=0; i< collapsedNode.length ; i++){
			    var node = LeankorApp.Gantt.gantt.taskStore.findRecord('Id',collapsedNode[i]);
			    if(node){
				node.collapse();
			    }
			}
			collapsedNode.length = 0;
			formPanel.collapse();
			
		    }
		},
		
		{
		    text    : Locale.LocaleName.Delete,
			tooltip: Locale.LocaleName.Delete,
		    cls : 'saveBtnClss',
		    scope   : this,
		    itemId : 'depDelete',
		    handler : function () {
			_LOG && console.log('DeleteDependency');
			var formPanel = Ext.ComponentQuery.query('app_dependencyeditor')[0];
			// dependencyRecordGUUID=[];
			var  record = formPanel.dependencyRecord;
			// var deleteDependencyObject={
				// Id:record.data.Id
			// }
			// dependencyRecordGUUID.push(record.data.Id);
			formPanel.collapse();
			 LeankorApp.Gantt.gantt.dependencyStore.remove(record);
			// var onsuccess=function(result){
				// _LOG && console.log('RemoveDependency > Success',result);
			// }
			// /** Delete Dependency on force.com
			// *@param {array of ID of Dependency}        dependencyRecordGUUID
			// */
			// glueforce.RemoveDependency(dependencyRecordGUUID, onsuccess)
			// onsuccess=function(result){
				// _LOG && console.log('DependencyStreaming> DeleteDependency > onsuccess',result);
			// }
			// var dependencyGUUID=[];
			// dependencyGUUID.push(JSON.stringify(deleteDependencyObject));
			// glueforce.DependencyStreaming(dependencyGUUID,"DeleteDependency",onsuccess);
			// LeankorApp.Gantt.gantt.dependencyStore.commitChanges();
			
			
		    }
		},
		{
			text    : Locale.LocaleName.Cancel,
			tooltip: Locale.LocaleName.Cancel,
			scope   : this,
			handler : function () {
				_LOG && console.log('cancel');
				 var formPanel = Ext.ComponentQuery.query('app_dependencyeditor')[0];
				 formPanel.collapse();
			},
			cls : 'cancelBtnClss'
		  
		}
	    ]
});
