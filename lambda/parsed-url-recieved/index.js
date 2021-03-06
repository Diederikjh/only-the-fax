console.log('Loading function');

var request = require("request");
var validUrl = require('valid-url');
var urls = require("./urls.js");

var saveFaxSentTime = function(dynamoDbKeys, callback){
  
  console.log(dynamoDbKeys);
  console.log("Saving fax sent time");
  
    var aws = require('aws-sdk');
    var dynamo = new aws.DynamoDB();
    
    var d = new Date();

    var params = {
       TableName:"fax-received",
       Key: dynamoDbKeys,
       UpdateExpression : "SET faxSendTime = :text",
       ExpressionAttributeValues : { ":text": {"S":d.toISOString()} }
    };
    dynamo.updateItem( params, function(err, data){
        if (err) {
            console.log("failed to save dynamodb data");
            console.log(err);
            callback(err, "failed to save dynamodb data");
        }
        else
        {
            console.log("saved data scuucessfully");
            callback(null, "Saved fax sent time successfully");
        }
    });
    
};

var sendResponseFax = function(newImage, dynamoDbKeys, callback) {
    var parsedText = newImage.parsedText.S.trim();
    
    parsedText = urls.sanitizeUrl(parsedText);
    
    if ('phaxio-from-number' in newImage)
    {
        var recipientNr= newImage['phaxio-from-number'].N.toString();
        
        // Because startsWith is missing.:(
        if (recipientNr.indexOf("+") != 0) {
            recipientNr= "+" + recipientNr;
        }
        
        console.log("sending fax of `" + parsedText + "` to " + recipientNr);
    
        var keys = require("./api_keys.js");
    
        if (validUrl.isUri(parsedText)) {
            if (newImage['phaxio-is-test'].BOOL== false) {
                request.post('https://api.phaxio.com/v1/send', {
                    form: {
                            to: recipientNr,
                            string_data: parsedText,
                            string_data_type: 'url',
                            api_key:keys.PHAXIO_API_KEY,
                            api_secret:keys.PHAXIO_API_SECRET
                                }
                        }, function(err, res, body) {
                            if (err) {
                                callback(err, "Failed to send fax");
                            }
                            else {
                                console.log(body);
                                console.log("Successfully sent fax");
                                saveFaxSentTime(dynamoDbKeys, callback);
                            }
                        });
            }
            else {
                console.log("Finished, but not sending fax as it is test");
                callback(null, "Finished, but not sending fax as it is test");
            }
        }
        else {
            console.log("Text doesn't seem to be valid URI `" + parsedText + "`");
            callback(null, "Text doesn't seem to be valid URI `" + parsedText + "`");
        }
    }
    else
    {
        console.log("No from number, can't send fax.");
        callback(null, "No from number, can't send fax.");
    }
};

exports.handler = function(event, context, callback) {
    event.Records.forEach(function(record) {
        console.log(record.eventID);
        console.log(record.eventName);

        if ((record.eventName == 'MODIFY') && urls.parsedURLUpdated(record.dynamodb)) {
            sendResponseFax(record.dynamodb.NewImage, record.dynamodb.Keys, callback);
        }
        else {
            console.log('Event not interesting.');
            callback(null, "Event not interesting");
        }

    });
};