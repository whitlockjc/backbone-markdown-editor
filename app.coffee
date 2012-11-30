# Backbone.js Markdown Editor
#
# This application will demonstrate how to use [Backbone.js](http://documentcloud.github.com/backbone/)
# and [Underscore.js](http://documentcloud.github.com/underscore/), both the client and server.  The server will be in
# [CoffeeScript](http://coffeescript.org/) to also show that both of these libraries can be used with CoffeeScript and
# JavaScript the same.

# The [Express.js](http://expressjs.com/) module
express = require('express')
# Core [Node.js](http://nodejs.org/) modules
http = require('http')
path = require('path')
fs = require('fs')
# Underscore.js module
_ = require('underscore')
# Create the Express.js application
app = express()
# Helper function to read the index.html shim file in as a string
readIndexHTML = ->
  fs.readFileSync __dirname + '/public/html/index.html', 'utf8'
# Since this application is a client-side, single-page application, all that is necessary is to return the HTML5 shim
# that loads up all of the client-side resources.  This shim is loaded into a variable for performance reasons.
indexHTMLShim = readIndexHTML()
savedFiles = {}
lastId = 0

# Configure Express.js (This is not a production-ready environment.)
app.configure ->
  app.set 'port', process.env.PORT or 3000
  # Turn off layout processing since we'll not be using it
  app.set 'view options', {layout: false}
  app.use express.favicon()
  app.use express.bodyParser()
  app.use app.router
  app.use express.static(path.join(__dirname, 'public'))
  app.use express.logger('dev')
  app.use express.errorHandler()

# ##Routes

# The single route for the UI of our application
app.get '/', (req, res) ->
  # In development mode, always reread the file from disk to handle changes to the file, othewise use the variable
  res.send if app.settings?.env is 'development' then readIndexHTML() else indexHTMLShim

# Route to get a list of saved files
app.get '/files', (req, res) ->
  res.json _.values savedFiles

# Route to create a saved file
app.post '/files', (req, res) ->
  newFile = req.body
  # Validate if it's a duplicate (by name)
  dup = _.find savedFiles, (file) -> return file.name? and file.name is newFile.name

  if dup
    res.json 405, {error: {
      message: "File already exists with the name of '#{newFile.name}'."
    }}
  else
    if newFile.name? and newFile.content? and not _.isEmpty newFile.name
      newFile['id'] = lastId += 1
      newFile['created'] = new Date()
      savedFiles[newFile.id] = newFile
      res.json newFile
    else
      badFields = {}
      for field in ['name', 'content']
        if not newFile[field]? or (field is 'name' and _.isEmpty(newFile[field]))
          res.json 405, {error: {message: "'#{field}' is a required field."}}
          return

# Route to get a saved file by id
app.get '/files/:id', (req, res) ->
  fileId = req.params.id
  if _.has savedFiles, fileId then res.json(savedFiles[fileId]) else res.json 404, {error: {message: "No saved file on the server with an id of #{fileId}."}}

# Route to update a saved file by id
app.put '/files/:id', (req, res) ->
  fileId = req.params.id
  updatedFile = req.body
  if _.has savedFiles, fileId
    if updatedFile.name? and updatedFile.content? and not _.isEmpty updatedFile.name
      # Validate if it's a duplicate (by name)
      dup = _.find savedFiles, (file) -> return file.name? and file.name is updatedFile.name

      if dup and dup.id is not updatedFile.id
        res.json 405, {error: {
          message: "File already exists with the name of '#{updatedFile.name}'."
        }}
      else
        savedFiles[fileId] = updatedFile
        res.json savedFiles[fileId]
    else
      badFields = {}
      for field in ['name', 'content']
        if not newFile[field]? or (field is 'name' and _.isEmpty(newFile[field]))
          res.json 405, {error: {message: "'#{field}' is a required field."}}
  else
    res.json 404, {error: {message: "No saved file on the server with an id of #{fileId}."}}

# Route to delete a saved file by id
app.delete '/files/:id', (req, res) ->
  fileId = req.params.id
  if _.has savedFiles, fileId
    deletedFile = savedFiles[fileId]
    delete savedFiles[fileId]
    res.json deletedFile
  else
    res.json 404, {error: {message: "No saved file on the server with an id of #{fileId}."}}

# Start the server
http.createServer(app).listen app.get('port'), ->
  console.log 'Express server listening on port ' + app.get('port')
