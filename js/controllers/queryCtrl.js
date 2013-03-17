"use strict";

function queryCtrl($q, $scope, $http, App, Parse, $timeout, $location) {

    $scope.queries = [];

    $scope.operators = [
        { name: "$e", type: "equality", description: "=" },
        { name: "$gt", type: "equality", description: ">" },
        { name: "$gte", type: "equality", description: ">=" },
        { name: "$lt", type: "equality", description: "<" },
        { name: "$lte", type: "equality", description: "<=" },
        { name: "$ne", type: "equality", description: "not equal" },
        { name: "$in", type: "set", description: "in list" },
        { name: "$nin", type: "set", description: "not in list" },
        { name: "$all", type: "set", description: "all in list" },
        { name: "$regex", type: "regex", description: "regex" },
        { name: "$exists", type: "exists", description: "exists" },
        { name: "$select", type: "query", description: "select" },
        { name: "$dontSelect", type: "query", description: "not select" },
        { name: "$and", type: "group", description: "and" },
        { name: "$or", type: "group", description: "or" }
    ];

    var operatorsAllowed = {
        string:["$e", "$ne", "$exists", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$regex"],
        number:["$e", "$ne", "$exists", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"],
        date:["$e", "$ne", "$exists", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"],
        pointer:["$e", "$ne", "$exists", "$in", "$nin"],
        array:["$e", "$ne", "$exists", "$all"],
        boolean:["$e", "$ne", "$exists"],
        file:["$e", "$ne", "$exists", "$in", "$nin"]
    };

    $scope.formats = [
        { name: "REST", description: "", transform: restTransform },
        { name: "Javascript", description: "Parse Javascript SDK", transform: jsTransform },
        { name: "Objective-C", description: "Parse iOS SDK", transform: iOSTransform },
        { name: "Normalized", description: "Normalized JSON query syntax", transform: normalForm }
    ];

    $scope.outputFormat = $scope.formats[0];

    $scope.executeQuery = function(query) {
        if (!App.hasAppInfo()) {
            $location.path('/ParseApp');
            return;
        }

        $scope.status = "sending request...";
        $scope.busy = true;

        var url = getBaseUrl(query);
        var expression = restTransformExpression(query);
        var params = { where : expression, limit:25 };
        var countParams = { where : expression, limit:0, count:1 };

        $http.get(url, {params: countParams, headers:App.getHeaders()}).
        then(function (data) {
            $scope.status = "found " + data.data.count;
            $http.get(url, {params: params,headers:App.getHeaders()}).
            then(function (data) {
                $scope.result = data.data.results;
                $scope.busy = false;
                setColumns(query, $scope.gridOptions);
            },
            function(error) {
                throw error;
            });
        },function(error) {
            $scope.status = "error status: " + error.status + " " + error.data.error;
            $scope.busy = false;
        });
    };

    $scope.getOperatorsByType = function(type) {
        var operators = operatorGroups[type];
        return operators;
    };

    $scope.transformQuery = function(query, format) {
        if (!query || !query.collection) {
            return "";
        }
        return format.transform(query);
    };

    $scope.addCondition = function(query, node) {
        var condition = getDefaultCondition(query, node);
        node.nodes.push(condition);
        condition.show = true;
        annotateQuery(query);
        $timeout(function() {
            condition.show = false;
        }, 500);
    };

    $scope.removeCondition = function(query, node) {
        removeNode(query, node);
    };

    $scope.addAndGroup = function(query, node) {
        addGroup(query, node, "$and");
    };

    $scope.addOrGroup = function(query, node) {
        addGroup(query, node, "$or");
    };

    $scope.getParentOperator = function(query, node) {
        var parent = getNodeById(query, node.parentId);
        var operator = getOperator(parent.op);
        return operator;
    };

    $scope.updateProperty = function(query, node) {
        if (node.opType !== "group") {
            var property = getProperty(query.collection, node.prop);
            convertType(node, property);
        }
    };

    // This only exists because angular-ui doesn't support binding to UTC dates.
    // Once this is fixed, displayDate should be removed to let everything auto bind.
    $scope.setUtcDate = function(query, node) {
        node.val.iso = node.displayDate.toISOString();
    };
    $scope.setDisplayDate = function(query, node) {
        node.displayDate = new Date(Date.parse(node.val.iso));
    };

    // select2 drop down item template
    $scope.format = function(item) {
        if (!item.id) {
            return item.text; // optgroup
        }
        else {
            return "<span class='prop_name'>" + item.text + "<span class='prop_type'>" + $(item.element).data('schema-type') + "</span>";
        }
    };

    // select2 drop down item template
    $scope.escape = function(item) {
        return item;
    };

    function removeNode(query, node) {
        node.hide = true;
        $timeout(function() {
            var parent = getNodeById(query, node.parentId);
            var index = -1;
            for (index=0; index<parent.nodes.length; index++) {
                var condition = parent.nodes[index];
                if (condition.id === node.id)
                    break;
            }
            if (index < 0) {
                throw "can't find condition " + conditionPropName;
            }
            parent.nodes.splice(index,1);
            if (parent.id!==0 && parent.nodes.length===0) {
                removeNode(query, parent);
            }
        }, 500);
    }

    function isCSVList(s) {
        if (angular.isObject()) {
            return false;
        }
        var arr = String(s).split(",");
        if (arr.length > 1) {
            return true;
        }
        else {
            return false;
        }
    }

    function convertType(node, newProperty) {
        node.opType = getOperator(node.op).type;
        if (node.opType==="set" || newProperty.type==="array") {
            if (newProperty.type!=="number") {
                node.val = "'one', 'two', 'three'";
            }
            else {
                node.val = "1, 2, 3";
            }
        }
        else if (node.opType==="exists") {
            node.val = Boolean(node.val);
        }
        else  {
            if (isCSVList(node.val) || node.val===false || node.val===true) {
                node.val = "";
            }
            if (node.val==="" || newProperty.type!==node.type) {
                switch (newProperty.type) {
                    case "number":
                        if (node.type!=="string" || isNaN(Number(node.val))) {
                            node.val = 0;
                        }
                        else {
                            node.val = Number(node.val);
                        }
                        break;
                    case "string":
                        if (node.type!=="number") {
                            node.val = "";
                        }
                        else {
                            node.val = String(node.val);
                        }
                        break;
                    case "boolean":
                        node.val = Boolean(node.val);
                        break;
                    case "date":
                        var date = new Date();
                        node.val = { __type:"Date", iso:date.toISOString() };
                        node.displayDate = date;
                        break;
                    case "file":
                        node.val = { __type:"File", name:"filename", url:"http://files.parse.com/guid/filename"};
                        break;
                    case "pointer":
                        node.val = { __type:"Pointer", className:node.subType, objectId:"" };
                        break;
                    default:
                        node.val = "";
                }
            }
        }
        if (node.opType !== "regex") {
            delete node.options;
        }
        node.type = newProperty.type;
        if (newProperty.subType) {
            node.subType = newProperty.subType;
        }
    }

    function getCollection(query) {
        if (query.hasOwnProperty("className")===false) {
            throw "query does not have className";
        }
        for (var i = 0; i<App.collections.length; i++) {
            if (App.collections[i].id===query.className) {
                return App.collections[i];
            }
        }
        return null;
    }

    function getNodeByPropertyName(tree, propertyName) {
        if (!tree) {
            return null;
        }
        var foundNode = null;
        getNodeR(tree, propertyName);
        return foundNode;
        function getNodeR(tree, propertyName) {
            if (tree.hasOwnProperty("prop") && tree.prop===propertyName) {
                foundNode = tree;
                return;
            }
            else if (tree.hasOwnProperty("nodes")) {
                for (var i=0; i<tree.nodes.length; i++) {
                    var node = tree.nodes[i];
                    getNodeR(node, propertyName);
                }
            }
        }
    }

    function getNodeById(tree, id) {
        if (!tree) {
            return null;
        }
        if (tree.id===id) {
            return tree;
        }
        var foundNode = null;
        getNodeR(tree, id);
        return foundNode;
        function getNodeR(tree, id) {
            if (tree.id===id) {
                foundNode = tree;
                return;
            }
            else if (tree.hasOwnProperty("nodes")) {
                for (var i=0; i<tree.nodes.length; i++) {
                    var node = tree.nodes[i];
                    getNodeR(node, id);
                }
            }
        }
    }

    function addGroup(query, parent, op) {
        var node = { op: op, nodes: []};
        parent.nodes.push(node);
        $scope.addCondition(query, node);
    }

    function getDefaultCondition(query, parent) {
        var collection = getCollection(query);
        var condition = { };
        for (var propertyName in collection.schema) {
            condition.prop = propertyName;
            if (getNodeByPropertyName(query, propertyName)===null)
                break;
        }
        condition.op = "$e";
        var property = getProperty(collection, condition.prop);
        convertType(condition, property);
        return condition;
    }

    function getProperty(collection, propertyName) {
        var property = { prop: name };
        property.type = collection.schema[propertyName];

        if (!property.type) {
            throw "property not found in schema: " + name;
        }
        if (property.type.indexOf("*")===0) {
            property.subType = property.type.substring(1);
            property.type = "pointer";
        }
        return property;
    }

    function restTransformExpression(query) {
        var s = "";
        restTransformExpressionR(query);
        return s;
        function restTransformExpressionR(query, parent) {
            if (query.op==="$and") {
                s += "{";
            }
            else if (query.op==="$or") {
                s += qt("$or") + ":[";
            }
            else {
                if (parent && parent.op==="$or") {
                    s += "{";
                }
                s += qt(query.prop);
                restTransformValue(query);
                if (parent && parent.op==="$or") {
                    s += "}";
                }
            }

            if (query.hasOwnProperty("nodes")) {
                var specialKeys = {};

                for (var j = 0; j<query.nodes.length; j++) {
                    var node = query.nodes[j];

                    if (node.op==="$e" || node.op==="$and" || node.op==="$or") {
                        restTransformExpressionR(node, query);
                        if (j < query.nodes.length-1 || Object.keys(specialKeys).length>0) {
                            s += ",";
                        }
                    }
                    else {
                        if (!specialKeys.hasOwnProperty(node.prop)) {
                            specialKeys[node.prop] = [];
                        }
                        specialKeys[node.prop].push(node);
                    }
                }

                var count = 0;
                for (var propertyName in specialKeys) {
                    if (query.op==="$or") {
                        for (var i=0; i<specialKeys[propertyName].length; i++) {
                            s += "{";
                            s += qt(propertyName);
                            s += ":{";

                            var specialNode = specialKeys[propertyName][i];
                            s += qt(specialNode.op);
                            restTransformValue(specialNode);
                            s += "}}";
                            if (i < specialKeys[propertyName].length-1) {
                                s += ",";
                            }
                        }
                    }
                    else {
                        s += qt(propertyName);
                        s += ":{";
                        for (var i=0; i<specialKeys[propertyName].length; i++) {
                            var specialNode = specialKeys[propertyName][i];
                            s += qt(specialNode.op);
                            restTransformValue(specialNode);
                            if (i < specialKeys[propertyName].length-1) {
                                s += ",";
                            }
                        }
                        s += "}";
                    }
                    if (count < Object.keys(specialKeys).length-1) {
                        s += ",";
                    }
                    count++;
                }
            }

            if (query.op==="$or") {
                s += "]";
            }
            if (query.op==="$and") {
                s += "}";
            }
        }

        function restTransformValue(node) {
            s += ":";
            if (node.opType==="set" || node.type==="array") {
                s += "[";
                var arr = node.val.split(",");
                for (var i=0; i<arr.length; i++) {
                    var val = arr[i];
                    if (node.type==="string") {
                        s += qt(val);
                    }
                    else {
                        s += val;
                    }
                    if (i < arr.length-1) {
                        s += ",";
                    }
                }
                s += "]";
            }
            else {
                switch (node.type) {
                    case "string":
                        s += qt(node.val);
                        break;
                    case "number":
                    case "boolean":
                        s += node.val;
                        break;
                    case "pointer":
                    case "date":
                        s += JSON.stringify(node.val);
                        break;
                    default:
                        s += qt("type not supported: " + node.type);
                }
            }
            if (node.hasOwnProperty("options")) {
                s += ",";
                s += qt("options");
                s += ":";
                s += qt(node.options);
            }
        }
    }

    // Add meta info to make the query easier to edit and display
    function annotateQuery(query) {
        query.collection = getCollection(query);
        if (!query.hasOwnProperty("nextId")) {
            query.nextId = 0;
        }
        annotateQueryR(query, null);
        function annotateQueryR(tree, parent) {
            if (!tree.hasOwnProperty("id")) {
                tree.id = query.nextId++;
            }
            if (parent && !tree.hasOwnProperty("parentId")) {
                tree.parentId = parent.id;
            }
            if (tree.hasOwnProperty("prop")) {
                var property = getProperty(query.collection, tree.prop);
                tree.type = property.type;
                if (property.subType) {
                    tree.subType = property.subType;
                }
                if (tree.type==="pointer") {
                    tree.val.__type = "Pointer";
                }
                if (tree.type==="date") {
                    tree.val.__type = "Date";
                    tree.displayDate = new Date(Date.parse(tree.val.iso));
                }
                if (tree.type==="file") {
                    tree.val.__type = "File";
                }
            }
            if (tree.hasOwnProperty("op")) {
                tree.opType = getOperator(tree.op).type;
            }
            if (tree.hasOwnProperty("nodes")) {
                for (var i=0; i<tree.nodes.length; i++) {
                    var node = tree.nodes[i];
                    annotateQueryR(node, tree);
                }
            }
        }
    }

    function deAnnotateQuery(query) {
        if (query.hasOwnProperty("collection")) {
            delete query.collection;
        }
        if (query.hasOwnProperty("nextId")) {
            delete query.nextId;
        }
        deAnnotateQueryR(query, null);
        function deAnnotateQueryR(tree, parent) {
            if (tree.hasOwnProperty("id")) {
                delete tree.id;
            }
            if (tree.hasOwnProperty("parentId")) {
                delete tree.parentId;
            }
            if (tree.hasOwnProperty("type")) {
                delete tree.type;
            }
            if (tree.hasOwnProperty("opType")) {
                delete tree.opType;
            }
            if (tree.hasOwnProperty("subType")) {
                delete tree.subType;
            }
            if (tree.hasOwnProperty("displayDate")) {
                delete tree.displayDate;
            }
            if (tree.hasOwnProperty("nodes")) {
                for (var i=0; i<tree.nodes.length; i++) {
                    var node = tree.nodes[i];
                    deAnnotateQueryR(node, tree);
                }
            }
        }
    }


    var operatorGroups = {};
    init();

    // Create a default query for each data class
    function init() {
        App.loadSchema();
        createOperatorGroups();

        for (var j = 0; j<App.collections.length; j++) {
            var collection = App.collections[j];
            var query = createQuery(collection.id);
            $scope.queries.push(query);
        }

        // If a test query is defined use it, otherwise use a default query
        useTestQuery($scope);
        if ($scope.q) {
            if (!App.hasAppInfo()) {
                $location.path('/ParseApp');
                return;
            }
            annotateQuery($scope.q);
        }
        else {
            $scope.q = $scope.queries[4];
        }
    }

    function createOperatorGroups() {
        for (var type in operatorsAllowed) {
            var operators = [];
            var allowed = operatorsAllowed[type];
            for (var i = 0; i<allowed.length; i++) {
                var operator = getOperator(allowed[i]);
                operators.push(operator);
            }
            operatorGroups[type] = operators;
        }
    }

    function getOperator(name) {
        for (var i = 0; i<$scope.operators.length; i++) {
            if ($scope.operators[i].name===name) {
                return $scope.operators[i];
            }
        }
        throw "operator not found: " + name;
    }

    function createQuery(className) {
        var query = {
            className:className,
            op: "$and",
            nodes: []
        };
        //$scope.addCondition(query, query);
        annotateQuery(query);
        return query;
    }

    function getBaseUrl(query) {
        var s = App.dataUrl + query.collection.id;
        return s;
    }

    function normalForm(query) {
        var copy = JSON.stringify(query);
        copy = JSON.parse(copy);
        deAnnotateQuery(copy);
        return copy;
    }

    function restTransform(query) {
        var base = getBaseUrl(query) + "?where=";
        var expression = restTransformExpression(query);
        var t = base + expression;
        return t;
    }

    function jsTransform(query) {
        return "TODO: Javascript transform";
    }

    function iOSTransform(query) {
        return "TODO: iOS transform";
    }

    $scope.$on('ngGridEventColumns', function(newColumns) {

    });

    function qt(s) {
        return "\"" + s + "\"";
    }

    function setColumns(query) {
        var cols = [];
        for (var propertyName in query.collection.schema) {
            var col = {};
            col.field = propertyName;
            col.displayName = propertyName;
            col.minWidth = 100;
            col.width = 100;

            var prop = getProperty(query.collection, propertyName);
            if (prop.type==="date") {
                col.cellTemplate = "<div class='ngCellText'>{{ COL_FIELD.iso | date:'MM/dd/yyyy' }}</div>";
            }
            else if (prop.type==="array") {
                col.cellTemplate = "<div class='ngCellText'>array ({{ COL_FIELD.length }})</div>";
            }
            else if (prop.type==="pointer") {
                col.cellTemplate = "<div class='ngCellText'>" + prop.subType + "* {{ COL_FIELD.objectId }}</div>";
                col.width = 200;
            }
            else if (prop.type==="file") {
                col.cellTemplate = "<div class='ngCellText'>{{ COL_FIELD.url.substring(97) }}</div>";
                col.width = 200;
            }
            else if (prop.type==="number") {
                col.width = 80;
            }
            else if (prop.type==="boolean") {
                col.width = 50;
            }
            cols.push(col);
        }
        $scope.columnDefs = cols;
    }

    $scope.columnDefs = [
        { field: 'columns', displayName: 'Results' }
    ];

    $scope.gridOptions = {
        data:'result',
        columnDefs: 'columnDefs',
        enableColumnResize: true
    }
}

