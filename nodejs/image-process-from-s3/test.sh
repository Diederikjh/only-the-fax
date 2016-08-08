
curl -X POST -H "Content-Type: application/json"  -H "x-api-key: abc" --data '{"bucketName":"com.onlythefax.images", "imageKey":"thumbnails/2015-07-13 22:53.33_7/fax1.jpg" }' http://localhost:8080/image-ocr

# post pdf to phaxio test service.
curl https://api.phaxio.com/v1/testReceive -F 'filename=@/home/drbergie/work/faxit2me/only-the-fax/test images/testimage.pdf' -F 'api_key=TODO' -F 'api_secret=TODO'

#docker env
docker run -p 8080:8080 -v /home/drbergie/work/faxit2me/only-the-fax/:/src/only-the-fax -e OCR_API_KEY=abc diederikjh/faxit2me-ocr:v11