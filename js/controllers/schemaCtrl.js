"use strict";

function schemaCtrl($q, $scope, $http, App, Parse, $location) {

    if (!App.hasAppInfo()) {
        $location.path('/ParseApp');
    }

    App.loadSchema();
    $scope.oneAtATime = true;
}

