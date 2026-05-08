// This override is required to fix "Should not loose scroll position on node collapse" in 115_collapse_expand.t
// and "View should keep scroll position after deleting task" in 091_task_context_menu.t
// In fact this override replaces old override NavigationModel_6_2_0, because Sencha cleaned up the code
// and stopped passing "preventNavigation" parameter into "focusPosition" function
Ext.define('Gnt.patches.NavigationModel_7_2_0', {
    extend: 'Sch.util.Patch',

    target: 'Ext.grid.NavigationModel',

    minVersion: '7.2.0',

    // We don't need to call "focusPosition" if "preventNavigation" is true
    // The original function is super long, so search for OVERRIDE region to find the override
    overrides: {
        setPosition: function(recordIndex, columnIndex, keyEvent, suppressEvent, preventNavigation) {
            var me = this,
                clearing = recordIndex == null && columnIndex == null,
                isClear = me.record == null && me.recordIndex == null && me.item == null,
                view, scroller, selModel, dataSource, columnManager,
                newRecordIndex, newColumnIndex, newRecord,
                newColumn, columns;

            // Work out the view we are operating on.
            // If they passed a CellContext, use the view from that.
            // Otherwise, use the view injected into the event by Ext.view.View#processEvent.
            // Otherwise, use the last focused view.
            // Failing that, use the view we were bound to.
            if (recordIndex && recordIndex.isCellContext) {
                view = recordIndex.view;
            }
            else if (keyEvent && keyEvent.view) {
                view = keyEvent.view;
            }
            else if (me.lastFocused) {
                view = me.lastFocused.view;
            }
            else {
                view = me.view;
            }

            // In case any async focus was requested before this call.
            view.cancelFocusTask();

            // Return if the view was destroyed between the deferSetPosition call and now,
            // or if the call is a no-op or if there are no items which could be focused.
            if (view.destroyed || !view.refreshCounter || !view.ownerCt || clearing && isClear ||
                !view.all.getCount()) {
                return;
            }

            selModel = view.getSelectionModel();
            dataSource = view.dataSource;
            columnManager = view.getVisibleColumnManager();
            columns = columnManager.getColumns();

            // If a CellContext is passed, use it.
            // Passing null happens on blur to remove focus class.
            if (recordIndex && recordIndex.isCellContext) {
                newRecord = recordIndex.record;
                newRecordIndex = recordIndex.rowIdx;
                newColumnIndex = Math.min(recordIndex.colIdx, columns.length - 1);
                newColumn = columns[newColumnIndex];

                // If the record being focused is not available (eg, after a removal),
                // then go to the same position
                if (dataSource.indexOf(newRecord) === -1) {
                    scroller = view.getScrollable();

                    // Change recordIndex so that the "No movement" test is bypassed
                    // if the record is not found
                    me.recordIndex = -1;

                    // If the view will not jump upwards to bring the next row under the mouse
                    // as expected because it's at the end, focus the previous row
                    // eslint-disable-next-line max-len
                    if (scroller && (scroller.getPosition().y >= scroller.getMaxPosition().y - view.all.last(true).offsetHeight)) {
                        recordIndex.rowIdx--;
                    }

                    newRecordIndex = Math.min(recordIndex.rowIdx, dataSource.getCount() - 1);
                    newRecord = dataSource.getAt(newRecordIndex);
                }
            }
            else {
                // Both axes are null, we defocus
                if (clearing) {
                    newRecord = newRecordIndex = null;
                }
                else {
                    // AbstractView's default behaviour on focus is to call setPosition(0);
                    // A call like this should default to the last column focused, or column 0;
                    if (columnIndex == null) {
                        columnIndex = me.lastFocused ? me.lastFocused.column : 0;
                    }

                    if (typeof recordIndex === 'number') {
                        newRecordIndex = Math.max(Math.min(recordIndex, dataSource.getCount() - 1), 0);
                        newRecord = dataSource.getAt(recordIndex);
                    }
                    // row is a Record
                    else if (recordIndex.isEntity) {
                        newRecord = recordIndex;
                        newRecordIndex = dataSource.indexOf(newRecord);
                    }
                    // row is a grid row
                    else if (recordIndex.tagName) {
                        newRecord = view.getRecord(recordIndex);
                        newRecordIndex = dataSource.indexOf(newRecord);

                        if (newRecordIndex === -1) {
                            newRecord = null;
                        }
                    }
                    else {
                        if (isClear) {
                            return;
                        }

                        clearing = true;
                        newRecord = newRecordIndex = null;
                    }
                }

                // Record position was successful
                if (newRecord) {
                    // If the record being focused is not available (eg, after a sort), then go to 0,0
                    if (newRecordIndex === -1) {
                        // Change recordIndex so that the "No movement" test is bypassed
                        // if the record is not found
                        me.recordIndex = -1;
                        newRecord = dataSource.getAt(0);
                        newRecordIndex = 0;
                        columnIndex = null;
                    }

                    // No columnIndex passed, and no previous column position - default to column 0
                    if (columnIndex == null) {
                        if (!(newColumn = me.column)) {
                            newColumnIndex = 0;
                            newColumn = columns[0];
                        }
                    }
                    else if (typeof columnIndex === 'number') {
                        newColumn = columns[columnIndex];
                        newColumnIndex = columnIndex;
                    }
                    else {
                        newColumn = columnIndex;
                        newColumnIndex = columnManager.indexOf(columnIndex);
                    }
                }
                else {
                    clearing = true;
                    newColumn = newColumnIndex = null;
                }
            }

            // The column requested may have been hidden or removed (eg reconfigure)
            // Fall back to column index.
            if (newColumn && columnManager.indexOf(newColumn) === -1) {
                if (newColumnIndex === -1) {
                    newColumnIndex = 0;
                }
                else {
                    newColumnIndex = Math.min(newColumnIndex, columns.length - 1);
                }

                newColumn = columns[newColumnIndex];
            }

            // If we are in actionable mode and focusing a cell, exit actionable mode
            // at the requested position
            if (view.actionableMode && !clearing) {
                return view.ownerGrid.setActionableMode(
                    false, new Ext.grid.CellContext(view).setPosition(newRecord, newColumn)
                );
            }

            // No movement; just ensure the correct item is focused and return early.
            // Do not push current position into previous position, do not fire events.
            if (newRecordIndex === me.recordIndex && newColumnIndex === me.columnIndex &&
                view === me.position.view) {
                return me.focusPosition(me.position);
            }

            if (me.cell) {
                me.cell.removeCls(me.focusCls);
            }

            // Track the last position.
            // Used by SelectionModels as the navigation "from" position.
            me.previousRecordIndex = me.recordIndex;
            me.previousRecord = me.record;
            me.previousItem = me.item;
            me.previousCell = me.cell;
            me.previousColumn = me.column;
            me.previousColumnIndex = me.columnIndex;
            me.previousPosition = me.position.clone();

            // Track the last selectionStart position to correctly track ranges
            // (i.e., SHIFT + selection).
            me.selectionStart = selModel.selectionStart;

            // Set our CellContext to the new position
            me.position.setAll(
                view,
                me.recordIndex = newRecordIndex,
                me.columnIndex = newColumnIndex,
                me.record = newRecord,
                me.column = newColumn
            );

            if (clearing) {
                me.item = me.cell = null;
            }
            else {
                // region OVERRIDE
                // Call "focusPosition" if view is not a gantt view or if view is a gantt view and navigation is not prevented
                if (!(this.view instanceof Gnt.view.Gantt) || !preventNavigation) {
                    me.focusPosition(me.position);
                }
                // endregion
            }

            // Legacy API is that the SelectionModel fires focuschange events
            // and the TableView fires rowfocus and cellfocus events.
            if (!suppressEvent) {
                selModel.fireEvent('focuschange', selModel, me.previousRecord, me.record);
                view.fireEvent('rowfocus', me.record, me.item, me.recordIndex);
                view.fireEvent('cellfocus', me.record, me.cell, me.position);
            }

            // If we have moved, fire an event
            if (keyEvent && !preventNavigation && me.cell !== me.previousCell) {
                me.fireNavigateEvent(keyEvent);
            }
        }
    }
});
