function DBMgr (bg) {
	
	this.bg = bg;
	this.available = false;
	this.connected = false;
	this.reconnecting = false;
	this.writeable = false;
	this.readable = false;
	
	this.port = browser.runtime.connectNative("db_connector");
	
	this.bg.app_events.on('options-ready',
		() => {
			
			this.port.postMessage('{ "tag": "connect", "content": "' + this.bg.option_mgr.data_origin + '" }');
			
			this.port.onMessage.addListener(
				response => {
					
					let obj = JSON.parse(response);					
					this.reconnecting = false;
					
					switch (obj.tag) {
						
						case "alive":

							this.available = true;
							this.connected = true;
							this.writeable = obj.writeable;
							this.readable = obj.readable;
							
							if (this.bg.option_mgr.events)						
								this.bg.option_mgr.events.emit("db_change", obj.string);
							
							break;;

						case "bad-params":

							this.available = true;
							this.connected = false;
							this.writeable = false;
							this.readable = false;
							
							if (this.bg.option_mgr.events) 	
								this.bg.option_mgr.events.emit("db_change", obj.string);
							
							console.error("DB connection failed: " + obj.content + " for " + obj.string);
							
							break;;

						case "groups":
						case "domains":
							
							this.bg[obj.tag.slice(0, -1) + "_mgr"].importData(obj.content)
								.then(() => {
									
									if (this.bg.option_mgr.events)
										this.bg.option_mgr.events.emit("db_newdata");
								});
							
							break;;

						case "query":
							
							if (this.bg.option_mgr.events) {
								
								this.bg.option_mgr.events.emit("db_query", obj.content.map(
									record => {

										/* try - catch */
										return record.type == "Domain" ?
															  new Domain(record.data) :
															  new Group(record.data);
									})
								);
							}
							
							break;;

						case "error":

							this.available = true;
							this.connected = false;
							this.writeable = false;
							this.readable = false;
							
							if (this.bg.option_mgr.events) 
								this.bg.option_mgr.events.emit("db_error", obj.content);

							console.error("DB error: " + obj.content);
							
							break;;
							
						default:
							break;
							//console.error("DB manager: Unknown tag.\n" + JSON.stringify(obj));
					}
				}
			);
			
			this.pushDomains = (domains) => {

				if (!this.reconnecting) {

					if (domains && domains.length > 0) {

						this.port.postMessage('{ "tag": "domains_push", "content": [' + domains.map(domain => { return domain.getJSON(); }).join(",") + '] }' );

					} else {
						
						this.bg.domain_mgr.exportScripts(true)
							.then(
								text => {
									
									this.port.postMessage('{ "tag": "domains_push", "content":' + text.join("") + '}' );
									
								}
							);
					}
					
				} else {
					
					this.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");

				}
			}
			
			this.getDomains = (names) => {

				if (!this.reconnecting) {
					
					this.port.postMessage('{ "tag": "domains_get", "content": ' + ((names && names.length) ? JSON.stringify(names) : "[]") + '}');
					
				} else {
					
					this.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
				}
			}
			
			this.pushGroups = (groups) => {

				if (!this.reconnecting) {

					if (groups && groups.length > 0) {
						
						this.port.postMessage('{ "tag": "groups_push", "content": [' + groups.map(group => { return group.getJSON(); }).join(",") + '] }' );
						
					} else {
						
						this.bg.group_mgr.exportGroups(true)
							.then(
								text => {
									
									this.port.postMessage('{ "tag": "groups_push", "content":' + text.join("") + '}' );
									
								}
							);
					}

				} else {
					
					this.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");

				}
				
			}
			
			this.getGroups = (names) => {

				if (!this.reconnecting) {
					
					this.port.postMessage('{ "tag": "groups_get", "content": ' + ((names && names.length) ? JSON.stringify(names) : "[]") + '}');

				} else {
					
					this.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
					
				}
			}
			
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
								+ '", "content": ['
								+ items.map(item => { return item.getJSON(); }).join(",") + ']}');

							tID = setTimeout(() => {
									
								reject(new Error("Transaction " + tag + " timed out."));
								this.port.onMessage.removeListener(handler);
								
							}, 5000);
							
						}
					);
					
				} else {
					
					this.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
					
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
					
					this.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
					
					return Promise.reject(new Error("DB not available."));
					
				}
			}


			this.removeResources = (resources) => {

				if (!this.reconnecting) {

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
					
					this.port.postMessage('{ "tag": "remove_resources", "response": "' 
						+ tag 
						+ '", "content": '
						+ ((resources && resources.length) ? JSON.stringify(resources) : "[]") + ' }');
					
					tID = setTimeout(() => {
						
						reject(new Error("Transaction " + tag + " timed out."));
						this.port.onMessage.removeListener(handler);
						
					}, 5000);
					
				} else {
					
					this.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
					
					return Promise.reject(new Error("DB not available."));
				}
			}

			this.reconnect = (connectionString) => {
				
				//this.available = false;
				this.connected = false;
				this.writeable = false;
				this.readable = false;
				
				this.reconnecting = true;
				
				this.port.postMessage('{ "tag": "connect", "content": "' + connectionString + '" }');
				
			}

			this.queryDB = (query) => {

				if (!this.reconnecting) 
					this.port.postMessage('{ "tag": "query_for", "content": "' + query + '" }');
				else
					this.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
			}
			
		});
}
