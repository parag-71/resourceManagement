/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: MainViewport.js
 */
/**
 * This class is the main view for the application. It is specified in app.js as the
 * "mainView" property. That setting automatically applies the "viewport"
 * plugin causing this view to become the body element (i.e., the viewport).
 */
Ext.define('LeankorApp.view.MainViewport', {
    extend: 'Ext.Viewport',
    xtype: 'app-mainviewport',

    requires: [
        'Ext.plugin.Viewport',
        'Ext.window.MessageBox',
        'LeankorApp.view.MainViewportModel',
        'LeankorApp.view.MainViewportController',
        'LeankorApp.view.ControlHeader',
        'LeankorApp.view.AssignmentGrid',
        'LeankorApp.view.ResourceSchedule',
        'LeankorApp.util.AccessibilityUtil'
    ],
    controller: 'mainviewport',
    viewModel: 'mainviewport',

    layout: 'border',
    region: 'center',
    /**
     *@method initComponent
     *@Description Here we will declare tewo global varibales fid , and btype to store folder Id and BoardType fetched from url.Also we will initialize crudManager and TaskStore(with calendar configuration).
    Will add body items directly here to be shown as main view of app.
    In Gantt Panel we will customize some ZoomToFit level settings to work with our presets and requirements;
     */
    initComponent: function () {
        myTimer();

        // One-time global a11y overrides: WCAG 1.4.10 Reflow (viewport width
        // patch, x-zoom-overflow toggle, Window/Menu height-constrain) and
        // 4.1.3 Status Messages (setLoading → aria-busy + live-region).
        // Idempotent — guarded inside the helper.
        LeankorApp.util.AccessibilityUtil.bootReflowOverrides();

        var currLocation,
        me = this,
        currLocation = window.location.search;
        fid = Ext.urlDecode(Ext.htmlDecode(currLocation.substring(1))).fid;
        btype = Ext.urlDecode(Ext.htmlDecode(currLocation.substring(1))).btype;
        var portfolio = glueforce.getWorkspaceConfig();

        if (portfolio.saveWorkspaceSnapshot === null) {
            this.initComponent();
        }
        if (portfolio.pageStrings) {
            Locale.LocaleName = Object.assign(Locale.LocaleName, Locale.LocaleName, portfolio.pageStrings);
        }
        var weekendDays = me.getController().getWeekendDays(),
        calendar = Ext.create('Gnt.data.calendar.BusinessTime', {
            calendarId: 'calendarSevenDays',
            defaultAvailability: me.getController().getCalendarAvailability(portfolio.WorkingHoursPerDay || 8),
            hoursPerDay: portfolio.WorkingHoursPerDay || 8,
            daysPerWeek: 7,
            daysPerMonth: 30,
            weekendFirstDay: weekendDays.first,
            weekendSecondDay: weekendDays.second,
            weekendsAreWorkdays: true
        });
        var taskStore = new LeankorApp.store.TaskStoreCustom({
            calendar: calendar,
            assignmentStore: 'assignmentStore',
            resourceStore: 'resourcesStoreCustom'
        }),
        // assignmentStore = Ext.getStore('assignmentStore'),
        centerPanel = null,
        mainPanel = null,
        subPanel,
        zoomLevels = [
            //YEAR
            {
                width: 40,
                increment: 1,
                resolution: 1,
                preset: 'manyYears',
                resolutionUnit: 'YEAR'
            }, {
                width: 80,
                increment: 1,
                resolution: 1,
                preset: 'manyYears',
                resolutionUnit: 'YEAR'
            }, {
                width: 30,
                increment: 1,
                resolution: 1,
                preset: 'year',
                resolutionUnit: 'MONTH'
            }, {
                width: 50,
                increment: 1,
                resolution: 1,
                preset: 'year',
                resolutionUnit: 'MONTH'
            }, {
                width: 100,
                increment: 1,
                resolution: 1,
                preset: 'year',
                resolutionUnit: 'MONTH'
            }, {
                width: 200,
                increment: 1,
                resolution: 1,
                preset: 'year',
                resolutionUnit: 'MONTH'
            },
            //MONTH
            {
                width: 100,
                increment: 1,
                resolution: 7,
                preset: 'monthAndYear',
                resolutionUnit: 'DAY'
            }, {
                width: 30,
                increment: 1,
                resolution: 1,
                preset: 'weekDateAndMonth',
                resolutionUnit: 'DAY'
            },
            //WEEK

            {
                width: 20,
                increment: 1,
                resolution: 1,
                preset: 'weekAndDayLetter',
                resolutionUnit: 'DAY'
            }, {
                width: 20,
                increment: 1,
                resolution: 1,
                preset: 'weekAndDayLetter8',
                resolutionUnit: 'DAY'
            }, {
                width: 20,
                increment: 1,
                resolution: 1,
                preset: 'weekAndDayLetter12',
                resolutionUnit: 'DAY'
            }, {
                width: 20,
                increment: 1,
                resolution: 1,
                preset: 'weekAndDayLetter4',
                resolutionUnit: 'DAY'
            }, {
                width: 80,
                increment: 1,
                resolution: 1,
                preset: 'weekAndHour',
                resolutionUnit: 'DAY'
            }, {
                width: 75,
                increment: 1,
                resolution: 1,
                preset: 'weekAndHour',
                resolutionUnit: 'DAY'
            }, {
                width: 60,
                increment: 1,
                resolution: 1,
                preset: 'weekAndHour',
                resolutionUnit: 'DAY'
            }, {
                width: 35,
                increment: 1,
                resolution: 1,
                preset: 'weekAndMonth',
                resolutionUnit: 'DAY'
            }, {
                width: 20,
                increment: 1,
                resolution: 1,
                preset: 'weekAndMonth',
                resolutionUnit: 'DAY'
            }, {
                width: 50,
                increment: 1,
                resolution: 1,
                preset: 'weekAndMonth',
                resolutionUnit: 'DAY'
            },
            //DAY
            {
                width: 50,
                increment: 1,
                resolution: 1,
                preset: 'weekAndDay',
                resolutionUnit: 'DAY'
            }, {
                width: 100,
                increment: 1,
                resolution: 1,
                preset: 'weekAndDay',
                resolutionUnit: 'DAY'
            },
            //HOUR
            {
                width: 50,
                increment: 6,
                resolution: 30,
                preset: 'hourAndDay',
                resolutionUnit: 'MINUTE'
            }, {
                width: 100,
                increment: 6,
                resolution: 30,
                preset: 'hourAndDay',
                resolutionUnit: 'MINUTE'
            }, {
                width: 60,
                increment: 2,
                resolution: 30,
                preset: 'hourAndDay',
                resolutionUnit: 'MINUTE'
            }, {
                width: 60,
                increment: 1,
                resolution: 30,
                preset: 'hourAndDay',
                resolutionUnit: 'MINUTE'
            },
            //MINUTE
            {
                width: 30,
                increment: 15,
                resolution: 5,
                preset: 'minuteAndHour'
            }, {
                width: 60,
                increment: 15,
                resolution: 5,
                preset: 'minuteAndHour'
            }, {
                width: 130,
                increment: 15,
                resolution: 5,
                preset: 'minuteAndHour'
            }, {
                width: 60,
                increment: 5,
                resolution: 5,
                preset: 'minuteAndHour'
            }, {
                width: 100,
                increment: 5,
                resolution: 5,
                preset: 'minuteAndHour'
            }, {
                width: 50,
                increment: 2,
                resolution: 1,
                preset: 'minuteAndHour'
            },
            //SECOND
            {
                width: 30,
                increment: 10,
                resolution: 5,
                preset: 'secondAndMinute'
            }, {
                width: 60,
                increment: 10,
                resolution: 5,
                preset: 'secondAndMinute'
            }, {
                width: 130,
                increment: 5,
                resolution: 5,
                preset: 'secondAndMinute'
            }
        ];
        if (btype == 'ru') {
            mainPanel = {
                xtype: 'assignmentgridpanel',
                highlightWeekends: true,
                region: 'center',
                weekStartDay: portfolio.FirstDayOfTheWeek,
                height: '90%',
                calendar: calendar,
                taskStore: taskStore,
                viewPreset: 'weekAndMonth',
                //startDate 			 : new Date((new Date().getFullYear()), (new Date().getMonth()), (new Date().getDate())),
                //endDate 			 : new Date(((new Date().getFullYear()) + 1), (new Date().getMonth()), (new Date().getDate())),
                zoomLevels: zoomLevels,
                header: {
                    xtype: 'controlheader',
                    title: Ext.htmlEncode(Locale.LocaleName.ResourceUtilization)
                }
            };
            partnerTimelinePanel = (btype == 'ru' ? new LeankorApp.view.AssignmentGrid(mainPanel) : new LeankorApp.view.ResourceSchedule(mainPanel));
            subPanel = {
                xtype: 'resourceschedule',
                highlightWeekends: true,
                calendar: calendar,
                weekStartDay: portfolio.FirstDayOfTheWeek,
                region: 'south',
                height: '50%',
                partnerTimelinePanel: partnerTimelinePanel,
                zoomLevels: zoomLevels,
                eventStore: taskStore,
                assignmentStore: 'assignmentStore',
                resourceStore: 'resourcesStoreCustom',
                split: true,
                collapsible: true,
                layout: 'fit',
                header: {
                    hidden: true
                }
            };
        } else {
            mainPanel = {
                xtype: 'resourceschedule',
                calendar: calendar,
                highlightWeekends: true,
                region: 'center',
                height: '90%',
                weekStartDay: portfolio.FirstDayOfTheWeek,
                viewPreset: 'weekAndMonth',
                // startDate: new Date((new Date().getFullYear()), (new Date().getMonth()), (new Date().getDate())),
                // endDate: new Date(((new Date().getFullYear()) + 1), (new Date().getMonth()), (new Date().getDate())),
                header: {
                    xtype: 'controlheader',
                    title: Ext.htmlEncode(Locale.LocaleName.ResourceSchedule)
                },
                eventStore: taskStore,
                assignmentStore: 'assignmentStore',
                resourceStore: 'resourcesStoreCustom',
                zoomLevels: zoomLevels
            };
            partnerTimelinePanel = (btype == 'ru' ? new LeankorApp.view.AssignmentGrid(mainPanel) : new LeankorApp.view.ResourceSchedule(mainPanel));
            subPanel = {
                xtype: 'assignmentgridpanel',
                weekStartDay: portfolio.FirstDayOfTheWeek,
                highlightWeekends: true,
                calendar: calendar,
                region: 'south',
                height: '50%',
                partnerTimelinePanel: partnerTimelinePanel,
                taskStore: taskStore,
                //viewPreset: 'weekAndMonth',
                zoomLevels: zoomLevels,
                split: true,
                collapsible: true,
                layout: 'fit',
                header: {
                    hidden: true
                }
            };
        }
        PartnerPanel = (btype == 'ru' ? new LeankorApp.view.ResourceSchedule(subPanel) : new LeankorApp.view.AssignmentGrid(subPanel));
        Ext.apply(this, {
            items: [
                partnerTimelinePanel,
                PartnerPanel

            ]
        });
        me.callParent(arguments);

        // ── Skip-link (WCAG 2.4.1 — Bypass Blocks) ─────────────────────────
        // Inserts a Tab-revealable "Skip to main content" link as the first
        // focusable element on the page, targeting the main (center) panel.
        partnerTimelinePanel.on('afterrender', function (panel) {
            LeankorApp.util.AccessibilityUtil.insertSkipLink(panel);
            // Ensure SR can identify the main grid by name.
            var label = (btype === 'ru')
                ? Locale.LocaleName.ResourceUtilization
                : Locale.LocaleName.ResourceSchedule;
            LeankorApp.util.AccessibilityUtil.setAriaLabel(panel, label);
        }, null, { single: true });
    }

});
