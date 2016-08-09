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

var dynamo = new AWS.DynamoDB();
var s3 = new AWS.S3();

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
   var regex = /.*\/(.*)\//;
   var result = regex.exec(imageKey);
   if (result == null || result.length < 2) {
       console.log("Image key " + imageKey + " doesn't match expected form");
   }
   var rangeKey = result[1];
   return rangeKey.split("_");
};

/* 
  expects an object that looks like this

{ 'bucketName': 'xxx',
  'imageKey' : 'imageKey',
}

*/

var updateDynamoDb = function(imageKey, text) {
    console.log("saving " + imageKey + " and " + text + " to db ");
    var faxProvider = "";
    if (imageKey.indexOf("fax-pdfs/") == 0)
    {
        faxProvider = "phaxio";
    }
    else if (imageKey.indexOf("fax-pdfs-mg/") == 0)
    {
        faxProvider = "mg";
    }
    
    var tableName = "";
    var key = {};
    
    if (faxProvider == "phaxio")
    {
        tableName = "fax-received";
        var dynamoDbKeyRange = extractDynamoDBKeyFromImageKey(imageKey);
    
        var range = dynamoDbKeyRange[0];
        var phaxioKey = dynamoDbKeyRange[1];
    
        key = { "phaxio-id":{"N":phaxioKey},
              "phaxio-requested-at":{"S":range  } };
    }
    else if (faxProvider == "mg")
    {
        //tODO wire up change event for this dynamodb table
        tableName = "fax-receive-mg";
        key = { "receive":{"S": imageKey.split("/")[1]} };
    }
    
    var params = {
       TableName:tableName,
       Key: key,
       UpdateExpression : "SET parsedText = :text",
       ExpressionAttributeValues : { ":text": {"S":text} }
    };
    dynamo.updateItem( params, function(err, data){
        if (err) {
            console.log("failed to save dynamodb data");
            console.log(err);
        }
        else
        {
            console.log("saved data scuucessfully");
            console.log(text);
        }
    });
};

var imageReceived = function(filepath, imageKey) {

    tesseract.process(filepath, function(err,text) {
          if (err){
              console.log("failed to process image" + filepath);
              console.log(err);
          }
          else {
              console.log("Found text");
              console.log(text);
              
              updateDynamoDb(imageKey, text);
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
                    saveMGFaxToS3(pdfFileAttachmentLocalPath, timestamp ,res);
                }
            });
};

var saveMGFaxToS3 = function(filePath, timestamp,res) {
    
    var requestDateAsString = dateStringFromTimestamp(timestamp);
    
	var mime = require('mime');
	var contentType = mime.lookup(filePath);
	var body = fs.createReadStream(filePath);
	
	var filebasename = path.basename(filePath);
	
	var key = "fax-pdfs-mg/" + requestDateAsString + "/" + filebasename;
	
	s3.putObject({
        Bucket: "com.onlythefax.images",
        Key: key,
        ContentType: contentType,
        Body: body
    },
    function(err) {
        if (err) {
            console.log("Faild to save mg email to s3");
            console.log(err);
            res.sendStatus(500);
        }
        else {
            console.log('Saved pdf image data to s3');
            res.sendStatus(200);
        }
    });
    
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
				//console.log(JSON.stringify(r));

				var dateString = dateStringFromTimestamp(timestamp);
				console.log(dateString);
				console.log(pdfFileAttachmentLocalPath);

				 res.json(r);
				
				// TODO put image in seperate bucket.
				// Save incomming data to dynamo db.
				// Change API to also send dynamo db table and Keys where to write parsed text.
				// Add lambda to send outgoing fax on change of that dynamo db field.
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

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/image-ocr', imageProcessRouter);
app.use('/fax-receive', faxReceiveRouter);
app.use('/fax-receive-from-email', faxReceiveFromEmailRouter);

// START THE SERVER
// =============================================================================
app.listen(port);

var i = require("./imports.js");
console.log (i.testVar);
console.log('Magic happens on port' + port);



