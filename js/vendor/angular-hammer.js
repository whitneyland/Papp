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