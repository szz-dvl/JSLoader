#!/usr/bin/env python

# Install script ======> pymongo
import sys
import re
import json
import struct
from pymongo import MongoClient

global db
db = {};

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
                removeable = False;

                db = client.get_database()

                res = db.command("connectionStatus", 1, showPrivileges=True)

                if len(res['authInfo']['authenticatedUserPrivileges']):
                    
                    for record in res['authInfo']['authenticatedUserPrivileges']:
                        if record['resource']['db'] == db.name and not record['resource']['collection'].startswith('system.'):
                            readable = 'find' in record['actions'] 
                            writeable = 'update' in record['actions'] and 'insert' in record['actions']
                            removeable = 'remove' in record['actions']
                            
                else: #Running anonymously / no auth
                    readable=True
                    writeable=True
                    removeable= True
                    
                sendMessage(encodeMessage('{"tag": "alive", "readable": ' +
                                          ("true" if readable else "false") +
                                          ', "writeable": ' +
                                          ("true" if writeable else "false") +
                                          ', "removeable": ' +
                                          ("true" if removeable else "false") +
                                          ', "string": "' +
                                          receivedMessage['content'] +
                                          '"}'));
                
            except Exception as e:     
                sendMessage(encodeMessage('{"tag": "bad-params", "content": "' + str(e) + '" ' + ', "string": "' + receivedMessage['content'] + '"}'));            
                
        elif tag == 'domains_get':

            try:

                # client = MongoClient(receivedMessage['string'])
                # db = client.get_database()
                
                docs = [];
                query = { "name": { "$in": receivedMessage['content'] }} if len(receivedMessage['content']) > 0 else None; 
            
                for domain in db.domains.find(query):
                    del domain['_id']
                    docs.append(domain['name'])
                
                sendMessage ( encodeMessage( '{ "tag": "domains", "content":' + json.dumps(docs) + ' }' ));
                    
            except Exception as e:
                sendMessage(encodeMessage('{"tag": "domains", "error": "' + str(e) + '" }'));

        elif tag == 'groups_get':

            try:

                # client = MongoClient(receivedMessage['string'])
                # db = client.get_database()
                
                docs = [];
                query = { "name": { "$in": receivedMessage['content'] }} if len(receivedMessage['content']) > 0 else None;
                
                for group in db.groups.find(query):
                    del group['_id']
                    docs.append(group['name'])

                sendMessage ( encodeMessage( '{ "tag": "groups", "content":' + json.dumps(docs) + ' }' ));

            except Exception as e:
                sendMessage(encodeMessage('{"tag": "groups", "error": "' + str(e) + '" }'));

        elif tag == 'push_sync':

            try:

                # client = MongoClient(receivedMessage['string'])
                # db = client.get_database()
                
                for item in receivedMessage['content']:    
                    db[receivedMessage['collection']].replace_one(
                        { "name": item["name"] },
                        item,
                        upsert=True
                    );
                    
                sendMessage (encodeMessage('{ "tag": "' + receivedMessage['response'] + '" }'));

            except Exception as e:
                sendMessage (encodeMessage('{ "tag": "' + receivedMessage['response'] + '", "error": "' + str(e) + '" }'));
                
        elif tag == 'get_sync':

            try:

                # client = MongoClient(receivedMessage['string'])
                # db = client.get_database()
                
                docs = [];
                query = { "name": { "$in": receivedMessage['content'] }} if len(receivedMessage['content']) > 0 else None; 
        
                for item in db[receivedMessage['collection']].find(query):
                    del item['_id']
                    docs.append(item)
                    
                sendMessage ( encodeMessage( '{ "tag": "' + receivedMessage['response'] + '", "content": ' + json.dumps(docs) + ' }' ));

            except Exception as e:
                sendMessage (encodeMessage('{ "tag": "' + receivedMessage['response'] + '", "error": "' + str(e) + '" }'));
                
        elif tag == 'remove_sync':

            try:

                # client = MongoClient(receivedMessage['string'])
                # db = client.get_database()
                
                query = { "name": { "$in": receivedMessage['content'] }} if len(receivedMessage['content']) > 0 else None;

                result = db[receivedMessage['collection']].delete_many(query);
                    
                sendMessage (encodeMessage('{ "tag": "' + receivedMessage['response'] + '", "content": "' + str(result.deleted_count) + '" }'));

            except Exception as e:
                sendMessage (encodeMessage('{ "tag": "' + receivedMessage['response'] + '", "error": "' + str(e) + '" }'));
