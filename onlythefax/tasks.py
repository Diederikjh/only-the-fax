# from http://docs.celeryproject.org/en/latest/django/first-steps-with-django.html
# define celery tasks

from __future__ import absolute_import

from celery import shared_task

from onlythefax.models import Fax
    
@shared_task
def getFaxImageAndProcess(faxId):
    newFax = Fax.objects.get(id=faxId);
    newFax.phaxio_tags = str(newFax.phaxio_tags) + "run with background thread!\n"
    
    phaxio_id = newFax.phaxio_id
    
    # TODO fancy things with Phaxio API to get image. https://www.phaxio.com/docs/api/send/sendFax/
    
    # Do OCR and then save parsed string back.
    
    # Send call to Phaxio API to send fax of url, if URL is valid.
    
    newFax.save()
    
    
    
    