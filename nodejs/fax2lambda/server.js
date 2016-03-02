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

var validateReceivedMessage = function(fields, req, files, phaxioHeaderValue) {

    // From http://stackoverflow.com/a/10185427/8524
    var requestUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    var hashString = requestUrl;

    console.log('fields');
    console.log(fields);
    console.log('requestUrl');
    console.log(requestUrl);
    console.log('hardCodedURL');
    console.log(hashString);
    console.log('files');
    console.log(files);
    console.log('phaxioHeaderValue');
    console.log(phaxioHeaderValue);
    
    var names = [];
    for (var idx in fields) names.push(idx);
    names.sort();
    
    for (var idx = 0; idx < names.length; idx++) {
        if (fields[names[idx]].length != 1) {
            console.warn("Not one field value for field name " + names[idx] );
        }
        hashString += names[idx] + fields[names[idx]][0];
    }

    console.log(hashString);

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
        
        var filename = fileNames[idx];
        var filepath = fieldNamePaths[fileNames[idx]];
        
        console.log('Filename');
        console.log(filename);
        console.log('Filepath');
        console.log(filepath);
        var fileSha1Hash = crypto.createHash('sha1').update(fs.readFileSync(filepath)).digest('hex');
        console.log('hash');
        console.log(fileSha1Hash);
        hashString += fileNames[idx] + fileSha1Hash;
    }
    
    console.log('last thing before hash');
    console.log(hashString);
    
    var callbackToken = process.env.PHAXIO_CALLBACK_TOKEN;

    var computedHash = crypto.createHmac('sha1', callbackToken).update(hashString).digest('hex'); 
    console.log('Computed hash');
    console.log(computedHash);
    
    return computedHash === phaxioHeaderValue;
    
};


faxReceiveRouter.post('/', function (req, res) {
    // parse a file upload 
    var form = new multiparty.Form({autoFiles:true});

    form.parse(req, function(err, fields, files) {
        if (err) {
          console.log(err);
          res.sendStatus(400);
        }
        else{
          console.log(util.inspect({fields: fields, files: files}));
          
          console.log("headers:");
          console.log(req.headers);
          
          // Check that message received is from actual phaxio sender.
          var phaxioSignatureValue = 'x-phaxio-signature';
          if (phaxioSignatureValue in req.headers && validateReceivedMessage(fields, req, files, req.headers[phaxioSignatureValue]))
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

