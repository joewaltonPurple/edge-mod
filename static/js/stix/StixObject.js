define([
    "dcl/dcl",
    "knockout",
    "kotemplate!labelled-field:./templates/labelled-field.html",
    "kotemplate!mandatory-labelled-field:./templates/mandatory-labelled-field.html",
    "kotemplate!optional-labelled-field:./templates/optional-labelled-field.html",
    "kotemplate!common-fields:./templates/common.html"
], function (declare, ko) {
    "use strict";

    return declare(null, {
        constructor: function (data, stixPackage) {
            this.data = ko.observable(data);
            this.id = ko.computed(function () {
                return stixPackage.safeGet(this.data(), "id");
            }, this);
            this.title = ko.computed(function () {
                return stixPackage.safeGet(this.data(), "title");
            }, this);
            this.shortDescription = ko.computed(function () {
                return stixPackage.safeGet(this.data(), "short_description");
            }, this);
            this.description = ko.computed(function () {
                return stixPackage.safeGet(this.data(), "description");
            }, this);
            this.tlp = ko.computed(function () {
                return stixPackage.safeGet(this.data(), "handling.0.marking_structures.0.color");
            }, this);
        }
    });
});
