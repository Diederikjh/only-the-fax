from django.conf.urls import patterns, include, url
from django.contrib import admin
from django.contrib.auth.models import User

from onlythefax import views
from onlythefax import api_views

#REST Stuff

from rest_framework import routers, serializers, viewsets

# Serializers define the API representation.
class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ('url', 'username', 'email', 'is_staff')

# ViewSets define the view behavior.
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r'users', UserViewSet)

# End rest stuff


urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'onlythefax.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
    url(r'^api/fax2me/$', api_views.fax_receive),   #REST stuff
    url(r'^api/', include(router.urls)),   #REST stuff
    url(r'^admin/', include(admin.site.urls)),
    url(r'^$', views.IndexView.as_view(), name='index'),
    url(r'^fax/(?P<pk>\d+)/$', views.DetailView.as_view(), name='detail'),
    url(r'^fax/fax_form/$', views.fax_form, name='fax_form'),
    url(r'^fax/fax_upload/$', views.fax_upload, name='fax_upload'),
    url(r'^fax/fax_receive/$', views.fax_receive_callback, name='fax_receive_callback'),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),    # REST web stuff
)
