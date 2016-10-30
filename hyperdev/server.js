// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

var bodyParser = require('body-parser');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var multiparty = require('multiparty');
const fs       = require('fs');
var path = require('path');
var AWS = require('aws-sdk');
// Set your region for future requests.
AWS.config.region = 'us-west-2';

var dynamo = new AWS.DynamoDB();
var s3 = new AWS.S3();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/dreams", function (request, response) {
  response.send(dreams);
});

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post("/dreams", function (request, response) {
  dreams.push(request.query.dream);
  response.sendStatus(200);
});

// Simple in-memory store for now
var dreams = [
  "Find and count some sheep",
  "Climb a really tall mountain",
  "Wash the dishes"
  ];


var validateReceivedMessage = function(fields, req, files, phaxioHeaderValue) {

//  return true for now, debugging.
    return true;

    var crypto = require('crypto');

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
  
    var request    = require("request");
    var util       = require('util');
  
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

var getFirstPDFFileAttachment = function(files) {
    
    var keys = Object.keys(files);
    
    var regex = new RegExp('.*\.pdf$', "i");
    
    for (var i in keys){
        
        var key = keys[i];
        var attachment = files[key][0];
        
        var originalFilename = attachment["originalFilename"];
        var matches = regex.exec(originalFilename);
        if (matches !== null) {
            return attachment["path"];
        }
        
    }
    
    return null;
    
};

var dateStringFromTimestamp = function (timestamp) {
    var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
    d.setUTCSeconds(timestamp);
    var timestampAsString = d.toISOString();
    return timestampAsString;
};


var saveMGFaxToS3 = function(filePath, timestamp, token, res) {
    
    var requestDateAsString = dateStringFromTimestamp(timestamp);
    
	var mime = require('mime');
	var contentType = mime.lookup(filePath);
	var body = fs.createReadStream(filePath);
	
	var filebasename = path.basename(filePath);
	
	var key = "fax-pdfs-mg/" + requestDateAsString + "_" + token + "/" + filebasename;
	
	s3.putObject({
        Bucket: "com.onlythefax.images",
        Key: key,
        ContentType: contentType,
        Body: body
    },
    function(err) {
        if (err) {
            console.log("Failed to save mg email to s3");
            console.log(err);
            res.sendStatus(500);
        }
        else {
            console.log('Saved pdf image data to s3');
            res.sendStatus(200);
        }
    });
    
};


var saveMGFaxDynamoDB = function(subject, faxNumber, timestamp, token, sender, body, pdfFileAttachmentLocalPath, res)
{
  var item = {
      "received":{"S":dateStringFromTimestamp(timestamp)},
      "token" : {"S":token},
      "subject":{"S":subject},
      "faxNumber":{"S":faxNumber},
      "sender" : {"S":sender},
      "body" : {"S":body}
  };
  
  // TODO also add other fields that might be empty.
  if (body == null || body === "") {
    delete item.body;
  }
  
  dynamo.putItem({
  "TableName": "fax-receive-mg",
  "Item":item
  }, function(err, data) {
          if (err) {
              console.log("Faild to save mg email to dynamodb");
              console.log(err);
              res.sendStatus(500);
          } else {
              console.log('Dynamo Success: ' + JSON.stringify(data, null, '  '));
              saveMGFaxToS3(pdfFileAttachmentLocalPath, timestamp, token, res);
          }
      });
};

var numberFromSubject = function(subjectString) {
    // TODO add support for nubmers of the format 27866000476
    // look for first 10 digit number 
    var words = subjectString.split(" ");
    
    // 10 digit number
    var regex = /\d{10}/;
    for (var i in words) {
        var word = words[i];
        var result = regex.exec(word);
        if (result !== null && result.length != 0) {
            return result[0];            
        }
    }
    
    return null;
};

var faxReceiveFromEmailRouter = express.Router();
faxReceiveFromEmailRouter.post('/', function (req, res) {

     var contentType = req.get('content-type');
     console.log(contentType);

     if (contentType.indexOf('multipart/form-data') == 0)
     {
	     var form = new multiparty.Form({autoFiles:true});
	     
	     form.parse(req, function(err, fields, files) {
  		  
  		    if (err) {
    			  console.log(err);
    			  res.sendStatus(400);
  		    }
  		    else
  		    {
                console.log("Parsed");
                console.log(JSON.stringify(fields));
                console.log(JSON.stringify(files));
                
            // TODO verify from field is correct. Not sure this is 100% right place. What about email send/receive use case
            /*if (emailFrom.indexOf("faxfx.biz") < 0) {
                console.log("Email from doesn't match");
                console.log(emailFrom);
                ress.sendStatus(400);
            }*/
            
            var sender = fields["sender"][0];
            var subject = fields["Subject"][0];
            var faxNumber = numberFromSubject(subject);
            var timestamp = fields["timestamp"][0];
            var token = fields["token"][0];
            var body = fields["stripped-text"][0];
            
            var pdfFileAttachmentLocalPath = getFirstPDFFileAttachment(files);
  
      			if (faxNumber != null && pdfFileAttachmentLocalPath != null) {	
                    saveMGFaxDynamoDB(subject, faxNumber, timestamp, token, sender, body, pdfFileAttachmentLocalPath, res);
      			}
      			else
      			{
                  var r = {message:fields,
                      files: files,
                       fromNr: faxNumber,
                       time: timestamp,
                       pathToFile: pdfFileAttachmentLocalPath
                  };
                  console.log(JSON.stringify(r));
                  
                  var dateString = dateStringFromTimestamp(timestamp);
                  console.log(dateString);
                  console.log(pdfFileAttachmentLocalPath);
                  
                  res.json(r);
      			}
      			
  		    }
	      });
  	}
  	else
  	{
  		console.log("Content type not supported " + contentType);
  		res.sendStatus(200);
  	}
});

app.use('/fax-receive', faxReceiveRouter);
app.use('/fax-receive-from-email', faxReceiveFromEmailRouter);

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

