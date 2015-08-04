#OCR
sudo apt-get install tesseract-ocr
# pulled in by above aparently: sudo apt-get install tesseract-ocr-eng

#see requirements.txt for python depends

#  runs celery beat services with django-celery saved scheduler
# celery -A onlythefax beat -S djcelery.schedulers.DatabaseScheduler
# Not used as no beat (repeating task) is being run

# start celery normaly:
celery -A onlythefax worker -l info 