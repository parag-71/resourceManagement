/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ControlHeader.js
 */
Ext.define('LeankorApp.view.ControlHeader', {
	extend : 'Ext.panel.Header',
	xtype : 'controlheader',
	// `controlheader` class is referenced by the responsive @media rules in
	// resources/accessibility.css (Phase 1 reflow) — must be applied to the
	// rendered DOM for the rules to match.
	cls   : 'controlheader',
	// Declares the header as an ARIA landmark (WCAG 1.3.1) — gives screen
	// readers a stable role for keyboard navigation.
	ariaRole : 'toolbar',
	title : 'Gantt Board',
	//height : 60,
	//split  : true,
	initComponent : function () {
		 Ext.getStore('monthStore').setData([
			{	
				"name":Ext.htmlEncode(Locale.LocaleName.Weeks), 
				"value":"weekAndMonth"
			},{
				"name": Ext.htmlEncode(Locale.LocaleName.OneWeek),
				"value": "weekAndHour"
			}, {
				"name": Ext.htmlEncode(Locale.LocaleName.OneMonth),
				"value": "weekAndDayLetter4"
			}, {
				"name": Ext.htmlEncode(Locale.LocaleName.TwoMonths),
				"value": "weekAndDayLetter8"
			}, {
				"name": Ext.htmlEncode(Locale.LocaleName.ThreeMonths),
				"value": "weekAndDayLetter12"
			}, {
				"name": Ext.htmlEncode(Locale.LocaleName.SixMonths),
				"value": "weekAndDayLetter"
			}, {
				"name": Ext.htmlEncode(Locale.LocaleName.OneYear),
				"value": "monthAndYear1"
			}, {
				"name": Ext.htmlEncode(Locale.LocaleName.TwoYears),
				"value": "monthAndYear2"
			}, {
				"name": Ext.htmlEncode(Locale.LocaleName.ThreeYears),
				"value": "monthAndYear3"
			}
		]);
		Ext.getStore('settingsStore').loadData([	
			{"name": Locale.LocaleName.ZoomToFit, "value":"Zoom to Fit" , id : 1},
			{"name": Locale.LocaleName.Today, "value":"Today", id : 6},
			{"name": Locale.LocaleName.Print, "value":"Print", id : 2}
		]);
		Ext.getStore('departmentOption').loadData([{
				"name": Locale.LocaleName.ByRoleHierarchy,
				"value": "By Role Hierarchy",
				id: 2
			}, {
				"name": Locale.LocaleName.ByUsers,
				"value": "By Users",
				id: 1
			}
		]);
		
		this.tools = [{
				xtype : 'combo',
				store : 'departmentOption',
				queryMode : 'local',
				// No displayField — combo acts as a trigger that opens a custom
				// popup (see MainViewportController.onDepartmentFilter). Leaving
				// displayField unset keeps emptyText visible after selection so
				// the combo always reads as "Departments". Same pattern as the
				// other trigger-style combos (period, settings).
				valueField : 'value',
				selectOnTab : false,
				cls : 'combo-custom-cls-period',
				forceSelection : false,
				editable : false,
				listConfig : {
					width : 190,
					minWidth : 190
				},
				emptyText : Ext.htmlEncode(Locale.LocaleName.Departments),
				ariaLabel : Locale.LocaleName.Departments,
				reference : 'departmentFilter',
				tpl : Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain"><tpl for=".">',
					'<li role="option" class="x-boundlist-item">{name:htmlEncode}</li>',
					'</tpl></ul>'),

			}, {
				xtype : 'combo',
				store : 'folderProjectTree',
				// No displayField — combo opens a custom tree popup (see
				// onProjectFilter). emptyText "Projects" stays visible.
				valueField : 'value',
				selectOnTab : false,
				editable : false,
				cls : 'combo-custom-cls-period',
				emptyText :  Ext.htmlEncode(Locale.LocaleName.Projects),
				ariaLabel : Locale.LocaleName.Projects,
				reference : 'projectFilter',

			}, {
				xtype : 'button',
				tooltip: Ext.htmlEncode(Locale.LocaleName.PreviousTimespan),
				ariaLabel : Locale.LocaleName.PreviousTimespan,
				text: '<span class="controlheader-btn-text">' + Ext.htmlEncode(Locale.LocaleName.PreviousTimespan) + '</span>',
				reference : 'shiftPrevious',
				iconCls : 'icon-previous',
				cls : 'toolbar-custom-btn'
			}, {
				xtype : 'button',
				tooltip: Ext.htmlEncode(Locale.LocaleName.NextTimespan),
				ariaLabel : Locale.LocaleName.NextTimespan,
				text: '<span class="controlheader-btn-text">' + Ext.htmlEncode(Locale.LocaleName.NextTimespan) + '</span>',
				reference : 'shiftNext',
				iconCls : 'icon-next',
				cls : 'toolbar-custom-btn'
			}, {
				xtype : 'combo',
				store : 'viewStore',
				queryMode : 'local',
				displayField : 'name',
				valueField : 'value',
				selectOnTab : false,
				cls : 'combo-custom-cls-period',
				forceSelection : false,
				editable : false,
				listConfig : {
					width : 190,
					minWidth : 190,
				},
				emptyText : Ext.htmlEncode(Locale.LocaleName.Show),
				ariaLabel : Locale.LocaleName.Show,
				reference : 'viewChange',
				// Template for the dropdown menu.
				// Note the use of the "x-list-plain" and "x-boundlist-item" class,
				// this is required to make the items selectable.
				tpl : Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain customulcls"><tpl for=".">',
					'<li role="option" class="x-boundlist-item"><span class="{value:htmlEncode}"></span><span class="name">{name:htmlEncode}</span></li>',
					'</tpl></ul>'),

			},
			// '-',
			{
				xtype : 'combo',
				store : 'settingsStore',
				queryMode : 'local',
				// No displayField — Settings is a trigger combo (Zoom to Fit /
				// Today / Print are actions, not values). Without displayField,
				// the input always shows emptyText "Select Action".
				valueField : 'value',
				selectOnTab : false,
				cls : 'combo-custom-cls-setting',
				forceSelection : false,
				editable : false,
				listConfig: {
                    width: 190,
                    minWidth: 190,
                    maxWidth: 260,
                },
				autoSelect : false,
				ariaLabel : Locale.LocaleName.Action,
				reference : 'settingCheck',
				// Template for the dropdown menu.
				// Note the use of the "x-list-plain" and "x-boundlist-item" class,
				// this is required to make the items selectable.
				tpl : (Ext.urlDecode(Ext.htmlDecode(window.location.search.substring(1))).btype == 'projectgantt') ? Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain"><tpl for=".">',
					'<li role="option" class="x-boundlist-item">{name:htmlEncode}</li>',
					'</tpl></ul>') : Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain"><tpl for=".">',
					'<tpl if="id!=\'8\' && id!=\'9\'"><li role="option" class="x-boundlist-item">{name:htmlEncode}</li></tpl>',
					'</tpl></ul>')

			}, {
				xtype : 'combo',
				store : 'monthStore',
				queryMode : 'local',
				// No displayField — Period is a trigger combo, the picker
				// items are radio inputs. Without displayField, the combo
				// input always reads "Select Period" instead of showing the
				// last-picked timespan.
				valueField : 'value',
				selectOnTab : false,
				cls : 'combo-custom-cls-period',
				forceSelection : false,
				editable : false,
				listConfig: {
                    width: 170,
                    minWidth: 170,
                    maxWidth: 220,
					height : 330,
					minHeight: 330,
                    maxHeight: 350,
                },
				emptyText : Ext.htmlDecode(Locale.LocaleName.SelectPeriod),
				ariaLabel : Locale.LocaleName.SelectPeriod,
				reference : 'monthChange',
				// Template for the dropdown menu.
				// Note the use of the "x-list-plain" and "x-boundlist-item" class,
				// this is required to make the items selectable.
				tpl : Ext.create('Ext.XTemplate',
					'<ul class="x-list-plain radioButtonCls"><tpl for=".">',
					'<li role="option" class="x-boundlist-item"><input type="radio" name="group1"  class = "{value:htmlEncode}"/> {name:htmlEncode}</li>',
					'</tpl></ul>')

			}, {
				xtype : 'textfield',
				height : 25,
				width : 130,
				fieldLabel : '',
				reference : 'searchfilterfield',
				emptyText : Locale.LocaleName.SearchResources,
				ariaLabel : Locale.LocaleName.SearchResources,
				cls: 'toolbar-custom-textfield textFieldPlaceholderCls',
				enableKeyEvents : true,
				// listeners : {
				// 	blur : function (field, e, eOpts) {
				// 		_LOG && console.log('onNewPostFieldBlur');
				// 		var currVal = field.getValue(),
				// 		newVal = Ext.htmlDecode(currVal.replace(/(<([^>]+)>)/ig, ""));
				// 		field.setValue(newVal);
				// 	}
				// }
			}, {
				xtype : 'button',
				reference : 'popOut',
				ariaLabel : Locale.LocaleName.ZoomToFit,
				tooltip : Ext.htmlEncode(Locale.LocaleName.ZoomToFit),
				iconCls : 'icon-zoom-to-fit',
				cls : 'toolbar-custom-btn'
			}

		];

		// Explicitly opts every toolbar item into the tab order and marks it
		// focusable. ExtJS already does this by default for buttons/combos,
		// but defensive defaults make the tab order predictable across
		// re-renders and prevent any future `focusable: false` regression
		// on a single item from breaking the header's keyboard nav.
		Ext.Array.forEach(this.tools, function (cmp) {
			if (cmp.reference) {
				cmp.itemId = cmp.reference;
			}
			if (!Ext.isDefined(cmp.tabIndex)) { cmp.tabIndex = 0; }
			if (!Ext.isDefined(cmp.focusable)) { cmp.focusable = true; }
		});
		this.callParent(arguments);

		// WCAG 4.1.2 — wire aria-haspopup="listbox" + aria-expanded toggling
		// on every combo so screen readers announce the popup role and state.
		// AccessibilityUtil.wireComboAria is idempotent and defers until
		// afterrender, so calling it from initComponent is safe.
		var me = this;
		me.on('afterrender', function () {
			Ext.Array.forEach(me.query('combobox'), function (combo) {
				LeankorApp.util.AccessibilityUtil.wireComboAria(combo);
			});

			// WCAG 2.4.3 — explicit Tab routing from popOut (last header item)
			// to the + icon (.addBtnTop) in the locked grid header. Without
			// this, the natural Tab order routes through the gantt panel /
			// locked-grid-view container first, wasting a Tab before reaching
			// the +.
			var popOutBtn = me.down('[reference=popOut]');
			if (popOutBtn && popOutBtn.el && popOutBtn.el.dom && !popOutBtn.el.dom._popOutTabBound) {
				popOutBtn.el.dom._popOutTabBound = true;
				popOutBtn.el.dom.addEventListener('keydown', function (e) {
					if (e.keyCode !== 9 || e.shiftKey) { return; }
					var addBtn = document.querySelector('.addBtnTop');
					if (addBtn) {
						e.preventDefault();
						e.stopPropagation();
						addBtn.focus();
					}
				}, true);
			}
		}, null, { single: true });
	}
});
