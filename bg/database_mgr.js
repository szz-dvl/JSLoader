function DBMgr (bg) {
	
	let self = this;
	
	this.bg = bg;
	this.available = false;
	this.port = browser.runtime.connectNative("db_connector");

	this.bg.events.on('options-ready',
		() => {
			
			self.port.postMessage('{ "tag": "connect", "content": "' + self.bg.option_mgr.jsl.data_origin + '" }');
			
			self.port.onMessage.addListener(
				response => {
					
					let obj = JSON.parse(response);
					
					switch (obj.tag) {
						
						case "alive":
							self.available = true;
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
				
				self.bg.domain_mgr.exportScripts(true)
					.then(
						text => {
							
							self.port.postMessage('{ "tag": "domains_push", "content":' + text.join("") + '}' );
							
						}
					);	
			}
			
			self.getDomains = function () {
				
				self.port.postMessage('{ "tag": "domains_get" }');
			}
			
			self.pushGroups = function () {
				
				self.bg.group_mgr.exportGroups(true)
					.then(
						text => {
							
							self.port.postMessage('{ "tag": "groups_push", "content":' + text.join("") + '}' );
							
						}
					);
			}
			
			self.getGroups = function () {
				
				self.port.postMessage('{ "tag": "groups_get" }');
			}
			
		});
}
