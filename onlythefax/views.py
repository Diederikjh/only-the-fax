from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404
from django.core.urlresolvers import reverse

from django.views import generic

from django.http import Http404

from models import Fax

from ocr import readImage

import json

class IndexView(generic.ListView):
    template_name = 'onlythefax/index.html'
    context_object_name = 'latest_faxes_list'

    def get_queryset(self):
        """Return the last five published questions."""
        return Fax.objects.order_by('-id')[:5]

class DetailView(generic.DetailView):
    model = Fax
    template_name = "onlythefax/fax_detail.html"

def fax_form(request):
    context = { }
    return render(request, "onlythefax/fax_upload_test.html", context);

def fax_upload(request):
    
    cost = request.POST['fax_cost']
    url = request.POST['fax_url']
    phaxio_id = request.POST['fax_phaxio_id']
    
    f = Fax();
    f.phaxio_id = phaxio_id;
    f.phaxio_cost_US_c = cost;
    
    imageFile = request.FILES['image']
    url = readImage(imageFile);
    
    f.parsed_URL = url;
    
    f.save();
    
    return HttpResponseRedirect(reverse('index'))
    
def fax_receive_callback(request):
    if request.method == "POST":
        
        isTest = request.POST["is_test"]
        direction = request.POST["direction"]
        faxString = request.POST["fax"]
        metadata = request.POS["metadata"]
        
        f = Fax()
        f.phaxio_is_test = isTest
        f.phaxio_meta_data = metadata
        
        #POST test. 
        # Then file read test
        # then api integration test.
        
        # faxData = json.loads(faxString)
        
        # f.phaxio_id = faxData["id"]
        # if "from_number" in faxData.values():
        #     f.phaxio_from_number = faxData["from_number"]
        
        # f.phaxio_requested_at = faxData["requested_at"]
        # TODO add more fields

        # todo get image call, or atlest start this asyncronously.
        
        f.save()
        
        # todo is this the right thing to do?
        return HttpResponse(200);
    else:
        return HttpResponse( status=400);
    
    
    
    
    
    
    