
var parsedURLUpdated = function(dynamodbRecord) {
    console.log(dynamodbRecord.OldImage);
    console.log(dynamodbRecord.NewImage);
    
    // If field is only in new record, not in old one (and new one is of type string)
    if (!('parsedText' in dynamodbRecord.OldImage) && ('parsedText' in dynamodbRecord.NewImage)) {
        if (typeof dynamodbRecord.NewImage.parsedText.S === "string") {
            return true;
        }
    }

    // Change was in URL
    if ('parsedText' in dynamodbRecord.OldImage && 'parsedText' in dynamodbRecord.NewImage) {
        return dynamodbRecord.OldImage.parsedText.S != dynamodbRecord.NewImage.parsedText.S;
    }
    return false;
};

var sanitizeUrl = function(potentialUrl){
    // Any chars (including newline) http replace with http
    potentialUrl = potentialUrl.replace(new RegExp("[\\s\\S]*http", "gm"), "http");
    // Replace all: http://stackoverflow.com/a/1144788/8524
    // Remove any whitespace
    potentialUrl = potentialUrl.replace(/\s/g, "");
    // Replace | with l. Pretty |ame if you ask me
    potentialUrl = potentialUrl.replace(/\|/g, 'l');
    
    var httpProtocols = ["http", "https"];
    for(var i in httpProtocols)
    {
        var protocol = httpProtocols[i];
        // Replace http // or similar with http://  (GC vision doesn't always pickup on the : after http)
        potentialUrl = potentialUrl.replace(new RegExp(protocol + "\\s*//", "i"), protocol +"://");
        // Replace http:ll or similar with http://
        potentialUrl = potentialUrl.replace(new RegExp(protocol + ":.{2}", "i"), protocol +"://");
    }
    
    // Replace .coml with .com/
    var topLevelDomains = ["com", "org","net", "za", "uk", "au", "biz", "guru", "gov", "mil", "mobi", "edu", "io", "us"];
    for (i in topLevelDomains)
    {
        var tld = topLevelDomains[i];
        potentialUrl = potentialUrl.replace(new RegExp("\\." + tld + ".{1}", "i"), "." + tld +"/");
    }
    
    return potentialUrl;
};