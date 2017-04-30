# Only the fax

AWS and [phaxio](https://www.phaxio.com/) implementation of a fax based browser (stay with me people).

The fax is sent to a predetermend number (xxxx-TBD).  The 3rd party fax API calls a lambda function *fax-receive* that pulls the first page of the fax, and saves it to S3 path. This path is formatted with the dynamodb key that saves the metadata.

This save triggers another lambda function *fax-on-s3 and calls a docker nodeJS app with bucket name, and image key as saved in S3.  (Tesserect is used for OCR, but since its a bitch to install stuff on lambda, we used a node JS docker image instead.)

The docker app *fax-ocr* OCRs the image, looking for any valid URLs.  If any are found, it saves the first one to the dynamdb record, as specified by the key.

Then the final lambda is triggered *parse-url-received*.  This runs when the URL field for the dynamodb record has been updated.  This calls the fax API again, sending the fax to the original recipient, if a sender number was available.

Use cases for an app like this:
None, except perhaps for my amusement. :)

[Early test image](https://drive.google.com/file/d/0B2qYO1ogQVPaQmY2T3NRb3gtMkk/view?usp=sharing)


Hints:

Zip folder:
    `zip -r parsed-url-rcvd.zip ./*`

Send zip to lambda:
    `aws lambda  update-function-code --function-name <name> --zip-file fileb://path/to/zip/file.zip`
    
Use specific node version:
    `sudo n 4.3`

 
 
 