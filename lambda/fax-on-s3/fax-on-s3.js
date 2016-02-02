	console.log('Loading function');

	var aws = require('aws-sdk');
	var s3 = new aws.S3({ apiVersion: '2006-03-01' });
	var request = require("request")

	exports.handler = function(event, context) {
		//console.log('Received event:', JSON.stringify(event, null, 2));

		// Get the object from the event and show its content type
		var bucket = event.Records[0].s3.bucket.name;
		// NOTE key is URL encoded
		var key = unescape(event.Records[0].s3.object.key).replace("+", " ");
		var params = {
			bucketName: bucket,
			imageKey: key
		};
		
		var dataAsString = JSON.stringify(params);
		console.log(dataAsString);

	    request({ url: "http://onlythefax-ocr-env.us-west-2.elasticbeanstalk.com/image-ocr",
        method: "POST",
        json: params
        }, function (error, response, body){
             if (!error && response.statusCode === 200) {
                context.succeed("Sent data to OCR");
             }
             else {
                 console.log("Error with data send to OCR");
                 console.log(response.statusCode);
                 context.fail(error);
             }
             console.log(body);
        });
		
	};