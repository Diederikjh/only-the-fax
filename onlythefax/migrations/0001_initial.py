# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Fax',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('phaxio_meta_data', models.CharField(max_length=200, null=True, blank=True)),
                ('phaxio_id', models.IntegerField()),
                ('phaxio_cost_US_c', models.IntegerField(blank=True)),
                ('phaxio_status', models.CharField(max_length=50, null=True, blank=True)),
                ('phaxio_is_test', models.BooleanField(default=False)),
                ('phaxio_requested_at', models.CharField(max_length=50, null=True, blank=True)),
                ('phaxio_from_number', models.CharField(max_length=50, null=True, blank=True)),
                ('phaxio_to_number', models.CharField(max_length=50, null=True, blank=True)),
                ('phaxio_recipients', models.CharField(max_length=200, null=True, blank=True)),
                ('phaxio_tags', models.CharField(max_length=1000, null=True, blank=True)),
                ('phaxio_error_type', models.CharField(max_length=50, null=True, blank=True)),
                ('phaxio_error_code', models.CharField(max_length=200, null=True, blank=True)),
                ('phaxio_completed_at', models.CharField(max_length=50, null=True, blank=True)),
                ('parsed_URL', models.CharField(max_length=6000)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
