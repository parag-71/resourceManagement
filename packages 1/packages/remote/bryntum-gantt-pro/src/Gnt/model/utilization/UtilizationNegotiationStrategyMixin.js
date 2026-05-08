/**
 * The mixin adds utilization negotiation strategy config
 */
Ext.define('Gnt.model.utilization.UtilizationNegotiationStrategyMixin', {

    extend : 'Ext.Mixin',

    uses : [
        'Gnt.model.utilization.DefaultUtilizationNegotiationStrategy'
    ],

    config : {
        /**
         * @cfg {Gnt.model.utilization.DefaultUtilizationNegotiationStrategy} utilizationNegotiationStrategy
         */
        utilizationNegotiationStrategy : null
    },

    applyUtilizationNegotiationStrategy : function(strategy) {
        // <debug>
        Ext.Assert && Ext.Assert.truthy(
            strategy == null || strategy instanceof Gnt.model.utilization.DefaultUtilizationNegotiationStrategy,
            'Strategy class invalid!'
        );
        // </debug>

        return (strategy || (strategy == null && strategy)) || undefined;
    }
});
