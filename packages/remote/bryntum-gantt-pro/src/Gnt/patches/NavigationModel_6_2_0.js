// https://www.sencha.com/forum/showthread.php?332570-locked-view-and-header-are-out-of-sync-after-collapsing-node
// covered by 115_collapse_expand
Ext.define('Gnt.patches.NavigationModel_6_2_0', {
    extend: 'Sch.util.Patch',

    target: 'Ext.grid.NavigationModel',

    minVersion: '6.2.0',
    maxVersion: '7.1.9',

    overrides: {
        // "preventNavigation" is removed by Sencha in 7.2.0
        // See Gnt.patches.NavigationModel_7_2_0 which is designed to replace this patch
        focusPosition : function (position, preventNavigation) {
            // Only apply logic to gantt view
            if (!(this.view instanceof Gnt.view.Gantt) || !preventNavigation) {
                this.callParent(arguments);
            }
        }
    }
});
