"use strict";

function parseAppCtrl($scope, $route, App, $location) {

    $scope.app_id = App.getAppKey();
    $scope.api_key = App.getRestKey();
    $scope.schema = App.getSchemaString();
    $scope.status = "";

    $scope.save = function() {
        var s = $scope.schema.trim();
        if (s[s.length-1]===";") {
            s = s.substring(0, s.length-1);
        }
        $scope.schema = s;
        if (s[0]!=='[') {
            alert("The schema must be a JSON array.  It should start with '[' and end with ']'.");
            return;
        }
        try {
            JSON.parse(s);
        } catch (e) {
            alert("The schema must be a JSON array.  It should start with '[' and end with ']' and must be valid JSON.");
            return false;
        }
        localStorage.parseAppSchema = $scope.schema;
        localStorage.parseAppKey = $scope.app_id.trim();
        localStorage.parseRestKey = $scope.api_key.trim();

        App.getAppStatus().
        then(function (status) {
            $scope.status = status;
        },function(error) {
            $scope.error = status;
        });
    };

    $scope.disableSave = function() {
        if (!$scope.schema || $scope.schema.length===0) {
            return true;
        }
        if (!$scope.app_id || $scope.app_id.length===0) {
            return true;
        }
        if (!$scope.api_key || $scope.api_key.length===0) {
            return true;
        }
        return false;
    };

    $scope.remove = function() {
        delete localStorage.parseAppKey;
        delete localStorage.parseRestKey;
        delete localStorage.parseAppSchema;
        App.collections = [];
        $scope.app_id = "";
        $scope.api_key = "";
        $scope.schema = "";
    };
}

