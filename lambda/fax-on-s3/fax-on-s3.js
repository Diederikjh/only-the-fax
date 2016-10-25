// TODO this can be resued for mail gun pdf bucket as well -  still to wire up s3 change event.

	console.log('Loading function');

	var aws = require('aws-sdk');
	var s3 = new aws.S3({ apiVersion: '2006-03-01' });
	var request = require("request");
	var path = require("path");
	var fs = require('fs');
	
	var getProcessedFilename = function(filename)
	{
		// TODO make this replace-last
		// Replace .jpeg and .pdf to processed
		var processedFilename = filename.replace(".jpeg", ".jpg");
		processedFilename = processedFilename.replace(".jpg", ".pdf");
		processedFilename = processedFilename.replace(".pdf", "_processed.png");
		return processedFilename;
	};
	
	var fileConverted = function(bucket,key, processedFilename, callback)
	{
		var newKey = getProcessedFilename(key);
		var mime = require('mime');
		var contentType = mime.lookup(processedFilename);
		var body = fs.createReadStream(processedFilename);
		s3.putObject({
            Bucket: bucket,
            Key: newKey,
            ContentType: contentType,
            Body: body
        },
        function(err) {
            if (err) {
            	console.log("Failed to save to s3 " +err);
                callback(err, "Failed to save to s3");
            }
            else {
                console.log('Saved processed image data to s3');
                postOCR(bucket, newKey, callback);
            }
        });
		
	};
	
	var imageDownloaded = function(tempFullFilename, bucket, key, callback)
	{
		var im = require('imagemagick');
		
		// use image magick to convert image for better OCR.
		var processedFilename = getProcessedFilename(tempFullFilename);
		// add [0] for only first page of pdf.
		// Remove alpha layer to prevent tessarect getting confused with too many colours.
		// Add border to ensure OCR does better job.
		// Crop outside 5% on all sides to try and get rid of fax text noise
		// For GC-OCR don't resize image.
		im.convert(['-density','300', '-depth', '8', '-quality', '85',tempFullFilename + "[0]", '-background', 'white', '-alpha', 'remove', '-gravity',
		    'Center',  '-crop', '95%x95%+0+0', '-sharpen', '0x2.5', '-trim', '-fuzz', '30%', 
		    '-bordercolor', 'white', '-border', '20%x60%', processedFilename], 
			function(err, stdout){
			  if (err) 
			  {
			  	console.log(err);
			  	callback(err, "Failed to convert image");
			  }
			  console.log('stdout:', stdout);
			  fileConverted(bucket, key, processedFilename, callback);
			});
		
	};
	
	var processImage = function(bucket, key, callback)
	{
		
		var tempFilesDirPath = '/tmp/onlyhthefax';

		if (!fs.existsSync(tempFilesDirPath)) {
			fs.mkdirSync(tempFilesDirPath);
		}
		
		var filename = path.basename(key);
		
		var tempFullFilename = path.join(tempFilesDirPath , filename);

  		var finish = function() {
             console.log("write finised successfully.");
             imageDownloaded(tempFullFilename, bucket, key, callback);
        };
    
        var error = function(err) {
             console.log("Error downloading file");
             console.log(err);
             callback(err,"Error downloading file");
        };

        var file = fs.createWriteStream(tempFullFilename);
        file.addListener('finish', finish);
        file.addListener('error', error);
		var s3DownloadParams = {Bucket: bucket, Key: key};
        s3.getObject(s3DownloadParams).createReadStream().pipe(file);
		
	};
	
	var postOCR = function(bucket, key, callback)
	{
		var params = {
			bucketName: bucket,
			imageKey: key
		};
		
		var dataAsString = JSON.stringify(params);
		console.log(dataAsString);

		var lambda = new aws.Lambda({apiVersion: '2015-03-31'});
		lambda.invoke( {
			FunctionName: 'gc-vision-ocr',
			Payload: dataAsString,
			InvocationType: 'Event' // Async call
		}, function(err, data)
		{
			if (err){
				console.log(err);
				callback(err, "Failed to invoke OCR lambda");
			}
			else{
				callback(null, "Send to OCR successfully");
			}
		});
		
	};

	exports.handler = function(event, context, callback) {
		console.log('Received event:', JSON.stringify(event, null, 2));

		// Get the object from the event and show its content type
		var bucket = event.Records[0].s3.bucket.name;
		// NOTE key is URL encoded
		var key = unescape(event.Records[0].s3.object.key).replace("+", " ");
		
		// Prevent processing already processed files
		if (key.indexOf("processed") == -1)
		{
			processImage(bucket, key, callback);	
		}
		else
		{
			callback(null, "File event not intresting " + key);
		}
		
	};