from django.db import models

class Fax(models.Model):
    
    # Phaxio fields
    phaxio_meta_data = models.CharField(max_length=200, blank=True, null=True)
    phaxio_id = models.IntegerField()
    phaxio_cost_US_c = models.IntegerField(blank=True)
    phaxio_status = models.CharField(max_length=50, blank=True, null=True)
    phaxio_is_test = models.BooleanField(default=False)
    phaxio_requested_at = models.CharField(max_length=50, blank=True, null=True)
    phaxio_from_number = models.CharField(max_length=50, blank=True, null=True)
    phaxio_to_number = models.CharField(max_length=50, blank=True, null=True)
    phaxio_recipients = models.CharField(max_length=200, blank=True, null=True)
    phaxio_tags = models.CharField(max_length=1000, blank=True, null=True)
    phaxio_error_type = models.CharField(max_length=50, blank=True, null=True)
    phaxio_error_code = models.CharField(max_length=200, blank=True, null=True)
    phaxio_completed_at = models.CharField(max_length=50, blank=True, null=True)
    
    # Normal fields
    parsed_URL = models.CharField(max_length=6000)
    # TODO sent info?
    