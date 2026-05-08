/**
 * Special event store for {@link Gnt.datal.ResourceUtilizationStore} resource store.
 */
Ext.define('Gnt.data.ResourceUtilizationEventStore', {
    extend             : 'Sch.data.EventStore',
    model              : 'Gnt.model.UtilizationEvent',

    storeId            : null,

    /**
     * Returns this store (utilization information) model which corresponding to particular original model a resource or
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
