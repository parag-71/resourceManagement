/**
 * @class Gnt.plugin.Replicator
 * @extends Ext.grid.selection.Replicator
 *
 * This class provides selection replication feature to gantt panel and should be used instead of Ext.grid.selection.Replicator.
 * In addition to simple columns like {@link Gnt.column.Name}, it will also copy complex values like dependencies and resource
 * assignments. Following columns will be ignored:
 *
 * - {@link Gnt.column.LateEndDate}
 * - {@link Gnt.column.LateStartDate}
 * - {@link Gnt.column.Milestone}
 * - {@link Gnt.column.Sequence}
 * - {@link Gnt.column.Slack}
 * - {@link Gnt.column.WBS}
 *
 */
Ext.define('Gnt.plugin.Replicator', {
    extend  : 'Ext.grid.selection.Replicator',

    uses    : ['Gnt.data.undoredo.Manager'],

    alias   : 'plugin.gantt_selectionreplicator',

    init    : function (gantt) {
        this.gantt = gantt;
        this.callParent(arguments);
    },


    applyValueToColumnIf : function (record, column, colData, context) {
        var me               = this,
            value            = colData.value,
            processedIndexes = context.processedIndexes;

        // if the field is editable and is not processed yet
        if (me.isEditable(column, record) && !processedIndexes[colData.dataIndex]) {

            if (colData.dataIndex === record.startDateField) {
                value = context.fromRecord.getStartDate();
            } else if (colData.dataIndex === record.endDateField) {
                value = context.fromRecord.getEndDate();
            }

            me.copyDataTo(colData, value, column, record, context);
        }
        // if the column is not editable ..proceed to next
        else {
            context.next();
        }
    },


    // Applies replication values to the record
    applyValuesToRecordIf : function (record, context) {
        var processedIndexes   = context.processedIndexes = {},
            propagationSources = context.propagationSources = context.propagationSources || [];

        // skip if the record is not editable
        if (!record.isReadOnly()) {
            record.beginEdit();

            context.currentRecord = record;

            propagationSources.push(record);

            // if we have both start & end dates we use setStartEndDate*() method instead of calling steStartDate*() and setEndDate*()
            if (context.valuesContainStartAndEndDate && record.isEditable(record.startDateField) && record.isEditable(record.endDateField)) {
                record.setStartEndDateAndPinWithoutPropagation(context.fromRecord.getStartDate(), context.fromRecord.getEndDate(), undefined, function (sources) {
                    // remember that we have processed start and end date fields
                    processedIndexes[record.startDateField] = true;
                    processedIndexes[record.endDateField] = true;

                    return context.next(sources);
                });
            }
            else {
                context.next();
            }
        }
    },

    /**
     * This is the method which is called when the {@link Ext.grid.selection.SpreadsheetModel} selection model's extender
     * handle is dragged and released. It is passed contextual information about the selection and the extension area.
     * By default, the selection is extended to encompass the selection area, return false to prevent that.
     * @param {Gnt.panel.Gantt} ownerGrid
     * @param {Ext.grid.selection.Selection} sel
     * @param {Object} extension
     */
    replicateSelection  : function (ownerGrid, sel, extension) {
        var me = this;

        if (extension.columns || sel.isColumns || me.gantt.isReadOnly()) {
            return;
        }

        var selFirstRowIdx = sel.getFirstRowIndex(),
            selLastRowIdx = sel.getLastRowIndex(),
            selectedRowCount = selLastRowIdx - selFirstRowIdx + 1,
            store = sel.view.dataSource,
            startIdx,
            endIdx,
            increment,
            columns = me.columns,
            colCount = columns.length,
            values, lastTwoRecords, i, j;

        // Single row, just duplicate values into extension
        if (selectedRowCount === 1) {
            values = me.getColumnValuesWithMetaData(store.getAt(selFirstRowIdx));
        }

        // Multiple rows, take the numeric values from the closest two rows, calculate an array of differences and propagate it
        else {

            values = new Array(colCount);

            if (extension.rows < 0) {
                lastTwoRecords = [
                    store.getAt(selFirstRowIdx + 1),
                    store.getAt(selFirstRowIdx)
                ];
            } else {
                lastTwoRecords = [
                    store.getAt(selLastRowIdx - 1),
                    store.getAt(selLastRowIdx)
                ];
            }

            lastTwoRecords[0] = me.getColumnValuesWithMetaData(lastTwoRecords[0]);
            lastTwoRecords[1] = me.getColumnValuesWithMetaData(lastTwoRecords[1]);

            // The values array will be the differences between all numeric columns in the selection of the closest two records.
            for (j = 0; j < colCount; j++) {
                values[j] = me.calculateDifference(lastTwoRecords[0][j], lastTwoRecords[1][j]);
            }
        }

        // Loop from end to start of extension area
        if (extension.rows < 0) {
            startIdx  = extension.end.rowIdx;
            endIdx    = extension.start.rowIdx - 1;
            increment = -1;
        } else {
            startIdx  = extension.start.rowIdx;
            endIdx    = extension.end.rowIdx + 1;
            increment = 1;
        }

        // Replicate single selected row
        if (selectedRowCount === 1) {

            var fromRecord       = sel.startCell.record,
                recordsToProcess = [];

            // collect records that should be changed
            for (i = startIdx; i !== endIdx; i += increment) {
                recordsToProcess.push(store.getAt(i));
            }

            // initialize the replication context object
            var context = me.initReplicationContext({
                recordsToProcess : recordsToProcess,
                fromRecord       : fromRecord,
                columns          : columns,
                values           : values
            });

            // Entry point for copying data to the target records
            var changerFn = function(task, continueFn) {
                // remember changer continuation callback
                context.changerContinueFn = continueFn;

                // start records processing
                context.next();

                return context.propagationSources;
            };

            // if we need to propagate changes wrap changerFn with propagateChanges() call
            if (context.needPropagation) {
                fromRecord.propagateChanges(
                    changerFn,
                    function (cancelChanges, affectedTasks) {
                        return me.onPropagationComplete(cancelChanges, affectedTasks, context);
                    },
                    null,
                    true // async
                );
            } else {
                changerFn();
            }
        }
        // Add differences from closest two rows
        else {
            var record, prevValues;

            for (i = startIdx; i !== endIdx; i += increment) {
                record = store.getAt(i);

                if (!record.isReadOnly()) {
                    prevValues = me.getColumnValuesWithMetaData(store.getAt(i - increment));

                    for (j = 0; j < colCount; j++) {
                        me.sumUpDifference(columns[j], record, prevValues[j], values[j]);
                    }
                }
            }
        }
    },

    // Initializes replication context
    initReplicationContext : function (config) {
        var me                           = this,
            fromRecord                   = config.fromRecord,
            valuesContainStartDate       = Ext.Array.findBy(config.columns, function (col) {
                return col.dataIndex === fromRecord.startDateField;
            }),
            valuesContainEndDate         = Ext.Array.findBy(config.columns, function (col) {
                return col.dataIndex === fromRecord.endDateField;
            }),
            // check if we have both start & end date copied
            valuesContainStartAndEndDate = Boolean(valuesContainStartDate && valuesContainEndDate),
            // check if we need propagation based on which fields get changed
            needPropagation              = Boolean(valuesContainStartDate || valuesContainEndDate || Ext.Array.findBy(config.columns, function (col) {
                var dataIndex = col.dataIndex;

                return col.isResourceAssignmentColumn ||
                    dataIndex === fromRecord.calendarIdField ||
                    dataIndex === fromRecord.effortField ||
                    dataIndex === fromRecord.effortUnitField ||
                    dataIndex === fromRecord.constraintTypeField ||
                    dataIndex === fromRecord.constraintDateField ||
                    dataIndex === fromRecord.durationUnitField ||
                    dataIndex === fromRecord.durationField;
            })),
            propagationSources = [],
            // @return
            context            = Ext.apply({
                valuesContainStartAndEndDate : valuesContainStartAndEndDate,
                propagationSources           : propagationSources,
                needPropagation              : needPropagation,
                robo                         : needPropagation && me.initRoboManager(config),

                // Function that proceeds the replication to the next column
                // or next record in case previous processed column is the last one
                next : function (sources) {
                    // if changing is cancelled
                    if (sources === false) {
                        context.finalizeChangerFn(false);
                        return;
                    }

                    var column = context.columns[++context.colIndex];

                    if (!context.currentRecord || !column) {
                        if (context.currentRecord) {
                            context.currentRecord.endEdit();

                            context.currentRecord = null;
                        }

                        // pull new record to process
                        var record = context.recordsToProcess.shift();

                        // reset current column index
                        context.colIndex = -1;

                        // if we have a record - handle it
                        if (record) {
                            me.applyValuesToRecordIf(record, context);
                        }
                        // no records left - call finalizeChangerFn that finishes
                        else {
                            context.finalizeChangerFn(true);
                        }
                    }
                    // apply next column value
                    else {
                        me.applyValueToColumnIf(context.currentRecord, column, context.values[context.colIndex], context);
                    }
                },

                // Finalization function
                // it triggers change continueFn - a function that continues changer code (used in async changer functions)
                finalizeChangerFn : function (sources) {
                    if (context.changerContinueFn) {
                        // sources === false means process should be cancelled
                        // otherwise continue (pass our collected propagation sources)
                        context.changerContinueFn(sources === false ? false : context.propagationSources);
                    }
                }

            }, config);

        return context;
    },

    // Initializes undo/redo manager for propagation
    // in order to revert changes if cancelling is needed
    initRoboManager : function (context) {
        var taskStore = context.fromRecord.getTaskStore();

        // send "pause" command to other bound undo managers
        taskStore.fireEvent('robo-command', taskStore, 'pause', []);

        var robo = context.robo = new Gnt.data.undoredo.Manager({
            stores : [
                taskStore,
                taskStore.getDependencyStore(),
                taskStore.getAssignmentStore(),
                taskStore.getResourceStore()
            ]
        });

        // the undo manager should not listen to own "robo-command" events
        robo.disableIncomingCommands();

        robo.start();

        return robo;
    },

    // Finalize propagation
    onPropagationComplete : function (cancelChanges, affectedTasks, context) {
        var robo      = context.robo;
        var taskStore = context.fromRecord.getTaskStore();

        // undo if need to cancel changes
        cancelChanges && robo.undo();

        var transaction = robo.currentTransaction;

        transaction && robo.endTransaction();

        if (cancelChanges) {
            robo.undo();

            var view = this.gantt.getSchedulingView();

            // force refreshing of nodes that took part in the propagation
            Ext.Array.forEach(context.propagationSources, function (task) {
                view.refreshNode(task);
            });

        } else {
            // If we've got a transaction recorded let's inform other registered undo/redo managers about it
            if (transaction && transaction.hasActions()) {
                taskStore.fireEvent('robo-command', taskStore, 'endTransaction', []);
                taskStore.fireEvent('robo-command', taskStore, 'addTransaction', [transaction]);
            }
        }

        // send "resume" command to other bound undo managers
        taskStore.fireEvent('robo-command', taskStore, 'resume', []);

        // destroy the undo/redo manager made for this operation
        robo.destroy();
    },

    isEditable : function (column, record) {

        if (column.dataIndex && !record.isEditable(column.dataIndex)) {
           return false;
        }
        else {
            return true;
        }
    },

    //called on multiple row selection - ignores unit related fields
    calculateDifference : function (first, second) {

        //we clone the meta of the second row
        var x = first.value, y = second.value, result = Ext.clone(second);

        if (!isNaN(x) && !isNaN(y)) {

            switch (second.dataIndex) {

                case second.record.durationField :
                    //TODO to be implemented if unit first and second is compatible
                    break;

                case second.record.effortField :
                    //TODO to be implemented if unit first and second is compatible
                    break;

                default :
                    result.value = Number(y) - Number(x);

            }

            return result;
        }

    },

    sumUpDifference : function (column, record, prevMeta, meta) {

        var prevValue = prevMeta.value,
            value = meta && meta.value,
            newValue;

        if (this.isEditable(column, record)) {

            if (!isNaN(prevValue) && !Ext.isEmpty(prevValue)) {

                switch (meta.dataIndex) {

                    case record.durationField :
                        //TODO to be implemented if unit prevmeta and meta is compatible
                        break;

                    case record.effortField :
                        //TODO to be implemented if unit prevmeta and meta is compatible
                        break;

                    default :

                        if (prevValue instanceof Date) {
                            newValue = Sch.util.Date.add(prevValue, 'ms', value);
                        } else {
                            newValue = Ext.coerce(Number(prevValue) + value, prevValue);
                        }

                        this.copyDataTo(meta, newValue, column, record);
                }
            }
        }
    },

    copyDataTo : function (meta, value, targetColumn, targetRecord, context) {
        var sourceTask = meta.record,
            callback = context && context.next;

        if (targetColumn.isResourceAssignmentColumn) {
            targetRecord.assignAndUnassignAssignmentsWithoutPropagation(targetRecord.getResources(), value);
            callback && callback();
            return;
        }

        // Special treatment of fields causing propagation
        switch (meta.dataIndex) {
            case sourceTask.startDateField :
                targetRecord.setStartDateAndPinWithoutPropagation(value, undefined, undefined, callback);
                callback = false;
                break;

            case sourceTask.endDateField :
                targetRecord.setEndDateAndPinWithoutPropagation(value, false, undefined, callback);
                callback = false;
                break;

            case sourceTask.durationField :
                targetRecord.setDurationWithoutPropagation(value, sourceTask.getDurationUnit());
                break;

            case sourceTask.effortField :
                targetRecord.setEffortWithoutPropagation(value, sourceTask.getEffortUnit());
                break;

            case sourceTask.calendarIdField :
                targetRecord.setCalendarIdWithoutPropagation(value);
                break;

            case sourceTask.constraintTypeField :
                targetRecord.setConstraintTypeWithoutPropagation(value);
                break;

            case sourceTask.constraintDateField :
                targetRecord.setConstraintDateWithoutPropagation(value);
                break;

            default :

                if (targetColumn.putRawData) {
                    targetColumn.putRawData(Ext.clone(value), targetRecord);
                } else if (targetColumn.dataIndex) {
                    targetRecord.set(meta.dataIndex, value);
                }
        }

        callback && callback();
    },

    getColumnValuesWithMetaData :  function (record) {
        return Ext.Array.map(this.columns, function(column) {

            var obj = {
                dataIndex   : column.dataIndex,
                record      : record
            };

            if (column.getRawData) {
                obj.value = column.getRawData(record);
            } else if (column.dataIndex) {
                obj.value = record.get(column.dataIndex);
            }

            return obj;
        });
    }
});
