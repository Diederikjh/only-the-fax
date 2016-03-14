#!/bin/bash

i=$1
convert -crop +0+10% -trim -fuzz 40% -sharpen 0x1.5 $i $i"_trimmed.png"
