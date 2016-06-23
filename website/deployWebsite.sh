#!/bin/bash
echo "Also building"
./buildWebsite.sh
aws s3 sync ./public/ s3://onlythefax.io/ --region us-west-2
