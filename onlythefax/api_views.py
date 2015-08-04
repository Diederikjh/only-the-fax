

from rest_framework.decorators import api_view

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from rest_framework import permissions

from serialisers import IncommigPhaxioFaxSerializer, PhaxioFax

from tasks import getFaxImageAndProcess

@api_view(['POST'])
@permission_classes((permissions.AllowAny,))
def fax_receive(request):
    if request.method == 'POST': 
        serializer = IncommigPhaxioFaxSerializer(data=request.data)
        if serializer.is_valid():
            savedFax = serializer.save()
            
            #start save task
            getFaxImageAndProcess.delay(savedFax.id)
            
            return Response(status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status.HTTP_400_BAD_REQUEST)


                    