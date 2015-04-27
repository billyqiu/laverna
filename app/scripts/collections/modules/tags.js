/* global define */
define([
    'underscore',
    'jquery',
    'backbone.radio',
    'collections/modules/module',
    'collections/tags',
    'sjcl'
], function(_, $, Radio, ModuleObject, Tags, sjcl) {
    'use strict';

    /**
     * Tags collection.
     * A convenience object that handles operations to Tags collection.
     *
     * Listens to events:
     * 1. this.collection, event: `reset:all`
     *    destroys the current collection.
     *
     * Complies to commands on channel `tags`:
     * 1. `remove` - removes an existing model.
     * 2. `save`   - adds a new model or updates an existing one.
     *
     * Replies to requests on channel `tags`:
     * 1. `get:all`  - returns a collection.
     * 2. `get:model` - returns a model with the specified ID.
     * 3. `add`       - add several tags at once.
     *
     * Triggers events:
     * 1. `add:model` to a collection that is currently under use
     *    when a new model was added or updated.
     * 2. channel: `tags`, event: `save:after`
     *    after a model was added or updated.
     * 3. channel: `tags`, event: `model:destroy`
     *    after a model was destroyed.
     */
    var Collection = ModuleObject.extend({
        Collection: Tags,

        comply: function() {
            return {
                'remove' : this.remove,
                'save'   : this.saveModel
            };
        },

        reply: function() {
            return {
                'add'       : this.add,
                'get:all'   : this.getAll,
                'get:model' : this.getById
            };
        },

        filter: function(options) {
            return this.collection.fullCollection.where(options.conditions);
        },

        /**
         * Add a new model or update an existing one.
         */
        saveModel: function(model, data) {
            var self  = this,
                id    = sjcl.hash.sha256.hash(data.name).join(''),
                defer = $.Deferred();

            // First, make sure that a model won't duplicate itself.
            $.when(this._removeOld(id, model))
            .then(function() {
                model.set('id', id);
                model.set(data);
                model.updateDate();

                return self.save(model, model.toJSON());
            });

            return defer.promise();
        },

        /**
         * Add a bunch of tags
         */
        add: function(tags) {
            var defer = $.Deferred(),
                self  = this,
                model,
                promise;

            if (!tags.length) {
                return defer.resolve();
            }

            _.each(tags, function(tag) {
                model = new Tags.prototype.model();

                if (!promise) {
                    promise = $.when(self.save(model, {name: tag}));
                    return;
                }

                promise.then(function() {self.save(model, {name: tag});});
            });

            promise.then(defer.resolve);
            return defer.promise();
        },

        /**
         * Sometimes a tag might have a new ID.
         * If that happens, tags will be duplicated.
         * With this method we solve that problem.
         */
        _removeOld: function(newId, model) {
            var defer = $.Deferred();

            if (!model.id || !this.collection || newId === model.id) {
                return defer.resolve();
            }

            $.when(this.remove(model)).then(defer.resolve);
            return defer.promise();
        }

    });

    // Initialize the collection automaticaly
    Radio.command('init', 'add', 'app:before', function() {
        new Collection();
    });

    return Collection;

});