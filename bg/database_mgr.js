function DBMgr (bg) {
	
	let self = this;
	
	this.bg = bg;
	this.available = false;
	this.connected = false;
	this.reconnecting = false;
	this.writeable = false;
	this.readable = false;
	
	this.port = browser.runtime.connectNative("db_connector");

	this.bg.events.on('options-ready',
		() => {
			
			self.port.postMessage('{ "tag": "connect", "content": "' + self.bg.option_mgr.data_origin + '" }');
			
			self.port.onMessage.addListener(
				response => {

					let obj = JSON.parse(response);					
					self.reconnecting = false;
					
					switch (obj.tag) {
						
						case "alive":
							self.available = true;
							self.connected = true;
							self.writeable = obj.writeable;
							self.readable = obj.readable;
							self.bg.app_events.emit("db_change", obj.string);
							break;;
						case "bad-params":
							self.available = true;
							self.connected = false;
							self.writeable = false;
							self.readable = false;
							self.bg.app_events.emit("db_change", obj.string);
							console.error("DB connection failed: " + obj.content + " for " + obj.string);
							break;;
						case "domains":
							self.bg.domain_mgr.importDomains(obj.content);
							break;;
						case "groups":
							self.bg.group_mgr.importGroups(obj.content);
							break;;
						case "query":
							self.bg.app_events.emit("db_query", obj.content.map(
								record => {

									return record.type == "Domain" ?
														  new Domain(record.data) :
														  new Group(record.data);
								})
							);
							break;
							
						default:
							console.error("DB manager: Unknown tag.\n" + JSON.stringify(obj));
					}
				}
			);
			
			self.pushDomains = function (domains) {

				if (!self.reconnecting) {

					if (domains && domains.length > 0) {

						self.port.postMessage('{ "tag": "domains_push", "content": [' + domains.map(domain => { return domain.getJSON(); }).join(",") + '] }' );

					} else {
						
						self.bg.domain_mgr.exportScripts(true)
							.then(
								text => {
									
									self.port.postMessage('{ "tag": "domains_push", "content":' + text.join("") + '}' );
									
								}
							);
					}
					
				} else {
					
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");

				}
			}
			
			self.getDomains = function (names) {

				if (!self.reconnecting) {
					
					self.port.postMessage('{ "tag": "domains_get", "content": ' + ((names && names.length) ? JSON.stringify(names) : "[]") + '}');
					
				} else {
					
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
				}
			}
			
			self.pushGroups = function (groups) {

				if (!self.reconnecting) {

					if (groups && groups.length > 0) {
						
						self.port.postMessage('{ "tag": "groups_push", "content": [' + groups.map(group => { return group.getJSON(); }).join(",") + '] }' );
						
					} else {
						
						self.bg.group_mgr.exportGroups(true)
							.then(
								text => {
									
									self.port.postMessage('{ "tag": "groups_push", "content":' + text.join("") + '}' );
									
								}
							);
					}

				} else {
					
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");

				}
				
			}
			
			self.getGroups = function (names) {

				if (!self.reconnecting) {

					self.port.postMessage('{ "tag": "groups_get", "content": ' + ((names && names.length) ? JSON.stringify(names) : "[]") + '}');

				} else {
					
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
					
				}
			}

			self.reconnect = function (connectionString) {

				self.available = false;
				self.connected = false;
				self.writeable = false;
				self.readable = false;
				
				self.reconnecting = true;
				
				self.port.postMessage('{ "tag": "connect", "content": "' + connectionString + '" }');
				
			}

			self.queryDB = function (query) {

				if (!self.reconnecting) 
					self.port.postMessage('{ "tag": "query_for", "content": "' + query + '" }');
				else
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
			}
			
		});
}
