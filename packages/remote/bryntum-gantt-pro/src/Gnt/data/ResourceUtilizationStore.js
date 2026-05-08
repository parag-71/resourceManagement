/**
 * Special resource store for {@link Gnt.panel.ResourceUtilization} panel.
 */
Ext.define('Gnt.data.ResourceUtilizationStore', {
    extend : 'Sch.data.ResourceTreeStore',
    uses   : [
        'Gnt.data.ResourceUtilizationEventStore',
        'Gnt.model.Resource',
        'Gnt.model.Assignment',
        'Gnt.model.UtilizationEvent'
    ],

    mixins : [
        'Gnt.model.utilization.UtilizationNegotiationStrategyMixin'
    ],

    model      : 'Gnt.model.UtilizationResource',
    eventModel : 'Gnt.model.UtilizationEvent',

    autoDestroy : true,

    storeId : null,

    root  : { expanded : true },
    proxy : 'memory',

    folderSort : false,

    /**
     * @constructor
     */
    constructor : function (config) {
        var me = this;

        me.eventModel = Ext.ClassManager.get(this.eventModel);

        me.callParent([config]);

        me.initConfig([config]);

        if (!me.getEventStore()) {
            me.setEventStore(new Gnt.data.ResourceUtilizationEventStore({
                owner         : me,
                model         : me.eventModel,
                resourceStore : me
            }));
        }

        me.setupSorters();
    },

    destroy : function () {
        var me = this,
            eventStore = me.getEventStore();

        me.callParent(arguments);

        if (eventStore && eventStore.owner == me) {
            Ext.destroy(eventStore);
        }

        me.setEventStore(null);
    },

    setupSorters : function () {
        var me = this;

        me.setSorters([{
            sorterFn : function (a, b) {
                var result;

                // Sorting resources alphanumerically
                if (a.isSurrogateResource() && b.isSurrogateResource() && a.getName() > b.getName()) {
                    result = 1;
                }
                else if (a.isSurrogateResource() && b.isSurrogateResource() && a.getName() < b.getName()) {
                    result = -1;
                }
                else if (a.isSurrogateResource() && b.isSurrogateResource()) {
                    result = 0;
                }
                // Placing resources before assignments
                else if (a.isSurrogateResource() && b.isSurrogateAssignment()) {
                    result = 1;
                }
                else if (a.isSurrogateAssignment() && b.isSurrogateResource()) {
                    result = -1;
                }
                // Assignments are compared according to strategy
                else if (a.isSurrogateAssignment() && b.isSurrogateAssignment()) {
                    result = me.getUtilizationNegotiationStrategy().assignmentsComparator(a.getOriginalAssignment(), b.getOriginalAssignment());
                }
                else {
                    result = 0;
                }

                return result;
            }
        }]);
    },

    /**
     * Fills store using configured utilization negotiation strategy
     */
    fillStore : function() {
        return this.getUtilizationNegotiationStrategy().fillResourceUtilizationStore();
    },

    /**
     * Synchronizes store using configured utilization negotiation strategy
     */
    syncStore : function() {
        return this.getUtilizationNegotiationStrategy().syncResourceUtilizationStore();
    },

    /**
     * Returns this store (utilization information) model which corresponds to a particular original model: a resource or
     * an assignment.
     *
     * @param {Gnt.model.Resource|Gnt.model.Assignment} originalModel
     * @return {Gnt.model.UtilizationResource}
     */
    getModelByOriginal : function (originalModel) {
        var me = this;
        return me.getModelById(me.model.getSurrogateIdFor(originalModel));
    }
});
