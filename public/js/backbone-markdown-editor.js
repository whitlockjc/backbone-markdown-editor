// Global variable for debugging and playing around
var Application;
var MarkdownFile;

// Wait for the document to be ready before running JavaScript.
$(document).ready(function() {

  // Begin Backbone Code
  // -------------------

  // Lets start creating a [Backbone.Model](http://documentcloud.github.com/backbone/#Model)
  // which will be used to describe a "Markdown File".  Basically, our application will let you
  // manage files containing the [Markdown](http://daringfireball.net/projects/markdown/)
  // language.  Our **File** model will have a `name` and `content` property, for the
  // display name and the Markdown contents respectively.
  MarkdownFile = Backbone.Model.extend({

    // [Backbone.Model#urlRoot](http://backbonejs.org/#Model-urlRoot) is used to generate
    // the model url whenever it's not part of a collection, like when creating a new file.
    urlRoot: 'files',

    // [Backbone.Model#defaults](http://backbonejs.org/#Model-defaults) is used to set
    // specify default values when values are missing when creating an object.
    defaults: function() {
      return {
        name: '',
        content: '',
        description: ''
      }
    },

    // [Backbone.Model#validate](http://backbonejs.org/#Model-validate) is used to validate
    // the model automatically by Backbone.js.
    validate: function(attrs) {
      // Ensure there is a name attribute set
      if (!attrs.name || _.isEmpty(attrs.name)) {
        return 'Please specify a name for your Markdown File.';
      }
    },

    // [Backbone.Model#parse](http://backbonejs.org/#Model-parse) is used to parse the response
    // returned by our REST API.  This is where we will detect error responses vs. successful
    // responses.  Of course, some of this could be bubbled up to an abstract class.
    parse: function(response) {
      if (response.error) {
        // Our REST API returns errors as a JSON object with a message attribute and a fields
        // attribute that is a hash describing the actual object attributes that are invalid.
        errorJSON = response.error
        error = new Error(errorJSON.message);
        error['fields'] = errorJSON.fields
        return error;
      } else {
        // Since it's not an error, return the object as-is.
        return response;
      }
    }

  });

  // Now that we have a Backbone.Model (**File**), let's create a
  // [Backbone.Collection](http://backbonejs.org/#Collection) to keep track of them all.
  var FilesCollection = Backbone.Collection.extend({

    // [Backbone.Collection#url](http://backbonejs.org/#Collection-url) is used to tell Backbone.js
    // the base URL for our collection.
    url: 'files',

    // [Backbone.Collection#model](http://backbonejs.org/#Collection-model) is used to tell Backbone.js
    // which model this collection is "managing".
    model: MarkdownFile,

    // [Backbone.Collection#comparator](http://backbonejs.org/#Collection-comparator) is used to tell
    // the collection how to sort the models it's "managing".
    comparator: function(file) {
      // Sort by name
      return file.get('name');
    }

  });

  var SideBarView = Backbone.View.extend({

    // [Backbone.View#el](http://backbonejs.org/#View-el) is used to tell Backbone.js the DOM element
    // to attach to.  If you omit this, Backbone.js will create one for you.
    el: $('#files-list'),

    // Used to store the [Underscore#template](http://underscorejs.org/#template) that will be used
    // to generate the DOM contents of our view.
    template: _.template([
      '<li class="nav-header">Saved Files</li>',
      '<% if (!collection || collection.length == 0) { %>',
      '  <li id="files-list-empty"><em><small>No saved files...</small></em></li>',
      '<% } else { %>',
      '  <% _.each(collection, function(file) { %><li id="file-<%= file.id %>"><a href="#files/<%= file.id %>"><%= file.name %></a></li><% }); %>',
      '<% } %>'
    ].join('')),

    // [Backbone.View#initialize](http://backbonejs.org/#View-constructor) is the initializer.
    initialize: function(options) {
      // Ensure we have a collection object set for wiring up event handling below
      if (!options.collection) {
        this.collection = new FilesCollection();
      } else {
        this.collection = options.collection;
      }

      // Wire up event handlers
      this.collection.on('reset', this.render, this);
      this.collection.on('add', this.render, this);
      this.collection.on('remove', this.render, this);

      // Fetch the files
      this.collection.fetch();
    },

    // [Backbone.View#render](http://backbonejs.org/#View-render) is used to actually create the DOM
    // element.
    render: function() {
      this.$el.html(this.template({collection: this.collection.toJSON()}));
      // Return this for method chaining
      return this;
    }

  });

  var EditorView = Backbone.View.extend({

    // Used by [Backbone.View#el](http://backbonejs.org/#View-el) when creating a DOM element from scratch.
    // This is the actual HTML tag name used for the created DOM element.  (Defaults to **div** but was
    // explicitly used here for explanation purposes.)
    tagName: 'div',

    // Used by [Backbone.View#el](http://backbonejs.org/#View-el) when creating a DOM element from scratch.
    // This will become the actual id attribute on the HTML DOM element.
    id: 'editor',

    // Used by [Backbone.View#el](http://backbonejs.org/#View-el) when creating a DOM element from scratch.
    // This will become the actual class attribute on the HTML DOM element.
    className: 'span10',

    // Used to store the [Underscore#template](http://underscorejs.org/#template) that will be used
    // to generate the DOM contents of our view.  (Example of loading a template from external.)
    template: _.template($('#editor-template').text()),

    // [Backbone.View#initialize](http://backbonejs.org/#View-constructor) is the initializer.
    initialize: function(options) {
      this.render();
    },

    // [Backbone.View#render](http://backbonejs.org/#View-render) is used to actually create the DOM
    // element.
    render: function() {
      // Only rebuild and attach the DOM element once
      if ($('#' + this.id).length === 0) {
        // Populate the generated div's contents with the template
        this.$el.html(this.template());
        // Attach the view's DOM to the page
        $('#content > div.row-fluid').append(this.$el);
        // Resize the editor/preview panes
        $('#preview-pane').height($(window).height() - 120);
        // Put into View
        $('#file-content').height($(window).height() - $('#file-content').position().top - 60);
      }
      // Return this for method chaining
      return this;
    },

    // [Backbone.View#events](http://backbonejs.org/#View-delegateEvents) is used as a single
    // location to create DOM event handlers.
    events: {
      'click #delete-file': 'deleteFile',
      'click #revert-file': 'revertFile',
      'click #save-file': 'saveFile',
      'keyup #file-content': 'contentChanged',
      'keyup #file-description': 'descriptionChanged',
      'keyup #file-name': 'nameChanged'
    },

    // View logic

    contentChanged: function(event) {
      var rawText = $(event.target).val();
      this.model.set('content', rawText, {silent: true});
      $('#preview-pane').html(marked($('<div/>').text(rawText).html()));
    },

    deleteFile: function(event) {
      if (confirm("Are you sure you want to delete '" + this.model.get('name') + "'?")) {
        var self = this;
        this.model.destroy({
          error: this.handleSyncError,
          success: function(model, response) {
            self.trigger('fileDeleted', model);
          }
        });
      }
    },

    descriptionChanged: function(event) {
      this.model.set('description', $(event.target).val(), {silent: true});
    },

    nameChanged: function(event) {
      this.model.set('name', $(event.target).val(), {silent: true});
    },

    revertFile: function() {
      this.model.set(this.model.previousAttributes());
      $('#error-message').html('').addClass('hide');
    },

    saveFile: function() {
      var self = this;

      this.model.save(null, {
        error: this.handleSyncError,
        success: function(model, response) {
          if (Backbone.history.fragment !== model.url()) {
            self.trigger('fileCreated', model);
          }
        }
      });
    },

    handleChange: function(model, options) {
      // Set the input values based on the model
      $('#file-content').val(model.get('content'));
      $('#preview-pane').html(marked(model.get('content')));
      $('#file-description').val(model.get('description'));
      $('#file-name').val(model.get('name'));
      $('#file-name').focus().select();
    },

    handleSyncError: function(model, response) {
      var error;

      if (response.responseText) {
        try {
          error = $.parseJSON(response.responseText).error.message;
        } catch (err) {
          error = response.responseText;
        }
      } else {
        error = response;
      }

      $('#error-message').html('<span>' + error + '</span>').removeClass('hide');
    },

    shouldNavigate: function() {
      if (!this.model || !this.model.hasChanged()) {
        return true;
      } else {
        return confirm('The current file has changed, do you really want to leave?');
      }
    },

    setModel: function(model) {
      // Remove bindings
      if (this.model) {
        this.model.off('change');
      }

      if (this.model && this.model.hasChanged()) {
        this.model.set(this.model.previousAttributes());
      }

      // Set the current model
      this.model = model;

      $('#error-message').html('').addClass('hide');

      // Mark the current file as selected in the sidebar
      this.trigger('selectionChanged', model);

      // Update the UI
      if (model) {
        // Bind change handler so we can update the preview pane
        this.model.on('change', this.handleChange, this);

        // Enable all inputs and buttons
        $('#' + this.id + ' input, #' + this.id + ' textarea, #revert-file, #save-file').removeAttr('disabled');

        if (!this.model.isNew()) {
          $('#delete-file').removeAttr('disabled');
        } else {
          $('#delete-file').attr('disabled', 'disabled');
        }

        this.handleChange(model);
      } else {
        // Disable all inputs and buttons
        $('#' + this.id + ' input, #' + this.id + ' textarea, #delete-file, #revert-file, #save-file').attr('disabled', 'disabled');
        // Reset all content
        $('#' + this.id + ' input, #' + this.id + ' textarea').val('');
        $('#preview-pane').html('');
      }
    }
  });

  var Router = Backbone.Router.extend({

    // [Backbone.Router#routes](http://backbonejs.org/#Router-routes) is used to store the map
    // of route handlers.
    routes: {
      '': 'listFiles',
      'files': 'listFiles',
      'files/:id': 'createOrViewFile'
    },

    // [Backbone.Router#initialize](http://backbonejs.org/#Router-constructor) is the initializer.
    initialize: function(options) {
      this.files = new FilesCollection();
      this.sideBarView = new SideBarView({collection: this.files});
      this.editorView = new EditorView({router: this});

      this.editorView.on('fileCreated', function(model) {
        this.createFileAndNavigate(model);
      }, this);
      this.editorView.on('fileDeleted', function(model) {
        this.deleteFileAndNavigate(model);
      }, this);
      this.editorView.on('selectionChanged', function(model) {
        this.changeSelectedFile(model);
      }, this);

      var router = this;

      $('#list-files, #new-file').click(function(event) {
        if (!router.editorView.shouldNavigate()) {
          event.stopPropagation();
          return false;
        }
      });
    },

    // Router Logic

    listFiles: function() {
      this.editorView.setModel(null);
    },

    changeSelectedFile: function(model) {
      var currSelected = $('#sidebar li.active');
      var modelId = model ? model.id : null;

      if (!model || !modelId) {
        currSelected.removeClass('active');
      } else if (currSelected && currSelected.attr('id') !== 'file-' + modelId) {
        currSelected.removeClass('active');
        $('#file-' + modelId).addClass('active');
      }
    },

    createFileAndNavigate: function(model) {
      this.files.add(model);
      this.navigate(model.url(), true);
    },

    deleteFileAndNavigate: function(model) {
      this.files.remove(model.id);
      this.navigate('/', true);
    },

    createOrViewFile: function(id) {
      var model = this.files.get(id);

      if (id === 'new') {
        this.editorView.setModel(new MarkdownFile());
      } else if (model) {
        this.editorView.setModel(model);
      } else {
        this.navigate('', true);
      }
    },

  });

  // Create our application
  Application = new Router();

  // Push state not enabled because of how we're serving the API and application from same root URL
  Backbone.history.start();

  // Begin Miscellaneous Code
  // ------------------------

  // Configure [Marked options](https://github.com/chjj/marked#options)
  marked.setOptions({
    gfm: true,
    pedantic: true,
    sanitize: true,
    // Configure syntax highligher support using [Google Code Prettify](https://code.google.com/p/google-code-prettify/)
    highlight: function(code, lang) {
      return prettyPrintOne(code, lang, true);
    }
  });

});