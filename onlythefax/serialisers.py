

from rest_framework import serializers
from models import Fax

class PhaxioFax(serializers.Serializer):
    id = serializers.IntegerField()
    direction = serializers.CharField(max_length=100)
    num_pages = serializers.IntegerField
    cost = serializers.IntegerField()
    status = serializers.CharField(max_length=50)
    is_test = serializers.BooleanField()
    requested_at = serializers.CharField(max_length=100)
    from_number = serializers.CharField(max_length=100, required=False)
    to_number = serializers.CharField(max_length=100, required=False)
    recipients = serializers.CharField(max_length=100, required=False)
    tags = serializers.CharField(max_length=1000, required=False)
    error_type = serializers.CharField(max_length=50, required=False)
    error_code = serializers.CharField(max_length=100, required=False)
    completed_at = serializers.CharField(max_length=100, required=False)
    
class IncommigPhaxioFaxSerializer(serializers.Serializer):
    is_test = serializers.BooleanField()
    direction = serializers.CharField(max_length=100)
    metadata = serializers.CharField(max_length=1000)
    fax = PhaxioFax()
    
    def create(self, validated_data):
        fax = Fax()
        fax.phaxio_id = validated_data["fax"]["id"];
        fax.phaxio_cost_US_c = validated_data["fax"].get("cost")
        fax.phaxio_status = validated_data["fax"].get("status")
        fax.phaxio_requested_at = validated_data["fax"].get("requested_at")
        fax.phaxio_from_number = validated_data["fax"].get("from_number")
        fax.phaxio_to_number = validated_data["fax"].get("to_number")
        fax.phaxio_recipients = validated_data["fax"].get("recipients")
        fax.phaxio_tags = validated_data["fax"].get("tags")
        fax.phaxio_error_type = validated_data["fax"].get("error_type")
        fax.phaxio_error_code = validated_data["fax"].get("error_code")
        fax.phaxio_completed_at = validated_data["fax"].get("completed_at")
        
        fax.phaxio_is_test = validated_data["is_test"]
        fax.phaxio_meta_data = validated_data["metadata"]
        
        fax.save()
        
        return fax;
