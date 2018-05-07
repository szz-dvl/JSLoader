function Options (opt) {
	
	this.proxys = opt.proxys || {"example": {"host": "hostname", "port": 9050, "type": "socks"}};
	this.data_origin = opt.data_origin || "mongodb://localhost:27017/jsl";
	
	this.editor = opt.editor || {
		
		showGutter: false,
		printMarginColumn: 80,
		fontSize: 10,
		theme: "github",
		font: "monospace"
	};
}

function OptionMgr (bg) {

	var self = this;
	
	this.bg = bg;
	this.storage = global_storage;
	this.events = null;
	
	this.storage.getOptions(
		
		new_options => {
			
			Options.call(self, {});
			
			self.bg.app_events.emit('options-ready');
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

		console.log("Openning page.");
		self.events = new EventEmitter();
		browser.runtime.openOptionsPage();
		
	};

	this.getDataInfo = function () {

		return new Promise(
			(resolve, reject) => {

				let domains = [];
				let groups = [];
				
				async.each(self.bg.domain_mgr.domains,
					(domain_name, next) => {

						self.storage.getDomain(
							domain => {

								if (domain) {

									if (domain.haveData())
										domains.push({ name: domain_name, scripts: domain.getScriptCount(), sites: domain.sites.length });

									
								} else {
									
									console.warn("Missing indexed domain: " + domain_name);
									
								}
								
								next();
								
						}, domain_name);
						
					}, err => {
						
						if (err)
							reject(err);
						else {

							async.each(self.bg.group_mgr.groups,
								(group_name, next) => {
									
									self.storage.getGroup(
										group => {

											if (group)
												groups.push({ name: group_name, scripts: group.getScriptCount(), sites: group.sites.length });
											else
												console.warn("Missing indexed domain: " + group_name);
												
											next();
											
										}, group_name);
									
								}, err => {

									if (err)
										reject(err);
									else
										resolve({ domains: domains, groups: groups });
									
								} 
							);
						}
					}
				);
			}
		);
	};
	
	/* this.getFullOpts = function () {
	   
	   return {editor: self.editor, jsl: self.jsl};
	   };
	   
	   this.sendMessage = function(action, message) {
	   
	   if (self.port)
	   self.port.postMessage({action: action, message: message});
	   
	   }; */
	
	/* browser.runtime.onConnect
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
	   
	   default:
	   break;
	   }
	   
	   } catch (e) {}
	   }
	   );
	   
	   self.port.onDisconnect.addListener(
	   () => {
	   self.port = null;
	   }
	   );
	   }
	   }
	   ); */

	this.clear = function () {
		
		self.storage.removeOptions();
	};

	/* this.setProxys = function (literal) {
	   
	   self.jsl.proxys = JSON.parse(literal);
	   
	   }; */
	
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
		
		return new Promise(
			(resolve, reject) => {
				
				let idx = 0;
				
				async.eachSeries([self.bg.domain_mgr.importData, self.bg.group_mgr.importData],
					(promise, next) => {
						
						promise(idx ? imported.groups : imported.scripts)
							.then(() => { idx ++; next(); }, next);
							
					}, err => {
						
						if (err)
							reject(err);
						else {

							resolve();
							self.bg.rules_mgr.importRules(imported.rules);
						}
					});
			});
	}
	
}

