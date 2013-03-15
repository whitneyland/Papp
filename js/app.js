"use strict";

var app = angular.module('sportsSideApp', ['parseResource','ui', 'ui.bootstrap', 'ngGrid']);

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

app.directive('dndList', function() {
    return function(scope, element, attrs) {

        // variables used for dnd
        var toUpdate;
        var startIndex = -1;

        // watch the model, so we always know what element
        // is at a specific position
        scope.$watch(attrs.dndList, function(value) {
            toUpdate = value;
        },true);

        // use jquery to make the element sortable (dnd). This is called
        // when the element is rendered
        $(element[0]).sortable({
            items:'li',
            start:function (event, ui) {
                // on start we define where the item is dragged from
                startIndex = ($(ui.item).index());
            },
            stop:function (event, ui) {
                // on stop we determine the new index of the
                // item and store it there
                var newIndex = ($(ui.item).index());
                var toMove = toUpdate[startIndex];
                toUpdate.splice(startIndex,1);
                toUpdate.splice(newIndex,0,toMove);

                // we move items in the array, if we want
                // to trigger an update in angular use $apply()
                // since we're outside angulars lifecycle
                scope.$apply(scope.model);
            },
            axis:'y'
        })
    }
});

app.constant("PARSE_CONFIG",{
        defaultHeaders: {
            "X-Parse-Application-Id" : "VylSzcFwtgPW5P6YQAFyUbbSTM6rxYOzAcHgcHUr",
            "X-Parse-REST-API-Key" : "OIVfUmElXCfG7nAQDfkgY2XTbzpqfgnucq0Q5yPZ"
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