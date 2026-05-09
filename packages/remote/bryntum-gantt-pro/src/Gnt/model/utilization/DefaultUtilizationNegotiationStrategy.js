/**
 * Default (though, not really) synchronous resource utilization negotiation strategy
 */
Ext.define('Gnt.model.utilization.DefaultUtilizationNegotiationStrategy', {

    uses : [
        'Sch.util.Date'
    ],

    config : {
        owner : null,
        /**
         * TaskStore the strategy is intended to work with
         *
         * @cfg {Gnt.data.Store} taskStore
         */
        taskStore : null,
        /**
         * @cfg {Gnt.data.ResourceStore} resourceStore
         * @private
         */
        resourceStore : null,
        /**
         * @cfg {Gnt.data.AssignmentStore} assignmentStore
         * @private
         */
        assignmentStore : null,
        /**
         * @cfg {Gnt.data.ResourceUtilizationStore} resourceUtilizationStore
         */
        resourceUtilizationStore : null,
        /**
         * @cfg {Gnt.data.ResourceUtilizationEventStore} resourceUtilizationEventStore
         * @private
         */
        resourceUtilizationEventStore : null,
        /**
         * Time axis to use to obtain utilization information intervals from
         *
         * @cfg {Sch.data.TimeAxis} timeAxis
         */
        timeAxis : null,
        /**
         * Assignment unit (in %) less or equal to this value will be considered as under-utilization of a resource.
         * Such summary cells will be colored gray by default. If the total units assigned for a resource is between the under and over
         * intervals, the resource is considered to be optimally utilized (green).
         *
         * @cfg {Number} underUtilizationThreshold
         */
        underUtilizationThreshold   : null,
        /**
         * Assignment unit (in %) greater than this value will be considered as over-utilization of a resource
         * Such summary cells will be colored red by default. If the total units assigned for a resource is between the under and over
         * intervals, the resource is considered to be optimally utilized (green).
         *
         * @cfg {Number} overUtilizationThreshold
         */
        overUtilizationThreshold    : null,
        /**
         * An observable to use to fire events
         *
         * @cfg {Ext.util.Observable} eventDelegate
         */
        viaObservable : null,
        /**
         * Default resource node expanded state
         *
         * @cfg {Boolean} defaultResourceExpandedState
         */
        defaultResourceExpandedState : false
    },

    utilizationInfoCache          : null,

    taskStoreDetacher             : null,
    resourceStoreDetacher         : null,
    assignmentStoreDetacher       : null,
    utilizationEventStoreDetacher : null,
    timeAxisDetacher              : null,

    fireReassignTimer             : null,

    constructor : function(config) {
        var me = this;

        me.callParent([config]);

        me.initConfig(config);

        me.utilizationInfoCache = {};
    },

    destroy : function() {
        var me = this;

        Ext.destroy(
            me.taskStoreDetacher,
            me.resourceStoreDetacher,
            me.assignmentStoreDetacher,
            me.utilizationEventStoreDetacher,
            me.timeAxisDetacher
        );

        clearTimeout(me.fireReassignTimer);
        me.fireReassignTimer = null;

        me.isDestroyed = true;
    },

    /**
     * This method should return a value containing utilization information for particular interval within event
     * start/end dates.
     *
     * Note: utilization information is supposed to be consumed by intervals, defined by configured TimeAxis units
     *
     * @param  {Gnt.model.UtilizationEvent} utilizationEvent
     * @param  {Date} intervalStartDate Interval start date
     * @param  {Date} intervalEndDate Interval end date
     * @return {Object|Ext.Promise}  info
     * @return {Boolean} info.isUtilized
     * @return {Number}  info.allocationMs
     * @return {Number}  info.allocationDeltaMs
     * @return {Boolean} info.isOverallocated
     * @return {Boolean} info.isUnderllocated
     */
    getUtilizationInfoForUtilizationEventInterval : function(utilizationEvent, intervalStartDate, intervalEndDate) {
        var me = this,
            originalResource   = utilizationEvent.getOriginalResource(),
            originalAssignment = utilizationEvent.getOriginalAssignment(),
            validEndDate       = intervalEndDate || me.getIntervalEndDateByStartDate(intervalStartDate),
            cache              = me.utilizationInfoCache,
            cacheKey           = me.self.makeUtilizationInfoKey(intervalStartDate, validEndDate, originalResource.internalId),
            utilizationInfo    = cache[cacheKey] || originalResource.getUtilizationInfo(
                intervalStartDate,
                validEndDate,
                me.getUnderUtilizationThreshold(),
                me.getOverUtilizationThreshold()
            ),
            result;

        cache[cacheKey] = utilizationInfo;

        if (utilizationEvent.isSurrogateSummary()) {
            result = utilizationInfo;
        }
        else {
            if (utilizationInfo.assignmentInfo.hasOwnProperty(originalAssignment.getId())) {
                result = utilizationInfo.assignmentInfo[originalAssignment.getId()];
            }
            else {
                result = {
                    isUtilized        : false,
                    allocationMs      : 0,
                    allocationDeltaMs : 0,
                    isOverallocated   : false,
                    isUnderallocated  : false,
                    assignmentInfo    : null,
                    taskInfo          : null
                };
            }
        }

        return result;
    },

    /**
     * Iterates over a timespan time intervals and calls the callback providing interval start/end dates
     * as parameters. For this strategy interval is one day, other strategies might use other intervals.
     *
     * @param {Sch.model.Range} timespan Any object supporting interface having getStartDate()/getEndDate() methods or startDate/endDate properties.
     * @param {Function} callback
     * @param {Date} callback.startDate
     * @param {Date} callback.endDate
     */
    forEachTimeSpanInterval : function(timespan, callback) {
        var me            = this,
            timeAxis      = me.getTimeAxis(),
            startDate, endDate;

        startDate = timespan.getStartDate ? timespan.getStartDate() : timespan.startDate;
        endDate   = timespan.getEndDate   ? timespan.getEndDate()   : timespan.endDate;

        startDate = new Date(Math.max(startDate, timeAxis.getStart()));
        endDate   = new Date(Math.min(endDate, timeAxis.getEnd()));

        // timeAxis.generateTicks() adjust start/end dates to time axis main unit boundaries, which is not
        // what we want here, adjusted start date might be lesser then time span start date, as well as
        // adjusted end date might be greater then time span end date, if, for example, main unit is week
        // whereas unit is day.
        Ext.Array.each(timeAxis.generateTicks(startDate, endDate, timeAxis.getUnit()), function(tick) {
            if (tick.start - startDate >= 0 && tick.end - endDate <= 0) {
                callback(tick.start, tick.end);
            }
        });
    },

    /**
     * Adjusts event start date to strategy tick.
     *
     * Note: this strategy uses daily intervals so ticks are at the begining of the days, other strategies might use
     *       different ticks.
     *
     * @param {Date} date
     * @return {Date}
     */
    adjustStartDateToTick : function(date) {
        var timeAxis = this.getTimeAxis();

        return timeAxis.floorDate(date, false, timeAxis.unit, 1);
    },

    /**
     * Adjust event end date to strategy tick.
     *
     * Note: this strategy uses daily intervals so ticks are at the begining of the days, other strategies might use
     *       different ticks.
     *
     * @param {Date} date
     * @return {Date}
     */
    adjustEndDateToTick : function(date) {
        var timeAxis = this.getTimeAxis();

        return timeAxis.ceilDate(date, false, timeAxis.unit, 1);
    },

    /**
     * Calculates timespan occupied by resource assignments and adjusts it to tick used
     *
     * @param {Gnt.model.Resource} resource
     * @return {Object} timespan
     * @return {Date}   timespan.startDate
     * @return {Date}   timespan.endDate
     */
    calculateResourceAssignmentsTimespan : function(resource) {
        var me           = this,
            // These are correct initial dates (min <- MAX), (max <- Min)
            minStartDate = Sch.util.Date.MAX_VALUE,
            maxEndDate   = Sch.util.Date.MIN_VALUE;

        resource.forEachAssignment(function resourceAssignmentsTimespanCalculationEnumeratorCallback(assignment) {
            var task = assignment.getTask(),
                taskStartDate = task && task.getStartDate() || minStartDate,
                taskEndDate   = task && task.getEndDate()   || maxEndDate;

            if (minStartDate > taskStartDate) {
                minStartDate = taskStartDate;
            }
            if (maxEndDate < taskEndDate) {
                maxEndDate = taskEndDate;
            }
        });

        return {
            startDate : minStartDate < Sch.util.Date.MAX_VALUE && me.adjustStartDateToTick(minStartDate) || null,
            endDate   : maxEndDate > Sch.util.Date.MIN_VALUE && me.adjustEndDateToTick(maxEndDate) || null
        };
    },

    /**
     * Assignments comparison function, by default order by task name
     *
     * @param {Gnt.model.Assignment} a
     * @param {Gnt.model.Assignment} b
     * @return {Number}
     */
    assignmentsComparator : function(a, b) {
        return (a.getTask() && b.getTask() && a.getTask().getName() > b.getTask().getName()) ? 1 : -1;
    },

    /**
     * Fills in the resource utilization store from primary (Task/Resource/Assignment) stores.
     *
     * @param {Gnt.data.ResourceUtilizationStore} [store] Store to fill, if none given the strategy will use the store it's configured with
     */
    fillResourceUtilizationStore : function() {
        var me                       = this,
            utilizationResourceStore = me.getResourceUtilizationStore(),
            utilizationResourceRoot  = utilizationResourceStore.getRoot(),
            utilizationEventStore    = me.getResourceUtilizationEventStore(),
            resourceStore            = me.getResourceStore(),
            resources                = resourceStore && resourceStore.getRange(),
            resourcesToAdd           = [],
            eventsToAdd              = [];

        me.syncingWithOriginal = true;

        /**
         * @event sync-start
         *
         * Fired when store starts synchronization with original (Task/Resource/Assignment) stores
         *
         * @param {Gnt.data.ResourceUtilizationStore} me
         */
        me.fireEventVia('sync-start', me);

        utilizationResourceRoot.removeAll();
        utilizationEventStore.removeAll();

        utilizationResourceStore.suspendEvents();
        utilizationEventStore.suspendEvents();

        utilizationResourceStore.beginUpdate();
        utilizationEventStore.beginUpdate();

        resources && Ext.Array.forEach(resources, function (resource) {
            var branch;

            branch  = me.makeSurrogateResourceBranch(resource);

            resourcesToAdd.push(branch.resource);
            eventsToAdd = eventsToAdd.concat(branch.events);
        });

        utilizationEventStore.add(eventsToAdd);
        utilizationResourceRoot.appendChild(resourcesToAdd);

        utilizationResourceRoot.sort();

        utilizationEventStore.endUpdate();
        utilizationResourceStore.endUpdate();

        utilizationEventStore.resumeEvents();
        utilizationResourceStore.resumeEvents();

        me.syncingWithOriginal = false;

        utilizationEventStore.fireEvent('refresh', utilizationEventStore);
        utilizationResourceStore.fireEvent('refresh', utilizationResourceStore);

        /**
         * @event sync-end
         *
         * Fired when store completes synchronization with original (Task/Resource/Assignment) stores
         *
         * @param {Gnt.data.ResourceUtilizationStore} me
         */
        me.fireEventVia('sync-complete', me);
    },

    /**
     * Synchronizes the resource utilization store with primary (Task/Resource/Assignment) stores
     *
     * In theory this operation should be faster.
     */
    syncResourceUtilizationStore : function() {
        var me = this,
            utilizationResourceStore = me.getResourceUtilizationStore(),
            utilizationEventStore    = me.getResourceUtilizationEventStore(),
            utilizationResourceRoot  = utilizationResourceStore.getRoot(),
            resourceStore            = me.getResourceStore(),
            assignmentStore          = me.getAssignmentStore();

        // If current utilization data is empty then just fill
        if (utilizationEventStore.getCount() === 0) {
            me.fillResourceUtilizationStore();
        }
        // otherwise synchronize
        else {
            me.syncingWithOriginal = true;

            me.fireEventVia('sync-start', me);

            utilizationResourceStore.beginUpdate();
            utilizationEventStore.beginUpdate();

            // Remove outdated surrogate resources & assingments
            me.removeOutdatedSurrogateModels(utilizationResourceStore, utilizationEventStore, resourceStore, assignmentStore);

            // Sync present surrogate assingments
            me.updatePresentSurrogates(utilizationResourceStore, utilizationEventStore);
            // Add new surrogate resources
            me.addNewSurrogateResources(utilizationResourceStore, utilizationEventStore, resourceStore);
            // Add new surrogate assignments
            me.addNewSurrogateAssignments(utilizationResourceStore, utilizationEventStore, assignmentStore);

            utilizationResourceRoot.sort();

            utilizationEventStore.endUpdate();
            utilizationResourceStore.endUpdate();

            me.syncingWithOriginal = false;

            me.fireEventVia('sync-complete', me);
        }
    },

    updateTaskStore : function (newStore, oldStore) {
        var me = this;

        oldStore && Ext.destroy(me.taskStoreDetacher);

        if (newStore) {
            me.setResourceStore(newStore.getResourceStore() || me.setResourceStore());
            me.setAssignmentStore(newStore.getAssignmentStore() || me.getAssignmentStore());

            me.taskStoreDetacher = newStore.on({
                load        : me.onSourceDataTouch,
                refresh     : me.onSourceDataTouch,
                clear       : me.onSourceDataTouch,
                nodeappend  : me.onSourceDataTouch,
                noderemove  : me.onSourceDataTouch,
                nodeinsert  : me.onSourceDataTouch,
                nodemove    : me.onSourceDataTouch,
                update      : me.onSourceDataTouchUpdateFiltered,
                move        : me.onSourceDataTouch,
                scope       : me,
                destroyable : true
            });
        }
    },

    updateResourceStore : function (newStore, oldStore) {
        var me = this;

        oldStore && Ext.destroy(me.resourceStoreDetacher);

        if (newStore) {
            me.resourceStoreDetacher = newStore.on({
                load        : me.onSourceDataTouch,
                refresh     : me.onSourceDataTouch,
                clear       : me.onSourceDataTouch,
                add         : me.onSourceDataTouch,
                update      : me.onSourceDataTouch,
                remove      : me.onSourceDataTouch,
                bulkremove  : me.onSourceDataTouch,
                scope       : me,
                destroyable : true
            });
        }
    },

    updateAssignmentStore : function (newStore, oldStore) {
        var me = this;

        oldStore && Ext.destroy(me.assignmentStoreDetacher);

        if (newStore) {
            me.assignmentStoreDetacher = newStore.on({
                load        : me.onSourceDataTouch,
                refresh     : me.onSourceDataTouch,
                clear       : me.onSourceDataTouch,
                add         : me.onSourceDataTouch,
                update      : me.onSourceDataTouch,
                remove      : me.onSourceDataTouch,
                bulkremove  : me.onSourceDataTouch,
                scope       : me,
                destroyable : true
            });
        }
    },

    updateResourceUtilizationStore : function(newStore, oldStore) {
        var me = this;

        if (oldStore != newStore) {
            if (newStore) {
                me.setResourceUtilizationEventStore(newStore.getEventStore());
            }
            else {
                me.setResourceUtilizationEventStore(null);
            }
        }
    },

    updateResourceUtilizationEventStore : function (newStore, oldStore) {
        var me = this;

        if (oldStore != newStore) {
            oldStore && Ext.destroy(me.utilizationEventStoreDetacher);

            if (newStore) {
                me.utilizationEventStoreDetacher = newStore.on({
                    update : me.onUtilizationEventStoreUpdate,
                    scope  : me
                });
            }
        }
    },

    updateTimeAxis : function (newTimeAxis, oldTimeAxis) {
        var me = this;

        oldTimeAxis && Ext.destroy(me.timeAxisDetacher);

        if (newTimeAxis) {
            me.timeAxisDetacher = newTimeAxis.on({
                reconfigure : me.onSourceDataTouch,
                scope       : me,
                destroyable : true
            });
        }
    },

    makeSurrogateResource : function (resource) {
        var me    = this,
            model = me.getResourceUtilizationStore().model;

        return new model({
            Id               : model.getSurrogateIdFor(resource),
            originalResource : resource,
            expanded         : me.getDefaultResourceExpandedState()
        });
    },

    makeSurrogateAssignment : function (assignment) {
        var me    = this,
            model = me.getResourceUtilizationStore().model;

        return new model({
            Id                 : model.getSurrogateIdFor(assignment),
            originalAssignment : assignment,
            leaf               : true
        });
    },

    makeSurrogateAssignmentEvent : function (resourceOrAssignment) {
        var me         = this,
            model      = me.getResourceUtilizationEventStore().model,
            id         = model.getSurrogateIdFor(resourceOrAssignment);

        return new model({
            Id                             : id,
            ResourceId                     : id,
            originalResource               : resourceOrAssignment instanceof Gnt.model.Resource && resourceOrAssignment || null,
            originalAssignment             : resourceOrAssignment instanceof Gnt.model.Assignment && resourceOrAssignment || null,
            utilizationNegotiationStrategy : me
        });
    },

    makeSurrogateResourceBranch : function (resource) {
        var me                        = this,
            surrogateResource         = me.makeSurrogateResource(resource),
            surrogateAssignmentEvents = [],
            surrogateSummaryEvent;

        // Surrogate assignments
        resource.forEachAssignment(function (assignment) {
            var task = assignment.getTask();

            if (task && !task.isUnscheduled()) {
                surrogateResource.appendChild(me.makeSurrogateAssignment(assignment));
                surrogateAssignmentEvents.push(me.makeSurrogateAssignmentEvent(assignment));
            }
        });

        // Surrogate summary (only if there are any assignments)
        if (surrogateAssignmentEvents.length > 0) {
            surrogateSummaryEvent = me.makeSurrogateAssignmentEvent(resource);
            surrogateAssignmentEvents.push(surrogateSummaryEvent);
        }
        else {
            surrogateResource.set('leaf', true);
        }

        return {
            resource : surrogateResource,
            events   : surrogateAssignmentEvents
        };
    },

    removeOutdatedSurrogateModels : function(utilizationResourceStore, utilizationEventStore, resourceStore, assignmentStore) {
        var currentRoot    = utilizationResourceStore.getRoot(),
            nodesToDelete  = [],
            eventsToDelete = [];

        currentRoot.cascadeBy(function (currentNode) {
            var resource,
                assignment;

            // Surrogate assignments without original counterpart or the ones which were moved should be deleted
            if (!currentNode.isRoot() && currentNode.isSurrogateAssignment()) {

                assignment = currentNode.getOriginalAssignment();

                // If assignment has been removed from the assignment store or assignment is now referening different resource
                if (!assignment.store || !assignmentStore.contains(assignment) || assignment.getResource() != currentNode.parentNode.getOriginalResource()) {
                    nodesToDelete.push(currentNode);
                    eventsToDelete = eventsToDelete.concat(currentNode.getEvents());
                }
            }
            // Surrogate resources without original counterpart should be deleted
            else if (!currentNode.isRoot() && currentNode.isSurrogateResource()) {

                resource = currentNode.getOriginalResource();

                // Original resource has been removed from resource store
                if (!resource.store || !resourceStore.contains(resource)) {
                    nodesToDelete.push(currentNode);
                    eventsToDelete = eventsToDelete.concat(currentNode.getEvents());
                }
                // Valid surrogate resource which has original resource without assignments must not have summary surrogate events
                else if (!resource.getAssignments().length) {
                    eventsToDelete = eventsToDelete.concat(currentNode.getEvents());
                }
            }
        });

        utilizationEventStore.remove(eventsToDelete);

        Ext.Array.each(nodesToDelete, function (currentNode) {
            currentNode.remove();
        });
    },

    updatePresentSurrogates : function(utilizationResourceStore, utilizationEventStore) {
        var currentRoot = utilizationResourceStore.getRoot(),
            utilizationEvents = utilizationEventStore.getRange();

        currentRoot.cascadeBy(function (currentNode) {
            if (!currentNode.isRoot() && !currentNode.isInSyncWithOriginal()) {
                currentNode.syncFromOriginal();
            }
        });

        Ext.Array.forEach(utilizationEvents, function(event) {
            event.beginEdit();

            if (!event.isInSyncWithOriginal()) {
                event.syncFromOriginal();
            }

            event.endEdit();
        });
    },

    addNewSurrogateResources : function (utilizationResourceStore, utilizationEventStore, resourceStore) {
        var me          = this,
            currentRoot = utilizationResourceStore.getRoot(),
            eventsToAdd = [];

        Ext.Array.forEach(resourceStore.getRange(), function(resource) {
            var surrogateResource = utilizationResourceStore.getModelByOriginal(resource);

            // If there's no such resource
            if (!surrogateResource) {
                currentRoot.appendChild(
                    me.makeSurrogateResource(resource)
                );
                // Surrogate summary only if resource has assignments
                if (resource.getAssignments().length) {
                    eventsToAdd.push(
                        me.makeSurrogateAssignmentEvent(resource)
                    );
                }
            }
            // If there's corresponding surrogate resource then checking if it's summary event must be added
            else if (!surrogateResource.getEvents().length && resource.getAssignments().length) {
                eventsToAdd.push(
                    me.makeSurrogateAssignmentEvent(resource)
                );
            }
        });

        utilizationEventStore.add(eventsToAdd);
    },


    addNewSurrogateAssignments : function (utilizationResourceStore, utilizationEventStore, assignmentStore) {
        var me           = this,
            resourceNode = null,
            eventsToAdd  = [];

        Ext.Array.forEach(assignmentStore.getRange(), function(assignment) {
            var surrogateResource,
                originalResource,
                originalTask;

            // If there's no such surrogate assignment in utilization resource store
            if (!utilizationResourceStore.getModelByOriginal(assignment)) {

                // If the orignal assignment has both resource and task set
                originalResource = assignment.getResource();
                originalTask     = assignment.getTask();

                surrogateResource = originalResource && utilizationResourceStore.getModelByOriginal(originalResource);

                if (surrogateResource && originalTask) {
                    // By that time the parent node should be 100% in the utilization resource store
                    // it's ensured in addNewSurrogateResources() method which is called always before
                    // this one.
                    surrogateResource.appendChild(
                        me.makeSurrogateAssignment(assignment)
                    );
                    eventsToAdd.push(
                        me.makeSurrogateAssignmentEvent(assignment)
                    );
                }
            }
        });

        utilizationEventStore.add(eventsToAdd);
    },

    clearUtilizationInfoCache : function () {
        this.utilizationInfoCache = {};
    },

    getIntervalEndDateByStartDate : function(intervalStartDate) {
        var SUD = Sch.util.Date,
            timeAxis = this.getTimeAxis(),
            tickIndex = timeAxis.getTickFromDate(intervalStartDate),
            intervalEndDate;

        // when "autoAdjust : true" tickIndex might get equal ticket count and not -1 (if we pass end date of last tick to getTickFromDate())

        if (tickIndex !== -1 && tickIndex < timeAxis.count()) {
            intervalEndDate = timeAxis.getAt(Math.floor(tickIndex)).getEndDate();
        }
        else {
            intervalEndDate = SUD.add(intervalStartDate, 1, timeAxis.unit);
        }

        return intervalEndDate;
    },

    onSourceDataTouchUpdateFiltered : function(source, record, operation, modifiedFieldNames, details) {
        if (!modifiedFieldNames || modifiedFieldNames.length != 1 || modifiedFieldNames[0] != 'expanded') {
            this.onSourceDataTouchBuffered();
        }
    },

    onSourceDataTouch : function() {
        this.onSourceDataTouchBuffered();
    },

    onSourceDataTouchBuffered : Ext.Function.createBuffered(function () {
        var me = this;

        if (!me.isDestroyed) {
            me.clearUtilizationInfoCache();
            me.syncResourceUtilizationStore();
        }
    }, 10),

    onUtilizationEventStoreUpdate : function (utilizationEventStore, surrogateEvent, operation, modifiedFieldNames) {
        var me = this;

        if (!me.syncingWithOriginal) {
            if (!surrogateEvent.isInSyncWithOriginal()) {
                surrogateEvent.syncToOriginal();
            }

            if (Ext.Array.contains(modifiedFieldNames, surrogateEvent.resourceIdField)) {

                var surrogateResource = surrogateEvent.getResource();

                me.fireReassignTimer = Ext.Function.defer(
                    function () {
                        me.fireEventVia(
                            'reassign',
                            me,
                            surrogateResource.getOriginalResource(),
                            surrogateResource.getOriginalTask(), // might be null
                            surrogateEvent.getOriginalResource(),
                            surrogateEvent.getOriginalTask(),
                            surrogateEvent.getOriginalAssignment()
                        );
                    },
                    1
                );
            }
        }
    },

    fireEventVia : function() {
        var eventSource = this.getViaObservable(),
            result;

        if (eventSource) {
            result = eventSource.fireEvent.apply(eventSource, arguments);
        }

        return result;
    },

    inheritableStatics : {
        /**
         * Makes utilization information key.
         *
         * @private
         */
        makeUtilizationInfoKey : function(startDate, endDate, suffix) {
            return [startDate.getTime(), endDate.getTime(), suffix].join('-');
        }
    }
});
