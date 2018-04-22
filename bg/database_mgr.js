function DBMgr (bg) {
	
	let self = this;
	
	this.bg = bg;
	this.available = false;
	this.connected = false;
	this.reconnecting = false;
	
	this.port = browser.runtime.connectNative("db_connector");

	this.bg.events.on('options-ready',
		() => {
			
			self.port.postMessage('{ "tag": "connect", "content": "' + self.bg.option_mgr.jsl.data_origin + '" }');
			
			self.port.onMessage.addListener(
				response => {
					
					let obj = JSON.parse(response);
					self.reconnecting = false;
					
					switch (obj.tag) {
						
						case "alive":
							self.available = true;
							self.connected = true;
							self.bg.app_events.emit("db_change");
							break;;
						case "bad-params":
							self.available = true;
							self.bg.app_events.emit("db_change");
							console.error("DB connection failed: " + obj.content);
							break;;
						case "domains":
							self.bg.domain_mgr.importDomains(obj.content);
							break;;
						case "groups":
							self.bg.group_mgr.importGroups(obj.content);
							break;;
							
						default:
							console.error("DB manager: Unknown tag.\n" + JSON.stringify(obj));
					}
				}
			);
			
			self.pushDomains = function () {

				if (!self.reconnecting) {
					
					self.bg.domain_mgr.exportScripts(true)
						.then(
							text => {
								
								self.port.postMessage('{ "tag": "domains_push", "content":' + text.join("") + '}' );
							
							}
						);
					
				} else {
					
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");

				}
			}
			
			self.getDomains = function () {

				if (!self.reconnecting) {
					
					self.port.postMessage('{ "tag": "domains_get" }');
					
				} else {
					
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
				}
			}
			
			self.pushGroups = function () {

				if (!self.reconnecting) {
					
					self.bg.group_mgr.exportGroups(true)
						.then(
							text => {
								
								self.port.postMessage('{ "tag": "groups_push", "content":' + text.join("") + '}' );
								
							}
						);

				} else {
					
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");

				}
				
			}
			
			self.getGroups = function () {

				if (!self.reconnecting) {

					self.port.postMessage('{ "tag": "groups_get" }');

				} else {
					
					self.bg.notify_mgr.info("Reconnecting to DB, please wait a jiffy ...");
					
				}
			}

			self.reconnect = function (connectionString) {

				self.available = false;
				self.connected = false;

				self.reconnecting = true;
				
				self.port.postMessage('{ "tag": "connect", "content": "' + connectionString + '" }');
				
			}
			
		});
}
