console.log('Loading function');

var request = require("request");
var validUrl = require('valid-url');

var parsedURLUpdated = function(dynamodbRecord) {
    console.log(dynamodbRecord.OldImage);
    console.log(dynamodbRecord.NewImage);
    if (!('parsedText' in dynamodbRecord.OldImage) && ('parsedText' in dynamodbRecord.NewImage)) {
        if (typeof dynamodbRecord.NewImage.parsedText.S === "string") {
            return true;
        }
    }

    if ('parsedText' in dynamodbRecord.OldImage && 'parsedText' in dynamodbRecord.NewImage) {
        return dynamodbRecord.OldImage.parsedText.S != dynamodbRecord.NewImage.parsedText.S;
    }
    return false;
};

var sendResponseFax = function(newImage, context){
    var parsedText = newImage.parsedText.S.trim();
    
    parsedText = sanitizeUrl(parsedText);
    
    var recipientNr = newImage['phaxio-from-number'].N.toString();
    
    // Because startsWith is missing. :(
    if (recipientNr.indexOf("+") != 0) {
        recipientNr = "+" + recipientNr;
    }
    
    console.log("sending fax of `" + parsedText + "` to " + recipientNr);

    if (validUrl.isUri(parsedText)) {
        if (newImage['phaxio-is-test'].BOOL == false) {
            request.post('https://api.phaxio.com/v1/send', {
                form: {
                    to: recipientNr,
                    string_data: parsedText,
                    string_data_type: 'url',
                    api_key: 'TODO PHAXIO_API_KEY',
                    api_secret: 'TODO PHAXIO_API_SECRET'
                }
            }, function(err, res, body) {
                if (err) {
                    context.fail(err);
                }
                else {
                    console.log(body);
                    console.log("Successfully sent fax");
                    context.succeed("Successfully sent fax");
                }
            });
        }
        else {
            console.log("Finished, but not sending fax as it is test");
            context.succeed("Finished, but not sending fax as it is test");
        }
    }
    else {
        console.log("Text doesn't seem to be valid URI `" + parsedText + "`");
        context.succeed("Text doesn't seem to be valid URI `" + parsedText + "`");
    }
};

var sanitizeUrl = function(potentialUrl){
    // Any chars (including newling) http replace with http
    return potentialUrl.replace(new RegExp("[\\s\\S]*http", "gm"), "http")
}

exports.handler = function(event, context) {
    event.Records.forEach(function(record) {
        console.log(record.eventID);
        console.log(record.eventName);

        if ((record.eventName == 'MODIFY') && parsedURLUpdated(record.dynamodb)) {
            sendResponseFax(record.dynamodb.NewImage, context);
        }
        else {
            console.log('Event not interesting.')
            context.succeed('Event not interesting.');
        }

    });
};