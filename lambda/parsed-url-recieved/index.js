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

var sendResponseFax = function(id, range, newImage){
    // TODO
    // Get number from newImage,
    // and send Fax of URL
    console.log("sending fax!!");
};

exports.handler = function(event, context) {
    event.Records.forEach(function(record) {
        console.log(record.eventID);
        console.log(record.eventName);
        //console.log('DynamoDB Record: %j', record.dynamodb);
        
        // Keys.
        var phaxioID = record.dynamodb.Keys["phaxio-id"].N;
        var phaxioRequestedAt = record.dynamodb.Keys["phaxio-requested-at"].S;
        
        if (parsedURLUpdated(record.dynamodb))
        {
            sendResponseFax(phaxioID, phaxioRequestedAt, record.dynamodb.NewImage);
        }
        
    });
    context.succeed("Successfully processed " + event.Records.length + " records.");
};