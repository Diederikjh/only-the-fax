# Only the fax

AWS implementation of Fax based browser (stay with me people.)

The fax is sent to a predetermend number (xxxx-TBD).  The 3rd party fax API calls a lambda function *SaveImage* that pulls the first page of the fax, and saves it to S3 path. This path matches the dynamodb key that saves the metadata.

This save triggers another lambda function *proccess-image* (should be *s3-bucket-saved*) and calls a docker nodeJS app with bucket name, and image key as saved in S3.  

The docker app *fax-ocr* OCRs the image, looking for any valid URLs.  If any are found, it saves the first one to the dynamdb record, as specified by the key.  

Then the final lambda is triggered *dynamodb-update*.  This runs when the URL field for the dynamodb record has been updated.  This calls the 3rd party fax API again, sending the fax to the original recipient.