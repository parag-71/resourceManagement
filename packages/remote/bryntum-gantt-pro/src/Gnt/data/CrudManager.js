/**
 * @class Gnt.data.CrudManager
 * @aside guide gantt_crud_manager
 * @aside guide crud_manager
 *
 * A class implementing a central collection of all data stores related to the Gantt chart.
 * It allows you to load all stores in a single server request and persist all of their changes in one request as well. This
 *  helps you use a transactional 'all-or-nothing' approach to saving your data.
 * This class uses AJAX as a transport mechanism and JSON as the encoding format.
 *
 * # Gantt stores
 *
 * The class supports all the Gantt specific stores: resources, assignments, dependencies, calendars and tasks.
 * For these stores, the class has separate configs ({@link #resourceStore}, {@link #assignmentStore}, {@link #dependencyStore}, {@link #taskStore})
 * to register them. The class can also grab them from the task store (this behavior can be changed using {@link #addRelatedStores} config).
 *
 * ```javascript
 *     var taskStore = Ext.create('Gnt.data.TaskStore', {
 *         calendarManager : calendarManager,
 *         resourceStore   : resourceStore,
 *         dependencyStore : dependencyStore,
 *         assignmentStore : assignmentStore
 *     });
 *
 *     var crudManager = Ext.create('Gnt.data.CrudManager', {
 *         autoLoad        : true,
 *         // We specify TaskStore only. The rest stores will be taken from it.
 *         taskStore       : taskStore,
 *         transport       : {
 *             load    : {
 *                 url     : 'php/read.php'
 *             },
 *             sync    : {
 *                 url     : 'php/save.php'
 *             }
 *         }
 *     });
 * ```
 *
 * # Calendars
 *
 * The CrudManager class supports bulk loading of project calendars.
 * To do this, the {@link #calendarManager} config has to be specified or it can be specified on a {@link Gnt.data.TaskStore#calendarManager task store}
 * (while having {@link #addRelatedStores} is enabled).
 *
 * ```javascript
 *     var calendarManager   = Ext.create('Gnt.data.CalendarManager', {
 *         calendarClass   : 'Gnt.data.calendar.BusinessTime'
 *     });
 *
 *     ...
 *
 *     var taskStore     = Ext.create('MyTaskStore', {
 *         // taskStore calendar will automatically be set when calendarManager gets loaded
 *         calendarManager : calendarManager,
 *         resourceStore   : resourceStore,
 *         dependencyStore : dependencyStore,
 *         assignmentStore : assignmentStore
 *     });
 *
 *     var crudManager   = Ext.create('Gnt.data.CrudManager', {
 *         autoLoad        : true,
 *         taskStore       : taskStore,
 *         transport       : {
 *             load    : {
 *                 url     : 'php/read.php'
 *             },
 *             sync    : {
 *                 url     : 'php/save.php'
 *             }
 *         }
 *     });
 * ```
 *
 * # AJAX request configuration
 *
 * To configure AJAX request parameters please take a look at the {@link #transport} config.
 *
 * ```javascript
 *     var crudManager = Ext.create('Sch.data.CrudManager', {
 *         autoLoad        : true,
 *         taskStore       : taskStore,
 *         transport       : {
 *             load    : {
 *                 url         : 'php/read.php',
 *                 // use GET request
 *                 method      : 'GET',
 *                 // pass request JSON in "rq" parameter
 *                 paramName   : 'rq',
 *                 // extra HTTP request parameters
 *                 params      : {
 *                     foo     : 'bar'
 *                 }
 *             },
 *             sync    : {
 *                 url     : 'php/save.php'
 *             }
 *         }
 *     });
 * ```
 *
 *
 * # Extra stores
 *
 * Along with the Gantt specific stores any number of additional stores can be specified
 * using {@link #stores} config on a construction step or {@link #addStore} method in the runtime:
 *
 * ```javascript
 *     var crudManager = Ext.create('Gnt.data.CrudManager', {
 *         // extra stores
 *         stores          : [ 'departments', 'messages' ],
 *         taskStore       : taskStore,
 *         transport       : {
 *             load    : {
 *                 url     : 'php/read.php'
 *             },
 *             sync    : {
 *                 url     : 'php/save.php'
 *             }
 *         }
 *     });
 *
 *     // append 'documents' store
 *     crudManager.addStore('documents');
 *
 *     // now when we registered all the stores let's load them
 *     crudManager.load();
 * ```
 *
 * * **Note:** Any extra stores provided in {@link #stores} config will be loaded **before** the gantt specific stores.
 * If for some reason you need to change that loading order you should use {@link #addStore} method:
 *
 * ```javascript
 *     // append store3 to the end so it will be loaded last
 *     crudManager.addStore(store3);
 * ```
 *
 */
