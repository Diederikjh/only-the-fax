# Test lambda function
curl -H "Content-Type: application/json" -H "x-api-key: xxyyzz" -X POST -d '{"test":"1","test2":"1"}' https://n90olzaik3.execute-api.us-west-2.amazonaws.com/prod/FaxReceived

#Test file get from phaxio

curl https://api.phaxio.com/v1/faxFile -F 'id=22736328' -F 'type=l' -F 'api_key=TODO' -F 'api_secret=TODO' > test.jpeg
