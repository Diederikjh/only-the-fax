#!/bin/bash
aws s3 cp ./public/ s3://onlythefax.io/ --recursive --region us-west-2
