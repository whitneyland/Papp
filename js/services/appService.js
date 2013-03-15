function appService($rootScope, $http, $location, $window) {

    $rootScope.app = this;  // Make App service available to HTML views

    this.dataUrl = "https://api.parse.com/1/classes/";
    this.collections = [];

    this.getAppKey = function() {
        return localStorage.parseAppKey ? localStorage.parseAppKey : "";
    }

    this.getRestKey = function() {
        return localStorage.parseRestKey ? localStorage.parseRestKey : "";
    }

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
    }

    this.getSchemaString = function() {
        return localStorage.parseAppSchema ? localStorage.parseAppSchema : "";
    }

    this.hasAppInfo = function() {
        if (!localStorage.parseAppKey || !localStorage.parseRestKey || !localStorage.parseAppSchema)
            return false;
        else
            return true;
    }

    this.getAppStatus = function() {
        if (!this.hasAppInfo())
            return "Settings are incorrect.";
        this.loadSchema();
        if (this.collections.length == 0)
            return "No collections found.";
        var collection =  this.collections[0];
        var url = this.dataUrl + collection.id;
        var params = { limit: 0, count: 1 };
        return $http.get(url, {params: params, headers:this.getHeaders()}).
        then(function (data) {
            var s = "Working!  Found " + data.data.count + " items in first collection " + collection.id;
            return s;
        },function(error) {
            var s = "error status: " + error.status + " " + error.data.error;
            return s;
        });
    }

    this.getHeaders = function() {
        return {
            "X-Parse-Application-Id" : this.getAppKey(),
            "X-Parse-REST-API-Key" : this.getRestKey()
        };
    }

    this.hasLocalStorage = function() {
        return (typeof(Storage)!=="undefined");
    }

    $rootScope.$on('$viewContentLoaded', function() {
        $window._gaq.push(['_trackPageview', $location.path()]);
    });
}