Ext.define('Gnt.data.CrudManager', {
    extend              : 'Sch.crud.AbstractManager',

    mixins              : ['Sch.crud.encoder.Json', 'Sch.crud.transport.Ajax'],

    requires            : [
        'Gnt.data.CalendarManager',
        'Gnt.data.TaskStore'
    ],

    /**
     * @cfg {Gnt.data.CalendarManager/Object} calendarManager A calendar manager instance or its descriptor.
     */
    calendarManager     : null,
    /**
     * @cfg {Gnt.data.TaskStore/String/Object} taskStore Tasks store or its descriptor or its identifier.
     */
    taskStore           : null,
    /**
     * @cfg {Gnt.data.DependencyStore/Object} dependencyStore A store with dependencies or its descriptor.
     */
    dependencyStore     : null,
    /**
     * @cfg {Gnt.data.ResourceStore/Object} resourceStore A store with resources or its descriptor.
     */
    resourceStore       : null,
    /**
     * @cfg {Gnt.data.AssignmentStore/Object} assignmentStore A store with assignments or its descriptor.
     */
    assignmentStore     : null,

    /**
     * @cfg {Boolean} addRelatedStores
     * When set to `true` this class will try to get the {@link #calendarManager}, {@link #dependencyStore}, {@link #resourceStore} and {@link #assignmentStore} stores from
     * the specified {@link #taskStore} instance.
     */
    addRelatedStores    : true,

    constructor : function (config) {
        config  = config || {};

        var calendarManager = config.calendarManager || this.calendarManager,
            taskStore       = config.taskStore || this.taskStore || new Gnt.data.TaskStore({ proxy : 'memory' }),
            assignmentStore = config.assignmentStore || this.assignmentStore,
            resourceStore   = config.resourceStore || this.resourceStore,
            dependencyStore = config.dependencyStore || this.dependencyStore,
            // list of stores to add
            stores          = [];

        // retrieve stores registered on the provided taskStore
        if (config.addRelatedStores !== false) {
            var extracted   = this.getTaskStoreInfo(taskStore, config);

            calendarManager = calendarManager || extracted.calendarManager;
            assignmentStore = assignmentStore || extracted.assignmentStore;
            resourceStore   = resourceStore || extracted.resourceStore;
            dependencyStore = dependencyStore || extracted.dependencyStore;
        }

        // If calendar manager was not provided to crud manager or task store - it is still null at this point
        if (!calendarManager) {
            calendarManager = new Gnt.data.CalendarManager();
        }

        // Call this early manually to be able to add listeners before calling the superclass constructor
        this.mixins.observable.constructor.call(this, config);
        // calendars go first in the stores loading order
        this.addCalendarManager(calendarManager, stores);

        // ..then resources, assignments, dependencies and finally tasks
        if (resourceStore) stores.push(resourceStore);
        if (assignmentStore) stores.push(assignmentStore);
        if (dependencyStore) stores.push(dependencyStore);
        if (taskStore) stores.push(taskStore);

        if (stores.length) {
            var syncSequence   = [];

            // For applying sync results we have a different order:
            // calendars -> resources -> tasks -> assignments -> dependencies
            if (calendarManager) syncSequence.push(calendarManager);
            if (resourceStore) syncSequence.push(resourceStore);
            if (taskStore) syncSequence.push(taskStore);
            if (assignmentStore) syncSequence.push(assignmentStore);
            if (dependencyStore) syncSequence.push(dependencyStore);

            if (syncSequence.length) {
                config.syncApplySequence    = (config.syncApplySequence || config.stores || []).concat(syncSequence);
            }

            var _stores = config.stores || this.stores;
            if (_stores && !Ext.isArray(_stores)) _stores = [_stores];

            // all the Gantt related stores will go after the user defined stores (specified in config.stores)
            config.stores = (_stores || []).concat(stores);
        }

        this.callParent([ config ]);

        // make sure we have properties set to proper stores descriptors
        this.calendarManager    = this.getStoreDescriptor(calendarManager);
        this.resourceStore      = this.getStoreDescriptor(resourceStore);
        this.assignmentStore    = this.getStoreDescriptor(assignmentStore);
        this.dependencyStore    = this.getStoreDescriptor(dependencyStore);
        this.taskStore          = this.getStoreDescriptor(taskStore);

        this.taskStore.store.setCalendarManager(calendarManager);
    },

    onBeforeIndentationChange : function () {
        this.suspendChangesTracking();
    },

    onIndentationChange : function () {
        this.resumeChangesTracking(true);
    },

    onBeforeBatchRemove : function () {
        this.suspendChangesTracking();
    },

    onBatchRemove : function () {
        this.resumeChangesTracking(true);
    },

    bindStoreListeners : function (store, un) {
        // task store has some extra events to listen
        if (store instanceof Gnt.data.TaskStore) {
            var listeners = {
                beforeindentationchange : this.onBeforeIndentationChange,
                indentationchange       : this.onIndentationChange,
                beforebatchremove       : this.onBeforeBatchRemove,
                batchremove             : this.onBatchRemove,
                scope                   : this
            };

            if (un) {
                this.mun(store, listeners);
            } else {
                this.mon(store, listeners);
            }
        }

        return this.callParent(arguments);
    },

    getTaskStoreInfo : function (taskStore, config) {
        if (!taskStore.isStore) {
            if (typeof taskStore == 'string') {
                taskStore   = Ext.data.StoreManager.get(taskStore);
            } else {
                taskStore   = taskStore.store;
            }
        }

        var result          = {},
            calendarManager = config.calendarManager,
            assignmentStore = config.assignmentStore,
            resourceStore   = config.resourceStore,
            dependencyStore = config.dependencyStore;

        if (!calendarManager) result.calendarManager = taskStore.calendarManager;
        if (!assignmentStore) result.assignmentStore = taskStore.getAssignmentStore();
        if (!resourceStore) result.resourceStore = taskStore.getResourceStore();
        if (!dependencyStore) result.dependencyStore = taskStore.getDependencyStore();

        return result;
    },


    addCalendarManager : function (calendarManager, stores) {
        var store, descriptor;

        if (calendarManager.isStore) {
            store       = calendarManager;
            descriptor  = { store : calendarManager };

        } else if (typeof calendarManager == 'object') {
            store       = calendarManager.store;
            descriptor  = calendarManager;

        } else {
            calendarManager = Ext.data.StoreManager.get(calendarManager);
            store           = calendarManager;
            descriptor      = { store : calendarManager };
        }

        var model   = (store.getModel && store.getModel() || store.model).prototype;

        // register calendar manager sub-stores being kept in "Days" field
        if (!descriptor.stores) {
            descriptor.stores  = [{
                storeId     : model.daysField,
                idProperty  : model.idProperty
            }];
        }

        this.calendarManager    = descriptor;

        // on calendar manager data loaded, we set the project calendar
        store.on('load', this.onCalendarManagerLoad, this);

        this.mon(store, {
            dayadd          : this.onStoreChange,
            dayupdate       : this.onStoreChange,
            dayremove       : this.onStoreChange,
            daybulkremove   : this.onStoreChange,
            scope           : this
        });

        stores.push(descriptor);
    },


    onCalendarManagerLoad : function (store) {
        // if meteData is provided and it contains project calendar definition
        if (store.metaData && store.metaData.hasOwnProperty('projectCalendar')) {
            var projectCalendar = store.getProjectCalendar(),
                oldCalendarId   = projectCalendar && projectCalendar.getCalendarId(),
                newCalendarId   = store.metaData.projectCalendar;

            // if project calendar has changed
            if (oldCalendarId != newCalendarId) {
                store.setProjectCalendar(newCalendarId);
            }
        }
    },


    applyLoadResponse : function () {
        // let's ignore calendars events during data loading since we don't want tasks to get moved after stores loading
        var cm  = this.getCalendarManager();

        cm && cm.suspendCalendarsEvents();

        this.callParent(arguments);

        if (cm) {
            cm.resumeCalendarsEvents();

            // Since we suspended calendar events the calendar caches stayed intact
            // so we need to reset them now .."resetCache" private method does it silently
            // since we don't want to trigger "adjustToCalendar" calls automatically (expensive operation on large datasets)
            Ext.Array.each(cm.getRoot().childNodes, function (node) {
                var c = node.getCalendar();
                if (c) c.resetCache();
            });
        }
    },


    /**
     * Returns the calendar manager bound to the crud manager.
     * @return {Gnt.data.CalendarManager} The calendar manager bound to the crud manager.
     */
    getCalendarManager : function () {
        return this.calendarManager && this.calendarManager.store;
    },

    /**
     * Returns the resource store bound to the crud manager.
     * @return {Gnt.data.ResourceStore} The resource store bound to the crud manager.
     */
    getResourceStore : function () {
        return this.resourceStore && this.resourceStore.store;
    },

    /**
     * Returns the dependency store bound to the crud manager.
     * @return {Gnt.data.DependencyStore} The dependency store bound to the crud manager.
     */
    getDependencyStore : function () {
        return this.dependencyStore && this.dependencyStore.store;
    },

    /**
     * Returns the assignment store bound to the crud manager.
     * @return {Gnt.data.AssignmentStore} The assignment store bound to the crud manager.
     */
    getAssignmentStore : function () {
        return this.assignmentStore && this.assignmentStore.store;
    },

    /**
     * Returns the task store bound to the crud manager.
     * @return {Gnt.data.TaskStore} The task store bound to the crud manager.
     */
    getTaskStore : function () {
        return this.taskStore && this.taskStore.store;
    },

    // To make this compatible with Ext Scheduler
    getEventStore : function () {
        return this.taskStore && this.taskStore.store;
    },

    prepareUpdated : function (list, stores, storeInfo) {
        if (list[0] instanceof Gnt.model.Task) {
            // Root should not be updated since the gantt doesn't modify this (though Ext JS might)
            list = Ext.Array.filter(list, function(node) { return !node.isRoot(); });

            var result  = this.callParent([list, stores, storeInfo]);

            // if resetIdsBeforeSync mode is enabled and we deal with tasks
            // we need to reset ids for tasks segments as well
            if (this.resetIdsBeforeSync) {
                var segmentsField   = list[0].segmentsField,
                    proto           = Ext.ClassManager.get(list[0].segmentClassName).prototype,
                    idProperty      = proto.idProperty,
                    phantomIdField  = proto.phantomIdField;

                for (var i = 0; i < result.length; i++) {
                    var segmentsData    = result[i][segmentsField];
                    if (segmentsData) {
                        for (var j = 0; j < segmentsData.length; j++) {
                            var segment = segmentsData[j];
                            if (segment[phantomIdField]) delete segment[idProperty];
                        }
                    }
                }
            }

            return result;
        }

        return this.callParent(arguments);
    },


    prepareAdded : function (list) {
        var result  = this.callParent(arguments);

        // if resetIdsBeforeSync mode is enabled and we deal with tasks
        // we need to reset ids for tasks segments as well
        if (this.resetIdsBeforeSync && list[0] instanceof Gnt.model.Task) {
            var segmentsField   = list[0].segmentsField,
                idProperty      = Ext.ClassManager.get(list[0].segmentClassName).prototype.idProperty;

            for (var i = 0; i < result.length; i++) {
                var segmentsData    = result[i][segmentsField];
                if (segmentsData) {
                    for (var j = 0; j < segmentsData.length; j++) {
                        delete segmentsData[j][idProperty];
                    }
                }
            }
        }

        return result;
    },


    // Override AbstractManager method to get Segment field changes properly
    getRecordChangesStates : function (record, changes, stores, store) {
        if (record.isTaskSegment) {
            return this.getSegmentChangesStates(record);
        }

        return this.callParent(arguments);
    },


    // Extracts Segments field changes
    getSegmentChangesStates : function (record) {
        var task             = record.getTask(),
            taskStore        = task.getTaskStore(),
            storeInfo        = this.getStoreDescriptor(taskStore),
            idProperty       = record.idProperty,
            phantomIdField   = storeInfo && storeInfo.phantomIdField || record.phantomIdField || this.phantomIdField,
            taskId           = task.getId(),
            id               = record.getId(),
            activeSync       = this.activeRequests.sync;

        function findById(array, prop, value) {
            return array && Ext.Array.findBy(array, function (entry) { return entry[prop] == value; });
        }

        var sentChanges, currentChanges;

        // If we have info on the active sync operation
        if (activeSync) {
            var sentData    = activeSync.pack[storeInfo.storeId],
                syncUpdated = sentData && sentData.updated,
                syncAdded   = sentData && sentData.added,
                currentTaskChanges,
                sentTaskChanges;

            // Get current changes snapshot made before CM started applying the response
            var currentData    = this._currentChangeSetPackage[storeInfo.storeId],
                currentUpdated = currentData && currentData.updated,
                currentAdded   = currentData && currentData.added;

            // Get snapshot of the Task data sent to the server (if it was updated)
            sentTaskChanges = findById(syncUpdated, idProperty, taskId);

            // the task was updated and sent to the server
            if (sentTaskChanges) {
                // find sent Segments data
                sentChanges = findById(sentTaskChanges[task.segmentsField], idProperty, id);

                if (sentChanges) {
                    // get its current state
                    currentTaskChanges = findById(currentUpdated, idProperty, taskId);

                    currentChanges = findById(currentTaskChanges && currentTaskChanges[task.segmentsField], idProperty, id);
                }
            }
            // ..no snapshot means the record could be sent to the server as added
            else {
                // searching the Task data in sent added data
                sentTaskChanges = findById(syncAdded, phantomIdField, taskId);
                // the task was added and sent to the server
                if (sentTaskChanges) {
                    // find sent Segments data
                    sentChanges = findById(sentTaskChanges[task.segmentsField], phantomIdField, id);

                    if (sentChanges) {
                        // get its current state
                        currentTaskChanges = findById(currentAdded, phantomIdField, taskId);

                        currentChanges = findById(currentTaskChanges && currentTaskChanges[task.segmentsField], phantomIdField, id);
                    }
                }
            }
        }

        return {
            sent    : sentChanges,
            current : currentChanges
        }
    },


    isSegmentsValueEqual : function (segments1, segments2) {
        if (!segments1 && !segments2) return true;

        if ((!segments1 && segments2) || (segments1 && !segments2) || segments1.length != segments2.length) {
            return false;
        }

        for (var i = 0, l = segments1.length; i < l; i++) {
            var segment1 = segments1[i],
                segment2 = segments2[i];

            if (segment1.isInstance) segment1 = segment1.serialize();
            if (segment2.isInstance) segment2 = segment2.serialize();

            if (Ext.JSON.encode(segment1) != Ext.JSON.encode(segment2)) return false;
        }

        return true;
    },


    // Override AbstractManager method to treat Segments field properly
    isFieldValueEqual : function (record, field, value1, value2) {
        if (record.isTaskModel && (field == record.segmentsField || field.name == record.segmentsField)) {
            return this.isSegmentsValueEqual(value1, value2);
        }

        return this.callParent(arguments);
    },


    // Override AbstractManager method to tweak Segments field
    applyChangeToField : function (record, name, value, store) {
        // If that's a new value for a task "Segments" field
        if (record.isTaskModel && name == record.segmentsField) {

            var segments        = record.getSegments(),
                phantomIdField  = segments && segments[0].phantomIdField,
                idProperty      = segments && segments[0].idProperty;

            // If the task is segmented we try to modify existing segments one by one
            if (segments && value) {
                // loop over transferred segments if any
                for (var i = value.length - 1; i >= 0; i--) {
                    // get transferred segment change
                    var segmentChange   = value[i],
                        phantomId       = segmentChange[phantomIdField],
                        id              = segmentChange[idProperty],
                        segment         = null;

                    // let's find corresponding segment to update
                    for (var j = 0; j < segments.length; j++) {
                        segment     = segments[j];

                        // we detect it using either phantom or real id
                        if ((segment.get(phantomIdField) == phantomId) || (segment.getId() == id)) {
                            // let's apply transferred changes to found segment
                            this.applyChangesToRecord(segment, segmentChange);
                            break;
                        }
                    }
                    // TODO if match not found add a new segment passed from the server here
                }

                return;
            }
        }

        // fallback to default behaviour
        return this.callParent(arguments);
    },


    // TODO keep applyChangesToTask hook since we mentioned it on the forum
    applyChangesToTask : function (record, changes) {},


    applyChangesToRecord : function (record, changes, stores) {
        // TODO keep applyChangesToTask hook since we mentioned it on the forum
        if (record.isTaskModel) {
            this.ignoreUpdates++;

            this.applyChangesToTask.apply(this, arguments);

            this.ignoreUpdates--;
        }

        this.callParent(arguments);

        if (!record.isPhantom() && record.data[record.phantomIdField])
            delete record.data[record.phantomIdField];
    }
});
