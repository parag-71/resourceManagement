Ext.define('LeankorApp.view.override.LinesToolTip', {
    override: 'Sch.plugin.Lines',
    init: function (scheduler) {
		var me = this;
		
        if (typeof this.innerTpl === 'string') {
            this.innerTpl = new Ext.XTemplate(this.innerTpl);
        }

        this.side = scheduler.rtl ? 'right' : 'left';

        var innerTpl = this.innerTpl;

        if (!this.template) {
            this.template = new Ext.XTemplate(
                    '<tpl for=".">',
                    '<div id="{id}" ' + (this.showTip ? 'title="{[this.getTipText(values)]}" ' : '') + 'class="{$cls}" style="' + this.side + ':{left}px;top:{top}px;width:{width}px">' +
                    (innerTpl ? '{[this.renderInner(values)]}' : '') +
                    '</div>',
                    '</tpl>', {
                    getTipText: function (values) {
                       if (me.store && me.store.data) {
							if (me.store.data.length) {
								var storeData = me.store.data.items[0].data;
								if (storeData && storeData.Text != Locale.LocaleName.CurrentTime && storeData.Text == "Current time") {
									storeData.Text = Ext.htmlEncode(Locale.LocaleName.CurrentTime);
									me.store.setData([storeData]);
								}

							}

						}
                    },

                    renderInner: function (values) {
                        return innerTpl.apply(values);
                    }
                });
        }

        this.callParent(arguments);
    }
});
