'use strict';
console.log('Loading function');

var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });
var path = require("path");
var fs = require('fs');

var dynamo = new aws.DynamoDB();

// TODO reduce duplication by moving this (and its other twins) to a common module
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

// from [docs](http://www.faxfx.net/how-to/send-a-fax/)
var getEmailFromNumber = (faxNumber) => {
    
    faxNumber = faxNumber.replace("+27", "0");
    
    if (faxNumber.indexOf("27") == 0) {
        // Note only replace first occurance
        faxNumber = faxNumber.replace("27", "0");
    }
    
    return faxNumber + "@faxfx.net";
    
};

var sendFax = (faxNumber, tempFullFilename, callback) => {
    
    console.log("Sending fax started");
    
    var toEmail = getEmailFromNumber(faxNumber);
    var keys = require('./api_keys.js');
    
    var formData = {
          from: 'Fax User <' + keys.MG_EMAIL + '>',
          to : toEmail,
          cc: keys.CC_EMAIL,
          subject: faxNumber,
          text: " ", // <--- no body otherwise that becomes "cover letter"
          attachment: fs.createReadStream(tempFullFilename)
    };
    
    var request = require('request');

    request.post({url:'https://api.mailgun.net/v3/mg.onlythefax.io/messages', formData: formData}, function postResponse(err, httpResponse, body) {
          if (err) {
            console.error('upload failed:', err);
            callback(err);
          }
          else
          {
            console.log('Upload successful!  Server responded with:', body);              
            callback(null, "Fax sent");
          }
        }).auth('api', keys.MG_KEY);
        
        console.log("Sending fax");

};

var imageDownloaded = (tempFullFilename, key, callback) => {
  console.log("File downloaded");

  // Strip off preamble not compattable with function - fix when building unified version
  var dynamoDbKeys = extractDynamoDBKeyFromImageKey(key.replace("websites/", ""));
  
  var received = dynamoDbKeys[0];
  var token = dynamoDbKeys[1];
  
   var params = {
       TableName:"fax-receive-mg",
       Key: {
            "received":{"S": received },
            "token": {"S": token}
       }
    };

  dynamo.getItem(params, function(err, data)
  {
      if (err)
      {
          console.log(err);
          callback(err);
      }
      else
      {
          var faxNumber = data["Item"]["faxNumber"]["S"];
          sendFax(faxNumber, tempFullFilename, callback);
      }
  });
    
};

var sendEmail = (bucket, key, callback) => {
    
    console.log(bucket);
    console.log(key);
    
	var tempFilesDirPath = '/tmp/onlyhthefax';

	if (!fs.existsSync(tempFilesDirPath)) {
		fs.mkdirSync(tempFilesDirPath);
	}
	
	var filename = path.basename(key);
	
	var tempFullFilename = path.join(tempFilesDirPath , filename);

  	var finish = function() {
         console.log("write finised successfully.");
         imageDownloaded(tempFullFilename, key, callback);
    };

    var error = function(err) {
         console.log("Error downloading file");
         console.log(err);
         callback(err);
    };

    var file = fs.createWriteStream(tempFullFilename);
    file.addListener('finish', finish);
    file.addListener('error', error);
	var s3DownloadParams = {Bucket: bucket, Key: key};
    s3.getObject(s3DownloadParams).createReadStream().pipe(file);
    
};

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

        event.Records.forEach(function(record) {
            // Get the object from the event and show its content type
    		var bucket = event.Records[0].s3.bucket.name;
    		// NOTE key is URL encoded
    		var key = unescape(event.Records[0].s3.object.key).replace("+", " ");
    		
    		// Prevent processing already processed files
    		if (key.indexOf("pdf") != -1)
    		{
    			sendEmail(bucket, key, callback);	
    		}
    		else
    		{
    			console.log("File event not intresting " + key);
    		}

        });

};