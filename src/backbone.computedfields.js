/*
    Backbone.ComputedFields v.0.0.4
    (c) 2012 alexander.beletsky@gmail.com
    Distributed Under MIT License

    https://github.com/alexanderbeletsky/backbone.computedfields
*/

(function () {

    if (!Backbone) {
        throw 'Please include Backbone.js before Backbone.ComputedFields.js';
    }

    var ComputedFields = function (model) {
        this.model = model;
        this._computedFields = [];

        this.initialize();
    };

    ComputedFields.VERSION = '0.0.4';

    _.extend(ComputedFields.prototype, {
        initialize: function () {
            _.bindAll(this);

            this._lookUpComputedFields();
            this._bindModelEvents();
            this._wrapJSON();
        },

        _lookUpComputedFields: function () {
            for (var obj in this.model.computed) {
                var field = this.model.computed[obj];

                if (field && (field.set || field.get)) {
                    this._computedFields.push({name: obj, field: field});
                }
            }
        },

        _bindModelEvents: function () {
            _.each(this._computedFields, function (computedField) {
                var fieldName = computedField.name;
                var field = computedField.field;

                var updateComputed = _.bind(function () {
                    var value = this._computeFieldValue(field);
                    var updated = {};

                    updated[fieldName] = value;
                    this.model.set(updated, { skipChangeEvent: true });
                }, this);

                var updateDependent = _.bind(function (model, value, options) {
                    if (options && options.skipChangeEvent) {
                        return;
                    }

                    if (field.set) {
                        var fields = this._dependentFields(field.depends);
                        value = value || this.model.get(fieldName);

                        field.set.call(this.model, value, fields);
                        this.model.set(fields, options);
                    }
                }, this);

                this._thenDependentChanges(field.depends, updateComputed);
                this._thenComputedChanges(fieldName, updateDependent);

                updateComputed();
            }, this);
        },

        _thenDependentChanges: function (depends, callback) {
            _.each(depends, function (name) {
                if (typeof (name) === 'string') {
                    this.model.on('change:' + name, callback);
                }

                if (typeof (name) === 'function') {
                    name.call(this.model, callback);
                }
            }, this);
        },

        _thenComputedChanges: function (fieldName, callback) {
            this.model.on('change:' + fieldName, callback);
        },

        _wrapJSON: function () {
            this.model.toJSON = _.wrap(this.model.toJSON, this._toJSON);
        },

        _toJSON: function (toJSON) {
            var attributes = toJSON.call(this.model);

            var stripped = _.reduce(this._computedFields, function (memo, computed) {
                if (computed.field.toJSON === false) {
                    memo.push(computed.name);
                }
                return memo;
            },[]);

            return _.omit(attributes, stripped);
        },

        _computeFieldValue: function (computedField) {
            if (computedField && computedField.get) {
                var fields = this._dependentFields(computedField.depends);
                return computedField.get.call(this.model, fields);
            }
        },

        _dependentFields: function (depends) {
            return _.reduce(depends, function (memo, field) {
                memo[field] = this.model.attributes[field];
                return memo;
            }, {}, this);
        }

    });

    Backbone.ComputedFields = ComputedFields;

})();