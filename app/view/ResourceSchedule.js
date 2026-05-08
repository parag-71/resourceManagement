/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: ResourceSchedule.js
 */
Ext.define("LeankorApp.view.ResourceSchedule", {
	extend: 'Sch.panel.SchedulerGrid',
	xtype: 'resourceschedule',
	flex: 1,
	rowHeight: 30,
	widht: '100%',
	height: '100%',
	//allowOverlap: true,
	itemId: 'rsPanel',
	//multiSelect : true,
	animCollapse: false,
	eventResizeHandles: 'none',
	resizable: true,
	resizeHandles: 'n',
	//body : false,
	//bodyBorder : false,
	//split : true,
	//border : true,
	showTodayLine: true,
	// highlightWeekends: true,
	cls: 'backGroudCls',
	plugins: [
		{
			ptype: 'scheduler_printable',
			pluginId: 'printPlugin',
			fakeBackgroundColor: true,
			exportDialogConfig: {
				showColumnPicker: false,
				title: Locale.LocaleName.PrintSetting,
				cls: Ext.baseCSSPrefix + 'print-field-cls'
			}

		}

	],
	// Use the same layout and appearance as the Gantt chart

	viewConfig: {
		preserveScrollOnRefresh: true
	},
	// Scheduler configs
	enableDragCreation: false,
	barMargin: 2,
	lockedGridConfig: {
		width: 200,
		region: 'west'
	},
	//eventBorderWidth  : 0,
	assignmentStore: null,
	workingTimeStore: null,
	tooltipTpl: new Ext.XTemplate('<tpl><div>{ToolTip}</div></tpl>'),
	columns: [{
			// text: Locale.LocaleName.Name,
			cls: 'nameColumnCls',
			// header: '<span class ="addBtnTop" name = "addButton"></span><span style = "margin-left : 10px">'+Locale.LocaleName.Name+'</span>',
			flex: 1,
			dataIndex: 'Name',
			resizable: false,
			sortable: false,
			menuDisabled: true,
			reference: 'onAddNewResources',
			initialize : function(cmp){
				cmp.setText(Ext.htmlEncode(Locale.LocaleName.Name));
			},
			// editor   : {xtype: 'textfield'}
			//31-08-2017.
			/**
			 *@History
			 *<23-05-18>      <Sheetal Modi>     <If user is inactive , change the color of text to #ddd and show '(inactive)' in postfix of tooltip. otherwise show normally.>
			 */

			renderer: function (v, meta, rec) {
				if (rec.getName()) {
					if (!rec.get('IsActive')) {
						//Was: meta.style = 'color : #dddd' — invalid 4-char hex AND failing
						//WCAG 1.4.3 contrast. Replaced with .gnt-resource-inactive (sets
						//#595959 italic via accessibility.css; 7.0:1 on white).
						meta.tdAttr = 'data-qtip="' + Ext.htmlEncode(rec.getName()) + '  (' + Ext.htmlEncode(Locale.LocaleName.A11yInactiveResource) + ')" '
							+ 'aria-label="' + Ext.htmlEncode(rec.getName()) + ', ' + Ext.htmlEncode(Locale.LocaleName.A11yInactiveResource) + '"';
						meta.tdCls = (meta.tdCls || '') + ' gnt-resource-inactive';
					} else {
						meta.tdAttr = 'data-qtip="' + Ext.htmlEncode(rec.getName()) + '"';
					}
					return Ext.htmlEncode(rec.getName());
				}
			}
		}
	],
	// Helps scheduler out with milestone and split task rendering
	/**@Modified <24-05-18> Pankaj
	 * @Description: Show link icon in UI and on hover show link project name and also remove unnecessary line of code.
	 */
	eventRenderer: function (eventRecord, resourceRecord, tplData, row, col, ds) {
		_LOG && console.log('eventRenderer of RS');
		var tempName = eventRecord.getAssignmentFor(resourceRecord),
		iconvalue = '',
		projectName = '',
		customName;
		if (tempName) {
			customName = tempName.get('CustomTaskName');
			if (tempName.get('isLinked')) {
				// role="img" + aria-label so screen readers announce the linked-task badge
				// (was role="presentation" which silently hid the cue from AT users).
				var linkLabel = Ext.String.format(
					Locale.LocaleName.A11yLinkedTask,
					Ext.htmlEncode(tempName.get('parentProjectRoomName') || '')
				);
				iconvalue = '<div role="img" aria-label="' + linkLabel + '" class=" x-tree-icon  x-tree-icon-leaf linkIcon linkIcon_Resourcesche"></div> ';
				projectName = ' ('+Locale.LocaleName.LinkedToProject+' ' + tempName.get('parentProjectRoomName') + ')';
			}
			var schStartDate,
			newInstResetTimeDueDate,
			newInstResetStartDate,
			newInstResetFSLDueDate,
			newInstResetFSLStartDate,
			schEndDate;
			if (tempName.get('Type') == 'FSL') {
				/** @Date 15-Mar-2019 now we are changing activity  dates are gettting inside  @param [fslSchedDueDateTime, fslSchedStartDateTime ]*/

				// Compare date if fsl belong to startdate or enddate of card
				newInstResetFSLDueDate = eventRecord.get('fslSchedDueDateTime') && Ext.Date.clearTime(new Date(eventRecord.get('fslSchedDueDateTime')), true);
				newInstResetFSLStartDate = eventRecord.get('fslSchedStartDateTime') && Ext.Date.clearTime(new Date(eventRecord.get('fslSchedStartDateTime')), true);
				newInstResetTimeDueDate = Ext.Date.clearTime(eventRecord.get('DueDate'), true);
				newInstResetStartDate = Ext.Date.clearTime(eventRecord.get('StartDate'), true);
				if (eventRecord.get('fslSchedStartDateTime')) {
					// schStartDate = Ext.Date.between(newInstResetFSLStartDate, newInstResetStartDate, newInstResetTimeDueDate);
					schStartDate = Ext.Date.between(newInstResetStartDate, newInstResetFSLStartDate, newInstResetFSLDueDate);
				}
				//maxDueDate: 1549018280000
				//minStartDate: 1543056818000
				if (eventRecord.get('fslSchedDueDateTime')) {
					// schEndDate = Ext.Date.between(newInstResetFSLDueDate, newInstResetStartDate, newInstResetTimeDueDate);
					schEndDate = Ext.Date.between(newInstResetTimeDueDate, newInstResetFSLStartDate, newInstResetFSLDueDate);
				}

				if (schStartDate && schEndDate) {
					// blue border   FFC200
					tplData.style = 'background-color: #000080 ; color : white; border-radius: 1px;';
				} else {
					tplData.style = 'background-color: #000080 ; border: 2px solid #FFC200; color : white; border-radius: 1px;';

				} // 2px solid #FFC201;


			} else if (eventRecord.get('maxDueDate') || eventRecord.get('minStartDate')) {
				// Compare date if fsl belong to startdate or enddate of card
				newInstResetFSLDueDate = eventRecord.get('maxDueDate') && Ext.Date.clearTime(new Date(eventRecord.get('maxDueDate')), true);
				newInstResetFSLStartDate = eventRecord.get('minStartDate') && Ext.Date.clearTime(new Date(eventRecord.get('minStartDate')), true);
				newInstResetTimeDueDate = Ext.Date.clearTime(eventRecord.get('DueDate'), true);
				newInstResetStartDate = Ext.Date.clearTime(eventRecord.get('StartDate'), true);
				if (eventRecord.get('minStartDate')) {
					schStartDate = Ext.Date.between(newInstResetFSLStartDate, newInstResetStartDate, newInstResetTimeDueDate);
				}
				if (eventRecord.get('maxDueDate')) {
					schEndDate = Ext.Date.between(newInstResetFSLDueDate, newInstResetStartDate, newInstResetTimeDueDate);
				}

				if (schStartDate && schEndDate) {
					tplData.style = 'background-color: #3F7CB6 ; color : white; border-radius: 1px;';
				} else {
					tplData.style = 'background-color: #3F7CB6 ; border: 2px solid #FFC200; color : white; border-radius: 1px;';

				} // 2px solid #FFC201;
			} else {
				tplData.style = 'background-color: #3F7CB6 ; color : white; border-radius: 1px;border-color: rgb(71, 151, 231) !important;';
			}
			if (customName) {
				var type = tempName.get('Type');
				if(type == 'FSL'){
					type = 'SFS';
				}
				eventRecord.set('ToolTip', customName + '' + projectName);
				eventRecord.set('Type', type);
				return iconvalue + '' + tempName.get('CustomTaskName');
			}
		}
		//eventRecord.set('ToolTip', eventRecord.getName());
		return Ext.htmlEncode(eventRecord.getName());

	},

	/**
	 * @private
	 * Make every rendered event bar accessible per W3C ARIA Grid pattern:
	 *   - tabindex=-1 on all events (roving tabindex; locked grid is single
	 *     tab stop, events entered via ←/→ from a row).
	 *   - role="gridcell" (preserves grid-cell semantics; event behaves as
	 *     an activatable cell rather than a leaf button).
	 *   - aria-label = task name for SR announcement.
	 *
	 * Bryntum's event template bakes tabindex="-1" into every event div, but
	 * we re-apply on every refresh so newly-rendered events stay correct.
	 *
	 * Mouse-click on a tabindex=-1 element does NOT auto-focus in Chromium,
	 * so we wire a mousedown listener that programmatically focuses the
	 * clicked event. This keeps click and keyboard pathways in sync.
	 *
	 * APG reference: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
	 */
	makeEventsFocusable: function () {
		var me = this;
		var view = (typeof me.getSchedulingView === 'function')
			? me.getSchedulingView()
			: (typeof me.getView === 'function' ? me.getView() : null);
		var dom = view && view.el && view.el.dom;
		if (!dom) { return; }
		var mark = function () {
			var els = dom.querySelectorAll('.sch-event');
			Ext.Array.each(els, function (el) {
				// Roving tabindex: all events sit at -1 by default; the
				// keydown handler below promotes the focused one to 0.
				el.setAttribute('tabindex', '-1');
				el.setAttribute('role', 'gridcell');
				if (!el.hasAttribute('aria-label') && typeof view.resolveEventRecord === 'function') {
					var rec = view.resolveEventRecord(el);
					var name = rec && (
						(rec.get && rec.get('CustomTaskName')) ||
						(rec.getName && rec.getName()) ||
						''
					);
					if (name) { el.setAttribute('aria-label', Ext.htmlEncode(name)); }
				}
			});
		};
		Ext.defer(mark, 200);
		var es = (typeof me.getEventStore === 'function') ? me.getEventStore() : null;
		if (es) {
			es.on('refresh', mark);
			es.on('add', mark);
			es.on('update', mark);
			es.on('datachanged', mark);
		}
		if (typeof me.on === 'function') {
			me.on('viewchange', mark);
			me.on('eventadd', mark);
			me.on('eventupdate', mark);
		}
		// Mouse-click on a tabindex=-1 div does not auto-focus in Chromium.
		// Wire mousedown to keep click and keyboard focus in sync.
		if (!dom._eventClickFocusBound) {
			dom._eventClickFocusBound = true;
			dom.addEventListener('mousedown', function (e) {
				var el = e.target && e.target.closest && e.target.closest('.sch-event');
				if (el) {
					var siblings = dom.querySelectorAll('.sch-event');
					Ext.Array.each(siblings, function (s) {
						s.setAttribute('tabindex', s === el ? '0' : '-1');
					});
					el.focus();
				}
			}, true);
		}
	},

	/**
	 * @private
	 * W3C ARIA Grid pattern keyboard navigation for scheduler events.
	 *
	 *   ← / →               prev / next event on same row
	 *   Home / End          first / last event on same row
	 *   Ctrl+Home / Ctrl+End first / last event in entire scheduler
	 *   Esc                 return focus to the resource row in locked grid
	 *   ← / → from a row    enters that row's first (→) / last (←) event
	 *
	 * Uses roving tabindex: only the currently-focused event has tabindex=0,
	 * all others -1. The locked grid view is the single tab stop into the
	 * panel.
	 *
	 * Listener attaches to `document` in capture phase, gated by
	 * `panelDom.contains(target)`, because the locked grid and scheduling
	 * view are wrapped in separate ExtJS sub-panels with their own keymaps;
	 * doc-level capture is the only reliable entry point.
	 *
	 * APG reference: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
	 */
	wireEventArrowNav: function () {
		var me = this;
		var schedView = (typeof me.getSchedulingView === 'function')
			? me.getSchedulingView() : null;
		var panelDom = me.el && me.el.dom;
		if (!schedView || !panelDom || panelDom._eventArrowNavBound) { return; }
		panelDom._eventArrowNavBound = true;

		var allEvents = function () {
			var dom = schedView.el && schedView.el.dom;
			return dom ? Array.prototype.slice.call(dom.querySelectorAll('.sch-event')) : [];
		};

		var sameRowEvents = function (el) {
			var rect = el.getBoundingClientRect();
			var rowMid = rect.top + rect.height / 2;
			var hits = allEvents().filter(function (ev) {
				var r = ev.getBoundingClientRect();
				return r.top <= rowMid && r.bottom >= rowMid;
			});
			hits.sort(function (a, b) {
				return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
			});
			return hits;
		};

		// All events sorted top-to-bottom, then left-to-right (used for
		// Ctrl+Home / Ctrl+End "global first/last cell" navigation).
		var sortedAllEvents = function () {
			return allEvents().sort(function (a, b) {
				var ra = a.getBoundingClientRect();
				var rb = b.getBoundingClientRect();
				if (Math.abs(ra.top - rb.top) > 4) { return ra.top - rb.top; }
				return ra.left - rb.left;
			});
		};

		// Find the focused row's DOM element. This is more reliable than
		// resolving the row's record because the SchedulerGrid's locked
		// grid does not always propagate selection to a model we can read.
		// Returns the row DOM element (or null).
		var focusedRowDom = function () {
			// (1) Walk up from e.target — most direct: the keydown target
			//     is typically the focused row or its grid view.
			//     Caller passes the target via `target` arg.
			// (2) Query DOM for ExtJS classic focused/selected row classes.
			var classes = [
				'.x-grid-item-focused',
				'.x-grid-item-selected',
				'.x-grid-row-focused',
				'.x-grid-row-selected',
				'tr.x-grid-row-focused',
				'tr.x-grid-row-selected'
			];
			for (var i = 0; i < classes.length; i++) {
				var hit = panelDom.querySelector(classes[i]);
				if (hit) { return hit; }
			}
			return null;
		};

		// All events whose vertical mid-line falls within rowEl's Y range.
		// Pure DOM geometry — bypasses Bryntum record lookups entirely.
		var eventsInRowDom = function (rowEl) {
			if (!rowEl) { return []; }
			var rect = rowEl.getBoundingClientRect();
			var rowTop = rect.top, rowBottom = rect.bottom;
			var hits = allEvents().filter(function (ev) {
				var r = ev.getBoundingClientRect();
				var mid = r.top + r.height / 2;
				return mid >= rowTop && mid <= rowBottom;
			});
			hits.sort(function (a, b) {
				return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
			});
			return hits;
		};

		// Find the currently-focused resource record via 3 fallback paths.
		// Used by `eventsForResource` (record-driven path) — kept for the
		// case where DOM-based row resolution succeeds but we want the
		// record for SR announcement.
		var focusedResource = function () {
			var sm = me.getSelectionModel && me.getSelectionModel();
			var rec = sm && sm.getSelection && sm.getSelection()[0];
			if (rec) { return rec; }

			var lockedView = me.lockedGrid && me.lockedGrid.getView && me.lockedGrid.getView();
			if (lockedView) {
				try {
					var nav = lockedView.getNavigationModel && lockedView.getNavigationModel();
					if (nav && nav.getRecord) {
						rec = nav.getRecord();
						if (rec) { return rec; }
					}
					if (typeof lockedView.getFocused === 'function') {
						rec = lockedView.getFocused();
						if (rec) { return rec; }
					}
				} catch (ignore) {}
			}
			var v = lockedView || (me.getView && me.getView());
			if (v && typeof v.getRecord === 'function') {
				var rowEl = focusedRowDom();
				if (rowEl) {
					try { return v.getRecord(rowEl); } catch (ignore) {}
				}
			}
			return null;
		};

		var eventsForResource = function (resource) {
			if (!resource) { return []; }
			var resId = resource.getId ? resource.getId() : resource.id;
			var hits = allEvents().filter(function (el) {
				var rec = (typeof schedView.resolveEventRecord === 'function')
					? schedView.resolveEventRecord(el) : null;
				if (!rec) { return false; }
				var resOfEvent = rec.getResource && rec.getResource();
				return resOfEvent && resOfEvent.getId() === resId;
			});
			hits.sort(function (a, b) {
				return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
			});
			return hits;
		};

		var announceEvent = function (el) {
			if (!el || typeof schedView.resolveEventRecord !== 'function') { return; }
			var rec = schedView.resolveEventRecord(el);
			if (!rec) { return; }
			var name = (rec.get && rec.get('CustomTaskName')) ||
				(rec.getName && rec.getName()) || '';
			if (name && LeankorApp.util && LeankorApp.util.AccessibilityUtil) {
				LeankorApp.util.AccessibilityUtil.announce(Ext.htmlEncode(name));
			}
		};

		// Roving-tabindex move: target=0, all others=-1; focus + announce.
		var rovingFocus = function (target) {
			if (!target) { return; }
			Ext.Array.each(allEvents(), function (el) {
				el.setAttribute('tabindex', el === target ? '0' : '-1');
			});
			target.focus();
			announceEvent(target);
		};

		// Restore focus to a resource row in the locked grid.
		var focusRow = function (resource) {
			if (!resource) { return; }
			var sm = me.getSelectionModel && me.getSelectionModel();
			if (sm) { try { sm.select(resource); } catch (ignore) {} }
			var lockedView = me.lockedGrid && me.lockedGrid.getView && me.lockedGrid.getView();
			var v = lockedView || (me.getView && me.getView());
			if (v && typeof v.focusRow === 'function') {
				try { v.focusRow(resource); } catch (ignore) {}
			}
		};

		document.addEventListener('keydown', function (e) {
			var k = e.keyCode;
			var target = e.target;
			if (!target || !panelDom.contains(target)) { return; }
			var active = document.activeElement || target;
			if (!active || !active.closest) { return; }
			var currentEvent = active.closest('.sch-event');

			// ── Focus is on an EVENT ────────────────────────────────────
			if (currentEvent) {
				// Esc → return to resource row
				if (k === 27) {
					var rec = (typeof schedView.resolveEventRecord === 'function')
						? schedView.resolveEventRecord(currentEvent) : null;
					var res = rec && rec.getResource && rec.getResource();
					if (res) {
						e.preventDefault();
						e.stopPropagation();
						currentEvent.setAttribute('tabindex', '-1');
						focusRow(res);
					}
					return;
				}
				// Ctrl+Home / Ctrl+End → first / last event in scheduler
				if (e.ctrlKey && (k === 36 || k === 35)) {
					var allSorted = sortedAllEvents();
					if (!allSorted.length) { return; }
					e.preventDefault();
					e.stopPropagation();
					rovingFocus(k === 36 ? allSorted[0] : allSorted[allSorted.length - 1]);
					return;
				}
				// Home / End → first / last event on same row
				if (k === 36 || k === 35) {
					var rowEv = sameRowEvents(currentEvent);
					if (!rowEv.length) { return; }
					e.preventDefault();
					e.stopPropagation();
					rovingFocus(k === 36 ? rowEv[0] : rowEv[rowEv.length - 1]);
					return;
				}
				// ← / → → previous / next event on same row
				if (k === 37 || k === 39) {
					var dir = k === 39 ? 1 : -1;
					var siblings = sameRowEvents(currentEvent);
					var idx = siblings.indexOf(currentEvent);
					var nextEv = siblings[idx + dir];
					if (nextEv) {
						e.preventDefault();
						e.stopPropagation();
						rovingFocus(nextEv);
					}
					return;
				}
				return;
			}

			// ── Focus is on a ROW (locked grid) ──────────────────────────
			if (k !== 37 && k !== 39) { return; }

			// Layered fallback to find which row's events to enter:
			//   (a) DOM walk from keydown target to nearest grid row.
			//   (b) Query the panel for ExtJS focus/selection classes.
			//   (c) Resource record via selection or navigation model.
			//   (d) Last resort — any visible event, so the user is at
			//       least moved into the scheduler.
			var rowEvents = [];

			var rowEl = target.closest && target.closest('.x-grid-item, tr.x-grid-row');
			if (!rowEl) { rowEl = focusedRowDom(); }
			if (rowEl) { rowEvents = eventsInRowDom(rowEl); }

			if (!rowEvents.length) {
				var resource = focusedResource();
				if (resource) { rowEvents = eventsForResource(resource); }
			}

			if (!rowEvents.length) { rowEvents = sortedAllEvents(); }
			if (!rowEvents.length) { return; }

			e.preventDefault();
			e.stopPropagation();
			rovingFocus(k === 39 ? rowEvents[0] : rowEvents[rowEvents.length - 1]);
		}, true);
	},

	/**
	 * @private
	 * Keyboard equivalent of right-click on a scheduler event. Listens for
	 * Shift+F10, ContextMenu key, or Enter while focus is on (or inside)
	 * an event bar; resolves the event record from the DOM and fires the
	 * existing `eventcontextmenu` listener with a synthetic event so the
	 * Discuss / Open Board menu opens at the event's position.
	 * WCAG 2.1.1 Keyboard.
	 */
	wireEventContextMenuKey: function () {
		var me = this;
		var view = (typeof me.getSchedulingView === 'function')
			? me.getSchedulingView()
			: (typeof me.getView === 'function' ? me.getView() : null);
		var panelDom = me.el && me.el.dom;
		if (!view || !panelDom || panelDom._eventContextMenuKeyBound) { return; }
		panelDom._eventContextMenuKeyBound = true;

		// Bind to document (capture) and gate to this panel — the context
		// menu must fire whether the focused event is in the locked or normal
		// sub-panel; doc-level capture is the only reliable hook.
		document.addEventListener('keydown', function (e) {
			var isShiftF10   = (e.keyCode === 121 && e.shiftKey);
			var isContextKey = (e.keyCode === 93);
			var isEnter      = (e.keyCode === 13);
			if (!isShiftF10 && !isContextKey && !isEnter) { return; }

			var target = e.target;
			if (!target || !panelDom.contains(target)) { return; }

			var active = document.activeElement || target;
			if (!active || !active.closest) { return; }
			var eventEl = active.closest('.sch-event');
			if (!eventEl) { return; }

			var eventRecord = (typeof view.resolveEventRecord === 'function')
				? view.resolveEventRecord(eventEl) : null;
			if (!eventRecord) { return; }

			e.preventDefault();
			e.stopPropagation();

			// Synthetic Ext-event-shape so the existing eventcontextmenu
			// listener (which calls e.stopEvent() and e.getXY()) works.
			var rect = eventEl.getBoundingClientRect();
			var xy = [rect.left + Math.min(rect.width / 2, 80), rect.bottom];
			var fakeEvent = {
				stopEvent       : function () {},
				preventDefault  : function () {},
				stopPropagation : function () {},
				getXY           : function () { return xy; }
			};
			me.fireEvent('eventcontextmenu', me, eventRecord, fakeEvent);
		}, true);
	},

	listeners: {
		eventcontextmenu: function (scheduler, eventRecord, e, eOpts) {
			_LOG && console.log('eventcontextmenu of RS');
			e.stopEvent(); // Stop browsers
			// SR announcement — keyboard / SR users hear the menu open.
			LeankorApp.util.AccessibilityUtil.announce(Locale.LocaleName.A11yContextMenuOpened);
			var SchMenu = Ext.create('Ext.menu.Menu', {
					width: 60,
					floating: true, // usually you want this set to True (default)
					plain: true,
					items: [{
							text: Ext.htmlEncode(Locale.LocaleName.Discuss),
							handler: function () {
								_LOG && console.log('discussOnChatter');
								var url = (portfolio.BaseURL) + portfolio.KanbanCardChatterFeedURL.replace("/", "");
								var myURL = url + '?Id=' + Ext.htmlEncode(eventRecord.data.ForceID);

								var oDialog = new Ext.Window({
										title: Ext.htmlEncode(eventRecord.data.Name),
										width: '70%',
										height: '70%',
										closable: true,
										closeToolText : Locale.LocaleName.CloseDialog,
										resizable: true,
										draggable: true,
										modal: true,
										border: true,
										top: 10,
										// WCAG 2.1.1 / 2.1.2 — Keyboard / No keyboard trap.
										// ExtJS Windows usually close on ESC, but the iframe
										// inside this dialog captures focus and swallows the
										// keypress. listeners.afterrender wires bindEscapeToClose
										// + initCloseToolAccessibility for a reliable exit.
										listeners: {
											afterrender: function (win) {
												if (LeankorApp.util && LeankorApp.util.AccessibilityUtil) {
													LeankorApp.util.AccessibilityUtil.setAriaModal(win);
													LeankorApp.util.AccessibilityUtil.bindEscapeToClose(win);
													LeankorApp.util.AccessibilityUtil.initCloseToolAccessibility(win, true);
												}
											}
										},
										tools: [{
												xtype: 'button',
												iconCls: 'chatterButtonCls',
												cls: 'toolbar-custom-btn',
												tooltip: null,
												listeners: {
													click: function (me, e, eOpts) {
														var isLightningUrl = Ext.urlDecode(decodeURIComponent(window.location.search.substring(1)));
														if (isLightningUrl.isLightning) {
															myURL = myURL + '&isLightning=true';
															window.open(LeankorApp.Gantt.sanitizeValue(myURL));
															myURL = url + '?Id=' + Ext.htmlEncode(eventRecord.data.ForceID);
														} else {
															window.open(LeankorApp.Gantt.sanitizeValue(myURL));
														}
													}
												}
											}
										],
										itemId: 'myChaterWindow',
										html: ['<iframe height="100%" width=100% src="' + myURL + '"></iframe>']
									});
								oDialog.show();
							}
						}, {

							text: Ext.htmlEncode(Locale.LocaleName.OpenBoard),
							handler: function () {
								_LOG && console.log('right click Open Board option of RS');
								var myBoardType = eventRecord.data.BoardType,
								vsStore,
								fId,
								vsRecord,
								kanbanUrl = (portfolio.BaseURL);
								switch (myBoardType) {
								case "Kanban Board":
								case "Plan Board":
									kanbanUrl += (portfolio.KanbanBoardURL).replace('/', '') + '?Id=';
									break;
								case "Whiteboard":
								case "DashBoard":
									kanbanUrl += (portfolio.VisualKanbanURL).replace('/', '') + '?Id=';
									break;
								case "Portfolio View":
									kanbanUrl += (portfolio.PortfolioViewURL).replace('/', '') + '?Id=';
									break;
								case "UberBoard":
									vsStore = Ext.getStore('vsStore');
									vsRecord = vsStore.findRecord('Id', eventRecord.data.ValueStreamID);
									if (vsRecord) {
										fId = vsRecord.data.leankor__ProjectRoom__c;
									}
									kanbanUrl += (portfolio.pageGanttView).replace('/', '') + '?fid=' + Ext.htmlEncode(fId) + '&btype=projectgantt&Id=';
									break;
								default:
									kanbanUrl += (portfolio.VisualKanbanURL).replace('/', '') + '?Id=';
									break;
								}
								var myURL = kanbanUrl + Ext.htmlEncode(eventRecord.data.ValueStreamID) + '&cardid=' + Ext.htmlEncode(eventRecord.data.ForceID);
								// WCAG 3.2.5 Change on Request — confirmation
								// before context switch to a new tab.
								LeankorApp.Gantt.confirmMsgBox(Locale.LocaleName.OpenInNewTabConfirmation, function (btn) {
									if (btn === 'yes') { window.open(LeankorApp.Gantt.sanitizeValue(myURL)); }
								});
							}

						}
					]

				});

			SchMenu.showAt(e.getXY());
		},
		eventdragstart: function (view, dragContext, eOpts) {
			Ext.getStore('assignmentStore').commitChanges();
		},
		afterRender: function () {
			var me = this;
			me.getColumns()[0].setText('<span class ="addBtnTop" name = "addButton" ></span><span style = "margin-left : 10px">'+Ext.htmlEncode(Locale.LocaleName.Name)+'</span>');
			if (btype == 'ru') {
				this.getColumns()[0].setText('');
				this.getColumns()[0].initialConfig.header = '';
				this.getColumns()[0].initialConfig.text = '';
			}
			// WCAG 4.1.2 — grid structural ARIA + aria-label on panel.
			LeankorApp.util.AccessibilityUtil.wireGridAriaIndices(me);
			LeankorApp.util.AccessibilityUtil.setAriaLabel(me, Locale.LocaleName.ResourceSchedule);
			// WCAG 2.1.1 — keyboard nav across resource rows (↑/↓ + Home/End)
			// with screen-reader announcements per row.
			LeankorApp.util.AccessibilityUtil.initGridKeyboardNavigation(me, {
				announceRowFn: function (record, idx, total) {
					var name = (record.getName && record.getName()) || (record.get && record.get('Name')) || '';
					return Ext.String.format(
						Locale.LocaleName.A11yRowAnnouncement || '{0}, row {1} of {2}',
						Ext.htmlEncode(name), idx + 1, total
					);
				}
			});
			// Make event bars keyboard-focusable (tabindex=0 + role=button +
			// aria-label) so users can Tab into them and arrow-walk events.
			me.makeEventsFocusable();
			// ← / → on a focused event walks to prev / next event on the same row.
			me.wireEventArrowNav();
			// Shift+F10 / ContextMenu key on a focused event opens the
			// right-click context menu (Discuss / Open Board) — keyboard
			// equivalent of right-click. WCAG 2.1.1.
			me.wireEventContextMenuKey();
			// W3C Window Splitter pattern: keyboard-resize the divider
			// between locked grid and scheduling view.
			LeankorApp.util.AccessibilityUtil.wireSplitterKeyboard(me);
		},
		/**@author Bhupendra
		 * @Description: Don't allow to move FSL (Field Service Lightning) cards.
		 * @event {beforeeventdrag} firing by Sch.panel.SchedulerGrid.
		 * @param The scheduler view {Sch.view.SchedulerGridView}											scheduler
		 * @param The record corresponding to the node that's about to be dragged {Sch.model.Event}			record
		 * @param The event object {Ext.event.Event}															e
		 */
		beforeeventdrag: function (scheduler, record, e) {
			if (record.get('Type') === 'FSL' || !record.getEvent().get('hasEditAccess')) {
				// SR announcement — explains why the drag isn't starting.
				LeankorApp.util.AccessibilityUtil.announceError(
					record.get('Type') === 'FSL'
						? Locale.LocaleName.A11yFslCannotMove
						: Locale.LocaleName.MoveActivityToInactiveUserError
				);
				return false;
			}
		},

		/**
		 *@method aftereventdrop
		 *@param gantt gantt view
		 *@param eOpts option list
		 *@Description method is used to save changes RA in db by calling method - CreateAndDeleteResourceAssignment and then delete newly created RA record and insert data came from db to avoid Id conflict
		 *@History
		 *<22-05-18>      <Sheetal Modi>     <Preventing an inactive user to be assigned and showing popup message if trying to do so.>
		 */
		beforeeventdropfinalize: function (dragZone, dragContext, e, eOpts) {
			LeankorApp.Gantt.getView().setLoading(Ext.htmlEncode(Locale.LocaleName.PleaseWait)+'....');
			var deleteIdList = [],
			deleteList = [],
			tempArry = [],
			mainObj = {},
			i = 0,
			store = Ext.getStore('assignmentStore');

			//change code when support multiselect
			dragContext.endDate = dragContext.origEnd;
			dragContext.startDate = dragContext.origStart;
			//eof code
			for (i; i < dragContext.draggedRecords.length; i++) {
				if (dragContext.newResource.data.Id != dragContext.resourceRecord.data.Id) {
					var temp = dragContext.draggedRecords[i].data;

					var flag = true; // flag to check if card is dropped in new resoirce or not. If true , its for different user.
					store.each(function (record) {
						if (record.data.TaskId == temp.TaskId && record.data.ResourceId == dragContext.newResource.data.Id) { //Prevent allocation of same card to already assigned resource
							flag = false;
						}
					});

					if (flag) {

						//27-05-18
						//If new resource is iactive , prevent it to be assigned and show a popup message
						if (!dragContext.newResource.get('IsActive')) {
							GanttPanel.setLoading(false);
							dragContext.draggedRecords[i].reject();
							// showing Message Can not assign Inactive user.
							LeankorApp.util.AccessibilityUtil.announceError(Locale.LocaleName.AssignInactiveUserError);
							LeankorApp.Gantt.alertMsgBox(Locale.LocaleName.AssignInactiveUserError);
							dragContext.finalize(false);
							return false;
						}
						//eOf code  , following with else
						else {
							var deleteObj = {},
							cardRecord = LeankorApp.Gantt.gantt.taskStore.findRecord('Id', temp.TaskId);
							if (dragContext.draggedRecords[i].get('Type') == 'FSL') {
								continue;
							}
							deleteIdList.push(dragContext.draggedRecords[i].data.Id);
							deleteObj.ResourceId = dragContext.newResource.data.Id;
							deleteObj.TaskId = temp.TaskId;
							deleteObj.Units = temp.Units;
							deleteObj.PercentDone = cardRecord && cardRecord.data.PercentDone;
							deleteList.push(deleteObj);
							if (dragContext.timeDiff > 86400000 || dragContext.timeDiff < -86400000) {

								// showing Message can not move activity on different date for same user.
								LeankorApp.util.AccessibilityUtil.announceError(Locale.LocaleName.MoveActivityToInactiveUserError);
							LeankorApp.Gantt.alertMsgBox(Locale.LocaleName.MoveActivityToInactiveUserError);
							}
						}

					} else {
						dragContext.draggedRecords[i].reject();
						// showing Message resource is already assigned.
						LeankorApp.util.AccessibilityUtil.announceError(Locale.LocaleName.AlreadyAssignedToCardMsg);
						LeankorApp.Gantt.alertMsgBox(Locale.LocaleName.AlreadyAssignedToCardMsg);
					}
				} else {
					// showing Message can not move activity on different date for same user.
					if (dragContext.timeDiff > 86400000 || dragContext.timeDiff < -86400000) {

						LeankorApp.Gantt.alertMsgBox(Locale.LocaleName.MoveActivityToInactiveUserError);
					}
				} //eof code
			}
			if (deleteIdList.length) {
				mainObj.deleteId = deleteIdList;
				mainObj.newData = deleteList;

				glueforce.CreateAndDeleteResourceAssignment(mainObj, function (result) {
					store.each(function (record) {
						if (record.data.Id.startsWith('LeankorApp')) {
							tempArry.push(record);
						}
					});
					store.remove(tempArry);
					store.add(result);
					store.sync();
					LeankorApp.Gantt.getView().setLoading(false);
				});
			} else {
				LeankorApp.Gantt.getView().setLoading(false);
			}

		},
		/**
		 *@add  <01-06-18> Pankaj
		 *@method aftereventdrop
		 *@Description method is used to sorting assignmentPanel when drag and drop any task
		 */
		aftereventdrop: function (scheduler, eventRecords) {
			var assignmentPanel = Ext.ComponentQuery.query('[xtype=assignmentgridpanel]')[0];
			Ext.defer(function () {
				assignmentPanel && assignmentPanel.getStore().sort('Name', 'ASC');
			}, 500);
			// Announce the move to screen readers (WCAG 4.1.3 Status Messages).
			// Drag-drop is a silent visual change otherwise; SR users need confirmation.
			var rec = eventRecords && eventRecords[0];
			if (rec && rec.getStartDate) {
				var dateStr = Ext.Date.format(rec.getStartDate(), 'D M j, Y g:i A');
				LeankorApp.util.AccessibilityUtil.announce(
					Ext.String.format(Locale.LocaleName.A11yEventMoved, dateStr)
				);
			}
		}
	}
});
