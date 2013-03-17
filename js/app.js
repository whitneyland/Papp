"use strict";

var app = angular.module('pApp', ['parseResource','ui', 'ui.bootstrap', 'ngGrid']);

app.config(function($routeProvider) {
    $routeProvider.
        when('/Schema', {templateUrl: '/partials/schema.html', controller: schemaCtrl}).
        when('/Query', {templateUrl: '/partials/query.html', controller: queryCtrl}).
        when('/ParseApp', {templateUrl: '/partials/parseApp.html', controller: parseAppCtrl}).
        when('/Discuss', {templateUrl: '/partials/discuss.html', controller: discussCtrl}).
        otherwise({redirectTo: 'Query'});
});

app.controller('frameCtrl', frameCtrl);
app.factory('Parse', function ($parseResource) { return $parseResource(); });
app.service('App', appService);


// To use the angularjs $resource layer, add parse.com keys here
// These keys are not used for the Query Builder gui.  For the gui you will be prompted to enter keys at runtime.
app.constant("PARSE_CONFIG",{
        defaultHeaders: {
            "X-Parse-Application-Id" : "Your App Id Here",
            "X-Parse-REST-API-Key" : "Your REST api key here"
        },
        defaultParams: {}
    }
);
