console.log('Loading function');

var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });
var tesseract = require('node-tesseract');

exports.handler = function(event, context) {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    var bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;
    var params = {
        Bucket: bucket,
        Key: key
    };
    s3.getObject(params, function(err, data) {
        if (err) {
            console.log(err);
            var message = "Error getting object " + key + " from bucket " + bucket +
                ". Make sure they exist and your bucket is in the same region as this function.";
            console.log(message);
            context.fail(message);
        } else {
            console.log('CONTENT TYPE:', data.ContentType);
            
            // Sanity check
            tesseract.process("/tmp/file.jpg", function(err, text) {
                if (err) {
                    console.error(err);
                    context.fail(message);
                }
                else {
                    console.log(text);
                    context.succeed(text);
                }
            });         
//            context.succeed(data.ContentType);
            
        }
    });
};