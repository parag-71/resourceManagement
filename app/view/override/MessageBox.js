/**
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: MessageBox.js
 */
Ext.define('LeankorApp.view.override.MessageBox', {
    override: 'Ext.window.MessageBox',

   //</locale>
	/** @author Bhupendra to add custom Ui for buttons */
	buttonUIs: {
		ok: 'default',
		yes: 'default',
		no: 'default',
		cancel: 'default'
	},
	makeButton: function(btnIdx) {
        var btnId = this.buttonIds[btnIdx];

        return new Ext.button.Button({
            handler: this.btnCallback,
            itemId: btnId,
            scope: this,
			ui: this.buttonUIs[btnId], ///** @author Bhupendra
            text: this.buttonText[btnId],
            minWidth: 75
        });
    },
	 reconfigure: function(cfg) {
        var me = this,
            buttons = 0,
            hideToolbar = true,
            oldButtonText = me.buttonText,
			oldButtonUi = me.buttonUIs, // changes by @bhupendra
            resizer = me.resizer,
            header = me.header,
            headerCfg = header && !header.isHeader,
            message = cfg && (cfg.message || cfg.msg),
            buttonTips = cfg.buttonTips,
            title, iconCls, resizeTracker, width, height, i, textArea,
            textField, msg, progressBar, msgButtons, wait, tool;

        // Restore default buttonText before reconfiguring.
        me.updateButtonText();

        me.cfg = cfg = cfg || {};

        wait = cfg.wait;

        if (cfg.width) {
            width = cfg.width;
        }

        if (cfg.height) {
            height = cfg.height;
        }

        me.minWidth = cfg.minWidth || me.defaultMinWidth;
        me.maxWidth = cfg.maxWidth || me.defaultMaxWidth;
        me.minHeight = cfg.minHeight || me.defaultMinHeight;
        me.maxHeight = cfg.maxHeight || me.defaultMaxHeight;

        if ('maskClickAction' in cfg) {
            me.maskClickAction = cfg.maskClickAction;
        }
        else {
            delete me.maskClickAction;
        }

        if (resizer) {
            resizeTracker = resizer.resizeTracker;
            resizer.minWidth = resizeTracker.minWidth = me.minWidth;
            resizer.maxWidth = resizeTracker.maxWidth = me.maxWidth;
            resizer.minHeight = resizeTracker.minHeight = me.minHeight;
            resizer.maxHeight = resizeTracker.maxHeight = me.maxHeight;
        }

        // Previous default is rarely going to be valid
        delete me.defaultFocus;

        if (cfg.defaultFocus) {
            me.defaultFocus = cfg.defaultFocus;
        }

        // clear any old animateTarget
        me.animateTarget = cfg.animateTarget || undefined;

        // Defaults to modal
        me.modal = cfg.modal !== false;

        // Show the title/icon if a title/iconCls config was passed in the config
        // to either the constructor or the show() method. Note that anything
        // passed in the config should win.
        //
        // Note that if there is no title/iconCls in the config, check the headerCfg
        // and default to the instance properties. This works because there are default
        // values defined in initComponent.
        if (cfg.title != null) {
            title = cfg.title;
        }
        else if (headerCfg && header.title != null) {
            title = header.title;
        }
        else {
            title = me.title;
        }

        if (cfg.iconCls != null) {
            iconCls = cfg.iconCls;
        }
        else if (headerCfg && header.iconCls != null) {
            iconCls = header.iconCls;
        }
        else {
            iconCls = me.iconCls;
        }

        me.setTitle(title);
        me.setIconCls(iconCls);

        // Extract button configs
        if (Ext.isObject(cfg.buttons)) {
            me.buttonText = cfg.buttons;
            buttons = 0;
        }
        else {
            me.buttonText = cfg.buttonText || me.buttonText;
            buttons = Ext.isNumber(cfg.buttons) ? cfg.buttons : 0;
        }
		/**@author Bhupendra to changes UI*/
		if (Ext.isObject(cfg.buttonUIs)) {
			me.buttonUIs = cfg.buttonUIs;
		} else {
			me.buttonUIs = cfg.buttonUIs || me.buttonUIs;
		}
        Ext.each(me.buttonIds, function (buttonId) {
            me.msgButtons[buttonId].setTooltip((buttonTips && buttonTips[buttonId]) || null);
        });

        // Apply custom-configured buttonText
        // Infer additional buttons from the specified property names in the buttonText object
        buttons = buttons | me.updateButtonText();

        // Restore buttonText. Next run of reconfigure will restore to prototype's buttonText
        me.buttonText = oldButtonText;
		me.buttonUIs = oldButtonUi;  /**@author Bhupendra to changes UI*/

        // During the on render, or size resetting layouts, and in subsequent hiding and showing,
        // we need to suspend layouts, and flush at the end when the Window's children
        // are at their final visibility.
        Ext.suspendLayouts();

        me.width = me.height = null;

        if (width || height) {
            if (width) {
                me.setWidth(width);
            }

            if (height) {
                me.setHeight(height);
            }
        }

        if (!me.rendered) {
            me.render(Ext.getBody());
        }

        // Hide or show the close tool
        me.closable = cfg.closable !== false && !wait;

        // We need to redefine `header` because me.setIconCls() could create a Header instance.
        header = me.header;

        if (header) {
            tool = header.child('[type=close]');

            if (tool) {
                tool.setVisible(me.closable);
            }

            // Hide or show the header
            if (!cfg.title && !me.closable && !cfg.iconCls) {
                header.hide();
            }
            else {
                header.show();
            }
        }

        // Default to dynamic drag: drag the window, not a ghost
        me.liveDrag = !cfg.proxyDrag;

        // wrap the user callback
        me.userCallback = Ext.Function.bindCallback(
            cfg.callback || cfg.fn || Ext.emptyFn, cfg.scope || Ext.global
        );

        // Hide or show the icon Component
        me.setIcon(cfg.icon);

        // Hide or show the message area
        msg = me.msg;

        if (message) {
            msg.setHtml(message);
            msg.show();

            // As per WAI-ARIA spec, the alertdialog element should point to message element
            // via aria-describedby attribute.
            me.ariaEl.dom.setAttribute('aria-describedby', msg.id);
        }
        else {
            msg.hide();
            me.ariaEl.dom.removeAttribute('aria-describedby');
        }

        // WCAG 4.1.2 — Name, Role, Value: complete the alertdialog wiring.
        // aria-describedby (above) covers the message; aria-modal + aria-labelledby
        // come from AccessibilityUtil.setAriaModal which links the title element
        // and adds role=dialog + aria-modal=true.
        // bindEscapeToClose ensures ESC dismisses even when iframe content
        // would otherwise swallow the keypress.
        if (LeankorApp && LeankorApp.util && LeankorApp.util.AccessibilityUtil) {
            LeankorApp.util.AccessibilityUtil.setAriaModal(me);
            LeankorApp.util.AccessibilityUtil.initCloseToolAccessibility(me, false);
            LeankorApp.util.AccessibilityUtil.bindEscapeToClose(me);
        }

        // Hide or show the input field
        textArea = me.textArea;
        textField = me.textField;

        if (cfg.prompt || cfg.multiline) {
            me.multiline = cfg.multiline;

            if (cfg.multiline) {
                textArea.setValue(cfg.value);
                textArea.setHeight(cfg.defaultTextHeight || me.defaultTextHeight);
                textArea.show();
                textField.hide();
                me.defaultFocus = textArea;
            }
            else {
                textField.setValue(cfg.value);
                textArea.hide();
                textField.show();
                me.defaultFocus = textField;
            }

            // When either input field is displayed, it will reference the message component's
            // element via aria-labelledby. In such cases we need to remove aria-describedby
            // from the window ariaEl to avoid the message being announced twice.
            me.ariaEl.dom.removeAttribute('aria-describedby');
        }
        else {
            textArea.hide();
            textField.hide();
        }

        // Hide or show the progress bar
        progressBar = me.progressBar;

        if (cfg.progress || wait) {
            progressBar.show();
            me.updateProgress(0, cfg.progressText);
            me.defaultFocus = progressBar;

            if (wait) {
                progressBar.wait(wait === true ? cfg.waitConfig : wait);
            }
        }
        else {
            progressBar.hide();
        }

        // Hide or show buttons depending on flag value sent.
        msgButtons = me.msgButtons;

        for (i = 0; i < 4; i++) {
            if (buttons & Math.pow(2, i)) {

                // Default to focus on the first visible button if focus not already set
                if (!me.defaultFocus) {
                    me.defaultFocus = msgButtons[i];
                }

                msgButtons[i].show();
                hideToolbar = false;
            }
            else {
                msgButtons[i].hide();
            }
        }

        // Hide toolbar if no buttons to show
        if (hideToolbar) {
            me.bottomTb.hide();
        }
        else {
            me.bottomTb.show();
        }

        Ext.resumeLayouts(true);
    },
	/**
     * @private
     * Set button text according to current buttonText property object
     * @return {Number} The buttons bitwise flag based upon the button IDs specified
     * in the buttonText property.
     */
    updateButtonText: function() {
        var me = this,
            buttonText = me.buttonText,
			buttonUIs = me.buttonUIs, /**@author Bhupendra to changes UI*/
            buttons = 0,
            btnId, btn;


        for (btnId in buttonText) {
            if (buttonText.hasOwnProperty(btnId)) {
                btn = me.msgButtons[btnId];

                if (btn) {
                    if (me.cfg && me.cfg.buttonText) {
                        buttons = buttons | Math.pow(2, Ext.Array.indexOf(me.buttonIds, btnId));
                    }

                    if (btn.text !== buttonText[btnId]) {
                        btn.setText(buttonText[btnId]);
                    }
                }
            }
        }
		
		/**@author Bhupendra to changes UI*/
		for (btnUi in buttonUIs) {
			if (buttonUIs.hasOwnProperty(btnUi)) {
				btn = me.msgButtons[btnUi];
				if (btn) {
					if (btn.ui !== buttonUIs[btnUi]) {
						btn.addCls(buttonUIs[btnUi]);
					}
				}
			}
		}
        return buttons;
    },

});
