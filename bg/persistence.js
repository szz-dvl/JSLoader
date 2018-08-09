class DB extends EventEmitter {

	constructor(connString) {

		super();
		
		this.data_origin = connString;
		this.available = false;
		this.connected = false;
		this.writeable = false;
		this.readable = false;
		
		this.port = browser.runtime.connectNative("db_connector");
		
		this.port.onMessage.addListener(
			response => {
				
				let obj = JSON.parse(response);					
				this.reconnecting = false;

				console.log("message: ");
				console.log(obj);

				if (obj.error && obj.error.includes('[111]')) {

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

			console.log("reconnecting to: " + connectionString)
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
		
		this.getDomains = () => { return this.getIdxFor('domains') };
		this.getGroups = () => { return this.getIdxFor('groups') };

		this.port.postMessage('{ "tag": "connect", "content": "' + connString + '" }');
		
	}
}

class Storage extends EventEmitter  {

	constructor() {

		super();
		
		this.room = "local";
		this.target = browser.storage[this.room];
		
		this.__get = (cb, key) => {
			
			this.target.get(key)
				.then(
					values => {
						
						cb(values[key]);
						
					}, console.error
				);	
		};
		
		this.__set = (key, val) => {

			console.log("Persisting: " + key);
			console.log(val);
			
			var obj = {};
			obj[key] = val;
			
			return this.target.set(obj);
		};

		this.__remove = (key) => {
			
			console.log("Removing: " + key);
			
			return this.target.remove(key);
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
		
		this.target.get('options')
			.then(
				val => {
					
					/* DB*/
					this.db = new DB(val['options'] ? val['options'].data_origin : "mongodb://localhost:27017/jsl");
					
					this.__bringItem = (cb, name, type) => {

						this.db['get' + type](name)
							.then(arr => {
								
								if (arr.length)
									cb(arr[0]);
								else {
									
									this.__get(
										item => {

											if (item)
												item.in_storage = true;
											
											switch (type) {
												case "Domain":
													cb(item ? new Domain(item) : null);
												case "Group":
													cb(item ? new Group(item) : null);
												case "Resource":
													cb(item ? new Resource(item) : null);
												default:
													break;
											}
											
										}, type.toLowerCase() + '-' + name);	
								}
								
							}, err => {
								//console.error(err);
								this.__get(
									item => {

										if (item)
											item.in_storage = true;
										
										switch (type) {
											case "Domain":
												cb(item ? new Domain(item) : null);
											case "Group":
												cb(item ? new Group(item) : null);
											case "Resource":
												cb(item ? new Resource(item) : null);
											default:
												break;
										}
										
									}, type.toLowerCase() + '-' + name);
							})
					};
					
					this.__pushItem = (val, type) => {

						return new Promise ((resolve, reject) => {
							
							this.db['set' + type](val)
								.then(arr => {
									
									resolve(arr[0]); 	
									
								}, err => {
									
									//console.error(err);
									
									this.__set(type.toLowerCase() + '-' + val.name, val)
										.then(resolve, reject);
								})

						})
					};

					this.__removeItem = (name, type) => {
						
						return new Promise ((resolve, reject) => {

							this.db['remove' + type](name)
								.then(count => {
									
									
									if (count > 0) {

										resolve(count);

									} else {

										this.__remove(type.toLowerCase() + '-' + name)
											.then(resolve, reject);
									}
										
								}, err => {

									//console.error(err);
									
									this.__remove(type.toLowerCase() + '-' + name)
										.then(resolve, reject);
								})
						})
					}
					
					/* Domains: */

					this.upsertDomain = (val) => {

						this.__getDomains(
							arr => {

								if (!arr.includes(val.name)) {

									arr.push(val.name);
									this.__setDomains(arr);
									
								}

							}, true); 
						
						return this.__pushItem(val, "Domain");
					};
					
					this.getDomain = (cb, name) => {
						
						this.__bringItem(cb, name, "Domain");
					};

					this.removeDomain = (name) => {

						this.__getDomains(
							arr => {

								if (arr.includes(name)) {

									arr.remove(arr.indexOf(name));
									this.__setDomains(arr);
									
								}

							}, true);
						
						return this.__removeItem(name, "Domain");
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
					
					this.upsertGroup = (val) => {
						
						this.__getGroups(
							groups => {
								
								if (!groups.includes(val.name)) {

									groups.push(val.name);
									this.__setGroups(groups);
									
								}
							}
						);

						return this.__pushItem(val, "Group");	
					};
					
					this.removeGroup = (name) => {

						this.__getGroups(
							groups => {
								
								if (groups.includes(name)) {
									
									groups.remove(groups.indexOf(name));
									this.__setGroups(groups);	
									
								}
							}
						);
						
						return this.__removeItem(name, "Group");
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

						if (name.endsWith("/")) {

							this.__get(res => {

								cb(new ResourceDir(res))
									
							}, 'resource-' + name);

						} else {
							
							this.__bringItem(cb, name, "Resource");
						}
						
					};

					this.setResource = (val) => {

						if (val.dir) 
							return this.__set('resource-' + val.name, val);	
						else 
							return this.__pushItem(val, "Resource");
						
					}
					
					this.removeResource = (name) => {

						if (name.endsWith("/"))
							return this._remove('resource-' + name);
						else
							return this.__removeItem(name, "Resource");
						
					};

					this.emit('ready');
				}
			)
	}
	
}


let global_storage = new Storage();
