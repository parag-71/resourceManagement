/**
 * Asynchronous resource utilization negotiation strategy
 */
Ext.define('Gnt.model.utilization.AsyncUtilizationNegotiationStrategy', {

    extend : 'Gnt.model.utilization.DefaultUtilizationNegotiationStrategy',

    uses : ['Ext.Promise'],

    config : {
        /**
         * Maximum advised async step timeout in miliseconds
         */
        maxAsyncStepTimeout : 50
    },

    utilizationCalcQueue          : null,
    utilizationCalcMap            : null,
    utilizationCalcTimer          : null,
    utilizationCalcSteps          : 1,
    doneCount                     : 0,
    queuedCount                   : 0,

    constructor : function(config) {
        var me = this;

        me.callParent([config]);

        me.utilizationCalcQueue = [];
        me.utilizationCalcMap   = {};
    },

    destroy : function() {
        var me = this;

        me.resetCalcQueue();

        me.callParent();
    },

    fillResourceUtilizationStore : function() {
        var me = this;

        me.resetCalcQueue();
        me.callParent();
    },

    syncResourceUtilizationStore : function() {
        var me = this;

        me.resetCalcQueue();
        me.callParent();
    },

    getUtilizationInfoForUtilizationEventInterval : function(utilizationEvent, intervalStartDate, intervalEndDate) {
        var me = this,
            originalResource     = utilizationEvent.getOriginalResource(),
            cache                = me.utilizationInfoCache,
            validEndDate         = intervalEndDate || me.getIntervalEndDateByStartDate(intervalStartDate),
            cacheKey             = me.self.makeUtilizationInfoKey(intervalStartDate, validEndDate, originalResource.internalId),
            utilizationInfo      = cache[cacheKey],
            utilizationCalcQueue = me.utilizationCalcQueue,
            utilizationCalcMap   = me.utilizationCalcMap,
            result;

        if (cache[cacheKey]) {
            result = me.superclass.getUtilizationInfoForUtilizationEventInterval.call(
                me,
                utilizationEvent,
                intervalStartDate,
                validEndDate
            );
        }
        else if (me.isQueuedForCalc(cacheKey)) {
            result = me.prioQueuedCalc(cacheKey);
        }
        else {
            result = me.queueForCalc(cacheKey, utilizationEvent, originalResource, intervalStartDate, validEndDate);

            if (!me.isCalcQueueStarted()) {
                me.startCalcQueue();
            }
        }

        return result;
    },

    clearUtilizationInfoCache : function () {
        var me = this;

        me.callParent();

        me.resetCalcQueue();
    },

    isQueuedForCalc : function(cacheKey) {
        return this.utilizationCalcMap.hasOwnProperty(cacheKey);
    },

    prioQueuedCalc : function(cacheKey) {
        var me = this,
            utilizationCalcQueue = me.utilizationCalcQueue,
            utilizationCalcMap   = me.utilizationCalcMap,
            index = utilizationCalcQueue.indexOf(cacheKey);

        if (index != -1) {
            utilizationCalcQueue.splice(index, 1);
            utilizationCalcQueue.unshift(cacheKey);
        }

        return utilizationCalcMap[cacheKey].promise;
    },

    queueForCalc : function(cacheKey, utilizationEvent, originalResource, intervalStartDate, intervalEndDate) {
        var me = this,
            utilizationCalcQueue = me.utilizationCalcQueue,
            utilizationCalcMap   = me.utilizationCalcMap,
            promise, resolveFn;

        promise = new Ext.Promise(function(resolve, reject) {
            resolveFn = resolve;
        });

        utilizationCalcMap[cacheKey] = {
            intervalStartDate : intervalStartDate,
            intervalEndDate   : intervalEndDate,
            originalResource  : originalResource,
            utilizationEvent  : utilizationEvent,
            promise           : promise,
            resolve           : resolveFn
        };

        utilizationCalcQueue.push(cacheKey);

        ++me.queuedCount;

        return promise;
    },

    isCalcQueueStarted : function() {
        return !!this.utilizationCalcTimer;
    },

    startCalcQueue : function( ){
        var me = this;

        if (!me.syncingWithOriginal) {

            if (!me.doneCount) {
                /**
                 * @event utilization-calc-progress
                 *
                 * Fired to report asynchronous utilization calculation process progress
                 *
                 * @param {Gnt.model.utilization.AsyncUtilizationNegotiationStrategy} me
                 * @param {Number} queuedCount Total events count to calculate
                 * @param {Number} doneCount Calculated events count
                 * @param {Gnt.model.UtilizationEvent[]} eventsDone Calculated utilization event models
                 */
                me.fireEventVia('utilization-calc-progress', me, 0, 0, []);
            }

            me.utilizationCalcTimer = Ext.asap(function() {
                var stepKey, step,
                    info, i,
                    startTime, endTime,
                    eventsDone = [];

                me.utilizationCalcTimer = null;

                if (!me.isDestroyed && me.utilizationCalcQueue.length) {

                    startTime = new Date();

                    for (i = 0; i < me.utilizationCalcSteps && me.utilizationCalcQueue.length; i++) {
                        stepKey = me.utilizationCalcQueue.shift();
                        step    = me.utilizationCalcMap[stepKey];

                        delete me.utilizationCalcMap[stepKey];

                        info = me.superclass.getUtilizationInfoForUtilizationEventInterval.call(
                            me,
                            step.utilizationEvent,
                            step.intervalStartDate,
                            step.intervalEndDate
                        );

                        eventsDone.push(step.utilizationEvent);

                        ++me.doneCount;

                        step.resolve(info);
                    }

                    endTime = new Date();

                    if (endTime - startTime < me.getMaxAsyncStepTimeout()) {
                        ++me.utilizationCalcSteps;
                    }
                    else if (me.utilizationCalcSteps > 1) {
                        --me.utilizationCalcSteps;
                    }

                    me.fireEventVia('utilization-calc-progress', me, me.queuedCount, me.doneCount, eventsDone);

                    if (me.utilizationCalcQueue.length) {
                        me.startCalcQueue();
                    }
                    else {
                        me.resetCalcQueue();
                    }
                }
            });
        }
        else {
            me.utilizationCalcTimer = Ext.asap(me.startCalcQueue, me);
        }
    },

    resetCalcQueue : function() {
        var me = this;

        if (me.utilizationCalcTimer) {
            Ext.unasap(me.utilizationCalcTimer);
            me.utilizationCalcTimer = null;
        }

        me.utilizationCalcMap   = {};
        me.utilizationCalcQueue = [];

        me.queuedCount = 0;
        me.doneCount   = 0;
    },

    onSourceDataTouch : function() {
        var me = this;
        me.isCalcQueueStarted() && me.resetCalcQueue();
        me.callParent();
    }
});
