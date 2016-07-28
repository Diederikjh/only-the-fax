// All from https://scotch.io/tutorials/build-a-restful-api-using-node-and-express-4

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');

// Fax2lambda dependencies:
var multiparty = require('multiparty');
var request    = require("request");
var util       = require('util');
var crypto     = require('crypto');
const fs       = require('fs');

var AWS = require('aws-sdk');
// Set your region for future requests.
AWS.config.region = 'us-west-2';

var path = require('path');
var tesseract = require('node-tesseract');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port


/* 
  By convention the file is stored in S3 bucket as
        thumbnails/<dynamoDb-range>_<dynamoDb-key>/image.jpg
  as an example:
        thumbnails/2015-07-13 22:53.33_7/image.jpg
  note the range, key swaparound.  This is to make the file listing more sane.
*/
var extractDynamoDBKeyFromImageKey = function(imageKey)
{
   var regex = /.*\/(.*)\//
   var result = regex.exec(imageKey);
   if (result == null || result.length < 2){
       console.log("Image key " + imageKey + " doesn't match expected form");
   }
   var rangeKey = result[1];
   return rangeKey.split("_");
}

/* 
  expects an object that looks like this

{ 'bucketName': 'xxx',
  'imageKey' : 'imageKey',
}

*/

var updateDynamoDb = function(dynamoDbKeyRange, text) {
    console.log("saving " + dynamoDbKeyRange + " and " + text + " to db ");

    var range = dynamoDbKeyRange[0];
    var key = dynamoDbKeyRange[1];
    var dynamo = new AWS.DynamoDB();
    
    var params = {
       TableName:"fax-received",
       Key: { "phaxio-id":{"N":key},
              "phaxio-requested-at":{"S":range  } },
       UpdateExpression : "SET parsedText = :text",
       ExpressionAttributeValues : { ":text": {"S":text} }
    }
    dynamo.updateItem( params, function(err, data){
        if (err){
            console.log("failed to save dynamodb data");
            console.log(err);
        }
        else
        {
            console.log("saved data scuucessfully");
            console.log(text);
        }
    });
}

var imageReceived = function(filepath, imageKey) {

    tesseract.process(filepath, function(err,text) {
          if (err){
              console.log("failed to process image" + filepath);
              console.log(err);
          }
          else {
              console.log("Found text");
              console.log(text);
              
              updateDynamoDb(extractDynamoDBKeyFromImageKey(imageKey), text);
          }

    });

};

var imageProcessRouter = express.Router();
imageProcessRouter.post('/', function (req, res) {
    console.log(JSON.stringify(req.body));

    var headerName = 'x-api-key';
    if ( headerName in req.headers && req.headers[headerName] === process.env.OCR_API_KEY) {
        var bucketName = req.body.bucketName;
        var imageKey = req.body.imageKey;
        var filebasename = path.basename(imageKey);
        var filepath = '/tmp/' + filebasename;
     
        var finish = function() {
             console.log(filepath);
             console.log("write finised successfully.");
             imageReceived(filepath, imageKey);
        };
    
        var error = function(err) {
             console.log("error writing stream");
             console.log(err);
        };
    
        var s3 = new AWS.S3();
        var params = {Bucket: bucketName, Key: imageKey};

        var file = require('fs').createWriteStream(filepath);
        file.addListener('finish', finish);
        file.addListener('error', error);
        s3.getObject(params).createReadStream().pipe(file);
        res.json({message: 'Message received'});    
    }
    else {
        res.sendStatus(400);
    }

});

var validateReceivedMessage = function(fields, req, files, phaxioHeaderValue) {

    // URL path of this method
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

var faxReceiveRouter = express.Router();
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

var faxReceiveFromEmailRouter = express.Router();
faxReceiveFromEmailRouter.post('/', function (req, res) {
    
     var form = new multiparty.Form({autoFiles:true});
     
      form.parse(req, function(err, fields, files) {
          
            if (err) {
              console.log(err);
              res.sendStatus(400);
            }
            else
            {
                   res.json({message:JSON.stringify(fields),
                    files: JSON.stringify(files)
                    });
            }
      });
    
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/image-ocr', imageProcessRouter);
app.use('/fax-receive', faxReceiveRouter);
app.use('/fax-receive-from-email', faxReceiveFromEmailRouter);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port' + port);



