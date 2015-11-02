console.log('Loading function');

var AWS = require('aws-sdk');   
var formData = require('form-data');
var streams = require('memory-streams');

var dynamo = new AWS.DynamoDB();
var s3 = new AWS.S3();
    
var optionallyAddField = function(attrName, fieldName, dataIn, dataOut, typeString){
    console.log(typeString)
    if (fieldName in dataIn){
        var attrValue = {};
        if (typeString =="N")
        {
            attrValue[typeString] = dataIn[fieldName].toString();
        }
        else
        {
            attrValue[typeString] = dataIn[fieldName];
        }
        dataOut[attrName] = attrValue;   
    }
    
};

// TODO get binary to image as per https://www.phaxio.com/docs/api/general/faxFile/
var getThumbnailImage = function(faxid, requested_at, context)
{
    console.log("getThumbnailImage");
    var phaxioFilePost = "https://api.phaxio.com/v1/faxFile";
   
   var form = new formData();
   
    console.log("form created");
   form.append('id', faxid.toString());
   // s - small jpeg thumbnail l large jpeg thumbnail
   form.append('type', 'l');
   form.append('api_key', 'TODO');
   form.append('api_secret', 'TODO');
   
   var writer = new streams.WritableStream(); 
    console.log("stream created");
   form.submit(phaxioFilePost, function(err, res) {
        if (err) {
            console.error('Upload error' + err);
            context.fail('ERROR: save image failed: ' + err);
        }
        else
        {
            console.log("result received");
            console.log(res);
            // Asuming this is a stream
            res.pipe(writer);
            console.log("wrote to pipe");
            console.log("length " + writer.length);
            console.log(writer.toString());
            
            // TODO error on empty file.
            if (typeof(writer.length) == 'undefined' || writer.length ==0 )          
            {
                context.fail("empty file received");
            }
            else {
            
                var dstBucket = "com.onlythefax.images";
                // TODO for better filename use https://www.npmjs.com/package/content-disposition
                
                var faxidString = faxid.toString();
                var dstKey = "thumbnails/" + requested_at + "_" +faxidString + "/" + faxidString + ".jpg";
            
                s3.putObject({
					Bucket: dstBucket,
					Key: dstKey,
					Body: writer.toBuffer(),
					ContentType: res.ContentType
				},
				function (err) {
				    if (err){
				        context.fail("Failed to save to s3 " + err);
				    }
				    else{
				        context.succeed('Saved image data to s3');
				    }
				});
            }
            
        }
    });
    
}

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Key fields
    var item = {
            "phaxio-id":{"N":event.fax.id.toString()},
            "phaxio-requested-at":{"S":event.fax.requested_at},
    };
    
    optionallyAddField("phaxio-metadata", "metadata", event, item, "S");
    optionallyAddField("phaxio-is-test", "is_test", event, item, "BOOL");
    optionallyAddField("phaxio-status", "status", event.fax, item, "S");
    optionallyAddField("phaxio-num-pages", "num_pages", event.fax, item, "N");
    optionallyAddField("phaxio-cost", "cost", event.fax, item, "N");
    optionallyAddField("phaxio-from-number", "from_number", event.fax, item, "N");
    
    console.log('Received event:', JSON.stringify(item, null, 2));
    
    dynamo.putItem({
        "TableName": "fax-received",
        "Item":item
    }, function(err, data) {
            if (err) {
                context.fail('ERROR: Dynamo failed: ' + err);
            } else {
                console.log('Dynamo Success: ' + JSON.stringify(data, null, '  '));
                console.log('calling getThumbnailImage');
                console.log('calling arg1 ' + event.fax.id);
                console.log('calling arg2 ' + context);
                getThumbnailImage(event.fax.id, event.fax.requested_at, context);
            }
        });
};