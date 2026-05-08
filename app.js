/*
 * This file launches the application by asking Ext JS to create
 * and launch() the Application class.
 */
Ext.application({
    extend: 'LeankorApp.Application',

    name: 'LeankorApp',

    requires: [
        // This will automatically load all classes in the LeankorApp namespace
        // so that application classes do not need to require each other.
        'LeankorApp.view.MainViewport'
    ],

    // The name of the initial view to create.
    mainView: 'LeankorApp.view.MainViewport'
});
