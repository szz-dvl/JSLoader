class DB extends EventEmitter {

	constructor(connString) {

		super();
		
		this.data_origin = connString;
		this.available = false;
		this.connected = false;
		this.writeable = false;
		this.readable = false;
		
		this.port = chrome.runtime.connectNative("db_connector");
		
		this.port.onMessage.addListener(
			response => {
				
				let obj = JSON.parse(response);					
				this.reconnecting = false;

				console.log("message: ");
				console.log(obj);

				if (obj.error && obj.error.includes('[Errno 111]')) {

					if (this.connected) {

						this.available = true;
						this.connected = false;
						this.writeable = false;
						this.readable = false;
						this.removeable = false;

						this.emit("db_change", this.data_origin);
						
					}
					
				} else {
					
					
					switch (obj.tag) {
						
						case "alive":

							this.available = true;
							this.connected = true;
							this.writeable = obj.writeable;
							this.readable = obj.readable;
							this.removeable = obj.removeable;
							this.data_origin = obj.string;
							
							this.emit("db_change", obj.string);
							
							break;;

						case "bad-params":

							this.available = true;
							this.connected = false;
							this.writeable = false;
							this.readable = false;
							this.removeable = false;
							this.data_origin = obj.string;
							
							this.emit("db_change", obj.string);

							console.error("DB connection failed: " + obj.content + " for " + obj.string);
							
							break;;
							
						default:
							break;
					}
				}
			}
		);
		
		this.pushSync = (items, collection) => {
			
			if (!this.reconnecting) {

				return new Promise(
					(resolve, reject) => {
						
						var tID;
						let tag = UUID.generate().split(".").pop();
						
						let handler = (string) => {

							let response = JSON.parse(string);
							
							if (response.tag == tag) {

								clearTimeout(tID);
								
								if (response.error)
									reject(new Error(response.error));
								else
									resolve(items);
								
								this.port.onMessage.removeListener(handler);

							}
						}
						
						this.port.onMessage.addListener(handler);
						
						this.port.postMessage('{ "tag": "push_sync", "response": "' 
							+ tag 
							+ '", "collection": "' 
							+ collection 
							+ '", "content": '
							+ ((items && items.length) ? JSON.stringify(items) : "[]") + '}');

						tID = setTimeout(() => {
							
							reject(new Error("Transaction " + tag + " timed out."));
							this.port.onMessage.removeListener(handler);
							
						}, 5000);
						
					}
				);
				
			} else {
				
				return Promise.reject(new Error("DB not available."))
			}
		}

		this.getSync = (items, collection) => {
			
			if (!this.reconnecting) {

				return new Promise(
					(resolve, reject) => {

						var tID;
						let tag = UUID.generate().split("-").pop();
						
						let handler = (string) => {

							let response = JSON.parse(string);
							
							if (response.tag == tag) {
								
								clearTimeout(tID);
								
								if (response.error)
									reject(new Error(response.error));
								else {

									resolve(response.content.map(
										record => {

											/* try - catch */
											
											if (collection == "resources") {

												let resource = new Resource(record);
												resource.db = this;

												return resource

											} else {
												
												return (collection == "domains") ? new Domain(record) : new Group(record);
											}
										})
									);
								}
								
								this.port.onMessage.removeListener(handler);
							}
						}
						
						this.port.onMessage.addListener(handler);
						
						this.port.postMessage('{ "tag": "get_sync", "response": "' 
							+ tag 
							+ '", "collection": "' 
							+ collection 
							+ '", "content": '
							+ ((items && items.length) ? JSON.stringify(items) : "[]") + ' }');
						
						tID = setTimeout(() => {
							
							reject(new Error("Transaction " + tag + " timed out."));
							this.port.onMessage.removeListener(handler);
							
						}, 5000);
					}
				);
				
			} else {
				
				return Promise.reject(new Error("DB not available."));
				
			}
		}


		this.removeSync = (names, collection) => {

			if (!this.reconnecting) {

				return new Promise (
					(resolve, reject) => {

						var tID;
						let tag = UUID.generate().split("-").pop();
						
						let handler = (string) => {
							
							let response = JSON.parse(string);
							
							if (response.tag == tag) {
								
								clearTimeout(tID);
								
								if (response.error)
									reject(new Error(response.error));
								else 	
									resolve(response.content);
								
								this.port.onMessage.removeListener(handler);
							}						
						}
						
						this.port.onMessage.addListener(handler);

						this.port.postMessage('{ "tag": "remove_sync", "response": "' 
							+ tag 
							+ '", "collection": "' 
							+ collection 
							+ '", "content": '
							+ ((names && names.length) ? JSON.stringify(names) : "[]") + ' }');

						tID = setTimeout(() => {
							
							reject(new Error("Transaction " + tag + " timed out."));
							this.port.onMessage.removeListener(handler);
							
						}, 5000);
					});
				
			} else {
				
				return Promise.reject(new Error("DB not available."));
			}
		}

		this.getIdxFor = (type) => {
			
			return new Promise (
				(resolve, reject) => {

					var tID;

					let handler = (string) => {

						let response = JSON.parse(string);
						
						if (response.tag == type) {

							clearTimeout(tID);
							
							if (response.error)
								reject(new Error(response.error));
							else 	
								resolve(response.content);

							this.port.onMessage.removeListener(handler);
						}
					};

					this.port.onMessage.addListener(handler);
					
					this.port.postMessage('{ "tag": "' + type + '_get", "content": ' + "[]" + ', "string": "' + this.data_origin + '" }');
					
					tID = setTimeout(() => {
							
						reject(new Error("Transaction " + type + " timed out."));
						this.port.onMessage.removeListener(handler);
							
					}, 5000);
					
				});
		}

		this.reconnect = (connectionString) => {

			this.connected = false;
			this.writeable = false;
			this.readable = false;
			this.removeable = false;
			
			this.reconnecting = true;
			
			this.port.postMessage('{ "tag": "connect", "content": "' + connectionString + '" }');
			
		}

		this.mayRead = () => {

			return this.available && this.connected && this.readable;

		}

		this.mayWrite = () => {

			return this.available && this.connected && this.writeable;

		}

		this.mayRemove = () => {

			return this.available && this.connected && this.removeable;

		}

		this.getDomain = (name) => {
			
			if (this.mayRead())
				return this.getSync([name], "domains");
			else
				return Promise.reject(new Error("Unredeable DB"));
		}

		this.setDomain = (domain) => {

			if (this.mayWrite())
				return this.pushSync([domain], "domains");
			else
				return Promise.reject(new Error("Unwritteable DB"));
		}

		this.removeDomain = (name) => {

			if (this.mayRemove())
				return this.removeSync([name], "domains");
			else
				return Promise.reject(new Error("Unremoveable DB"));
		}

		this.getGroup = (name) => {
			
			if (this.mayRead())
				return this.getSync([name], "groups");
			else
				return Promise.reject(new Error("Unredeable DB"));
		}

		this.setGroup = (group) => {

			if (this.mayWrite())
				return this.pushSync([group], "groups");
			else
				return Promise.reject(new Error("Unwritteable DB"));
		}

		this.removeGroup = (name) => {

			if (this.mayRemove())
				return this.removeSync([name], "groups");
			else
				return Promise.reject(new Error("Unremoveable DB"));
		}

		this.getResource = (name) => {
			
			if (this.mayRead())
				return this.getSync([name], "resources");
			else
				return Promise.reject(new Error("Unredeable DB"));
		}

		this.setResource = (resource) => {

			if (this.mayWrite())
				return this.pushSync([resource], "resources");
			else
				return Promise.reject(new Error("Unwritteable DB"));
		}

		this.removeResource = (name) => {

			if (this.mayRemove())
				return this.removeSync([name], "resources");
			else
				return Promise.reject(new Error("Unremoveable DB"));
		}
		
		this.getDomains = () => {

			if(this.mayRead()) 
				return this.getIdxFor('domains');
			else
				return Promise.resolve([]);
		};
		
		this.getGroups = () => {

			if(this.mayRead()) 
				return this.getIdxFor('groups');
			else
				return Promise.resolve([]);
		};

		this.port.postMessage('{ "tag": "connect", "content": "' + connString + '" }');
		
	}
}

