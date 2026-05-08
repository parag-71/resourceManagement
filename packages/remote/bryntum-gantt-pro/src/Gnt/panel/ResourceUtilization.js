/**
 * @class Gnt.panel.ResourceUtilization
 * @extends Sch.panel.SchedulerTree
 *
 * A UI table component showing the utilization levels for your resources. The resources are displayed in a summary list where each row can
 * be expanded to show the tasks assigned for the resource.
 *
 *
 * {@img gantt/images/utilizationpanel.png width="50%" height=""}
 *
 * To use this panel in your application, here's the most basic usage:
 *
 *
 *      new Ext.Viewport({
            layout : 'border',
            items  : [
                {
                    title            : 'Gantt chart',
                    xtype            : 'ganttpanel',
                    id               : 'gantt',
                    region           : 'center',
                    crudManager      : crudManager,
                    columnLines      : true,

                    startDate        : new Date(2010, 0, 18),
                    endDate          : new Date(2010, 1, 8),
                    viewPreset       : 'weekAndDayLetter',

                    columns          : [
                        {
                            xtype : 'namecolumn',
                            width : 200
                        }
                    ]
                },
                {
                    title                : 'Resource utilization',
                    xtype                : 'resourceutilizationpanel',
                    region               : 'south',
                    height               : 350,
                    partnerTimelinePanel : 'gantt'
                }
            ]
      });
 *
 *
 */
