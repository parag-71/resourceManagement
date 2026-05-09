/**
 @class Gnt.plugin.exporter.SinglePage
 @extends Sch.plugin.exporter.SinglePage

 This class extracts all scheduler data to fit in a single page.

 The exporterId of this exporter is `singlepage`
 */


Ext.define('Gnt.plugin.exporter.SinglePage', {

    extend : 'Sch.plugin.exporter.SinglePage',

    mixins : ['Gnt.plugin.exporter.mixin.DependencyPainter']

});
