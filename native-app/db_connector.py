#!/usr/bin/env python

# Install script ======> pymongo
import sys
import re
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

            client = MongoClient(receivedMessage['content'])
            
            try:

                writeable = False;
                readable = False;
                
                db = client.get_database()
                res = db.command("connectionStatus", 1, showPrivileges=True)

                if len(res['authInfo']['authenticatedUserPrivileges']):
                    
                    for record in res['authInfo']['authenticatedUserPrivileges']:
                        if record['resource']['db'] == db.name and not record['resource']['collection'].startswith('system.'):
                            readable = 'find' in record['actions'] 
                            writeable = 'update' in record['actions'] and 'insert' in record['actions']

                else: #Running anonymously / no auth
                    readable=True
                    writeable=True
                            
                sendMessage(encodeMessage('{"tag": "alive", "readable": ' +
                                          ("true" if readable else "false") +
                                          ', "writeable": ' +
                                          ("true" if writeable else "false") +
                                          ', "string": "' +
                                          receivedMessage['content'] +
                                          '"}'));
                
            except Exception as e:     
                sendMessage(encodeMessage('{"tag": "bad-params", "content": "' + str(e) + '" ' + ', "string": "' + receivedMessage['content'] + '"}'));
            
        elif tag == 'domains_push':
            
            sys.stderr.write(json.dumps(receivedMessage['content']));
            
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
            query = { "name": { "$in": receivedMessage['content'] }} if len(receivedMessage['content']) > 0 else None; 
            
            for domain in db.domains.find(query):
                del domain['_id']
                docs.append(domain)
                
            sendMessage ( encodeMessage( '{ "tag": "domains", "content":' + json.dumps(docs) + ' }' ));
            
        elif tag == 'groups_get':
            
            docs = [];
            query = { "name": { "$in": receivedMessage['content'] }} if len(receivedMessage['content']) > 0 else None;
                
            for group in db.groups.find(query):
                del group['_id']
                docs.append(group)

            sendMessage ( encodeMessage( '{ "tag": "groups", "content":' + json.dumps(docs) + ' }' ));

        elif tag == 'query_for':
            
            docs = [];
            query = { "name": { "$regex": ".*" + re.escape(receivedMessage['content']) + ".*" }} if len(receivedMessage['content']) > 0 else None;
                
            for group in db.groups.find(query):
                del group['_id']
                docs.append({'data': group, 'type': 'Group'})

            for domain in db.domains.find(query):
                del domain['_id']
                docs.append({'data': domain, 'type': 'Domain'})
                
            sendMessage ( encodeMessage( '{ "tag": "query", "content":' + json.dumps(docs) + ' }' ));
                
            
