'use strict';
console.log('Loading function');

//let doc = require('dynamodb-doc');
//let dynamo = new doc.DynamoDB();

var fs = require('fs');

var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });
var path = require('path');

// TODO fix duplication
var parsedURLUpdated = function(dynamodbRecord) {
    console.log(dynamodbRecord.OldImage);
    console.log(dynamodbRecord.NewImage);
    
    // If field is only in new record, not in old one (and new one is of type string)
    if (!('parsedText' in dynamodbRecord.OldImage) && ('parsedText' in dynamodbRecord.NewImage)) {
        if (typeof dynamodbRecord.NewImage.parsedText.S === "string") {
            return true;
        }
    }

    // Change was in URL
    if ('parsedText' in dynamodbRecord.OldImage && 'parsedText' in dynamodbRecord.NewImage) {
        return dynamodbRecord.OldImage.parsedText.S != dynamodbRecord.NewImage.parsedText.S;
    }
    return false;
};


// TODO fix duplication!

var sanitizeUrl = function(potentialUrl){
    // Any chars (including newline) http replace with http
    potentialUrl = potentialUrl.replace(new RegExp("[\\s\\S]*http", "gm"), "http");
    // Replace all: http://stackoverflow.com/a/1144788/8524
    // Remove any whitespace
    potentialUrl = potentialUrl.replace(/\s/g, "");
    // Replace | with l. Pretty |ame if you ask me
    potentialUrl = potentialUrl.replace(/\|/g, 'l');
    
    // Replace http:ll or similar with http://
    var httpProtocols = ["http", "https"];
    for(var i in httpProtocols)
    {
        var protocol = httpProtocols[i];
        potentialUrl = potentialUrl.replace(new RegExp(protocol + ":.{2}", "i"), protocol +"://");
    }
    
    // Replace .coml with .com/
    var topLevelDomains = ["com", "org","net", "za", "uk", "au", "biz", "guru", "gov", "mil", "mobi", "edu", "io", "us"];
    for (i in topLevelDomains)
    {
        var tld = topLevelDomains[i];
        potentialUrl = potentialUrl.replace(new RegExp("\\." + tld + ".{1}", "i"), "." + tld +"/");
    }
    
    return potentialUrl;
};

var uploadPathToS3 = function(outputFilePath, received, token, callback) {
    
	var mime = require('mime');
	var contentType = mime.lookup(outputFilePath);
	var body = fs.createReadStream(outputFilePath);
	
	var filebasename = path.basename(outputFilePath);
	
	var key = "websites/mg/" + received + "_" + token + "/" + filebasename;
	
	s3.putObject({
        Bucket: "com.onlythefax.images",
        Key: key,
        ContentType: contentType,
        Body: body
    },
    function(err) {
        if (err) {
            console.log("Faild to save website pdf");
            console.log(err);
            callback(err);
        }
        else {
            console.log('Saved website pdf of webiste to s3');
        }
    });
    
};

var generatePDFURLImage = function(newImage, keys, callback){
    
    var parsedText = newImage.parsedText.S.trim();
    parsedText = sanitizeUrl(parsedText);
    
    console.log("generating PDF of " + parsedText);
    
    var phantom = require('phantom');   
    
	var tempFilesDirPath = '/tmp/onlyhthefax';

	if (!fs.existsSync(tempFilesDirPath)) {
		fs.mkdirSync(tempFilesDirPath);
	}
    
    var outputFilePath = tempFilesDirPath + '/page.pdf';

    phantom.create().then(function(ph) {
        ph.createPage().then(function(page) {
           page.property('paperSize', { format: 'A4', orientation: 'portrait', border: '1cm' }).then(function() {
               page.open(parsedText).then(function(status) {
                page.render(outputFilePath).then(function() {
                    console.log('Page Rendered');
                    ph.exit();
                    uploadPathToS3(outputFilePath, keys.received.S, keys.token.S, callback);
                });
              });
           });
        });
    });
    
};

/**
 * Provide an event that contains the following keys:
 *
 *   - operation: one of the operations in the switch statement below
 *   - tableName: required for operations that interact with DynamoDB
 *   - payload: a parameter to pass to the operation being performed
 */
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

     event.Records.forEach(function(record) {
        
             if ((record.eventName == 'MODIFY') && parsedURLUpdated(record.dynamodb)) {
                 generatePDFURLImage(record.dynamodb.NewImage, record.dynamodb.Keys, callback);
             }
             else
             {
                 console.log('Event not interesting');
             }
     });

    /*const operation = event.operation;

    if (event.tableName) {
        event.payload.TableName = event.tableName;
    }

    switch (operation) {
        case 'create':
            dynamo.putItem(event.payload, callback);
            break;
        case 'read':
            dynamo.getItem(event.payload, callback);
            break;
        case 'update':
            dynamo.updateItem(event.payload, callback);
            break;
        case 'delete':
            dynamo.deleteItem(event.payload, callback);
            break;
        case 'list':
            dynamo.scan(event.payload, callback);
            break;
        case 'echo':
            callback(null, event.payload);
            break;
        case 'ping':
            callback(null, 'pong');
            break;
        default:
            callback(new Error(`Unrecognized operation "${operation}"`));
    }*/
};