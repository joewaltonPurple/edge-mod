define([
    "dcl/dcl",
    "./CourseOfAction",
    "./Incident",
    "./Indicator",
    "./Observable",
    "./TTP"
], function (declare, CourseOfAction, Incident, Indicator, Observable, TTP) {
    "use strict";

    var TYPES = Object.freeze({
        "coa": {
            "class": CourseOfAction, "collection": "courses_of_action", "label": "Course Of Action", "code": "coa"
        },
        "ttp": {
            "class": TTP, "collection": "ttps.ttps", "label": "TTP", "code": "ttp"
        },
        "incident": {
            "class": Incident, "collection": "incidents", "label": "Incident", "code": "inc"
        },
        "indicator": {
            "class": Indicator, "collection": "indicators", "label": "Indicator", "code": "ind"
        },
        "observable": {
            "class": Observable, "collection": "observables.observables", "label": "Observable", "code": "obs"
        }
    });

    var TYPE_ALIASES = Object.freeze({
        "courseofaction": "coa"
    });

    var PATTERN = Object.freeze({
        namespace: "[a-z][\\w\\d-]+",
        type: "[a-z]+",
        uuid: "[a-f\\d]{8}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{12}"
    });

    function resolveAlias(type) {
        return TYPE_ALIASES[type] || type;
    }

    function parseId(/*String*/ id) {
        if (!(typeof id === "string")) {
            throw new TypeError("Identifier must be a string");
        }
        var pattern = new RegExp(
            "^(" + PATTERN.namespace + "):(" + PATTERN.type + ")-" + PATTERN.uuid + "$",
            "i"
        );
        var match = pattern.exec(id);
        if (!match) {
            throw new Error("Unable to parse id: " + id);
        }
        return match;
    }

    function findType(parsedId) {
        var type = TYPES[resolveAlias(parsedId[2].toLowerCase())];
        if (!type) {
            throw new TypeError("Unsupported type: " + parsedId[2]);
        }
        return type;
    }

    function findNamespace(parsedId) {
        return parsedId[1];
    }

    return declare(null, {
        declaredClass: "StixId",
        constructor: function (id) {
            var parsedId = parseId(id);
            this._id = id;
            this._type = findType(parsedId);
            this._namespace = findNamespace(parsedId);
        },
        id: function () {
            return this._id;
        },
        type: function () {
            return this._type;
        },
        namespace: function () {
            return this._namespace;
        }
    });
});