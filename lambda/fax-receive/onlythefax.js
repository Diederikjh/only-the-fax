console.log('Loading function');

var AWS = require('aws-sdk');   
var streams = require('memory-streams');
var request    = require("request");

var dynamo = new AWS.DynamoDB();
var s3 = new AWS.S3();
    
var optionallyAddField = function(attrName, fieldName, dataIn, dataOut, typeString) {
    console.log(typeString);
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
    var dstKey = "fax-pdfs/" + requested_at + "_" + faxidString + "/" + faxidString + ".pdf";
    console.log("Saving file `" + dstKey + "`"); 
    console.log("length `" + buffer.length + "`");

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

// From http://stackoverflow.com/a/14794066/8524
var isInt = function (value) {
  return !isNaN(value) && 
         parseInt(Number(value)) == value && 
         !isNaN(parseInt(value, 10));
}

// Download binary to image as per https://www.phaxio.com/docs/api/general/faxFile/
var getThumbnailImage = function(faxid, requested_at, context)
{
    console.log("getThumbnailImage from phaxio");
    var phaxioFilePost = "https://api.phaxio.com/v1/faxFile";
   
    var writer = new streams.WritableStream();
   
    writer.on('finish', function(){
        console.log('file downloaded finished');
    });
    
    var downloadContentType = '';
    request.post(phaxioFilePost, {
           form: {
               id: faxid,
               type: 'p',
               api_key:'TODO',
               api_secret:'TODO'
           }
       }, function(err, res, body) {
           if (err) {
               console.log(err);
               context.sendStatus(500);
           }
           else {
               imageReceived(faxid, requested_at, writer.toBuffer(), downloadContentType, context);
           }
       }).on('response', function(response) {
           console.log('response');
           console.log(response.statusCode);
           console.log(response.headers['content-type']);
           downloadContentType = response.headers['content-type'];
           var len = parseInt(response.headers['content-length'], 10);
           console.log("length in bytes");
           console.log(len);
       })
       .on('data', function(chunk){
          writer.write(chunk);
          console.log('(data) chunk length');
          console.log(chunk.length);
       })
       .on('end', function(){
           console.log('end');
           writer.end();
       })
       .on('error', function(err) {
           console.log('error');
           console.log(err);
           context.fail(err);
       });
      
    console.log("requested post");
};

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
    if (isInt(event.from_number)) {
        optionallyAddField("phaxio-from-number", "from_number", event, item, "N");
    }
    
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
                console.log('calling arg2 ' + requestDateAsString);
                getThumbnailImage(event.id, requestDateAsString, context);
            }
        });
        
};