/**
 * Surrogate event for resource utilization panel
 */
Ext.define('Gnt.model.UtilizationEvent', {
    extend   : 'Sch.model.Event',

    mixins : [
        'Gnt.model.utilization.UtilizationNegotiationStrategyMixin'
    ],

    originalResource   : null,
    originalAssignment : null,

    constructor : function (config) {
        var me = this,
            originalResource,
            originalAssignment;

        if (config.originalResource) {
            originalResource = config.originalResource;
            delete config.originalResource;
        }

        if (config.originalAssignment) {
            originalAssignment = config.originalAssignment;
            delete config.originalAssignment;
        }

        me.callParent([config]);

        me.initConfig(config);

        originalResource   && me.setOriginalResource(originalResource);
        originalAssignment && me.setOriginalAssignment(originalAssignment);
    },

    /**
     * Returns true if this surrogate event designates an assignment
     *
     * @return {Boolean}
     */
    isSurrogateAssignment : function() {
        return !!this.originalAssignment;
    },

    /**
     * Returns true if this surrogate event designates an assignment summary for a resource
     *
     * @return {Boolean}
     */
    isSurrogateSummary : function() {
        return !!this.originalResource;
    },

    /**
     * Returns original assignment corresponding to this surrogate.
     *
     * @return {Gnt.model.Assignment|null}
     */
    getOriginalAssignment : function() {
        return this.originalAssignment;
    },

    /**
     * Sets original assignment corresponding to this surrogate.
     *
     * @param {Gnt.model.Assignment} assignment
     */
    setOriginalAssignment : function(assignment) {
        var me = this;

        if (me.originalAssignment !== assignment) {
            me.originalAssignment = assignment;
            if (!me.isInSyncWithOriginal()) {
                me.syncFromOriginal();
            }
        }
    },

    /**
     * Returns original resource corresponding to this surrogate.
     *
     * @return {Gnt.model.Resource|null}
     */
    getOriginalResource : function() {
        var me         = this,
            resource   = me.originalResource,
            assignment = me.originalAssignment;

        return resource || assignment && assignment.getResource() || null;
    },

    /**
     * Sets original resource corresponding to this surrogate.
     *
     * @param {Gnt.model.Resource} resource
     */
    setOriginalResource : function(resource) {
        var me = this;

        if (me.originalResource !== resource) {
            me.originalResource = resource;
            if (!me.isInSyncWithOriginal()) {
                me.syncFromOriginal();
            }
        }
    },

    /**
     * Returns original task corresponding to this surrogate.
     *
     * @return {Gnt.model.Task|null}
     */
    getOriginalTask : function() {
        var me         = this,
            assignment = me.originalAssignment;

        return assignment && assignment.getTask() || null;
    },

    /**
     * Checks if this node is properly synchronized with original node.
     *
     * @return {Boolean}
     */
    isInSyncWithOriginal : function() {
        var me         = this,
            result     = true,
            assignment,
            resource,
            task,
            span,
            utilizationInfo;

        if (me.isSurrogateAssignment()) {

            assignment = me.getOriginalAssignment(),
            task       = me.getOriginalTask();

            if (assignment) {
                result = result && (me.getId() == me.self.getSurrogateIdFor(assignment));
            }
            if (task && !task.isUnscheduled()) {
                result = result && (me.getStartDate() - me.adjustStartDateToTick(task.getStartDate()) === 0);
                result = result && (me.getEndDate()   - me.adjustEndDateToTick(task.getEndDate())     === 0);
            }
        }
        else if (me.isSurrogateSummary()) {

            resource = me.getOriginalResource();
            span     = me.calculateSurrogateSummaryTimeSpan();

            result = result && (me.getId() == me.self.getSurrogateIdFor(resource));
            result = result && (me.getStartDate() - span.startDate === 0);
            result = result && (me.getEndDate()   - span.endDate   === 0);
        } else {
            // <debug>
            Ext.Error.raise('Unknown surrogate type');
            // </debug>
            // @TODO: #2773 - Rhyno parse error - Syntax error while building the app
            var foo = false;
        }

        return result;
    },

    /**
     * Updates the record from original record(s)
     */
    syncFromOriginal : function() {
        var me         = this,
            assignment,
            resource,
            task,
            span,
            utilizationInfo;

        me.beginEdit();

        if (me.isSurrogateAssignment()) {

            assignment = me.getOriginalAssignment(),
            task       = me.getOriginalTask();

            if (assignment) {
                me.setId(me.self.getSurrogateIdFor(assignment));
            }
            if (task && !task.isUnscheduled()) {
                me.setStartEndDate(
                    me.adjustStartDateToTick(task.getStartDate()),
                    me.adjustEndDateToTick(task.getEndDate())
                );
            }
        }
        else if (me.isSurrogateSummary()) {

            resource = me.getOriginalResource();

            if (resource) {
                me.setId(me.self.getSurrogateIdFor(resource));
            }

            span     = me.calculateSurrogateSummaryTimeSpan();
            me.setStartEndDate(span.startDate, span.endDate);
        }

        me.endEdit();
    },

    /**
     * Updates original record with values from surrogate
     */
    syncToOriginal : function() {
        var me = this,
            task;

        if (me.isSurrogateAssignment()) {

            task = me.getOriginalTask();

            if (task) {
                task.setStartEndDate(me.getStartDate(), me.getEndDate(), true);
            }
        }
    },

    /**
     * Returns an utilization info for this surrogate event for particular interval during which the event designating
     * an assignment or assignment summary lasts. Which intervals are defined for the event depend on event start/end
     * dates and ticks which are used by event's utilization info calculation strategy.
     *
     * @param {Date} intervalStartDate
     * @param {Date} intervalEndDate
     * @return {Object|Ext.Promise}  info
     * @return {Boolean} info.isUtilized
     * @return {Number}  info.allocationMs
     * @return {Number}  info.allocationDeltaMs
     * @return {Boolean} info.isOverallocated
     * @return {Boolean} info.isUnderallocated
     */
    getUtilizationInfoForInterval : function(intervalStartDate, intervalEndDate) {
        var me = this;

        return  me.getUtilizationNegotiationStrategy().getUtilizationInfoForUtilizationEventInterval(me, intervalStartDate, intervalEndDate);
    },

    /**
     * Iterates over intervals defined for this surrogate event calling callback for each
     *
     * @param {Function} callback
     * @param {Date} callback.intervalStartDate
     * @param {Date} callback.intervalEndDate
     */
    forEachInterval : function(callback) {
        var me = this;
        return me.getUtilizationNegotiationStrategy().forEachTimeSpanInterval(me, callback);
    },

    calculateSurrogateSummaryTimeSpan : function() {
        var me = this;
        return me.getUtilizationNegotiationStrategy().calculateResourceAssignmentsTimespan(me.getOriginalResource());
    },

    adjustStartDateToTick : function(date) {
        var me = this;
        return me.getUtilizationNegotiationStrategy().adjustStartDateToTick(date);
    },

    adjustEndDateToTick : function(date) {
        var me = this;
        return me.getUtilizationNegotiationStrategy().adjustEndDateToTick(date);
    },

    clone : function(session) {
        var me = this,
            clone = me.callParent([session]);

        clone.setUtilizationNegotiationStrategy(me.getUtilizationNegotiationStrategy());

        return clone;
    },

    inheritableStatics : {
        /**
         * Returns id for a surrogate record corresponding to original assignment or resource record
         *
         * @return {String}
         */
        getSurrogateIdFor : function(record) {
            var id = record.getInternalId();

            if (record.isResourceModel) {
                id = 'resource-' + id;
            }
            else if (record.isAssignmentModel) {
                id = 'assignment-' + id;
            }
            // <debug>
            else {
                Ext.Error.raise('Wrong original record type');
            }
            // </debug>

            return id;
        }
    }
});
