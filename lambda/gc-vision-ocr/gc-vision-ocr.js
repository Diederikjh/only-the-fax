
var AWS = require('aws-sdk');  


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

var saveURLToDynamoDb = (urlText, imageKey, callback) => {
    
    console.log("saving " + imageKey + " and " + urlText + " to db ");
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

    var dynamoDbKeyRange = extractDynamoDBKeyFromImageKey(imageKey);
    
    if (faxProvider == "phaxio")
    {
        tableName = "fax-received";

        var range = dynamoDbKeyRange[0];
        var phaxioKey = dynamoDbKeyRange[1];
    
        key = { "phaxio-id":{"N":phaxioKey},
              "phaxio-requested-at":{"S":range  } };
    }
    else if (faxProvider == "mg")
    {
        tableName = "fax-receive-mg";
        
        var received = dynamoDbKeyRange[0];
        var token = dynamoDbKeyRange[1];
        
        key = { "received":{"S": received },
           "token": {"S": token}};
    }
    
    var params = {
       TableName:tableName,
       Key: key,
       UpdateExpression : "SET parsedText = :text",
       ExpressionAttributeValues : { ":text": {"S":urlText} }
    };
    
    var dynamo = new AWS.DynamoDB();
    
    dynamo.updateItem( params, function(err, data){
        if (err) {
            console.log("failed to save dynamodb data");
            console.log(err);
            callback(err, "Failed to save dynamodb data");
        }
        else
        {
            console.log("saved data scuucessfully");
            console.log(urlText);
            callback(null, "Success");
        }
    });
    
};

var firstValidText = (textResults) => {
  
  var arrayLength = textResults.length;
  
  for (var i = 0 ; i < arrayLength; i++  ){
      
    var textResult = textResults[i];
      
    var re= /https?/;
    
    if (re.test(textResult)) {
        return textResult;
    }
  }
  
  return null;
    
};

var ocrImage = (filepath, imageKey, callback) => {
    var gcloud = require('google-cloud');
    var vision = gcloud.vision({
        projectId: 'faxit2me-1156',
        keyFilename: './faxit2me-f720b0e4bb6e.json'});
    
    vision.detectText(filepath, function(err, text, apiResponse) {
        
        if (err){
            callback(err, "Failed to detect text");
        }
        else{
            console.log(apiResponse);
            console.log(text);
            var firstValidUrlText = firstValidText(text);
            if (firstValidUrlText != null)
            {
                saveURLToDynamoDb(firstValidUrlText, imageKey, callback);
            }
            else
            {
                console.log("No valid text found");
                callback(null, "success ish");
            }
        }
    });
};


var getImageFile = (event, context, callback) => {
    
    console.log(JSON.stringify(event));
    
    var path = require('path');
    var s3 = new AWS.S3();

    var bucketName = event.bucketName;
    var imageKey = event.imageKey;
    var filebasename = path.basename(imageKey);
    var filepath = '/tmp/' + filebasename;
    
    var finish = function() {
         console.log(filepath);
         console.log("write finised successfully.");
         ocrImage(filepath, imageKey, callback);
    };
    
    var error = function(err) {
         console.log("error writing stream");
         console.log(err);
         callback(err, "Error writing stream");
    };
    
    var params = {Bucket: bucketName, Key: imageKey};
    
    var file = require('fs').createWriteStream(filepath);
    file.addListener('finish', finish);
    file.addListener('error', error);
    s3.getObject(params).createReadStream().pipe(file);
};

exports.handler = (event, context, callback) => {
    getImageFile(event, context, callback);
};