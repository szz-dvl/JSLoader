function Options (opt) {
	
	this.data_origin = opt.data_origin || "mongodb://localhost:27017/jsl";
	
	this.editor = opt.editor || {
		
		showGutter: true,
		printMarginColumn: 80,
		fontSize: 10,
		theme: "github",
		font: "monospace"
	};
}

function OptionMgr (bg) {
	
	this.bg = bg;
	this.storage = global_storage;
	this.events = null;
	
	this.storage.getOptions(
		
		new_options => {
			
			Options.call(this, new_options || {});
			
			this.bg.app_events.emit('options-ready');
		}
	);

	this.__schedulePersistAt = (to) => {
		
		if (this.persistID)
			clearTimeout(this.persistID);
		
		this.persistID = setTimeout(
			() => {

				let self = this;
				
				this.storage
					.setOptions({ editor: Object.assign({}, self.editor), data_origin: self.data_origin })
					.then(
						() => {
							
							this.bg.editor_mgr.broadcastEditors({action: "opts", message: Object.assign({}, self.editor)});
							
						}
					);
			}, to
		);	
	};
	
	this.persistEditorOpt = (opt) => {
		
		this.editor[opt.id] = opt.value;
		this.__schedulePersistAt(350);
	};

	this.persistDBString = (string) => {
		
		this.data_origin = string;
		this.__schedulePersistAt(350);
		
	};
	
	this.editUserDefs = () => {
		
		this.storage.getUserDefs(
			defs => {
				
				let promise = defs ? Promise.resolve(defs) : this.bg.readLocalFile("init/user-defs.js");

				promise.then(
					defs => {
					
						this.bg.editor_mgr.openEditorInstanceForScript(
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
			});
	};
	
	this.getDataInfo = () => {

		return new Promise(
			(resolve, reject) => {

				let domains = [];
				let groups = [];
				
				async.each(this.bg.domain_mgr.domains,
					(domain_name, next) => {
						
						this.storage.getDomain(
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

							async.each(this.bg.group_mgr.groups,
								(group_name, next) => {
									
									this.storage.getGroup(
										group => {

											if (group)
												groups.push({ name: group_name, scripts: group.getScriptCount(), sites: group.sites.length });
											else
												console.warn("Missing indexed group: " + group_name);
												
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
	
	this.exportApp = () => {

		let text = ["{"];
		
		async.eachSeries(["domain", "group"],

			(name, next) => {

				text.push("\"" + name + "s\": ");
				this.bg[name + "_mgr"].exportData(true)
					.then(
						data => {
							
							text.push.apply(text, data);
							text.push(",\n");
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
	
	this.importApp = (imported) => {
		
		return new Promise(
			(resolve, reject) => {

				async.eachSeries(["domain", "group"],
					(name, next) => {
						
						this.bg[name + "_mgr"].importData(imported[name + "s"])
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

