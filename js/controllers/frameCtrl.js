"use strict";

function frameCtrl($scope, $route, App, $location) {
    $scope.isPage = function(pageName) {
        if ($location.path().indexOf(pageName) > -1) {
            return true;
        }
        else {
            return false;
        }
    }
}

