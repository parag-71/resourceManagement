/*
 * FILE: AccessibilityUtil.js
 *
 * Reusable WCAG 2.1 AA helpers for the Resource Management app.
 * Singleton — wires live regions, focus outlines, ARIA labelling, and
 * keyboard navigation patterns used throughout the views.
 *
 * Initialised once from Application.launch() via init().
 */
Ext.define('LeankorApp.util.AccessibilityUtil', {
    singleton: true,
    alternateClassName: 'AccessibilityUtil',

    LIVE_REGION_ID: 'rm-a11y-live-region',
    LIVE_REGION_ID_ASSERTIVE: 'rm-a11y-live-region-assertive',
    FOCUS_OUTLINE_CLASS: 'a11y-keyboard-focus',

    _announceTimer: null,
    _announceTimerAssertive: null,
    _capturedFocus: null,
    _isKeyboard: false,

    /**
     * One-time bootstrap. Call from Application.launch().
     * Creates the live region and installs global mouse/key listeners that
     * track whether the user is currently driving with a keyboard.
     */
    init: function () {
        if (this._initialized) { return; }
        this._initialized = true;
        this.createLiveRegion();
        this.createLiveRegion(true);
        this.installKeyboardModeTracker();
        this.installGlobalEscapeHandler();
    },

    /**
     * Global ESC key handler — installed once at app launch.
     *
     * Closes whatever popup is open at the top of the visible stack:
     *   1. Expanded combo picker (most common case — every header dropdown)
     *   2. Visible floating menu (right-click menus, etc.)
     *   3. Topmost modal window (MessageBox, chatter Window, etc.)
     *   4. Any visible Ext.tip.ToolTip / Ext.tip.QuickTip
     *
     * Priority ordering matters: when a combo is expanded ON TOP of a modal
     * window, ESC should close the picker first (returning focus to the
     * combo), not the dialog underneath.
     *
     * Uses `capture: true` so it fires before component-level handlers that
     * might preventDefault, and stops propagation only when it actually
     * closed something — leaves other ESC behaviors (e.g. canceling cell
     * edits) untouched when no popup was open.
     */
    installGlobalEscapeHandler: function () {
        document.addEventListener('keydown', function (e) {
            if (e.keyCode !== 27 && e.key !== 'Escape') { return; }

            // ─────────────────────────────────────────────────────────────
            // Priority order (matters!):
            //
            //   1. Visible floating component that is NOT a combo's own
            //      BoundList picker. This catches Ext.Window, floating
            //      Ext.tree.Panel / Ext.grid.Panel (Projects picker,
            //      Departments user-list, Add-resources picker), Menu, etc.
            //
            //      We exclude BoundList because some header combos (e.g.
            //      projectFilter) attach an `expand` listener that opens a
            //      separate Ext.tree.Panel popup. ExtJS still considers the
            //      combo "expanded" while that popup is open. If we caught
            //      the BoundList here we'd hide it but leave the combo's
            //      internal state stale; better to fall through to step 2,
            //      which calls combo.collapse() and resets state cleanly.
            //
            //   2. Expanded combo — collapse(). For native combos this hides
            //      their BoundList AND resets internal state.
            //
            //   3. Visible tooltip / qtip.
            // ─────────────────────────────────────────────────────────────

            var floaters = Ext.ComponentQuery.query('component{isFloating()}{isVisible(true)}');
            // Drop combo BoundLists — those are owned by their combo and
            // get handled by combo.collapse() in step 2.
            floaters = floaters.filter(function (f) {
                return !(f.isBoundList || f.xtype === 'boundlist' || f.pickerField);
            });
            if (floaters.length) {
                floaters.sort(function (a, b) {
                    var za = (a.el && a.el.dom && parseInt(a.el.dom.style.zIndex, 10)) || 0;
                    var zb = (b.el && b.el.dom && parseInt(b.el.dom.style.zIndex, 10)) || 0;
                    return zb - za;
                });
                var top = floaters[0];
                if (top.closable !== false && typeof top.close === 'function') {
                    top.close();
                } else if (typeof top.hide === 'function') {
                    top.hide();
                } else {
                    return; // can't close, don't intercept
                }
                e.stopPropagation();
                return;
            }

            // 2. Expanded combo (BoundList case)
            var expandedCombo = Ext.ComponentQuery.query('combobox{isExpanded()}')[0];
            if (expandedCombo) {
                expandedCombo.collapse();
                e.stopPropagation();
                return;
            }

            // 3. Visible tooltip
            var tips = Ext.ComponentQuery.query('tooltip{isVisible(true)}, tip{isVisible(true)}');
            if (tips && tips.length) {
                tips[tips.length - 1].hide();
                e.stopPropagation();
                return;
            }

            // Nothing to close — let the event bubble (e.g. cell-edit ESC).
        }, true);
    },

    // ────────────────────────────────────────────────────────────────────────
    // Live region / announcements (WCAG 4.1.3 — Status Messages)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Create the singleton aria-live region used by announce(). Idempotent.
     * Two regions are managed:
     *   - polite (default): non-urgent updates, interrupted by user actions
     *   - assertive: errors / blocking validation that the user must hear
     *
     * @param {Boolean} [assertive]  if truthy, returns the assertive region
     */
    createLiveRegion: function (assertive) {
        var id = assertive ? this.LIVE_REGION_ID_ASSERTIVE : this.LIVE_REGION_ID;
        var el = document.getElementById(id);
        if (el) { return el; }
        el = document.createElement('div');
        el.id = id;
        el.setAttribute('role', assertive ? 'alert' : 'status');
        el.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
        el.setAttribute('aria-atomic', 'true');
        el.className = 'sr-only';
        document.body.appendChild(el);
        return el;
    },

    /**
     * Announce a string to screen readers via the polite live region.
     * Debounced (80 ms) so rapid arrow-key navigation doesn't queue stale text.
     *
     * The live region is **cleared 4 s after the announcement** so SR doesn't
     * re-read stale content (e.g. "1 of 1 resources match") whenever focus
     * moves to another element. NVDA/VoiceOver re-scan live regions on focus
     * change; if the region still has content, they replay it. Clearing it
     * after a brief grace period keeps announcements one-shot.
     *
     * @param {String} text
     */
    announce: function (text) {
        if (!text) { return; }
        var el = this.createLiveRegion();
        var me = this;
        clearTimeout(this._announceTimer);
        clearTimeout(this._announceClearTimer);
        el.textContent = '';
        this._announceTimer = setTimeout(function () {
            el.textContent = text;
            me._announceClearTimer = setTimeout(function () {
                el.textContent = '';
            }, 4000);
        }, 80);
    },

    /**
     * Announce a critical / error message via the ASSERTIVE live region —
     * screen readers interrupt their current speech to deliver this. Use
     * sparingly: drag-drop rejections, validation failures, blocking errors.
     *
     * Same clear-after-4s pattern as announce() — see the docstring there.
     *
     * @param {String} text
     */
    announceError: function (text) {
        if (!text) { return; }
        var el = this.createLiveRegion(true);
        var me = this;
        clearTimeout(this._announceTimerAssertive);
        clearTimeout(this._announceClearTimerAssertive);
        el.textContent = '';
        this._announceTimerAssertive = setTimeout(function () {
            el.textContent = text;
            me._announceClearTimerAssertive = setTimeout(function () {
                el.textContent = '';
            }, 4000);
        }, 50);
    },

    /**
     * Convenience: announce "{count} of {total} ... match" using the locale string.
     */
    announceFiltered: function (count, total) {
        var tpl = Locale.LocaleName.A11yFilteredCount || '{0} of {1} match';
        this.announce(Ext.String.format(tpl, count, total));
    },

    /**
     * Convenience: announce "{Name}, row {idx} of {total}" using the locale
     * string A11yRowAnnouncement. Used by grid keyboard navigation.
     *
     * @param {Ext.data.Model} record
     * @param {Number} idx     1-based or 0-based — caller's choice; this method
     *                         passes through verbatim into the format string.
     * @param {Number} total
     */
    announceRow: function (record, idx, total) {
        if (!record) { return; }
        var name = (typeof record.getName === 'function')
            ? record.getName()
            : (record.get && (record.get('Name') || record.get('name'))) || '';
        var tpl = Locale.LocaleName.A11yRowAnnouncement || '{0}, row {1} of {2}';
        this.announce(Ext.String.format(tpl, Ext.htmlEncode(name), idx, total));
    },

    /**
     * Toggle aria-busy on a component or DOM element. Pair with showing/hiding
     * a loading mask so screen readers know to wait. When `busy` becomes false,
     * also announces "Loading complete" via the polite region.
     *
     * @param {Ext.Component|HTMLElement} target
     * @param {Boolean} busy
     */
    setBusy: function (target, busy) {
        if (!target) { return; }
        var dom;
        if (target.nodeType === 1) { dom = target; }
        else if (target.el && target.el.dom) { dom = target.el.dom; }
        else if (target.getEl && target.getEl()) { dom = target.getEl().dom; }
        if (!dom) { return; }
        if (busy) {
            dom.setAttribute('aria-busy', 'true');
            this.announce(Locale.LocaleName.PleaseWait || 'Loading');
        } else {
            dom.removeAttribute('aria-busy');
            this.announce(Locale.LocaleName.A11yLoadingComplete || 'Loading complete');
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Combo aria-haspopup / aria-expanded wiring
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Wire aria-haspopup="listbox" + aria-expanded="false/true" on an Ext
     * combo. ExtJS doesn't toggle aria-expanded reliably across all picker
     * types, so we manage it ourselves via the combo's expand/collapse events.
     *
     * Call once after the combo is rendered; idempotent.
     *
     * @param {Ext.form.field.ComboBox} combo
     */
    wireComboAria: function (combo) {
        if (!combo || combo._a11yWired) { return; }
        combo._a11yWired = true;
        var apply = function () {
            var dom = (combo.inputEl && combo.inputEl.dom) ||
                      (combo.ariaEl && combo.ariaEl.dom) ||
                      (combo.el && combo.el.dom);
            if (!dom) { return; }
            dom.setAttribute('aria-haspopup', 'listbox');
            dom.setAttribute('aria-expanded', 'false');
            // Suppress "has auto complete" announcement. Every header combo
            // is `editable: false` (no typing) so autocomplete doesn't apply;
            // ExtJS adds aria-autocomplete="list" by default which makes
            // NVDA/VoiceOver say "has auto complete" misleadingly.
            dom.setAttribute('aria-autocomplete', 'none');
            // .combo-expanded is consumed by the header focus CSS in
            // all.scss to hide the combo trigger's outline while the
            // dropdown is open (focus visually moves to the picker items).
            combo.on('expand', function () {
                dom.setAttribute('aria-expanded', 'true');
                if (combo.el && combo.el.dom) { combo.el.dom.classList.add('combo-expanded'); }
            });
            combo.on('collapse', function () {
                dom.setAttribute('aria-expanded', 'false');
                if (combo.el && combo.el.dom) { combo.el.dom.classList.remove('combo-expanded'); }
            });
            // WCAG 2.1.1 Keyboard — Enter on a focused combo opens its picker.
            // ExtJS combos open on Down-arrow or Alt+Down, but keyboard users
            // expect Enter to "activate" the control. Without this, users
            // hitting Enter on Period / Settings / Show / Department / Project
            // get nothing.
            // Approach: synthesize a DOM click on the combo's chevron
            // trigger element. Mouse click works repeatedly (per user
            // testing) — going through the same DOM dispatch sidesteps
            // every state-management quirk that combo.expand() and
            // combo.onTriggerClick() expose.
            //
            // The single early-return is `picker.isVisible()`: if a real
            // BoundList picker is showing (Period / Settings / Show with
            // items), let ExtJS handle Enter for item selection.
            var onEnterExpand = function (e) {
                if (!e || e.getKey() !== e.ENTER) { return; }
                var pickerVisible = combo.picker &&
                    typeof combo.picker.isVisible === 'function' &&
                    combo.picker.isVisible();
                if (pickerVisible) { return; }
                e.stopEvent();
                var trigger = (typeof combo.getPickerTrigger === 'function')
                    ? combo.getPickerTrigger() : null;
                if (trigger && trigger.el && trigger.el.dom) {
                    trigger.el.dom.click();
                    return;
                }
                // Last-resort fallback for non-ComboBox pickers.
                combo.isExpanded = false;
                if (typeof combo.onTriggerClick === 'function') {
                    combo.onTriggerClick(combo, null, e);
                } else {
                    combo.expand();
                }
            };
            combo.on('keydown', onEnterExpand);
            if (combo.inputEl) { combo.inputEl.on('keydown', onEnterExpand); }
            if (combo.el)      { combo.el.on('keydown', onEnterExpand); }
        };
        if (combo.rendered) { apply(); }
        else { combo.on('afterrender', apply, null, { single: true }); }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Grid structural ARIA — role=grid / row / gridcell / columnheader,
    // aria-rowindex / aria-colindex / aria-rowcount / aria-colcount
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Add grid structural roles + aria indices/counts to an Ext grid. Re-runs
     * on store load and view refresh so indices stay correct after sort/filter.
     *
     * @param {Ext.grid.Panel} grid
     */
    wireGridAriaIndices: function (grid) {
        if (!grid || !grid.getView) { return; }
        var apply = function () {
            var view = grid.getView();
            if (!view || !view.el || !view.el.dom) { return; }
            var viewDom = view.el.dom;
            var store = view.getStore();
            var total = store ? store.getCount() : 0;
            // Grid container roles
            viewDom.setAttribute('role', 'grid');
            viewDom.setAttribute('aria-rowcount', total);
            // Column headers
            var headerCt = grid.headerCt || (grid.lockedGrid && grid.lockedGrid.headerCt);
            var cols = headerCt ? headerCt.getVisibleGridColumns() : [];
            viewDom.setAttribute('aria-colcount', cols.length);
            for (var i = 0; i < cols.length; i++) {
                if (cols[i].el && cols[i].el.dom) {
                    cols[i].el.dom.setAttribute('role', 'columnheader');
                    cols[i].el.dom.setAttribute('aria-colindex', i + 1);
                }
            }
            // Rows + cells
            var rows = viewDom.querySelectorAll('.x-grid-item, tr.x-grid-row');
            for (var r = 0; r < rows.length; r++) {
                rows[r].setAttribute('role', 'row');
                rows[r].setAttribute('aria-rowindex', r + 1);
                var cells = rows[r].querySelectorAll('td.x-grid-cell');
                for (var c = 0; c < cells.length; c++) {
                    cells[c].setAttribute('role', 'gridcell');
                    cells[c].setAttribute('aria-colindex', c + 1);
                }
                // For tree rows (AssignmentGrid), aria-expanded reflects state
                var rec = view.getRecord && view.getRecord(rows[r]);
                if (rec && rec.isLeaf && !rec.isLeaf()) {
                    rows[r].setAttribute('aria-expanded', rec.isExpanded() ? 'true' : 'false');
                }
            }
        };
        if (grid.rendered && grid.getView() && grid.getView().rendered) { apply(); }
        else { grid.on('viewready', apply, null, { single: true }); }
        grid.on('viewready', apply);
        var store = grid.getStore && grid.getStore();
        if (store) {
            store.on('refresh', apply);
            store.on('datachanged', apply);
            store.on('sort', apply);
            store.on('filterchange', apply);
        }
    },

    /**
     * Make an Ext.tree.Panel announce per-item content under NVDA / VoiceOver.
     *
     * ExtJS classic wraps each tree row in its own `<table role="presentation">`
     * with the real semantics on the inner `<tr role="row" aria-level="…">`.
     * `initPopupKeyboardNav` focuses that outer `<table>`, but a focused
     * `presentation`-role element drops out of the AT tree — so the inner ARIA
     * is invisible to NVDA and the row reads as silence.
     *
     * This helper, called after the tree renders / store loads / nodes
     * expand-collapse-select, walks each `.x-grid-item` outer table and:
     *
     *   - Replaces `role="presentation"` → `role="treeitem"` on the focused
     *     element so NVDA picks up the row.
     *   - Sets `aria-label` from `rec.get('Name')` (or `'text'`) so the row's
     *     content has an accessible name.
     *   - Lifts `aria-level`, `aria-expanded`, `aria-selected` from the inner
     *     `<tr>` up to the outer `<table>` (the focusable element needs them).
     *   - Sets `role="tree"` on the view container; adds
     *     `aria-multiselectable="true"` for `multiSelect: true` trees.
     *
     * Re-applies on store refresh / load / itemexpand / itemcollapse /
     * selectionchange so async data loads and user interaction stay in sync.
     *
     * @param {Ext.tree.Panel} treePanel
     */
    wireTreePopupAria: function (treePanel) {
        if (!treePanel) { return; }
        var apply = function () {
            var view = treePanel.getView && treePanel.getView();
            if (!view || !view.el || !view.el.dom) { return; }
            var viewDom = view.el.dom;
            viewDom.setAttribute('role', 'tree');
            if (treePanel.multiSelect) {
                viewDom.setAttribute('aria-multiselectable', 'true');
            }
            var rows = viewDom.querySelectorAll('.x-grid-item');
            Ext.Array.each(rows, function (row) {
                var rec = view.getRecord && view.getRecord(row);
                if (!rec) { return; }
                var name = (rec.get && (rec.get('Name') || rec.get('text'))) || '';
                row.setAttribute('role', 'treeitem');
                if (name) { row.setAttribute('aria-label', Ext.htmlEncode(name)); }
                // Lift tree-state from inner <tr> (ExtJS already populates it).
                var tr = row.querySelector('tr');
                if (tr) {
                    Ext.Array.each(['aria-level', 'aria-expanded', 'aria-selected'], function (attr) {
                        var val = tr.getAttribute(attr);
                        if (val !== null) { row.setAttribute(attr, val); }
                    });
                }
            });
        };
        // Defer slightly so any async content (proxy.data load) settles first.
        var schedule = function () { Ext.defer(apply, 50); };
        var store = treePanel.getStore && treePanel.getStore();
        if (store) {
            store.on('refresh', schedule);
            store.on('datachanged', schedule);
            store.on('load', schedule);
        }
        treePanel.on('itemexpand', schedule);
        treePanel.on('itemcollapse', schedule);
        treePanel.on('selectionchange', schedule);
        if (treePanel.rendered) { schedule(); }
        else { treePanel.on('afterrender', schedule, null, { single: true }); }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Aria-label / role helpers
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Set ariaLabel on an Ext component, working whether it's already
     * rendered or not. Use this for components that may be created before
     * the locale is loaded.
     */
    setAriaLabel: function (component, text) {
        if (!component || !text) { return; }
        component.ariaLabel = text;
        var apply = function () {
            if (component.ariaEl && component.ariaEl.dom) {
                component.ariaEl.dom.setAttribute('aria-label', text);
            } else if (component.el && component.el.dom) {
                component.el.dom.setAttribute('aria-label', text);
            }
        };
        if (component.rendered) { apply(); }
        else { component.on('afterrender', apply, null, { single: true }); }
    },

    /**
     * Mark a window/panel as a modal dialog: role=dialog, aria-modal=true,
     * aria-labelledby pointing at the title element.
     */
    setAriaModal: function (panel) {
        if (!panel) { return; }
        var apply = function () {
            var ariaDom = (panel.ariaEl && panel.ariaEl.dom) || (panel.el && panel.el.dom);
            if (!ariaDom) { return; }
            ariaDom.setAttribute('role', 'dialog');
            ariaDom.setAttribute('aria-modal', 'true');
            var titleCmp = panel.header && panel.header.titleCmp;
            var titleEl = titleCmp && titleCmp.el && titleCmp.el.dom;
            if (titleEl) {
                if (!titleEl.id) { titleEl.id = 'a11y-title-' + Ext.id(); }
                ariaDom.setAttribute('aria-labelledby', titleEl.id);
            }
        };
        if (panel.rendered) { apply(); }
        else { panel.on('afterrender', apply, null, { single: true }); }
    },

    /**
     * Configure an icon-only Ext button so it has a proper accessible name
     * and visible tooltip. Call from initComponent or pass into the button cfg.
     */
    markIconButton: function (button, label) {
        if (!button || !label) { return; }
        button.ariaLabel = label;
        if (!button.tooltip) { button.tooltip = label; }
        this.setAriaLabel(button, label);
    },

    // ────────────────────────────────────────────────────────────────────────
    // Focus management
    // ────────────────────────────────────────────────────────────────────────

    /** Returns true if the most recent input was a keyboard event. */
    isKeyboardActive: function () { return this._isKeyboard === true; },

    /**
     * Install once: tracks whether the user is currently keyboard-driven.
     * Used by views that want to apply outlines only on keyboard focus.
     */
    installKeyboardModeTracker: function () {
        var me = this;
        document.addEventListener('mousedown', function () { me._isKeyboard = false; }, true);
        document.addEventListener('keydown', function (e) {
            // Common navigation keys count as keyboard mode
            var k = e.keyCode;
            if (k === 9 || (k >= 32 && k <= 40) || k === 13 || k === 27) {
                me._isKeyboard = true;
            }
        }, true);
    },

    /**
     * Save current document.activeElement so we can restore it later
     * (e.g. before opening a modal).
     */
    captureFocus: function () {
        this._capturedFocus = document.activeElement;
    },

    /**
     * Restore focus saved by captureFocus(). Safe to call when nothing was
     * captured — falls back to body.
     */
    restoreFocus: function () {
        var el = this._capturedFocus;
        this._capturedFocus = null;
        if (el && typeof el.focus === 'function' && document.body.contains(el)) {
            el.focus();
        }
    },

    /**
     * Focus an Ext component by id (default) or component-query selector.
     */
    focusComponent: function (selector, useQuery) {
        var cmp = useQuery ? Ext.ComponentQuery.query(selector)[0] : Ext.getCmp(selector);
        if (cmp && typeof cmp.focus === 'function') { cmp.focus(); return; }
        if (cmp && cmp.el && cmp.el.dom) { cmp.el.dom.focus(); }
    },

    /**
     * Focus an Ext button only if it is enabled.
     */
    focusIfEnabled: function (btn) {
        if (btn && !btn.disabled && typeof btn.focus === 'function') { btn.focus(); }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Keyboard handlers — ESC, tab-trap
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Wire ESC-to-close on a panel. Call after the panel is rendered.
     */
    bindEscapeToClose: function (panel) {
        if (!panel) { return; }
        var apply = function () {
            if (!panel.el) { return; }
            panel.el.on('keydown', function (e) {
                if (e.getKey() === e.ESC) {
                    e.stopPropagation();
                    if (typeof panel.close === 'function') { panel.close(); }
                    else if (typeof panel.hide === 'function') { panel.hide(); }
                }
            });
        };
        if (panel.rendered) { apply(); }
        else { panel.on('afterrender', apply, null, { single: true }); }
    },

    /**
     * Generic Tab-trap. Cycles focus among the configured focusable
     * components inside `panel`. Call after panel is rendered.
     *
     * @param {Ext.panel.Panel} panel
     * @param {Object} opts
     * @param {Array} opts.focusables  Array of itemIds (string) or components.
     *                                 First-element Shift+Tab loops to last;
     *                                 last-element Tab loops to first.
     */
    setupTabTrap: function (panel, opts) {
        if (!panel || !opts || !opts.focusables || !opts.focusables.length) { return; }
        var resolve = function (entry) {
            if (typeof entry === 'string') { return panel.down('#' + entry); }
            return entry;
        };
        var apply = function () {
            if (!panel.el) { return; }
            panel.el.on('keydown', function (e) {
                if (e.getKey() !== e.TAB) { return; }
                var active = document.activeElement;
                var components = opts.focusables.map(resolve).filter(Boolean);
                if (!components.length) { return; }
                var firstEl = components[0].el && components[0].el.dom;
                var lastCmp = components[components.length - 1];
                var lastEl  = lastCmp.el && lastCmp.el.dom;
                if (e.shiftKey && firstEl && (active === firstEl || (firstEl.contains && firstEl.contains(active)))) {
                    e.stopEvent();
                    if (typeof lastCmp.focus === 'function') { lastCmp.focus(); }
                } else if (!e.shiftKey && lastEl && (active === lastEl || (lastEl.contains && lastEl.contains(active)))) {
                    e.stopEvent();
                    if (typeof components[0].focus === 'function') { components[0].focus(); }
                }
            });
        };
        if (panel.rendered) { apply(); }
        else { panel.on('afterrender', apply, null, { single: true }); }
    },

    /**
     * Insert a "Skip to main content" link as the first child of <body>.
     * The link is hidden via .sr-only-focusable styling; pressing Tab from
     * the URL bar reveals it, and Enter moves focus to the panel's body
     * element. Call once after the main panel is rendered.
     *
     * @param {Ext.Component} mainPanel - the panel whose body becomes the focus target
     */
    insertSkipLink: function (mainPanel) {
        if (document.querySelector('.skip-link[data-rm-skip]')) { return; }
        var label = (Locale.LocaleName && Locale.LocaleName.A11ySkipToMain) || 'Skip to main content';
        var link = document.createElement('a');
        link.href = '#';
        link.className = 'skip-link';
        link.textContent = label;
        link.setAttribute('data-rm-skip', 'true');
        link.addEventListener('click', function (e) {
            e.preventDefault();
            if (!mainPanel || !mainPanel.body || !mainPanel.body.dom) { return; }
            var dom = mainPanel.body.dom;
            if (!dom.hasAttribute('tabindex')) { dom.setAttribute('tabindex', '-1'); }
            dom.focus();
        });
        document.body.insertBefore(link, document.body.firstChild);
    },

    /**
     * Make a panel's close tool keyboard-accessible (tabindex=0, role=button,
     * aria-label). The Locale-driven label defaults to Locale.LocaleName.Close.
     */
    /**
     * Wire keyboard navigation inside a floating popup (project picker,
     * department user picker, add-resources picker, etc.).
     *
     * On every show:
     *   - Marks the popup as `role=dialog`, `aria-modal=true`, `aria-labelledby`
     *     via setAriaModal.
     *   - Makes the close tool focusable + labels it.
     *   - Auto-focuses the first focusable element inside (filter field →
     *     grid view → footer buttons → close tool).
     *
     * Tab trap: pressing Tab cycles through the same focusable list; Shift+Tab
     * walks the list in reverse. Wraps at both ends so focus never escapes
     * the popup.
     *
     * Single call replaces the per-popup wiring of grid tab-trap, paging-
     * button focus listeners, and Esc-to-close listeners. Each popup site
     * becomes one line.
     *
     * @param {Ext.Component} popup  The floating panel/grid/tree to wire.
     */
    initPopupKeyboardNav: function (popup) {
        if (!popup || popup._popupKbInited) { return; }
        popup._popupKbInited = true;
        var me = this;

        // Order: filter field → grid view → footer buttons → close tool.
        // Re-collected on every Tab so disabled/hidden buttons drop out as
        // their state changes (e.g. paging buttons enable/disable).
        var collectFocusables = function () {
            var list = [];
            if (!popup.el || !popup.el.dom) { return list; }
            // Top-docked text/search field.
            var filterField = popup.down('textfield');
            if (filterField && filterField.inputEl && filterField.isVisible(true)) {
                list.push(filterField.inputEl.dom);
            }
            // Grid / tree view itself.
            var view = (typeof popup.getView === 'function') ? popup.getView() : null;
            if (view && view.el && view.el.dom) {
                var viewDom = view.el.dom;
                if (!viewDom.hasAttribute('tabindex')) {
                    viewDom.setAttribute('tabindex', '0');
                }
                list.push(viewDom);
            }
            // Bottom-docked toolbar buttons (Prev/Next, Reset/Filter).
            Ext.Array.forEach(popup.query('toolbar button'), function (btn) {
                if (btn.el && btn.el.dom && !btn.disabled && btn.isVisible(true)) {
                    list.push(btn.el.dom);
                }
            });
            // Close (×) tool in the header.
            var closeTool = popup.down('tool[type=close]');
            if (closeTool && closeTool.el && closeTool.el.dom) {
                list.push(closeTool.el.dom);
            }
            return list;
        };

        var onShow = function () {
            me.setAriaModal(popup);
            me.initCloseToolAccessibility(popup, false);
            // Defer until DOM is painted and any async data has populated.
            Ext.defer(function () {
                var focusables = collectFocusables();
                if (!focusables.length || !focusables[0]) { return; }
                focusables[0].focus();

                // If the first focusable is a grid/tree view, also drill DOM
                // focus into the first row so Enter targets a real record
                // (otherwise focus is on the view container and Enter doesn't
                // fire cellclick — user had to Tab and Tab back to "wake
                // up" focus). If the store is still loading async data, wait
                // for the first store change and focus then.
                var view = (typeof popup.getView === 'function') ? popup.getView() : null;
                if (!view || !view.el || view.el.dom !== focusables[0]) { return; }

                var store = view.getStore && view.getStore();
                if (!store) { return; }

                var focusFirstRow = function () {
                    if (!store.getCount || !store.getCount()) { return false; }
                    var firstRec = store.getAt(0);
                    var node = view.getNode && view.getNode(firstRec);
                    if (!node) { return false; }
                    if (!node.hasAttribute('tabindex')) {
                        node.setAttribute('tabindex', '0');
                    }
                    node.focus();
                    var sm = popup.getSelectionModel && popup.getSelectionModel();
                    if (sm) { sm.select(firstRec); }
                    return true;
                };

                if (focusFirstRow()) { return; }

                // Store empty (data still loading). Wait for the next store
                // change, then focus + clean up the listener.
                var listener = function () {
                    if (focusFirstRow()) {
                        store.un('refresh', listener);
                        store.un('datachanged', listener);
                        store.un('load', listener);
                    }
                };
                store.on('refresh', listener);
                store.on('datachanged', listener);
                store.on('load', listener);
                // Also clean up if the popup closes before data arrives.
                popup.on('close', function () {
                    store.un('refresh', listener);
                    store.un('datachanged', listener);
                    store.un('load', listener);
                }, null, { single: true });
            }, 150);
        };

        popup.on('show', onShow);
        if (popup.isVisible && popup.isVisible()) { onShow(); }

        var wireTabTrap = function () {
            if (!popup.el || !popup.el.dom || popup.el.dom._popupTabTrapBound) { return; }
            popup.el.dom._popupTabTrapBound = true;
            popup.el.dom.addEventListener('keydown', function (e) {
                if (e.keyCode !== 9) { return; }   // Tab
                var focusables = collectFocusables();
                if (!focusables.length) { return; }
                var active = document.activeElement;
                var idx = focusables.indexOf(active);
                // If activeElement is *inside* one of the top-level focusables
                // (e.g. a row inside the grid view), find the containing one.
                if (idx === -1) {
                    for (var i = 0; i < focusables.length; i++) {
                        if (focusables[i].contains && focusables[i].contains(active)) {
                            idx = i;
                            break;
                        }
                    }
                }
                if (idx === -1) { return; }
                var next = e.shiftKey ? idx - 1 : idx + 1;
                // Wrap — cycle within the popup, never escape.
                if (next < 0) { next = focusables.length - 1; }
                if (next >= focusables.length) { next = 0; }
                e.preventDefault();
                e.stopPropagation();
                focusables[next].focus();
            }, true);
        };
        if (popup.rendered) { wireTabTrap(); }
        else { popup.on('afterrender', wireTabTrap, null, { single: true }); }
    },

    /**
     * Wire keyboard expand/collapse on an Ext.tree.Panel inside a popup.
     * Mirrors W3C ARIA tree-view convention:
     *   - Right Arrow: expand a collapsed non-leaf
     *   - Left Arrow:  collapse an expanded non-leaf
     *   - Enter on non-leaf (when `enterTogglesFolder: true`): toggle expand/collapse
     *     (Use this for trees where folders are NOT directly selectable —
     *     e.g. RM's Projects popup where only leaf "project" rows can be picked.)
     *
     * Enter on a leaf, and Enter on a non-leaf when `enterTogglesFolder: false`,
     * fall through to ExtJS's default keyboard handling (which fires the
     * panel's `cellclick` listener).
     *
     * @param {Ext.tree.Panel} treePanel
     * @param {Object} [opts]
     * @param {Boolean} [opts.enterTogglesFolder=false]
     * @param {Function} [opts.beforeExpand]  fn(record, doExpand) — called
     *   before expanding a non-leaf. Useful when children are loaded
     *   asynchronously: load them, then call doExpand().
     */
    wireTreeKeyboardNav: function (treePanel, opts) {
        if (!treePanel || treePanel._treeKbInited) { return; }
        treePanel._treeKbInited = true;
        opts = opts || {};
        var doExpandFor = function (rec, callback) {
            if (typeof opts.beforeExpand === 'function') {
                opts.beforeExpand(rec, callback);
            } else {
                callback();
            }
        };
        var ready = function () {
            var view = treePanel.getView();
            if (!view || !view.el || !view.el.dom) { return; }
            view.el.dom.addEventListener('keydown', function (e) {
                var sm = treePanel.getSelectionModel();
                var rec = sm && sm.getSelection()[0];
                if (!rec) { return; }
                // Right Arrow → expand
                if (e.keyCode === 39 && !rec.isLeaf() && !rec.isExpanded()) {
                    e.preventDefault();
                    e.stopPropagation();
                    doExpandFor(rec, function () { rec.expand(); });
                    return;
                }
                // Left Arrow → collapse
                if (e.keyCode === 37 && !rec.isLeaf() && rec.isExpanded()) {
                    e.preventDefault();
                    e.stopPropagation();
                    rec.collapse();
                    return;
                }
                // Enter on non-leaf (when configured) → toggle
                if (e.keyCode === 13 && !rec.isLeaf() && opts.enterTogglesFolder) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (rec.isExpanded()) {
                        rec.collapse();
                    } else {
                        doExpandFor(rec, function () { rec.expand(); });
                    }
                    return;
                }
            }, true);
        };
        if (treePanel.rendered && treePanel.getView() && treePanel.getView().rendered) {
            ready();
        } else {
            treePanel.on('viewready', ready, null, { single: true });
        }
    },

    initCloseToolAccessibility: function (panel, focusAfter) {
        if (!panel) { return; }
        var apply = function () {
            var closeTool = panel.down('tool[type=close]');
            if (closeTool && closeTool.el && closeTool.el.dom) {
                var dom = closeTool.el.dom;
                dom.setAttribute('tabindex', '0');
                dom.setAttribute('role', 'button');
                dom.setAttribute('aria-label', Locale.LocaleName.Close || 'Close');
                if (focusAfter) { dom.focus(); }
            }
        };
        if (panel.rendered) { apply(); }
        else { panel.on('afterrender', apply, null, { single: true }); }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Grid keyboard navigation (single tab stop, arrow nav, row/cell modes)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Wire arrow-key navigation to a grid view. Tab enters the grid once,
     * arrow keys move between rows and cells. Esc exits the grid back to
     * the previously focused element.
     *
     * @param {Ext.grid.Panel} grid
     * @param {Object} [opts]
     * @param {Function} [opts.announceRowFn]  fn(record) → string for SR announcement
     * @param {Function} [opts.announceCellFn] fn(record, col) → string
     */
    initGridKeyboardNavigation: function (grid, opts) {
        if (!grid || !grid.getView) { return; }
        opts = opts || {};
        var me = this;
        var view = grid.getView();
        if (!view) { return; }

        var ready = function () {
            var dom = view.el && view.el.dom;
            if (!dom) { return; }

            // Single tab stop: only the grid view itself is in the tab order.
            dom.setAttribute('tabindex', '0');

            // Helper — select row idx, scroll into view, fire row announcement.
            var gotoRow = function (idx) {
                var store = view.getStore();
                if (!store) { return null; }
                var total = store.getCount();
                if (!total) { return null; }
                idx = Math.max(0, Math.min(total - 1, idx));
                var rec = store.getAt(idx);
                if (!rec) { return null; }
                var sm = grid.getSelectionModel();
                if (sm) { sm.select(rec); }
                if (typeof view.focusRow === 'function') {
                    try { view.focusRow(rec); } catch (ignore) {}
                }
                if (opts.announceRowFn) {
                    me.announce(opts.announceRowFn(rec, idx, total));
                }
                return rec;
            };

            dom.addEventListener('keydown', function (e) {
                var KEY = { UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, ENTER: 13, ESC: 27, HOME: 36, END: 35, SPACE: 32 };
                var k = e.keyCode || e.which;
                if ([KEY.UP, KEY.DOWN, KEY.LEFT, KEY.RIGHT, KEY.ENTER, KEY.ESC, KEY.HOME, KEY.END, KEY.SPACE].indexOf(k) === -1) { return; }

                var store = view.getStore();
                if (!store || !store.getCount()) { return; }

                var sm = grid.getSelectionModel();
                var record = sm && sm.getSelection()[0];
                var rowIdx = record ? store.indexOf(record) : 0;
                var total = store.getCount();
                var isTreeRecord = record && typeof record.isLeaf === 'function';

                if (k === KEY.DOWN) {
                    e.preventDefault();
                    gotoRow(rowIdx + 1);
                } else if (k === KEY.UP) {
                    e.preventDefault();
                    gotoRow(rowIdx - 1);
                } else if (k === KEY.HOME) {
                    e.preventDefault();
                    gotoRow(0);
                } else if (k === KEY.END) {
                    e.preventDefault();
                    gotoRow(total - 1);
                } else if (k === KEY.RIGHT) {
                    // Treegrid: expand a collapsed non-leaf row.
                    // (For non-tree grids, no column navigation in the row
                    // model — left/right intentionally a no-op there.)
                    if (isTreeRecord && !record.isLeaf() && !record.isExpanded()) {
                        e.preventDefault();
                        record.expand();
                    }
                } else if (k === KEY.LEFT) {
                    if (isTreeRecord && !record.isLeaf() && record.isExpanded()) {
                        // Expanded → collapse
                        e.preventDefault();
                        record.collapse();
                    } else if (isTreeRecord && record.parentNode &&
                            typeof record.parentNode.isRoot === 'function' && !record.parentNode.isRoot()) {
                        // Already collapsed (or leaf) → move to parent
                        e.preventDefault();
                        var parentIdx = store.indexOf(record.parentNode);
                        if (parentIdx >= 0) { gotoRow(parentIdx); }
                    }
                } else if (k === KEY.ENTER || k === KEY.SPACE) {
                    if (typeof opts.onActivate === 'function' && record) {
                        e.preventDefault();
                        opts.onActivate(record, e);
                    }
                } else if (k === KEY.ESC) {
                    me.restoreFocus();
                }
            });
        };
        if (view.rendered) { ready(); }
        else { view.on('viewready', ready, null, { single: true }); }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Window splitter keyboard accessibility
    // (W3C ARIA Window Splitter pattern:
    //  https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Add APG Window Splitter pattern extras to an Ext Lockable splitter.
     *
     * ExtJS already ships role=separator, aria-orientation, tabindex=0,
     * and ←/↑/→/↓ resize via Ext.dd.DragTracker's KeyNav and
     * Ext.resizer.SplitterTracker.onResizeKeyDown — so we DON'T touch
     * those. We only add what the W3C pattern recommends but ExtJS
     * doesn't provide:
     *
     *   - aria-label (ExtJS leaves it blank; SR users hear nothing)
     *   - aria-valuenow / aria-valuemin / aria-valuemax (current width state)
     *   - Home → minimum width, End → maximum width
     *   - Live-region announcement of new width on each adjustment
     *
     * @param {Ext.panel.Panel} panel  Lockable panel (must expose lockedGrid)
     * @param {Object} [opts]
     * @param {Number} [opts.min=80]       Minimum locked-grid width in px
     * @param {Number} [opts.maxRatio=0.8] Max as fraction of panel width
     * @param {String} [opts.ariaLabel]    aria-label override
     */
    wireSplitterKeyboard: function (panel, opts) {
        if (!panel) { return; }
        opts = opts || {};
        var min      = opts.min      || 80;
        var maxRatio = opts.maxRatio || 0.8;
        var me = this;

        var apply = function () {
            var splitter = panel.down && panel.down('splitter');
            if (!splitter || !splitter.el || !splitter.el.dom) { return; }
            var dom = splitter.el.dom;
            if (dom._a11ySplitterBound) { return; }
            dom._a11ySplitterBound = true;

            var lockedGrid = panel.lockedGrid;
            if (!lockedGrid) { return; }

            var maxWidth = function () {
                var panelW = (panel.getWidth && panel.getWidth()) || window.innerWidth;
                return Math.max(min + 100, Math.floor(panelW * maxRatio));
            };

            var updateAria = function () {
                dom.setAttribute('aria-valuenow', lockedGrid.getWidth());
                dom.setAttribute('aria-valuemin', min);
                dom.setAttribute('aria-valuemax', maxWidth());
            };

            dom.setAttribute('aria-label',
                opts.ariaLabel || (Locale && Locale.LocaleName && Locale.LocaleName.A11ySplitter) || 'Resize divider');
            updateAria();

            // Home → min, End → max. ExtJS handles ←/↑/→/↓ itself.
            dom.addEventListener('keydown', function (e) {
                var k = e.keyCode;
                if (k !== 36 && k !== 35) { return; }
                var current = lockedGrid.getWidth();
                var newW = k === 36 ? min : maxWidth();
                if (newW === current) { return; }
                e.preventDefault();
                e.stopPropagation();
                lockedGrid.setWidth(newW);
                if (panel.updateLayout) { panel.updateLayout(); }
                updateAria();
                if (Locale && Locale.LocaleName && Locale.LocaleName.A11ySplitterResized) {
                    me.announce(Ext.String.format(Locale.LocaleName.A11ySplitterResized, newW));
                }
            });

            // Re-sync aria-valuenow + announce after every resize (mouse OR
            // ExtJS's built-in arrow-key resize).
            if (lockedGrid.on) {
                lockedGrid.on('resize', function () {
                    updateAria();
                    if (Locale && Locale.LocaleName && Locale.LocaleName.A11ySplitterResized) {
                        me.announce(Ext.String.format(Locale.LocaleName.A11ySplitterResized, lockedGrid.getWidth()));
                    }
                });
            }
        };

        if (panel.rendered) { apply(); }
        else { panel.on('afterrender', apply, null, { single: true }); }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Reflow (WCAG 1.4.10) — viewport constraints + zoom-aware popup decorator
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Reposition a floating component so it sits inside the viewport
     * (accounts for scroll offset). Used by reflow logic AND by other
     * a11y code that re-positions a window after layout changes.
     *
     * @param {Ext.Component} win  Floating component with getPosition / getWidth / getHeight / setPosition
     */
    constrainToViewport: function (win) {
        if (!win) { return; }
        var scrollX = window.pageXOffset || 0;
        var scrollY = window.pageYOffset || 0;
        var pos = win.getPosition();
        var maxX = scrollX + window.innerWidth - win.getWidth() - 5;
        var maxY = scrollY + window.innerHeight - win.getHeight() - 5;
        win.setPosition(
            Math.max(scrollX, Math.min(pos[0], maxX)),
            Math.max(scrollY, Math.min(pos[1], maxY))
        );
    },

    /**
     * Decorate a floating popup (tree/grid panel with floating: true) so
     * that under `html.x-zoom-overflow` it caps height to ~90 vh and stays
     * inside the viewport. Caller is responsible for adding
     * `draggable: true` / `constrain: true` to the popup config so the user
     * can drag-relocate. WCAG 1.4.10.
     *
     * @param {Ext.Component} popup  Floating panel (tree, grid, custom)
     */
    decoratePopup: function (popup) {
        if (!popup || popup._wcagDecorated) { return; }
        popup._wcagDecorated = true;
        var me = this;
        var apply = function () {
            if (!document.documentElement.classList.contains('x-zoom-overflow')) { return; }
            var maxH = Math.floor(window.innerHeight * 0.9);
            if (popup.getHeight() > maxH) { popup.setMaxHeight(maxH); }
            me.constrainToViewport(popup);
        };
        popup.on('show', apply);
        var resizeHandler = function () {
            if (popup.isVisible && popup.isVisible()) { apply(); }
        };
        window.addEventListener('resize', resizeHandler);
        popup.on('destroy', function () {
            window.removeEventListener('resize', resizeHandler);
        });
    },

    /**
     * One-time global setup for WCAG 1.4.10 Reflow + 4.1.3 Status Messages:
     *
     *   - Patch `Ext.Element.getViewportWidth` so panels keep filling the
     *     design width when zoomed (innerWidth shrinks with zoom; outerWidth
     *     doesn't). Document scrolls horizontally instead of clipping
     *     toolbar items.
     *   - Toggle `html.x-zoom-overflow` on `resize` so SCSS rules can scope
     *     reflow-only styles.
     *   - Override `Ext.window.Window.afterRender` to cap height/width AND
     *     reposition into the viewport when zoomed (reflow for popups).
     *   - Override `Ext.menu.Menu.onShow` similarly.
     *   - Override `Ext.AbstractComponent.setLoading` to also toggle
     *     aria-busy + announce "Loading"/"Loading complete" via the live
     *     region (WCAG 4.1.3).
     *
     * Idempotent — guarded by component-level flags so re-invocation is
     * a no-op. Call once from MainViewport.initComponent.
     */
    bootReflowOverrides: function () {
        var util = this;

        // Preserve full design layout width on browser zoom.
        var isInIframe = window !== window.parent;
        var outerHint = (!isInIframe && window.outerWidth > 0) ? window.outerWidth - 16 : 0;
        var MIN_VIEWPORT_WIDTH = Math.max(window.innerWidth, outerHint, 1024);
        if (!Ext.Element._wcagViewportWidthApplied) {
            Ext.Element._wcagViewportWidthApplied = true;
            var origGetViewportWidth = Ext.Element.getViewportWidth;
            Ext.Element.getViewportWidth = function () {
                return Math.max(origGetViewportWidth.call(this), MIN_VIEWPORT_WIDTH);
            };
        }
        document.documentElement.style.setProperty('--min-viewport-width', MIN_VIEWPORT_WIDTH + 'px');
        var updateZoomOverflow = function () {
            var cl = document.documentElement.classList;
            if (window.innerWidth < MIN_VIEWPORT_WIDTH) { cl.add('x-zoom-overflow'); }
            else                                       { cl.remove('x-zoom-overflow'); }
        };
        window.addEventListener('resize', updateZoomOverflow);
        updateZoomOverflow();

        // Constrain Window AND Menu vertically + horizontally when zoomed.
        if (!Ext.window.Window._wcagVerticalApplied) {
            Ext.window.Window._wcagVerticalApplied = true;
            Ext.override(Ext.window.Window, {
                afterRender: function () {
                    this.callParent(arguments);
                    var win = this;
                    var fit = function () {
                        if (!document.documentElement.classList.contains('x-zoom-overflow')) { return; }
                        var vh = window.innerHeight;
                        var vw = window.innerWidth;
                        if (win.getHeight() > vh) { win.setMaxHeight(vh); }
                        if (win.getWidth()  > vw) { win.setMaxWidth(vw);  }
                        util.constrainToViewport(win);
                    };
                    fit();
                    // Re-fit on every subsequent show — covers Ext.Msg
                    // singleton reuse (afterRender only fires on first show).
                    win.on('show', fit);
                    var resizeHandler = function () { fit(); };
                    window.addEventListener('resize', resizeHandler);
                    win.on('destroy', function () {
                        window.removeEventListener('resize', resizeHandler);
                    });
                }
            });
            Ext.override(Ext.menu.Menu, {
                onShow: function () {
                    this.callParent(arguments);
                    if (!document.documentElement.classList.contains('x-zoom-overflow')) { return; }
                    var vh = window.innerHeight;
                    var maxH = Math.floor(vh * 0.9);
                    if (this.getHeight() > maxH) { this.setMaxHeight(maxH); }
                    var pos = this.getPosition();
                    if (pos[1] + this.getHeight() > vh) {
                        this.setPosition(pos[0], Math.max(0, vh - this.getHeight()));
                    }
                }
            });
        }

        // setLoading → aria-busy + live-region announcement (WCAG 4.1.3).
        if (!Ext.AbstractComponent._wcagSetLoadingApplied) {
            Ext.AbstractComponent._wcagSetLoadingApplied = true;
            Ext.override(Ext.AbstractComponent, {
                setLoading: function (load) {
                    var ret = this.callParent(arguments);
                    var busy = (load !== false && load != null);
                    util.setBusy(this, busy);
                    return ret;
                }
            });
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // Roving tabindex for item grids (e.g. radio lists, color pickers)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Initialise a roving-tabindex inside a container.
     *
     * @param {Object} cfg
     * @param {HTMLElement} cfg.container
     * @param {String} cfg.itemSelector  CSS selector of focusable items inside container
     * @param {Number} [cfg.columns]  Items per row (for Up/Down wrapping). Default 1.
     * @param {Function} [cfg.onActivate]  fn(item) called on Enter/Space.
     */
    initRovingTabindex: function (cfg) {
        if (!cfg || !cfg.container || !cfg.itemSelector) { return; }
        var container = cfg.container;
        var items = function () { return container.querySelectorAll(cfg.itemSelector); };
        var all = items();
        if (!all.length) { return; }
        for (var i = 0; i < all.length; i++) {
            all[i].setAttribute('tabindex', i === 0 ? '0' : '-1');
        }
        var cols = cfg.columns || 1;
        container.addEventListener('keydown', function (e) {
            var list = items();
            var current = -1;
            for (var i = 0; i < list.length; i++) {
                if (list[i] === document.activeElement) { current = i; break; }
            }
            if (current === -1) { return; }
            var next = current;
            if (e.keyCode === 39) { next = current + 1; }
            else if (e.keyCode === 37) { next = current - 1; }
            else if (e.keyCode === 40) { next = current + cols; }
            else if (e.keyCode === 38) { next = current - cols; }
            else if ((e.keyCode === 13 || e.keyCode === 32) && cfg.onActivate) {
                e.preventDefault();
                cfg.onActivate(list[current]);
                return;
            } else { return; }
            if (next < 0 || next >= list.length) { return; }
            e.preventDefault();
            list[current].setAttribute('tabindex', '-1');
            list[next].setAttribute('tabindex', '0');
            list[next].focus();
        });
    }
});