class Storage {

	constructor() {

		this.ready = false;
		this.room = "local";
		this.target = chrome.storage[this.room];
		
		this.__get = (cb, key) => {
			
			this.target.get(key,
				values => {
						
					cb(values[key]);
					
				}
			)
		};
		
		this.__set = (key, val) => {

			return new Promise(
				(resolve) => {
					
					var obj = {};
					obj[key] = val;
			
					this.target.set(obj, resolve);

				})
		};

		this.__remove = (key) => {

			return new Promise(
				(resolve) => {

					return this.target.remove(key, resolve);
					
				})
		};
		
		/* Globals: */
		this.getGlobals = (cb) => {
			
			this.__get(cb, 'globals');		
			
		};
		
		this.setGlobals = (globals) => {

			return this.__set('globals', globals);
			
		};
		
		this.removeGlobals = () => {
			
			return this.__remove('globals');
			
		};

		/* User definitions: */
		this.getUserDefs = (cb) => {
			
			this.__get(defs => { cb(defs || "") }, 'userdefs');
			
		};

		this.setUserDefs = (literal) => {

			return this.__set('userdefs', literal);
			
		};

		this.removeUserDefs = () => {
			
			return this.__remove('userdefs');
			
		};

		/* Options: */
		this.getOptions = (cb) => {
			
			this.__get(cb, 'options');
			
		};
		
		this.setOptions = (val) => {
			
			return this.__set('options', val);
			
		};
		
		this.removeOptions = () => {
			
			return this.target.remove('options');

		};

		/* Indexs */
		this.__getDomains = (cb, simple) => {
			
			this.__get(info => {

				if (simple)
					cb(info || []);
				else {

					this.__get(disabled => {
						
						cb( { info: info || [], disabled: disabled || [] } );
						
					}, 'disabled-domains');
					
				}
				
			}, 'domains');
		};

		this.__setDomains = (val) => {
			
			return this.__set('domains', val);
		};


		this.__getGroups = (cb) => {
			
			this.__get(
				arr => {
					
					cb(arr || []);

				}, 'groups');	
		};

		this.__setGroups = (val) => {
			
			return this.__set('groups', val);
		};
		
		this.target.get('options', val => {
			
			/* DB*/
			this.db = new DB(val['options'] ? val['options'].data_origin : "mongodb://localhost:27017/jsl");
			
			this.__bringItem = (cb, name, type) => {
				
				this.__get(
					item => {

						//console.log("Getting " + type + ": " + unescape(name));
						
						if (item) {

							/* console.log(item); */
							
							item.in_storage = true;
							//item.name = unescape(item.name);
							
							switch (type) {
								case "Domain":
									cb(new Domain(item));
									break;
								case "Group":
									cb(new Group(item));
									break;
								case "Resource":
									cb(item.dir ? new ResourceDir(item) : new Resource(item));
									break;
								default:
									break;
							}

						} else {

							//console.log("Missing");
							
							this.db['get' + type](unescape(name))
								.then(arr => {
									
									cb(arr.length ? arr[0] : null);
									
								}, err => { cb(null) });
						}
						
					}, type.toLowerCase() + '-' + unescape(name));
			};
			
			this.__pushItem = (val, type, in_storage) => {

				//console.log("Pushing " + type + ": " + unescape(val.name));
				
				return new Promise ((resolve, reject) => {

					//val.name = unescape(val.name);
					
					if (in_storage) {

						this.__set(type.toLowerCase() + '-' + unescape(val.name), val)
							.then(resolve, reject);

					} else {

						this.db['set' + type](val)
							.then(resolve, err => {

								this.__set(type.toLowerCase() + '-' + unescape(val.name), val)
									.then(resolve, reject);
								
							});
					}
					
				})
			};

			this.__removeItem = (name, type, in_storage) => {

				return new Promise ((resolve, reject) => {
					
					if (in_storage) {
						
						this.__remove(type.toLowerCase() + '-' + unescape(name))
							.then(resolve, reject);
						
					} else {
						
						this.db['remove' + type](name)
							.then(resolve, err => {
								
								this.__remove(type.toLowerCase() + '-' + unescape(name), val)
									.then(resolve, reject);
								
							});
					}
					
				})
			}
			
			/* Domains: */

			this.upsertDomain = (val, in_storage) => {

				return new Promise (
					(resolve, reject) => {
						
						val.name = unescape(val.name);
						
						this.__pushItem(val, "Domain", in_storage)
							.then(
								() => {
									
									this.__getDomains(
										arr => {
											
											if (!arr.includes(val.name)) {
												
												arr.push(val.name);
												this.__setDomains(arr)
													.then(resolve, reject);
												
											} else {
												resolve();
											}
											
										}, true);
									
								}, reject)
					})
			};
			
			this.getDomain = (cb, name) => {
				
				this.__bringItem(cb, name, "Domain");
			};

			this.removeDomain = (dirty_name, in_storage) => {

				return new Promise(
					(resolve, reject) => {

						let name = unescape(dirty_name);
						
						this.__removeItem(name, "Domain", in_storage)
							.then (
								() => {
									this.db.getDomains()
										.then(idx => {

											if (in_storage && idx.includes(name))
												resolve();
											else {
												
												this.__getDomains(
													arr => {
														
														if (arr.includes(name)) {
															
															arr.remove(arr.indexOf(name));
															this.__setDomains(arr)
																.then(resolve, reject);
															
														} else {
															resolve();
														}
														
													}, true);
											}

										}, err => {

											this.__getDomains(
												arr => {
													
													if (arr.includes(name)) {
														
														arr.remove(arr.indexOf(name));
														this.__setDomains(arr)
															.then(resolve, reject);
														
													} else {
														resolve();
													}
													
												}, true);
										})
										
										
								}, reject)
					})
			};

			this.getOrCreateDomain = (cb, name) => {

				this.__bringItem(
					domain => {
						
						if (domain)
							cb(domain);
						else 
							cb(new Domain({name: name}));
						
					}, name, "Domain");
				
			};

			this.setDisabledDomains = (array) => {
				
				return this.__set('disabled-domains', array);
				
			};

			
			/* Groups: */
			
			this.getGroup = (cb, name) => {

				this.__bringItem(cb, name, "Group");
				
			};

			this.upsertGroup = (val, in_storage) => {

				return new Promise (
					(resolve, reject) => {

						val.name = unescape(val.name);
						
						this.__pushItem(val, "Group", in_storage)
							.then(
								() => {
									
									this.__getGroups(
										groups => {
											
											if (!groups.includes(val.name)) {

												groups.push(val.name);
												this.__setGroups(groups)
													.then(resolve, reject);
												
											} else {
												resolve();
											}
											
										}
									);

									
								}, reject)
					})
			};


			this.removeGroup = (dirty_name, in_storage) => {

				return new Promise(
					(resolve, reject) => {

						let name = unescape(dirty_name);
						
						this.__removeItem(name, "Group", in_storage)
							.then (
								() => {
									this.db.getGroups()
										.then(idx => {

											if (in_storage && idx.includes(name)) 
												resolve();
											else {
												
												this.__getGroups(
													groups => {
														
														if (groups.includes(name)) {
															
															groups.remove(groups.indexOf(name));
															this.__setGroups(groups)
																.then(resolve, reject);
															
														} else {
															resolve();
														}
													}
												);
											}

										}, err => {
											
											this.__getGroups(
												groups => {
													
													if (groups.includes(name)) {
														
														groups.remove(groups.indexOf(name));
														this.__setGroups(groups)
															.then(resolve, reject);
														
													} else {
														resolve();
													}
												}
											);
										});
									
								}, reject)
					})
			};

			this.getOrCreateGroup = (cb, name) => { 
				
				this.__bringItem(
					group => {
						
						if (group)
							cb(group);
						else 
							cb(new Group({name: name}));
						
					}, name, "Group");
			}

			/* Resources: */
			this.getResource = (cb, name) => {
				
				this.__bringItem(cb, name, "Resource");
				
			};

			this.setResource = (val, in_storage) => {

				return this.__pushItem(val, "Resource", in_storage);
				
			}
			
			this.removeResource = (name, in_storage) => {

				return this.__removeItem(name, "Resource", in_storage);
				
			};

			this.ready = true;
		})
			
	}
	
}


let global_storage = new Storage();
