function Options (opt) {

	this.jsl = opt.jsl || {
		
		proxys: {"example": {"host": "hostname", "port": 9050, "type": "socks | http5 | ... etc"}}
	};
	
	this.editor = opt.editor || {
		
		showPrintMargin: false,
		showGutter: false,
		fontSize: 10,
		collapsed: false
	};

	this.editor.theme = opt.editor ? new Theme(opt.editor.theme) : new Theme({});
}

function OptionMgr (bg) {

	var self = this;
	
	this.bg = bg;
	this.storage = global_storage;
	
	this.storage.getOptions(
		
		new_options => {
			Options.call(self, new_options || {});
		}
	);

	this.persist = function (opts) {
		
		return new Promise (
			(resolve, reject) => {

				/* Object.assign: Workaround to avoid strange "Can't acces dead object" in foreground pages. */

				self.editor.theme = Object.assign({}, opts.editor.theme);
				self.editor = Object.assign({}, opts.editor);
				//self.jsl = Object.assign({}, opts.jsl);
				
				self.storage
					.setOptions({editor: Object.assign({}, opts.editor), jsl: self.jsl})
					.then(
						() => {

							self.bg.editor_mgr.broadcastEditors({action: "opts", message: self.editor});
							
							resolve(opts);

						}
					);
			}
		);
	};

	this.openPage = function() {
		
		browser.runtime.openOptionsPage();
		
	};
	
	this.getFullOpts = function () {
		
		return {editor: self.editor, jsl: self.jsl};
	};
	
	this.sendMessage = function(action, message) {

		if (self.port)
			self.port.postMessage({action: action, message: message});
		
	};
	
	browser.runtime.onConnect
		.addListener(
			port => {

				if (port.name === "option-page") {
					
					self.port = port;
				
					self.port.onMessage.addListener(
						args => {

							try {
								switch (args.action) {
								case "list-update":
									self.sendMessage("list-update", args.message);
									
									break;
									
								case "import-opts":
									self.sendMessage("import-opts", args.message);
									
									break;
								
								case "update-PA":
									self.bg.tabs_mgr.updatePA(args.message);
									
									break;
								
								default:
									break;
								}
							} catch (e) {}
						}
					);
				
					self.port.onDisconnect.addListener(
						() => {

							//browser.runtime.reload(); /* !!! */

							self.port = null;
							console.log("Disconnecting port!");
						}
					);
				}
			}
		);

	this.clear = function () {
		
		self.storage.removeOptions();
	};

	this.setProxys = function (literal) {
		
		self.jsl.proxys = JSON.parse(literal);
		
	};
	
	this.exportApp = function () {

		let text = ["{\"scripts\": "];
		let promises = [self.bg.domain_mgr.exportScripts(true), self.bg.group_mgr.exportGroups(true)];
		
		Promise.all(promises).then(
			data => {

				text.push.apply(text, data[0]);
				text.push(", \"groups\": ");
				text.push.apply(text, data[1]);
				text.push(", \"rules\": ");
				text.push.apply(text, self.bg.rules_mgr.exportRules(true));
				text.push("}");
				
				browser.downloads.download({ url: URL.createObjectURL( new File(text, "app.json", {type: "application/json"}) ) });
			}
		);	
	}
	
	this.importApp = function (imported) {
		
		self.bg.domain_mgr.importDomains(imported.scripts);
		self.bg.group_mgr.importGroups(imported.groups);
		self.bg.rules_mgr.importRules(imported.rules);
	}
	
	// this.storeNewOpts = function (changes, area) {
		
	// 	if (area != "local")
	//  		return;
		
	// 	if (changes.options) 
	// 		Options.call(self, changes.options.newValue || {});
	// };

	// browser.storage.onChanged.addListener(this.storeNewOpts);
}

