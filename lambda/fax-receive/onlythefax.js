console.log('Loading function');

var AWS = require('aws-sdk');   
var streams = require('memory-streams');
var request    = require("request")

var dynamo = new AWS.DynamoDB();
var s3 = new AWS.S3();
    
var optionallyAddField = function(attrName, fieldName, dataIn, dataOut, typeString) {
    console.log(typeString)
    if (fieldName in dataIn) {
        var attrValue = {};
        if (typeString == "N") {
            attrValue[typeString] = dataIn[fieldName].toString();
        }
        else {
            attrValue[typeString] = dataIn[fieldName];
        }
        dataOut[attrName] = attrValue;
    }

};

var imageReceived = function(faxid, requested_at, buffer, downloadContentType, context) {
    var dstBucket = "com.onlythefax.images";
    // TODO for better filename use https://www.npmjs.com/package/content-disposition

    var faxidString = faxid.toString();
    var dstKey = "thumbnails/" + requested_at + "_" + faxidString + "/" + faxidString + ".jpg";
    console.log("Saving file `" + dstKey + "`");

    s3.putObject({
            Bucket: dstBucket,
            Key: dstKey,
            ContentType: downloadContentType,
            Body: buffer
        },
        function(err) {
            if (err) {
                context.fail("Failed to save to s3 " + err);
            }
            else {
                context.succeed('Saved image data to s3');
            }
        });

};

// Download binary to image as per https://www.phaxio.com/docs/api/general/faxFile/
var getThumbnailImage = function(faxid, requested_at, context)
{
    console.log("getThumbnailImage");
    var phaxioFilePost = "https://api.phaxio.com/v1/faxFile";
   
   var writer = new streams.WritableStream();
   var downloadContentType = '';
   request.post('https://api.phaxio.com/v1/faxFile', {
           form: {
               id: faxid,
               type: 'l',
               api_key: 'TODO API key',
               api_secret: 'TODO API secret'

           }
       }, function(err, res, body) {
           if (err) {
               context.fail(err);
           }
           else {
               imageReceived(faxid, requested_at, writer.toBuffer(), downloadContentType, context);
           }
       }).on('response', function(response) {
           console.log('response');
           console.log(response.statusCode);
           console.log(response.headers['content-type']);
           downloadContentType = response.headers['content-type'];
       })
       .on('error', function(err) {
           console.log('error');
           console.log(err);
       })
       .pipe(writer);
    
    console.log("requested post");
}

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    //Convert epoch number date to String 
    var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
    d.setUTCSeconds(event.requested_at);
    var requestDateAsString = d.toISOString();
    
    // Key fields
    var item = {
            "phaxio-id":{"N":event.id.toString()},
            "phaxio-requested-at":{"S":requestDateAsString},
    };
    
    optionallyAddField("phaxio-metadata", "metadata", event, item, "S");
    optionallyAddField("phaxio-is-test", "is_test", event, item, "BOOL");
    optionallyAddField("phaxio-status", "status", event, item, "S");
    optionallyAddField("phaxio-num-pages", "num_pages", event, item, "N");
    optionallyAddField("phaxio-cost", "cost", event, item, "N");
    optionallyAddField("phaxio-from-number", "from_number", event, item, "N");
    
    console.log('Save item:', JSON.stringify(item, null, 2));
    
    dynamo.putItem({
        "TableName": "fax-received",
        "Item":item
    }, function(err, data) {
            if (err) {
                context.fail('ERROR: Dynamo failed: ' + err);
            } else {
                console.log('Dynamo Success: ' + JSON.stringify(data, null, '  '));
                console.log('calling getThumbnailImage');
                console.log('calling arg1 ' + event.id);
                console.log('calling arg2 ' + context);
                getThumbnailImage(event.id, event.requested_at, context);
            }
        });
};