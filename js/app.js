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
app.constant("PARSE_CONFIG",{
        defaultHeaders: {
            "X-Parse-Application-Id" : "Your App Id Here",
            "X-Parse-REST-API-Key" : "Your REST api key here"
        },
        defaultParams: {}
    }
);

// Add angular directives for hammer.js
angular.forEach('hmTap:tap hmDoubletap:doubletap hmHold:hold hmTransformstart:transformstart hmTransform:transform hmTransforend:transformend hmDragstart:dragstart hmDrag:drag hmDragend:dragend hmSwipe:swipe hmRelease:release'.split(' '), function(name) {
    var directive = name.split(':');
    var directiveName = directive[0];
    var eventName = directive[1];
    app.directive(directiveName,
        ['$parse', function($parse) {
            return function(scope, element, attr) {
                var fn = $parse(attr[directiveName]);
                var opts = $parse(attr[directiveName + 'Opts'])(scope, {});
                element.hammer(opts).bind(eventName, function(event) {
                    scope.$apply(function() {
                        // console.log("Doing stuff", event);
                        fn(scope, {$event: event});
                    });
                });
            };
        }]);
});