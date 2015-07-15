

from django.test import TestCase
from django.core.urlresolvers import reverse

from ocr import readImage
from models import Fax

class OCRTests(TestCase):
    
    def test_ocr_sanity_check(self):
        
        # Files in test data?  Better way of handeling this?
        file = open("./onlythefax/testdata/images/fax1.jpg", "rb")
        readText = readImage(file)
        self.assertEqual(readText, "https://bing.com")
        
        
def createFax(phaxio_id, phaxio_cost_US_c, parsed_URL):
    f = Fax(phaxio_id=phaxio_id, phaxio_cost_US_c=phaxio_cost_US_c, parsed_URL=parsed_URL)
    f.save()
        
class URLTests(TestCase):
        
    def assertIndexResponseEquals(self, responseValue):
        response = self.client.get(reverse('index'))
        self.assertEqual(response.status_code, 200)
        self.assertQuerysetEqual(response.context['latest_faxes_list'], responseValue)
        return response
        
    def test_index_zero_faxes(self):
        self.assertIndexResponseEquals([])
        
    def test_index_one_fax(self):
        createFax(phaxio_id=1, phaxio_cost_US_c=10, parsed_URL="google.com")
        self.assertIndexResponseEquals(['<Fax: Fax object>'])
        
    def test_fax_details_empty_db(self):
        # note id for args is sequence, hence ","
        response = self.client.get(reverse('detail', args=(1,)))
        self.assertEqual(response.status_code, 404)
        
    def test_fax_details_one_fax(self):
        parsed_URL = "google.com"
        phaxio_id = 1
        phaxio_cost_US_c = 10
        createFax(phaxio_id=phaxio_id, phaxio_cost_US_c=phaxio_cost_US_c, parsed_URL=parsed_URL)
        response = self.client.get(reverse('detail', args=(1,)))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['fax'].parsed_URL, parsed_URL)
        self.assertEqual(response.context['fax'].phaxio_id, phaxio_id)
        self.assertEqual(response.context['fax'].phaxio_cost_US_c, phaxio_cost_US_c)

        
        
        
        
        