// All from https://scotch.io/tutorials/build-a-restful-api-using-node-and-express-4

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var multiparty = require('multiparty');
var request    = require("request")

var util = require('util');
var crypto = require('crypto');
const fs = require('fs');

var port = process.env.PORT || 8080;        // set our port

var faxReceiveRouter = express.Router();


var validateReceivedMessage = function(requestBody, requestUrl, requestFiles) {

    console.log(requestBody);
    console.log(requestUrl);
    console.log(requestFiles);

    var names = [];
    for (var idx in requestBody) names.push(idx);
    names.sort();
    
    for (var idx = 0; idx < names.length; idx++) {
        requestUrl += names[idx] + requestBody[names[idx]];
    }

    //sort the file parts and add their SHA1 sums to the URL
    var fileNames = [];
    var fieldNamePaths = {};
    for (var idx in requestFiles){
        var fieldname = requestFiles[idx].fieldname;
        fileNames.push(fieldname);
        fieldNamePaths[fieldname] = requestFiles[idx].path;
    }
    fileNames.sort();
    
    // TODO
    // crypto! 
    // fs
    for (var idx = 0; idx < fileNames.length; idx++) {
        var fileSha1Hash = crypto.createHash('sha1').update(fs.readFileSync(fieldNamePaths[fileNames[idx]])).digest('hex');
        requestUrl += fileNames[idx] + fileSha1Hash;
    }
    
    // TODO test
    var callbackToken = 'aabbccddee';

    console.log(crypto.createHmac('sha1', callbackToken).update(requestUrl).digest('hex'));
    
    //TODO validate fields.
    return true;
    
};


faxReceiveRouter.post('/', function (req, res) {
    // parse a file upload 
    var form = new multiparty.Form();

    form.parse(req, function(err, fields, files) {
        if (err) {
          console.log(err);
          res.fail(err);
        }
        else{
          console.log(util.inspect({fields: fields, files: files}));
          
          // Check that message received is from actual phaxio sender.
          if (validateReceivedMessage(req.body, req.url, req.files))
          {
              var jsonStringData = fields.fax[0];
              var faxData = JSON.parse(jsonStringData);
              
              request({ url: "https://n90olzaik3.execute-api.us-west-2.amazonaws.com/prod/FaxReceived",
                method: "POST",
                json: faxData,
                headers: {"x-api-key":process.env.AWS_GATEWAY_API_KEY}
               }, function (error, response, body){
                 console.log(body);
                 if (!error && response.statusCode === 200) {
                    res.json({message:"Sent data to fax receive lambda"});
                 }
                 else {
                     console.log("Error with data send to lambda");
                     console.log(response.statusCode);
                     res.fail(error);
                 }
              });
          }
          else
          {
               console.log("Message does not have correct signature");
               res.sendStatus(400);
          }
         
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

