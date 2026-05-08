/**
 * A container for the {@link Gnt.panel.TimelineScheduler project timeline panel} instance.
 * It shows a high level timeline of important tasks and includes labels
 * with the timespan start and end dates. Using it with your Gantt chart is very simple:
 *
 * ```javascript
 *
 * var taskStore = new Gnt.data.TaskStore();
 *
 * new Ext.Viewport({
 *     layout : 'border',
 *     items : [
 *         {
 *             xtype       : 'gantt_timeline',
 *             region      : 'north',
 *             taskStore   : taskStore
 *         },
 *         {
 *             xtype       : 'ganttpanel',
 *             region      : 'center',
 *             taskStore   : taskStore
 *         }
 *     ]
 * });
 * ```
 *
 * {@img gantt/images/timeline-panel.png}
 *
 */
Ext.define('Gnt.panel.Timeline', {
    extend : 'Ext.Panel',

    requires : [
        'Ext.form.field.Display',
        'Gnt.panel.TimelineScheduler'
    ],

    mixins : ['Gnt.mixin.Localizable'],
    alias  : 'widget.gantt_timeline',

    layout : {
        type  : 'hbox',
        align : 'stretch'
    },

    height      : 190,
    labelWidth  : 100,

    /**
     * @property {Object} scheduler The timeline component. Instance of {@link Gnt.panel.Timeline#schedulerClass}.
     * @readonly
     */
    scheduler   : null,

    /**
     * @cfg {Gnt.data.TaskStore} taskStore (required) The {@link Gnt.data.TaskStore store} holding the tasks.
     * The store is passed to the {@link Gnt.panel.Timeline#schedulerClass timeline component}.
     */
    taskStore   : null,

    /**
     * @cfg {Boolean} readOnly true to disable moving tasks in the timeline.
     */
    readOnly    : true,

    /**
     * @cfg {String} schedulerClass The class name that will be instantiated as the timeline component.
     */
    schedulerClass : 'Gnt.panel.TimelineScheduler',

    initComponent : function () {
        this.addCls('sch-gantt-timeline');

        this.scheduler = Ext.create(this.schedulerClass, {
            bodyPadding : '10 0 20 0',
            taskStore : this.taskStore,
            readOnly  : this.readOnly,
            flex      : 1
        });

        this.scheduler.on('viewchange', this.onTimespanChange, this);

        this.on('show', function() {
            this.scheduler.refreshMainRow();
        }, this);

        this.items = this.buildItems();

        this.callParent(arguments);
    },

    buildItems : function () {
        return [
            {
                xtype      : 'component',
                itemId     : 'startlabel',
                tpl       : '<dl class="sch-gantt-timeline-label sch-gantt-timeline-left-label">' +
                '<dt>' + this.L('start') + '</dt>' +
                '<dd>{startDate}</dd>' +
                '</dl>',
                width      : this.labelWidth
            },
            this.scheduler,
            {
                xtype      : 'component',
                itemId     : 'endlabel',
                tpl       : '<dl class="sch-gantt-timeline-label sch-gantt-timeline-right-label">' +
                '<dt>' + this.L('end') + '</dt>' +
                '<dd>{endDate}</dd>' +
                '</dl>',
                width      : this.labelWidth
            }
        ];
    },

    getStartLabel : function () {
        return this.startLabel || (this.startLabel = this.down('#startlabel'));
    },

    getEndLabel : function () {
        return this.endLabel || (this.endLabel = this.down('#endlabel'));
    },


    onTimespanChange : function () {
        var start = this.scheduler.getStart();
        var end   = this.scheduler.getEnd();

        this.getStartLabel().setData({ startDate : Ext.Date.format(start, this.L('format')) });
        this.getEndLabel().setData({ endDate : Ext.Date.format(end, this.L('format')) });
    }
});

