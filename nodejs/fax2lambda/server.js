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


var validateReceivedMessage = function(fields, requestUrl, files, phaxioHeaderValue) {

    console.log('fields');
    console.log(fields);
    console.log('requestUrl');
    console.log(requestUrl);
    console.log('files');
    console.log(files);
    console.log('phaxioHeaderValue')
    console.log(phaxioHeaderValue)
    
    var names = [];
    for (var idx in fields) names.push(idx);
    names.sort();
    
    for (var idx = 0; idx < names.length; idx++) {
        if (fields[names[idx]].length != 1) {
            console.warn("Not one field value for field name " + names[idx] );
        }
        requestUrl += names[idx] + fields[names[idx]][0];
    }

    console.log(requestUrl);

    //sort the file parts and add their SHA1 sums to the URL
    var fileNames = [];
    var fieldNamePaths = {};
    for (var idx in files){
        if (files[idx].length != 1) {
            console.error("not one files field for "+ idx);
        }
        var idxFile =  files[idx][0];
        var fieldname = idxFile.fieldName;
        fileNames.push(fieldname);
        console.log(idxFile);
        fieldNamePaths[fieldname] = idxFile.path;
    }
    fileNames.sort();
    
    console.log(fieldNamePaths[fieldname]);
    console.log(fileNames);
    
    for (var idx = 0; idx < fileNames.length; idx++) {
        var fileSha1Hash = crypto.createHash('sha1').update(fs.readFileSync(fieldNamePaths[fileNames[idx]])).digest('hex');
        requestUrl += fileNames[idx] + fileSha1Hash;
    }
    
    var callbackToken = process.env.PHAXIO_CALLBACK_TOKEN;

    console.log('Computed hash');
    console.log(crypto.createHmac('sha1', callbackToken).update(requestUrl).digest('hex'));
    
    //TODO compare hash with header value
    return true;
    
};


faxReceiveRouter.post('/', function (req, res) {
    // parse a file upload 
    var form = new multiparty.Form({autoFiles:true});

    form.parse(req, function(err, fields, files) {
        if (err) {
          console.log(err);
          res.fail(err);
        }
        else{
          console.log(util.inspect({fields: fields, files: files}));
          
          console.log("headers:");
          console.log(req.headers);
          
          console.log("process.env");
          console.log(process.env);
          
          // Check that message received is from actual phaxio sender.
          if (validateReceivedMessage(fields, req.url, files, req.headers["X-Phaxio-Signature"]))
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
                     res.sendStatus(400);
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

