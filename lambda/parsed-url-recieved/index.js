console.log('Loading function');

var parsedURLUpdated = function(dynamodbRecord){
    console.log(dynamodbRecord.OldImage);
    console.log(dynamodbRecord.NewImage);
    if (!('parsedText' in dynamodbRecord.OldImage)  && ('parsedText' in  dynamodbRecord.NewImage))
    {
        if (typeof dynamodbRecord.NewImage.parsedText.S === "string")
        {
            return true;
        }
    }
    
    if ('parsedText' in dynamodbRecord.OldImage && 'parsedText' in dynamodbRecord.NewImage){
        return dynamodbRecord.OldImage.parsedText.S != dynamodbRecord.NewImage.parsedText.S;
    }
    return false;
};

var sendResponseFax = function(newImage){
    // TODO
    // Get number from newImage,
    // and send Fax of URL
    
    var parsedText = newImage.parsedText;
    var recipientNr = newImage['phaxio-from-number']
    
    console.log("sending fax!! to " + parsedText.S + " of " + recipientNr.N);
};

exports.handler = function(event, context) {
    event.Records.forEach(function(record) {
        console.log(record.eventID);
        console.log(record.eventName);
        //console.log('DynamoDB Record: %j', record.dynamodb);
        
        if (record.eventName == 'MODIFY')
        {
            if (parsedURLUpdated(record.dynamodb))
            {
                sendResponseFax(record.dynamodb.NewImage);
            }
        }
        
    });
    context.succeed("Successfully processed " + event.Records.length + " records.");
};