// All from https://scotch.io/tutorials/build-a-restful-api-using-node-and-express-4

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var multiparty = require('multiparty');
var request    = require("request")

var util = require('util');

var port = process.env.PORT || 8080;        // set our port

var faxReceiveRouter = express.Router();
faxReceiveRouter.post('/', function (req, res) {
    // parse a file upload 
    var form = new multiparty.Form();

    form.parse(req, function(err, fields, files) {
        if (err) {
          console.log(err);
          res.json({message: 'fail'});               
        }
        else{
          console.log(util.inspect({fields: fields, files: files}));
          
          var jsonStringData = fields.fax[0];
          var faxData = JSON.parse(jsonStringData);
          
          // TODO lambda fax receive URL
          request({ url: "https://n90olzaik3.execute-api.us-west-2.amazonaws.com/prod/FaxReceived",
            method: "POST",
            json: faxData
           }, function (error, response, body){
             console.log(body);
             if (!error && response.statusCode === 200) {
                res.succeed("Sent data to fax receive lambda");
             }
             else {
                 console.log("Error with data send to lambda");
                 console.log(response.statusCode);
                 res.fail(error);
             }
          });
         
        }
    });
    
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/fax-receive', faxReceiveRouter);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Something happens on port ' + port);

