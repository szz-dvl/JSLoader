function Options (opt) {
	
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

	this.__schedulePersistAt = function (to) {
		
		if (self.persistID)
			clearTimeout(self.persistID);
		
		self.persistID = setTimeout(
			() => {
				
				self.storage
					.setOptions({ editor: self.editor, data_origin: self.data_origin })
					.then(
						() => {			
							/* !!! */
							self.bg.editor_mgr.broadcastEditors({action: "opts", message: self.editor});
						}
					);
			}, to
		);	
	};
	
	this.persistEditorOpt = function (opt) {
		
		self.editor[opt.id] = opt.value;
		self.__schedulePersistAt(350);
	};

	this.persistDBString = function (string) {
		
		self.data_origin = string;
		self.__schedulePersistAt(350);
		
	};
	
	this.openPage = function() {
		
		self.events = new EventEmitter();
		browser.runtime.openOptionsPage();
		
	};

	this.editUserDefs = function () {
		
		self.storage.getUserDefs(
			defs => {
				
				self.bg.editor_mgr.openEditorInstanceForScript(
					new Script (
						{
							name: "UserDefs",
							id:"UserDefs",
							parent: null,
							code: defs
						}
					)
				);
			});
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

		let text = ["{"];
		
		async.eachSeries(["domain", "group"],

			(name, next) => {

				text.push("\"" + name + "s\": ");
				self.bg[name + "_mgr"].exportData(true)
					.then(
						data => {

							console.log("Pushing " + name);
							console.log(data);
							
							text.push.apply(text, data);
							text.push(",");
							next();
						}
					);
			
			}, err => {

				if (err)
					console.error(err);
				else {

					text.pop();
					text.push("}");

					browser.downloads.download({ url: URL.createObjectURL( new File(text, "app.json", {type: "application/json"}) ) });
				}
			}
		);
	}
	
	this.importApp = function (imported) {
		
		return new Promise(
			(resolve, reject) => {

				async.eachSeries(["domain", "group"],
					(name, next) => {
						
						self.bg[name + "_mgr"].importData(imported[name + "s"])
							.then(next, next);
						
					}, err => {

						if (err)
							reject(err);
						else 
							resolve();	
					})
			});
	}
	
}

