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
	
	var fileConverted = function(bucket,key, processedFilename, context)
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
                context.sendStatus(500);
            }
            else {
                console.log('Saved processed image data to s3');
                postOCR(bucket, newKey, context);
            }
        });
		
	};
	
	var imageDownloaded = function(tempFullFilename, bucket, key, context)
	{
		var im = require('imagemagick');
		
		// use image magick to convert image for better OCR.
		var processedFilename = getProcessedFilename(tempFullFilename);
		// TODO convert PDF to png.  from script: convert -density 300 -depth 8 -quality 85 $1[0] -resize 25% -sharpen 0x3.0 -crop 80%x80%+20%+20% -trim -fuzz 30%  $1_cropped.png
		// add [0] for only first page of pdf
		im.convert(['-density','300', '-depth', '8', '-quality', '85',tempFullFilename + "[0]", '-resize', '25%','-sharpen', '0x2.5', '-crop', '80%x80%+20%+20%', '-trim', '-fuzz', '30%', processedFilename], 
			function(err, stdout){
			  if (err) 
			  {
			  	console.log(err);
			  	context.sendStatus(500);
			  }
			  console.log('stdout:', stdout);
			  fileConverted(bucket, key, processedFilename, context);
			});
		
	};
	
	var processImage = function(bucket, key, context)
	{
		
		var tempFilesDirPath = '/tmp/onlyhthefax';

		if (!fs.existsSync(tempFilesDirPath)) {
			fs.mkdirSync(tempFilesDirPath);
		}
		
		var filename = path.basename(key);
		
		var tempFullFilename = path.join(tempFilesDirPath , filename);

  		var finish = function() {
             console.log("write finised successfully.");
             imageDownloaded(tempFullFilename, bucket, key, context);
        };
    
        var error = function(err) {
             console.log("Error downloading file");
             console.log(err);
             context.sendStatus(500);
        };

        var file = fs.createWriteStream(tempFullFilename);
        file.addListener('finish', finish);
        file.addListener('error', error);
		var s3DownloadParams = {Bucket: bucket, Key: key};
        s3.getObject(s3DownloadParams).createReadStream().pipe(file);
		
	};
	
	var postOCR = function(bucket, key, context)
	{
		var params = {
			bucketName: bucket,
			imageKey: key
		};
		
		var dataAsString = JSON.stringify(params);
		console.log(dataAsString);

	    request({ url: "http://onlythefax-ocr-env.us-west-2.elasticbeanstalk.com/image-ocr",
        method: "POST",
         headers: {
		      "x-api-key":"TODO API KEY FOR OCR"
		    },
        json: params
        }, function (error, response, body){
             if (!error && response.statusCode === 200) {
                context.succeed("Sent data to OCR");
             }
             else {
                 console.log("Error with data send to OCR");
                 console.log(response.statusCode);
                 context.sendStatus(500);
             }
             console.log(body);
        });
	};

	exports.handler = function(event, context) {
		//console.log('Received event:', JSON.stringify(event, null, 2));

		// Get the object from the event and show its content type
		var bucket = event.Records[0].s3.bucket.name;
		// NOTE key is URL encoded
		var key = unescape(event.Records[0].s3.object.key).replace("+", " ");
		
		// Prevent processing already processed files
		if (key.indexOf("processed") == -1)
		{
			processImage(bucket, key, context);	
		}
		else
		{
			context.succeed("File event not intresting " + key);
		}
		
	};