Ext.define('Gnt.panel.ResourceUtilization', {
    extend   : 'Sch.panel.SchedulerTree',
    alias    : 'widget.resourceutilizationpanel',
    requires : [
        'Gnt.data.ResourceUtilizationStore'
    ],
    uses     : [
        'Ext.Promise',
        'Ext.XTemplate',
        'Ext.util.Format',
        'Gnt.model.utilization.UtilizationNegotiationStrategyMixin',
        'Gnt.model.utilization.AsyncUtilizationNegotiationStrategy'
    ],
    mixins : {
        lc  : 'Sch.mixin.Localizable',
        uns : 'Gnt.model.utilization.UtilizationNegotiationStrategyMixin'
    },

    enableDragCreation          : false,
    enableEventDragDrop         : false,
    eventResizeHandles          : 'none',
    readOnly                    : true,
    rowHeight                   : 32,
    rowLines                    : true,
    eventBorderWidth            : 0,
    columnLines                 : {
        useLowestHeader : true
    },
    variableRowHeight           : false,
    syncRowHeight               : false,
    lockedGridDependsOnSchedule : false,
    // No need for setting custom row heights
    enableRowHeightInjection    : function() {},
    // No need to draw dependencies
    dependencyViewConfig : {
        drawDependencies : false,
        enableDependencyDragDrop : false
    },

    columns : [
        {
            xtype     : 'treecolumn',
            flex      : 1,
            resizable : false,
            sortable  : false,
            renderer  : function (v, meta, rec) {
                if (rec.isSurrogateResource()) {
                    return rec.getName();
                } else {
                    return rec.getTaskName();
                }
            }
        }
    ],

    /**
     * @hide
     * @cfg resourceStore
     */
    /**
     * @hide
     * @cfg eventStore
     */
    /**
     * @hide
     * @cfg eventRendererScope
     */

    config : {
        /**
         * @cfg {Gnt.data.TaskStore} taskStore (required) The task store.
         *
         * The panel extracts resources and assignments from the provided task store and makes a new synthetic resource store
         * which in turn is used to generate the rows.
         * The new store is by default a {@link Gnt.data.ResourceUtilizationStore} instance (can be changed by {@link #resourceStoreClass} config)
         * having resources on the 1st level and corresponding assigned tasks on the 2nd level.
         * Please note that both `getStore` and {@link #getResourceStore} methods return reference to the same synthetic store built based on the provided one.
         */
        taskStore    : null,
        /**
         * @cfg {String} numberFormat
         *
         * Utilization cell number format
         */
        numberFormat : '0',
        /**
         * Assignment unit (in %) less or equal to this value will be considered as under-utilization of a resource.
         * Such summary cells will be colored gray by default. If the total units assigned for a resource is between the under and over
         * intervals, the resource is considered to be optimally utilized (green).
         *
         * @cfg {Number} underUtilizationThreshold
         */
        underUtilizationThreshold   : 99,
        /**
         * Assignment unit (in %) greater than this value will be considered as over-utilization of a resource
         * Such summary cells will be colored red by default. If the total units assigned for a resource is between the under and over
         * intervals, the resource is considered to be optimally utilized (green).
         *
         * @cfg {Number} overUtilizationThreshold
         */
        overUtilizationThreshold : 100,
        /**
         * Resource utilization store class to be used to create a store if no resource store is provided.
         *
         * @cfg {String} resourceStoreClass
         */
        resourceStoreClass : 'Gnt.data.ResourceUtilizationStore',
        /**
         * Resource utilization store class config to be used to create a store if no resource store is provided
         *
         * @cfg {Object} resourceStoreConfig
         */
        resourceStoreConfig : null,
        /**
         * Set to true to use asynchronous utilization information calculation, it might be slower, but
         * doesn't affect GUI responsiveness.
         */
        calculateAsync : true,
        /**
         * Template to use for title when asynchronous calculation process is in progress.
         *
         * @cfg {String|Ext.XTemplate|Array} titleTpl
         */
        titleTpl :'{originalTitle}… {progress}',
        /**
         * Whether to update panel utilization grid during asynchronous utilization calculation process.
         * Flashy but slow on huge datasets.
         *
         * @cfg {boolean} liveUpdate
         * @private
         */
        liveUpdate : false,
        /**
         * @cfg {String} utilizationNegotiationStrategyClass
         * @private
         */
        utilizationNegotiationStrategyClass : null,
        /**
         * @cfg {Object} utilizationNegotiationStrategyConfig
         * @private
         */
        utilizationNegotiationStrategyConfig : null
    },

    viewConfig : {
        markDirty           : false,
        dynamicRowHeight    : false,
        managedEventSizing  : false,
        getRowClass      : function (record) {
            return record.isSurrogateResource() ? 'gnt-utilizationrow-resource' : 'gnt-utilizationrow-task';
        }
    },

    eventBodyTemplate : '<tpl for=".">'+
        '<div class="gnt-resource-utilization-interval gnt-resource-utilization-interval-{status} {cls}" style="{dir}: {position}px; width: {width}px;{style}"' +
        'data-utilization-interval-start="{startTime}"' +
        'data-utilization-interval-end="{endTime}">' +
        '{value}' +
        '</div>' +
        '</tpl>',

    lockedGridConfig : {
        width : 200
    },

    /**
     * @cfg {Function} utilizationBarRenderer
     * This function is called each time a utilization bar is rendered. It's called with the allocation info for the resource time slot, the resource and an
     * object containing meta data about allowing you to customize add inline style, a CSS class .
     *
     * <pre>
     *  utilizationBarRenderer : function (allocationInfo, resource, intervalStart, intervalEnd, metaData) {
     *      metaData.style = 'color:white';        // You can use inline styles too.
     *      metaData.cls   = 'some-css-class';     // Set a CSS class to style the event
     *  }
     *</pre>
     * @param {Object}  allocationInfo
     * @param {Boolean} allocationInfo.isUtilized
     * @param {Number}  allocationInfo.allocationMs
     * @param {Number}  allocationInfo.allocationDeltaMs
     * @param {Boolean} allocationInfo.isOverallocated
     * @param {Boolean} allocationInfo.isUnderallocated
     * @param {Sch.model.Resource} resourceRecord The resource row in which the event is being created
     * @param {Date} startDate The interval start date
     * @param {Date} endDate The interval end date
     * @param {Object} metaData An object where you can set 'style' and 'cls' properties to style the bar
     */
    utilizationBarRenderer : null,

    /**
     * @cfg {Object} utilizationBarRendererScope The 'scope' (the 'this' object) for the {@link #utilizationBarRenderer} method
     */
    utilizationBarRendererScope : null,


    onDestroy : function() {
        var me = this,
            strategy = me.getUtilizationNegotiationStrategy();

        if (strategy.getOwner() == me) {
            Ext.destroy(strategy);
            me.setUtilizationNegotiationStrategy(null);
        }
    },

    initComponent : function () {
        var me = this;

        me.eventRendererScope = me;

        me.initStrategy();

        me.initComponentStores();

        me.callParent(arguments);

        me.setupStrategy();

        me.initProgressBar();

        me.addCls('gnt-resourceutilizationpanel');

        if (me.partnerTimelinePanel && Ext.isFunction(me.partnerTimelinePanel.getTaskStore)) {
            me.getUtilizationNegotiationStrategy().setTaskStore(me.partnerTimelinePanel.getTaskStore());
        }

        me.getResourceStore().fillStore();

        //me.on({
        //    scope               : me,
        //    'beforeeventdrag'   : me.onBeforeSurrogateEventDrag,
        //    'beforeeventresize' : me.onBeforeSurrogateEventResize
        //});
    },

    applyTitleTpl : function(newVal) {
        newVal = newVal || '{originalTitle}';

        if (!newVal.isTemplate) {
            newVal = new Ext.XTemplate(newVal);
        }

        return newVal;
    },

    initStrategy : function() {
        var me = this,
            strategyClass;

        if (!me.getUtilizationNegotiationStrategy()) {

            strategyClass = me.getUtilizationNegotiationStrategyClass();

            if (!strategyClass) {
                if (me.getCalculateAsync()) {
                    strategyClass = 'Gnt.model.utilization.AsyncUtilizationNegotiationStrategy';
                }
                else {
                    strategyClass = 'Gnt.model.utilization.DefaultUtilizationNegotiationStrategy';
                }
            }

            me.setUtilizationNegotiationStrategy(
                Ext.create(
                    strategyClass,
                    Ext.applyIf(
                        me.getUtilizationNegotiationStrategyConfig() || {},
                        {
                            owner                     : me,
                            taskStore                 : me.getTaskStore(),
                            underUtilizationThreshold : me.getUnderUtilizationThreshold(),
                            overUtilizationThreshold  : me.getOverUtilizationThreshold()
                        }
                    )
                )
            );
        }
    },

    initComponentStores : function () {
        var me = this;

        me.resourceStore = me.resourceStore || Ext.create(
            me.getResourceStoreClass(),
            Ext.apply(
                me.getResourceStoreConfig() || {},
                {
                    utilizationNegotiationStrategy : me.getUtilizationNegotiationStrategy()
                }
            )
        );

        me.eventStore = me.resourceStore.getEventStore();
    },

    setupStrategy : function() {
        var me = this,
            strategy = me.getUtilizationNegotiationStrategy();

        strategy.setTaskStore(me.getTaskStore());
        strategy.setResourceUtilizationStore(me.getResourceStore());
        strategy.setTimeAxis(me.timeAxis);
        strategy.setViaObservable(me.getResourceStore());
    },

    initProgressBar : function() {
        var me = this,
            origTitle;

        me.progressBar = me.addDocked({
            xtype     : 'progressbar',
            dock      : 'top',
            value     : 0,
            maxHeight : 2,
            cls       : 'gnt-resourceutilizationprogress'
        })[0];

        me.mon(me.getResourceStore(), 'utilization-calc-progress', function(strategy, queuedCount, doneCount, eventsDone) {
            var value = queuedCount && (doneCount / queuedCount);

            if (!value) {
                origTitle = origTitle || me.getTitle();
                me.progressBar.updateProgress(value);
            }
            else if (value == 1) {
                me.setTitle(origTitle);
                origTitle = undefined;
                me.progressBar.updateProgress(0);

                if (!me.getLiveUpdate()) {
                    me.getSchedulingView().refresh();
                }
            }
            else {
                me.setTitle(me.getTitleTpl().apply({
                    originalTitle : origTitle,
                    progress      : Ext.util.Format.format(me.L('calculating {0}% done'), Math.round(value * 100))
                }));

                me.progressBar.updateProgress(value);

                if (me.getLiveUpdate()) {

                    Ext.Array.forEach(eventsDone, function(ev) {
                        var resources = ev.getResources();

                        if (resources.length) {
                            me.getSchedulingView().repaintEventsForResource(resources[0]);
                        }
                    });
                }
            }
        });
    },

    /**
     * @hide
     * @cfg eventRenderer
     */
    eventRenderer : function (surrogateEvent, surrogateResource, meta) {
        var EUF           = Ext.util.Format,
            me            = this,
            view          = me.getSchedulingView(),
            startDate     = surrogateEvent.getStartDate(),
            msPerHour     = 60 * 60 * 1000,
            numberFormat  = me.getNumberFormat(),
            result        = [],
            eventLeft, divLeft, divRight, statusCls,
            rendererScope = this.utilizationBarRendererScope || this;

        eventLeft = view.getCoordinateFromDate(startDate);

        surrogateEvent.forEachInterval(function (intervalStartDate, intervalEndDate) {
            var resourceUtilizationInfo = surrogateEvent.getUtilizationInfoForInterval(intervalStartDate, intervalEndDate),
                metaData                = {},
                value                   = '?';

            divLeft  = view.getCoordinateFromDate(intervalStartDate);
            divRight = view.getCoordinateFromDate(intervalEndDate) - 1;

            if (resourceUtilizationInfo instanceof Ext.Promise) {
                statusCls = 'notcalculated';
            }
            else if (!resourceUtilizationInfo.isUtilized) {
                statusCls = 'notutilized';
            }
            else if (resourceUtilizationInfo.isUnderallocated) {
                statusCls = 'underallocated';
            }
            else if (resourceUtilizationInfo.isOverallocated) {
                statusCls = 'overallocated';
            }
            else {
                statusCls = 'optimallyallocated';
            }

            if (me.utilizationBarRenderer) {
                me.utilizationBarRenderer.call(rendererScope, resourceUtilizationInfo, surrogateResource, intervalStartDate, intervalEndDate, metaData);
            }

            if (!(resourceUtilizationInfo instanceof Ext.Promise)) {
                value = EUF.number(resourceUtilizationInfo.allocationMs / msPerHour, numberFormat);
            }

            result.push({
                status    : statusCls,
                dir       : me.rtl ? 'right' : 'left',
                position  : divLeft - eventLeft,
                width     : divRight - divLeft,
                startTime : intervalStartDate.getTime(),
                endTime   : intervalEndDate.getTime(),
                value     : (divRight - divLeft > 10 ? value : ''),
                style     : metaData.style || '',
                cls       : metaData.cls || ''
            });
        });

        return result;
    },

    // Deny surrogate summary dragging
    //onBeforeSurrogateEventDrag : function (me, surrogateEvent) {
    //    return surrogateEvent.isSurrogateAssignment();
    //},

    // Deny surrogate summary resizing
    //onBeforeSurrogateEventResize : function (me, surrogateEvent) {
    //    return surrogateEvent.isSurrogateAssignment();
    //},

    // Don't read from timeAxisViewModel in case it's shared
    getRowHeight : function () {
        return this.rowHeight;
    }

    // Documentation overrides
    /**
     * Returns panel's resource store instance
     *
     * @return {Gnt.data.ResourceUtilizationStore}
     * @method getResourceStore
     */
});
