/*
 * Copyright 2012-2015 Lucidsoft Inc. All rights reserved.
 * FILE: VsStore.js
 */
Ext.define('LeankorApp.store.VsStore', {
    extend : 'Ext.data.Store',
    fields: ['Id', 'leankor__BoardType__c', 'leankor__ProjectRoom__c' , 'Name'],
    storeId : 'vsStore',
});