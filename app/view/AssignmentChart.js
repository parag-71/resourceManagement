/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: AssignmentChart.js
 */
Ext.define('LeankorApp.view.AssignmentChart', {
    extend       : 'Ext.chart.CartesianChart',
    xtype        : 'assignmentchart',
    height       : 250,
    width        : 430,
    // WCAG 1.1.1 (Non-text Content) / 4.1.2 — the chart is presented as an
    // image. AT users get a single descriptive label rather than navigating
    // SVG primitives. The label is generic; the surrounding tooltip's title
    // (set in AssignmentToolTip.onMyBeforeShow) already carries resource and
    // interval context.
    ariaRole     : 'img',
    ariaLabel    : Locale.LocaleName.Hours, // populated below in initComponent for templated label
    requires 	 : [
		'Ext.chart.theme.Muted',
		'Ext.chart.axis.Numeric',
		'Ext.chart.axis.Category',
		'Ext.chart.series.Bar',
		'Ext.chart.interactions.ItemHighlight'
	],

    initComponent: function () {
        var me = this;
        me.callParent(arguments);
        // After initial render, drive the aria-label from the data: list each
        // task and its hour-count so SR users get the chart's actual content
        // instead of a generic "chart" word.
        me.on('redraw', function () {
            var store = me.getStore();
            if (!store) { return; }
            var parts = [];
            store.each(function (rec) {
                parts.push(rec.get('name') + ' ' + rec.get('amount') + ' ' + Locale.LocaleName.Hours);
            });
            var label = (Locale.LocaleName.A11yUtilizationChart || 'Allocation chart')
                .replace('{0}', parts.join(', '));
            if (LeankorApp.util && LeankorApp.util.AccessibilityUtil) {
                LeankorApp.util.AccessibilityUtil.setAriaLabel(me, label);
            }
        });
    },
    theme        : {
        type : 'muted'
    },
    insetPadding : '20 20 20 20',
    interactions : [ 'itemhighlight' ],
    animation    : Ext.isIE8 ? false : {
        easing   : 'backOut',
        duration : 500
    },
    axes         : [
        {
            type           : 'numeric',
            position       : 'left',
            fields         : 'amount',
            minimum        : 0,
            maximum        : 24,
            minorTickSteps : 1,
            majorTickSteps : 6,
            label          : {
                textAlign : 'right'
            },
            title          : Locale.LocaleName.Hours,
            grid           : {
                odd  : {
                    fillStyle : 'rgba(255, 255, 255, 0.06)'
                },
                even : {
                    fillStyle : 'rgba(0, 0, 0, 0.03)'
                }
            }
        },
        {
            type     : 'category',
            position : 'bottom',
            fields   : 'name'
        }
    ],
    series       : [ {
        type         : 'bar',
        xField       : 'name',
        yField       : 'amount',
        style        : {
            minGapWidth : 20
        },
        highlightCfg : {
            saturationFactor : 1.5
        },
        label        : {
            field   : 'amount',
            display : 'insideEnd'
        }
    } ],
	
});