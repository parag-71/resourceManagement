Ext.define('Gnt.field.ShowInTimeline', {
    extend                  : 'Ext.form.field.Checkbox',

    mixins                  : ['Gnt.field.mixin.TaskField', 'Gnt.mixin.Localizable'],

    alias                   : 'widget.showintimelinefield',

    alternateClassName      : ['Gnt.widget.ShowInTimelineField'],

    fieldProperty           : 'showInTimelineField',
    setTaskValueMethod      : 'setShowInTimeline',
    getTaskValueMethod      : 'getShowInTimeline',

    valueToVisible : function (value) {
        return value ? this.L('yes') : this.L('no');
    },

    setValue : function (value) {
        this.callParent(arguments);

        if (this.instantUpdate && !this.getSuppressTaskUpdate() && this.task) {
            // apply changes to task
            this.applyChanges();
        }
    }
});

