/**
 * A plugin that generates PDF/PNG files out of the Gantt panel.
 *
 * **NOTE:** This plugin will make an AJAX request to the server, POSTing
 * the HTML fragments to be exported. The {@link #printServer} URL must be configured.
 *
 * ##Configuring/usage
 *
 * To use this plugin, add it to your Gantt as any other plugins. It's also required to have NodeJS server set and running.
 * The complete process of setting up the backend for the plugin can be found in the corresponding [guide](#!/guide/gantt_scheduler_export).
 *
 * **Note:** The export feature is currently not supported if your store is buffered.
 *
 * ```javascript
 * var panel = Ext.create('Gnt.panel.Gantt', {
 *     plugins         : [
 *         {
 *             ptype       : 'gantt_export',
 *             printServer : 'http://localhost:8080'
 *         }
 *     ],
 *     ...
 * });
 * ```
 *
 * The Gantt instance will be extended with two new methods:
 *
 * - {@link #showExportDialog}, which shows export settings dialog
 *
 * ```javascript
 * panel.showExportDialog();
 * ```
 *
 * - {@link #doExport} which actually performs the export operation using {@link #exportConfig} or provided config object :
 *
 * ```javascript
 * panel.doExport({
 *     format      : "A5",
 *     orientation : "landscape",
 *     range       : "complete",
 *     showHeader  : true,
 *     exporterId  : "singlepage"
 * });
 * ```
 *
 * ##Export options
 *
 * In the current state, the plugin gives few options to modify the look and feel of the generated PDF document (or the image) through a dialog window :
 *
 * {@img scheduler/images/export_dialog.png 2x}
 *
 * If no changes are made to the form, the {@link #exportConfig} will be used.
 *
 * ###Schedule range
 *
 * This setting controls the timespan visible on the exported document. The following options are available here :
 *
 * {@img scheduler/images/export_dialog_ranges.png 2x}
 *
 * ####Complete schedule
 *
 * Whole current timespan of the panel will be visible in the exported document.
 *
 * ####Complete schedule (for all events)
 *
 * The timespan will be adjusted to include all the tasks registered in the task store.
 *
 * ####Date range
 *
 * User can select the start and end dates visible on the exported document.
 *
 * {@img scheduler/images/export_dialog_ranges_date.png 2x}
 *
 * ####Visible schedule
 *
 * Timespan of the exported document/image will be set to the currently visible part of the time axis.
 *
 * ###Select columns
 *
 * This field allows to pick the locked grid columns to be exported:
 *
 * {@img scheduler/images/export_dialog_columns.png 2x}
 *
 * ###Rows range
 *
 * This setting controls rows to be included into the exported document. The following options are available here :
 *
 * {@img scheduler/images/export_dialog_row_ranges.png 2x}
 *
 *
 * ####All rows
 *
 * All the panel rows will be included (default mode).
 *
 * ####Visible rows
 *
 * Only currently visible part of rows will be included into the result document.
 *
 * ##Control pagination
 *
 * This field allows to pick an exporter implementing needed way of pagination. The default exporter is `Multi pages`.
 *
 * {@img scheduler/images/export_modes.png 2x}
 *
 * Options:
 *
 * - `Single page`. Creates an export that fits one single page.
 * - `Multi pages`. Creates an export that creates pages in both vertical and horizontal direction.
 * - `Multi pages (vertically)`. Creates an export that creates pages in vertical direction.
 *
 * ##Paper Format
 *
 * This combo gives control of the size of the generated document/image by choosing one from a list of supported ISO paper sizes : (`A5`, `A4`, `A3`, `Letter`). Default format is `A4`.
 *
 * {@img scheduler/images/export_dialog_format.png 2x}
 *
 * ###Orientation
 *
 * This setting defines the orientation of the generated document/image.
 *
 * {@img scheduler/images/export_dialog_orientation.png 2x}
 *
 * Default option is the `portrait` (vertical) orientation :
 *
 * {@img scheduler/images/export_dialog_portrait.png 2x}
 *
 * Second option is the `landscape` (horizontal) orientation :
 *
 * {@img scheduler/images/export_dialog_landscape.png 2x}
 *
 * ##DPI (dots per inch)
 *
 * This field controls the DPI value to use for paper format related calculations:
 *
 * {@img scheduler/images/export_dialog_dpi.png 2x}
 *
 * ##Show header
 *
 * This option allows to show a header to a page displaying the page number:
 *
 * {@img scheduler/images/export_show_header.png 2x}
 *
 * ##Custom export styling
 *
 * A special "sch-export" CSS class is added to the body of the exported pages so that you can have special
 * styles in your exported chart.
 *
 * [1]: http://www.phantomjs.org
 * [2]: http://www.imagemagick.org
 * [3]: https://bryntum.com/blog
 *
 */
Ext.define('Gnt.plugin.Export', {
    extend              : 'Sch.plugin.Export',

    alias               : 'plugin.gantt_export',
    alternateClassName  : 'Gnt.plugin.PdfExport',

    requires            : [
        'Gnt.plugin.exporter.SinglePage',
        'Gnt.plugin.exporter.MultiPage',
        'Gnt.plugin.exporter.MultiPageVertical'
    ],

    buildExporters : function () {
        return [
            'Gnt.plugin.exporter.SinglePage',
            'Gnt.plugin.exporter.MultiPage',
            'Gnt.plugin.exporter.MultiPageVertical'
        ];
    },

    //override added to turn off vertical resizer in the dialog
    showExportDialog    : function() {
        this.exportDialogConfig.scrollerDisabled = true;

        this.callParent(arguments);
    }

});
