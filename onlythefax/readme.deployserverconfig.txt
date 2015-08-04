
#installed docker as per https://docs.docker.com/installation/ubuntulinux/

# pull django image 
docker pull mbentley/django-uwsgi-nginx

#run sample (8000) host port, 80 container port
docker run -p 8000:80 -d -e MODULE=myapp mbentley/django-uwsgi-nginx

# pip installation
 sudo apt-get install python-pip
 
 # Pyton imaging
 sudo apt-get install python-imaging
 
 #OCR
 sudo apt-get install tesseract-
 
 #rabbitmq for Celery
 sudo apt-get install rabbitmq-server
 
 # also: get service startup correctly:
 sudo service rabbitmq-server restart 
 # Also works around bug  https://groups.google.com/forum/#!topic/celery-users/tQolVQ7z5LA  Add sudo pip install librabbitmq  ?
 sudo apt-get remove python-librabbitmq
 