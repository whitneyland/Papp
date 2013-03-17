"use strict";

function appService($rootScope, $http, $location, $window) {

    $rootScope.app = this;  // Make App service available to HTML views

    this.dataUrl = "https://api.parse.com/1/classes/";
    this.collections = [];

    this.getAppKey = function() {
        return localStorage.parseAppKey ? localStorage.parseAppKey : "";
    };

    this.getRestKey = function() {
        return localStorage.parseRestKey ? localStorage.parseRestKey : "";
    };

    this.loadSchema = function() {
        if (this.collections.length > 0)
            return this.collections;
        if (!localStorage.parseAppSchema)
            return [];
        var array = JSON.parse(localStorage.parseAppSchema);
        for (var i=0; i<array.length; i++) {
            var collection = array[i];
            if (collection.id[0] != "_")
                this.collections.push(collection);
        }
        return this.collections;
    };

    this.getSchemaString = function() {
        return localStorage.parseAppSchema ? localStorage.parseAppSchema : "";
    };

    this.hasAppInfo = function() {
        if (!localStorage.parseAppKey || !localStorage.parseRestKey || !localStorage.parseAppSchema) {
            return false;
        }
        else {
            return true;
        }
    };

    this.isAppReady = function() {
        var status = { };
        if (!this.hasAppInfo()) {
            status.ready = false;
            status.error = "Incorrect settings.";
            return status;
        }
        this.loadSchema();
        if (this.collections.length == 0) {
            status.ready = false;
            status.error = "No collections found.";
            return status;
        }
        var collection =  this.collections[0];
        var url = this.dataUrl + collection.id;
        var params = { limit: 0, count: 1 };
        return $http.get(url, {params: params, headers:this.getHeaders()}).
        then(function (data) {
            status.ready = true;
            status.class = collection.id;
            status.count = data.data.count;
            return status;
        },function(error) {
            status.ready = false;
            status.error = error.status + " " + error.data.error;
            throw status;
        });
    };

    this.getHeaders = function() {
        return {
            "X-Parse-Application-Id" : this.getAppKey(),
            "X-Parse-REST-API-Key" : this.getRestKey()
        };
    }

    this.hasLocalStorage = function() {
        return (typeof(Storage)!=="undefined");
    };

    $rootScope.$on('$viewContentLoaded', function() {
        if ($window._gaq) {
            $window._gaq.push(['_trackPageview', $location.path()]);
        }
    });
}

