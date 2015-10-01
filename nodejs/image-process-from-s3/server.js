// All from https://scotch.io/tutorials/build-a-restful-api-using-node-and-express-4

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');

var AWS = require('aws-sdk');
// Set your region for future requests.
AWS.config.region = 'us-west-2';

var path = require('path');
var tesseract = require('node-tesseract');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });   
});

router.post('/', function (req, res) {
    console.log(JSON.stringify(req.body));
    res.json({message: 'success'});
});

/* 
  By convention the file is stored in S3 bucket as
        thumbnails/<dynamoDb-range>_<dynamoDb-key>/image.jpg
  as an example:
        thumbnails/2015-07-13 22:53.33_7/image.jpg
  note the range, key swaparound.  This is to make the file listing more sane.
*/
var extractDynamoDBKeyFromImageKey = function(imageKey)
{
   var regex = /thumbnails\/(.*)\//
   var result = regex.exec(imageKey);
   if (result == null || result.length < 2){
       console.log("Image key " + imageKey + " doesn't match expected form");
   }
   var rangeKey = result[1];
   return rangeKey.split("_");
}

/* 
  expects an object that looks like this

{ 'bucketName': 'xxx',
  'imageKey' : 'imageKey',
}

*/

var updateDynamoDb = function(dynamoDbKeyRange, text) {
    console.log("saving " + dynamoDbKeyRange + " and " + text + " to db ");

    var range = dynamoDbKeyRange[0];
    var key = dynamoDbKeyRange[1];
    var dynamo = new AWS.DynamoDB();
    
    var params = {
       TableName:"fax-received",
       Key: { "phaxio-id":{"N":key},
              "phaxio-requested-at":{"S":range  } },
       UpdateExpression : "SET parsedText = :text",
       ExpressionAttributeValues : { ":text": {"S":text} }
    }
    dynamo.updateItem( params, function(err, data){
        if (err){
            console.log("failed to save dynamodb data");
            console.log(err);
        }
        else
        {
            console.log("saved data scuucessfully");
            console.log(text);
        }
    });
}

var imageReceived = function(filepath, imageKey) {

    tesseract.process(filepath, function(err,text) {
          if (err){
              console.log("failed to process image" + filepath);
              console.log(err);
          }
          else {
              console.log("Found text");
              console.log(text);
              
              updateDynamoDb(extractDynamoDBKeyFromImageKey(imageKey), text);
          }

    });

};

var imageProcessRouter = express.Router();
imageProcessRouter.post('/', function (req, res) {
    console.log(JSON.stringify(req.body));

    var bucketName = req.body.bucketName;
    var imageKey = req.body.imageKey;
    var filebasename = path.basename(imageKey);
    var filepath = '/tmp/' + filebasename;
 
    var finish = function(){
         console.log(filepath);
         console.log("write finised successfully.");
         imageReceived(filepath, imageKey);
    }

    var error = function(err){
         console.log("error writing stream");
         console.log(err);
    }

    var s3 = new AWS.S3();
    var params = {Bucket: bucketName, Key: imageKey};
    // TODO use guid for filename to avoid clashes.
    var file = require('fs').createWriteStream(filepath);
    file.addListener('finish', finish);
    file.addListener('error', error);
    s3.getObject(params).createReadStream().pipe(file);
    res.json({message: 'Message received'});
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/test-api', router);
app.use('/image-ocr', imageProcessRouter);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);



