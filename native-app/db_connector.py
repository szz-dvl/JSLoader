#!/usr/bin/env python

# Install script ======> pymongo
import sys
import json
import struct
from pymongo import MongoClient

db = 0;

# Python 2.x version (if sys.stdin.buffer is not defined)
# Read a message from stdin and decode it.
def getMessage():
    rawLength = sys.stdin.read(4)
    if len(rawLength) == 0:
        sys.exit(0)
        
    messageLength = struct.unpack('@I', rawLength)[0]
    message = sys.stdin.read(messageLength).decode('utf-8')
    return json.loads(message)

# Encode a message for transmission,
# given its content.
def encodeMessage(messageContent):
    encodedContent = json.dumps(messageContent)
    encodedLength = struct.pack('@I', len(encodedContent))
    return {'length': encodedLength, 'content': encodedContent}
    
#Send an encoded message to stdout
def sendMessage(encodedMessage):
    sys.stdout.write(encodedMessage['length'])
    sys.stdout.write(encodedMessage['content'])
    sys.stdout.flush()
    
while True:
    receivedMessage = json.loads(getMessage());
    
    if receivedMessage:
        #sys.stderr.write(receivedMessage);
        tag = receivedMessage['tag'];

        if tag == "connect": 

            db = MongoClient(receivedMessage['content']).jsl;
            
            sendMessage(encodeMessage('{"tag": "alive"}'));
            
        elif tag == 'domains_push':
            for domain in receivedMessage['content']:
                
                db.domains.replace_one(
                    { "name": domain["name"] },
                    domain,
                    upsert=True
                );
                
        elif tag == 'groups_push':
            for group in receivedMessage['content']:
                
                db.groups.replace_one(
                    { "name": group["name"] },
                    group,
                    upsert=True
                );
                
        elif tag == 'domains_get':
            
            docs = [];
            
            for domain in db.domains.find():
                del domain['_id']
                docs.append(domain)
                
            sendMessage ( encodeMessage( '{ "tag": "domains", "content":' + json.dumps(docs) + ' }' ));
            
        elif tag == 'groups_get':
            
            docs = [];
            
            for group in db.groups.find():
                del group['_id']
                docs.append(group)
                
            sendMessage ( encodeMessage( '{ "tag": "groups", "content":' + json.dumps(docs) + ' }' ));
            
