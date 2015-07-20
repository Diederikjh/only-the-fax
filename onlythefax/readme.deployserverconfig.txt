
#installed docker as per https://docs.docker.com/installation/ubuntulinux/

# pull django image 
docker pull mbentley/django-uwsgi-nginx

#run sample (8000) host port, 80 container port
docker run -p 8000:80 -d -e MODULE=myapp mbentley/django-uwsgi-nginx