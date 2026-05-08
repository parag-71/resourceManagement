/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: SettingsStore.js
 */
Ext.define('LeankorApp.store.SettingsStore', {
    extend : 'Ext.data.Store',
    fields: ['name', 'value'],
    storeId : 'settingsStore',
    
});