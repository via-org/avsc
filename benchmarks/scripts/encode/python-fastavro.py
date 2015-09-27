#!/usr/bin/env python
# encoding: utf-8

"""Fastavro."""

from io import BytesIO
from itertools import repeat
from time import time
from fastavro import dump, load, acquaint_schema, reader as avro_reader
import sys


with open(sys.argv[2]) as reader:
  records = avro_reader(reader)
  SCHEMA = records.schema
  RECORDS = list(records)

start = time()
n = 0
buf = BytesIO()
for _ in repeat(None, 1):
  for record in RECORDS:
    n += 1
    dump(buf, record, SCHEMA)
    buf.seek(0)
print 1000. * (time() - start) / n
