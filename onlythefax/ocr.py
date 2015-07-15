
import Image

# System must have `tesseract` installed. See https://github.com/madmaze/pytesseract
import pytesseract

def readImage(imageFile):
    readURL = pytesseract.image_to_string(Image.open(imageFile))
    return readURL;
            