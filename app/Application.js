/**
 * The main application class. An instance of this class is created by app.js when it
 * calls Ext.application(). This is the ideal place to handle application launch and
 * initialization details.
 */
Ext.define('LeankorApp.Application', {
	extend: 'Ext.app.Application',

	name: 'LeankorApp',
	requires: ['Gnt.plugin.TaskContextMenu', 'Gnt.column.ResourceAssignment', 'Sch.plugin.Pan', 'Gnt.plugin.Printable','Locale','LeankorApp.util.AccessibilityUtil'],
	stores: [
		// TODO: add global / shared stores here
		'TaskStoreCustom',
		'MonthStore',
		'SettingsStore',
		'ViewStore',
		'UsersStore',
		'DataLogStore',
		'ResourcesStoreCustom',
		'AssignmentStore',
		'FolderProjectTree',
		'VsStore',
		'DepartmentOption',
		'RoleHierarchy'
	],
	models: [
		// TODO: add global / shared stores here
		'TaskModelCustom',
		'DataLogModel',
		'ResourcesModelCustom',
		'AssignmentModel',
		'FolderProjectTreeModel',
		'RoleHierarchy'
	],
	views: [
		'MainViewport',
		'AssignmentToolTip',
		'AssignmentGrid',
		'AssignmentChart',
		'ResourceSchedule',
		'LeankorApp.view.override.LinesToolTip',
		'LeankorApp.view.override.MessageBox'
		
	],

	launch: function () {
		// TODO - Launch the application

		// WCAG 2.4.7 — switch ExtJS into modern keyboard-mode tracking.
		// Without this, on classic+desktop builds ExtJS sets enableKeyboardMode=false
		// and permanently adds .x-keyboard-mode to <body>. Result: every focus
		// (mouse OR keyboard) is treated as keyboard, so focus outlines paint on
		// every click. Calling this enables the modern listener that toggles
		// .x-keyboard-mode on keydown / removes it on pointerdown — which is
		// what every CSS rule in all.scss section 3 / 3b assumes.
		Ext.setEnableKeyboardMode(true);

		// Bootstrap WCAG 2.1 AA helpers (live region + keyboard-mode tracker).
		LeankorApp.util.AccessibilityUtil.init();

		//This methd (startsWith) is not supported in some browsers so we need to explicitly  define the method
		if (!String.prototype.startsWith) {
			String.prototype.startsWith = function (searchString, position) {
				position = position || 0;
				return this.indexOf(searchString, position) === position;
			};
		}

		remoteWorkspaceHandler = (function (s, f) {});
		var isIE11 = navigator.userAgent.indexOf(".NET CLR") > -1 || navigator.userAgent.indexOf('Edge') > -1;
		browser = (isIE11 || navigator.appVersion.indexOf("MSIE") != -1) || navigator.msPointerEnabled;

		// Update getViewportScale method. ISsue - In lighning and in Iframe , resize was not working
		Ext.dom.Element.getViewportScale = function () {
			var top = window.top;
			try {
				if (top.devicePixelRatio ||
					top.screen.deviceXDPI) {}
			} catch (e) {
				top = window;
			}
			return ((Ext.isiOS || Ext.isAndroid) ? 1 : (top.devicePixelRatio ||
					top.screen.deviceXDPI / top.screen.logicalXDPI)) *
			this.getViewportTouchScale();
		}
		
		// Ext.override(Gnt.model.utilization.DefaultUtilizationNegotiationStrategy,{
		// 	removeOutdatedSurrogateResources:function(utilizationResourceStore, utilizationEventStore, resourceStore) {
		// 	  var currentRoot = utilizationResourceStore.getRoot(), nodesToDelete = [], eventsToDelete = [];
		// 	  currentRoot.cascadeBy(function(currentNode) {
		// 		var resource;
		// 		if (!currentNode.isRoot() && currentNode.isSurrogateResource()) {
		// 		  resource = currentNode.getOriginalResource();
		// 		  if (!resourceStore.contains(resource)) {
		// 			nodesToDelete.push(currentNode);
		// 			eventsToDelete = eventsToDelete.concat(currentNode.getEvents());
		// 		  }
		// 		  if (resource.getAssignments() == null) {
		// 			  nodesToDelete.push(currentNode);
		// 			eventsToDelete = eventsToDelete.concat(currentNode.getEvents());
		// 		  }
		// 		  if (resource.getAssignments() && !resource.getAssignments().length) {
		// 			  nodesToDelete.push(currentNode);
		// 			eventsToDelete = eventsToDelete.concat(currentNode.getEvents());
		// 		  }
		// 		}
		// 	  });
		// 	  utilizationEventStore.remove(eventsToDelete);
		// 	  Ext.Array.each(nodesToDelete, function(currentNode) {
		// 		currentNode.remove();
		// 	  });
		// 	}
		// })
		//Override to sort RS according to CustomTaskName + Type (Sorting according to CustomTaskName is already done on taskstore at the time of loading)
		Ext.override(Sch.eventlayout.Horizontal  , {
			
			sortEvents : function(a, b) {
		
			 var startA = a.getStartDate();
			  var startB = b.getStartDate();
			  var endA = b.getEndDate();
			  var endB = b.getEndDate();
			  var sameStart = startA - startB === 0;
			  var sameEnd = endA - endB === 0;
			  if (sameStart) {
				  if(sameEnd){
					  return a.data.CustomTaskName.localeCompare(b.data.CustomTaskName);
				  }
				else return a.getEndDate() > b.getEndDate() ? -1 : 1;
			  } else {
			    return startA < startB ? -1 : 1;
			  }
			 /* if(a.data.Type == 'Leankor' && b.data.Type == 'FSL') return -1;
			 if(a.data.Type == 'FSL' && b.data.Type == 'Leankor') return 1;
			 return 0;*/
				//return 1;
		}
		});
	}
});

/**
 *This function will get called when any change is broadcast from other side
 *@desc update local store and refresh view
 *@param String 'verb' identify activity took place on other side
 *@param  JSON  'payload' broadcast data

 */
function remoteWorkspaceHandler(verb, payload) {};
function sessionTimeOut(message) {
	var msg = Locale.LocaleName.SessionExpiredMsg;
	if (message == 'Other') {
		msg = Locale.LocaleName.ContactAdminMsg;
	} else if (message == 'OwnershipIssue') {
		msg = Locale.LocaleName.InsuffPrivilegesForOwnershipChange;
	}
	Ext.MessageBox.show({
		title: '',
		msg: msg,
		buttons: Ext.Msg.OK,
		closable: false,
		buttonUIs: {
			ok: 'saveBtnClss'
		},
		buttonIds: [
			'ok'
		],
		buttonTips : {
			yes: Locale.LocaleName.OK,
		},
		fn: function (btn) {
			if (btn == 'ok') {
				location.reload();
			}
		}

	});
};
