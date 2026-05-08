/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: AssignmentGrid.js
 */
Ext.define('LeankorApp.view.AssignmentGrid', {
	extend: 'Gnt.panel.ResourceUtilization',
	xtype: 'assignmentgridpanel',
	requires: [
		'LeankorApp.view.AssignmentToolTip',
		'Gnt.plugin.Printable',
	],
	//flex: 1,
	rowHeight: 30,
	//split : true,
	widht: '100%',
	height: '100%',
	//border : true,
	itemId: 'asPanel',
	showTodayLine: true,
	numberFormat: '0.000',
	// highlightWeekends: true,
	allowOverlap: false,
	cls: 'backGroudCls',
	// Easy to style each utilization bar individually with CSS or inline 'style'
	//utilizationBarRenderer : function (resourceUtilizationInfo, resource, intervalStartDate, intervalEndDate, metaData) {
	//  if (resource.getName() === 'Bart') {
	//     metaData.cls = 'Bart';
	// }
	//},


	eventRenderer: function (surrogateEvent, surrogateResource, meta) {
		var EUF = Ext.util.Format,
		me = this,
		view = me.getSchedulingView(),
		startDate = surrogateEvent.getStartDate(),
		msPerHour = 60 * 60 * 1000,
		numberFormat = me.getNumberFormat(),
		result = [],
		eventLeft,
		divLeft,
		divRight,
		statusCls,
		rendererScope = this.utilizationBarRendererScope || this;
		eventLeft = view.getCoordinateFromDate(startDate);
		surrogateEvent.forEachInterval(function (intervalStartDate, intervalEndDate) {
			var resourceUtilizationInfo = surrogateEvent.getUtilizationInfoForInterval(intervalStartDate, intervalEndDate),
			metaData = {},
			value = '?';
			divLeft = view.getCoordinateFromDate(intervalStartDate);
			divRight = view.getCoordinateFromDate(intervalEndDate) - 1;
			if (resourceUtilizationInfo instanceof Ext.Promise) {
				statusCls = 'notcalculated';
			} else {
				if (!resourceUtilizationInfo.isUtilized) {
					statusCls = 'notutilized';
				} else {
					if (resourceUtilizationInfo.isUnderallocated) {
						statusCls = 'underallocated';
					} else {
						if (resourceUtilizationInfo.isOverallocated) {
							statusCls = 'overallocated';
						} else {
							statusCls = 'optimallyallocated';
						}
					}
				}
			}
			if (me.utilizationBarRenderer) {
				me.utilizationBarRenderer.call(rendererScope, resourceUtilizationInfo, surrogateResource, intervalStartDate, intervalEndDate, metaData);
			}

			if (!(resourceUtilizationInfo instanceof Ext.Promise)) {
				if (Number.isInteger((resourceUtilizationInfo.allocationMs / msPerHour))) {
					var numberFormatCustom = '0';
				} else {
					var decimalAfterValue = (resourceUtilizationInfo.allocationMs / msPerHour).toString().split(".")[1].length,
					numberFormatCustom = decimalAfterValue == 0 ? '0' : (decimalAfterValue == 1 ? '0.0' : (decimalAfterValue == 2 ? '0.00' : '0.000'));
				}
				value = EUF.number(resourceUtilizationInfo.allocationMs / msPerHour, numberFormatCustom);
			}
			result.push({
				status: statusCls,
				dir: me.rtl ? 'right' : 'left',
				position: divLeft - eventLeft,
				width: divRight - divLeft,
				startTime: intervalStartDate.getTime(),
				endTime: intervalEndDate.getTime(),
				value: divRight - divLeft > 10 ? value : '',
				style: metaData.style || '',
				cls: metaData.cls || ''
			});
		});
		return result;
	},
	afterRender: function () {
		var me = this;
		me.callParent(arguments);
		// `addBtnTop` carries tabindex=0/role=button/aria-label so it's a
		// keyboard-reachable activation point.
		me.getColumns()[0].setText(
			'<span class="addBtnTop" name="addButton" tabindex="0" role="button" aria-label="' +
			Ext.htmlEncode(Locale.LocaleName.AddResource || 'Add Resource') +
			'"></span><span style="margin-left: 10px">' + Locale.LocaleName.Name + '</span>'
		);
		me.tip = new LeankorApp.view.AssignmentToolTip({
				target: me.getSchedulingView().el,
				panel: me
			});
		if (btype !== 'ru') {
			me.getColumns()[0].setText('');
			me.getColumns()[0].initialConfig.header = '';
			me.getColumns()[0].initialConfig.text = '';
		}

		// WCAG 4.1.2 — wire grid structural ARIA roles and aria-rowindex /
		// aria-colindex / aria-rowcount / aria-colcount. Re-runs on every
		// store change so indices stay in sync after sort/filter/load.
		LeankorApp.util.AccessibilityUtil.wireGridAriaIndices(me);
		// Set the panel-level aria-label so SR announces the grid's purpose
		// when focus enters it.
		LeankorApp.util.AccessibilityUtil.setAriaLabel(me, Locale.LocaleName.ResourceUtilization);
		// WCAG 2.1.1 — keyboard nav across rows (↑/↓), jump to first/last
		// (Home/End), expand/collapse tree branches (←/→), and announce each
		// row to screen readers as the user arrows through.
		LeankorApp.util.AccessibilityUtil.initGridKeyboardNavigation(me, {
			announceRowFn: function (record, idx, total) {
				var name = '';
				if (record.isSurrogateResource && record.isSurrogateResource()) {
					name = record.getName ? record.getName() : '';
				} else if (record.getOriginalAssignment && record.getOriginalAssignment()) {
					name = record.getOriginalAssignment().get('CustomTaskName') || '';
				} else if (record.get) {
					name = record.get('Name') || '';
				}
				return Ext.String.format(
					Locale.LocaleName.A11yRowAnnouncement || '{0}, row {1} of {2}',
					Ext.htmlEncode(name), idx + 1, total
				);
			}
		});
		// W3C Window Splitter pattern: keyboard-resize the divider between
		// the locked tree grid and the allocation chart.
		LeankorApp.util.AccessibilityUtil.wireSplitterKeyboard(me);

		// ── Tab routing: popOut → + icon → first row → right panel ────────
		// The Name column header would normally be the next tab stop after
		// popOut. We redirect that focus into the .addBtnTop span instead so
		// the user lands on the actionable element, not the column title.
		// From the + icon, Tab moves into the locked grid's first row (or to
		// the partner ResourceSchedule if the grid is empty); Shift+Tab
		// returns to the last header element (popOut button).
		Ext.defer(function () { me.wireAddBtnTabRouting(); }, 50);
	},

	/**
	 * @private
	 * Wire focus redirect on the Name column header → addBtnTop, plus
	 * keydown handlers on addBtnTop (Enter/Space activate, Tab/Shift+Tab
	 * route into/out of the grid).
	 */
	wireAddBtnTabRouting: function () {
		var me = this;
		if (btype !== 'ru') { return; }
		var nameCol = me.getColumns()[0];
		var nameColEl = nameCol && nameCol.el && nameCol.el.dom;
		if (!nameColEl) { return; }
		var addBtn = nameColEl.querySelector('.addBtnTop');
		if (!addBtn || addBtn._tabRoutingBound) { return; }
		addBtn._tabRoutingBound = true;

		// (a) Redirect Tab-into-column-header focus onto the + icon —
		//     keeps the column header out of the tab order, the + becomes
		//     the entry point of the locked grid.
		if (!nameColEl._addBtnFocusRedirected) {
			nameColEl._addBtnFocusRedirected = true;
			nameColEl.addEventListener('focus', function () {
				if (document.activeElement === addBtn) { return; }
				setTimeout(function () {
					addBtn.focus();
					nameCol.el.removeCls('x-column-header-focus');
					nameCol.el.removeCls('x-focus');
				}, 0);
			}, true);
		}

		// (b) keydown handler on the + icon
		addBtn.addEventListener('keydown', function (evt) {
			if (!evt) { return; }
			// Enter / Space — fire the same headerclick the controller listens to.
			if (evt.keyCode === 13 || evt.keyCode === 32) {
				evt.preventDefault();
				evt.stopPropagation();
				addBtn.click();
				return;
			}
			if (evt.keyCode !== 9) { return; }   // 9 = Tab
			if (evt.shiftKey) {
				// Back to last header element (popOut button).
				var popOut = Ext.ComponentQuery.query('[reference=popOut]')[0];
				if (popOut && popOut.el) {
					evt.preventDefault();
					evt.stopPropagation();
					popOut.focus();
				}
				return;
			}
			// Forward — try targets in order; only preventDefault when one
			// of them actually accepts focus, otherwise let the browser's
			// native Tab proceed. This avoids the "trap" the user reported:
			// when the grid is empty AND the partner panel can't accept
			// focus, the previous version preventDefault'd unconditionally
			// and Tab did nothing.
			var view = me.getView();
			var store = view && view.getStore();
			var moved = false;

			// (i) locked grid view — if it has rows.
			if (view && store && store.getCount() && view.el && view.el.dom) {
				var viewDom = view.el.dom;
				if (!viewDom.hasAttribute('tabindex')) {
					viewDom.setAttribute('tabindex', '0');
				}
				viewDom.focus();
				moved = (document.activeElement === viewDom);
			}

			// (ii) partner ResourceSchedule — try the panel-level focus first
			// (ExtJS handles tabbable surfaces internally), fall back to
			// raw DOM if the panel doesn't expose .focus().
			if (!moved) {
				var partner = (typeof PartnerPanel !== 'undefined' && PartnerPanel) ||
					Ext.ComponentQuery.query('[xtype=resourceschedule]')[0];
				if (partner && partner.isVisible && partner.isVisible(true)) {
					if (typeof partner.focus === 'function') {
						partner.focus();
						moved = true;
					} else if (partner.getView && partner.getView().el && partner.getView().el.dom) {
						var partnerDom = partner.getView().el.dom;
						if (!partnerDom.hasAttribute('tabindex')) {
							partnerDom.setAttribute('tabindex', '0');
						}
						partnerDom.focus();
						moved = (document.activeElement === partnerDom);
					}
				}
			}

			if (moved) {
				evt.preventDefault();
				evt.stopPropagation();
			}
			// else: do NOT preventDefault — let the browser do its native
			// Tab so the user can leave the page area entirely (e.g. into
			// browser chrome / address bar). Prevents the keyboard trap.
		}, true);

		// (c) Shift+Tab from the locked grid view returns to the + icon.
		var view = me.getView();
		if (view && view.el && view.el.dom && !view.el.dom._addBtnShiftTabBound) {
			view.el.dom._addBtnShiftTabBound = true;
			view.el.dom.addEventListener('keydown', function (evt) {
				if (!evt || evt.keyCode !== 9 || !evt.shiftKey) { return; }
				// Only bounce back to + when focus is at/near the top of the grid.
				var active = document.activeElement;
				if (!view.el.dom.contains(active)) { return; }
				var firstRow = view.el.dom.querySelector('.x-grid-row, .x-grid-item');
				if (active !== view.el.dom && active !== firstRow && !firstRow.contains(active)) {
					return;
				}
				evt.preventDefault();
				evt.stopPropagation();
				addBtn.focus();
			}, true);
		}
	},
	columns: [{
			xtype: 'treecolumn',
			flex: 1,
			resizable: false,
			cls: 'nameColumnCls',
			sortable: false,
			/**@Modified <24-05-18> Pankaj
			 * @Description: Show link icon in UI and on hover show link project name and also remove unnecessary line of code.
			 */
			/**@History
			 *<23-05-18>      <Sheetal Modi>     <If user is inactive , change the color of text to #ddd and show '(inactive)' in postfix of tooltip. otherwise show normally.>
			 */
			renderer: function (v, meta, rec) {
				var iconvalue = '',
				projectName = '';
				if (rec.isSurrogateResource()) {
					//If user is inactive, mark the row with .gnt-resource-inactive (sets #595959 italic
					//via accessibility.css — replaces the previous inline `color: #ddd` which failed
					//WCAG 1.4.3 at 1.4:1 contrast). Also append the localized "(inactive)" suffix
					//to the qtip and add an aria-label so screen readers announce the inactive state.
					meta.tdAttr = 'data-qtip="' + Ext.htmlEncode(rec.getName()) + '"';
					if (!rec.getOriginalResource().get('IsActive')) {
						meta.tdAttr = 'data-qtip="' + Ext.htmlEncode(rec.getName()) + ' (' + Ext.htmlEncode(Locale.LocaleName.A11yInactiveResource) + ')" '
							+ 'aria-label="' + Ext.htmlEncode(rec.getName()) + ', ' + Ext.htmlEncode(Locale.LocaleName.A11yInactiveResource) + '"';
						meta.tdCls = (meta.tdCls || '') + ' gnt-resource-inactive';
					}
					return Ext.htmlEncode(rec.getName());
				} else {
					if (rec.getOriginalAssignment() && rec.getOriginalAssignment().get('CustomTaskName')) {
						if (rec.getOriginalAssignment().get('isLinked')) {
							//Linked task icon — was role="presentation" which hid its meaning from
							//screen readers. role="img" + aria-label (Locale.A11yLinkedTask templated
							//with the parent project room name) makes it announceable.
							var linkLabel = Ext.String.format(
								Locale.LocaleName.A11yLinkedTask,
								Ext.htmlEncode(rec.getOriginalAssignment().get('parentProjectRoomName') || '')
							);
							iconvalue = '<div role="img" aria-label="' + linkLabel + '" class=" x-tree-icon  x-tree-icon-leaf linkIcon"></div> ';
							projectName = ' ('+ Ext.htmlEncode(Locale.LocaleName.LinkedToProject) + ' '+ Ext.htmlEncode(rec.getOriginalAssignment().get('parentProjectRoomName')) + ')';
						}
						meta.tdAttr = 'data-qtip="' + Ext.htmlEncode(rec.getOriginalAssignment().get('CustomTaskName'))+ '' + Ext.htmlEncode(projectName) + '"';
						return iconvalue + Ext.htmlEncode(rec.getOriginalAssignment().get('CustomTaskName'));
					}
				}
			}

		}
	],
	// Add some extra functionality
	plugins: [
		// Ext.create("LeankorApp.plugin.DependencyEditor"),
		// @cut-if-gantt->

		{
			ptype: 'gantt_printable',
			pluginId: 'printPlugin',
			fakeBackgroundColor: true,
			exportDialogConfig: {
				showColumnPicker: false,
				// title: Locale.LocaleName.PrintSetting,
				cls: Ext.baseCSSPrefix + 'print-field-cls'
			}
		}
	]

});
