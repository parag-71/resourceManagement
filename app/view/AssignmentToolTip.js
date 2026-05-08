/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: AssignmentToolTip.js
 */
Ext.define('LeankorApp.view.AssignmentToolTip', {
    extend: 'Ext.ToolTip',

    requires : [
        'LeankorApp.view.AssignmentChart'
    ],
    delegate : '.gnt-utilizationrow-resource .gnt-resource-utilization-interval',
    showDelay: 0,
    hideDelay: 200,
    anchor   : 'bl',
    layout   : 'fit',

    // WCAG 1.3.1 / 4.1.2 — explicit tooltip role so AT users hear the role
    // "tooltip" and treat the contents as supplementary, not as their primary
    // navigation target.
    ariaRole : 'tooltip',
    // WCAG 1.4.10 — keep the tooltip readable on narrow viewports. The
    // AssignmentChart inside still has a fixed 430×250 footprint, but the
    // tooltip will scroll within these caps rather than overflow the page.
    maxWidth : '90vw',
    maxHeight: '70vh',

    chartStore: null,
    panel     : null,
    trackMouse: true,
    title     : Locale.LocaleName.Hours,

    initComponent: function () {
        this.chartStore = new Ext.data.Store({
            fields: ['name', 'amount']
        });

        Ext.apply(this, {

            items: [
                {
                    xtype       : 'assignmentchart',
                    store       : this.chartStore
                }
            ],

            listeners: {
                beforeshow: this.onMyBeforeShow,
                scope     : this
            }
        });

        this.callParent(arguments);
    },

     onMyBeforeShow: function (tip) {
         var me = this,
            taskStore = LeankorApp.Gantt.gantt.taskStore;
			summaryEvent = me.panel.getSchedulingView().resolveEventRecord(tip.triggerElement),
            originalResource = summaryEvent.getOriginalResource(),
            utilizationDayEl = Ext.fly(tip.triggerElement),
            intervalStart = new Date(parseInt(utilizationDayEl.getAttribute('data-utilization-interval-start'), 10)),
            intervalEnd = new Date(parseInt(utilizationDayEl.getAttribute('data-utilization-interval-end'), 10)),
            utilizationInfo = summaryEvent.getUtilizationInfoForInterval(intervalStart),
            resourceCalendar = originalResource.getCalendar(),
            data = [];

        Ext.Object.each(utilizationInfo.taskInfo, function (taskId, assignmentUtilizationInfo) {
            if (assignmentUtilizationInfo.isUtilized) {
                data.push({
                    name  : taskStore.getNodeById(taskId).getName(),
                    amount: resourceCalendar.convertMSDurationToUnit(assignmentUtilizationInfo.allocationMs, 'h')
                });
            }
        });

        if (data.length === 0) return false;


        //let's get the resource availability value
        var resourceAvailability = 0;

       // loop over its calendar and summarize availability intervals in the "intervalStart - intervalEnd" timespan
        resourceCalendar.forEachAvailabilityInterval(
            {
                startDate: intervalStart,
                endDate  : intervalEnd
            },
            function (start, end) {
                resourceAvailability += end - start;
            }
        );

        //output the resource availability plus over-/underallocated hours
        this.down('cartesian').setTitle(Ext.htmlEncode(Locale.LocaleName.ResourceAvailability)+': ' + resourceCalendar.convertMSDurationToUnit(resourceAvailability, 'h') + ' '+Ext.htmlEncode(Locale.LocaleName.Hrs) +
            (utilizationInfo.isOverallocated || utilizationInfo.isUnderallocated ?
            ', ' + (utilizationInfo.isOverallocated ? Locale.LocaleName.Overallocated : Locale.LocaleName.Underallocated) + ': ' + resourceCalendar.convertMSDurationToUnit(Math.abs(utilizationInfo.allocationMs - resourceAvailability), 'h') + ' '+Ext.htmlEncode(Locale.LocaleName.Hrs)
                : '')
        );
		 this.down('cartesian').axes[0].setTitle(Ext.htmlEncode(Locale.LocaleName.Hours));
		
        var userAvailabilityInfo = 0;
		userAvailabilityInfo = Locale.LocaleName.UserAvailabilityInfo.replace('{UserName}', Ext.htmlEncode(originalResource.getName()));
		userAvailabilityInfo = userAvailabilityInfo.replace('{IntervalStart}', Ext.Date.format(intervalStart, 'M d'));
		userAvailabilityInfo = userAvailabilityInfo.replace('{IntervalEnd}', Ext.Date.format(intervalEnd, 'M d'));
		this.setTitle(Ext.htmlEncode(userAvailabilityInfo));

        // Set an aria-label that mirrors the title so SR users hear the
        // resource name + interval when the tooltip opens (the title is
        // visual; aria-label exposes it via the AT pipeline).
        if (LeankorApp.util && LeankorApp.util.AccessibilityUtil) {
            LeankorApp.util.AccessibilityUtil.setAriaLabel(this, userAvailabilityInfo);
        }

        this.chartStore.loadData(data);
     }
});