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
			
			//this.bg.app_events.emit('options-ready');
				
		}
	);

	this.bg.db.on('db_change', string => {

		if (this.events) 
			this.events.emit("db_change", string);

	});
	
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

					chrome.downloads.download({ url: URL.createObjectURL( new File(text, "app.json", {type: "application/json"}) ) });
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

	this.loadExamples = () => {

		return new Promise ((resolve, reject) => {
			
			this.bg.readLocalFile("init/examples_jsl.json")
				.then(text => {
					
					this.importApp(JSON.parse(text))
						.then(resolve, reject);
					
				})
		})
	}
	
	this.clearData = () => {

		return new Promise(
			(resolve, reject) => {

				Promise.all([
					this.bg.domain_mgr.clear(),
					this.bg.group_mgr.clear(),
					this.storage.removeGlobals(),
					this.storage.removeUserDefs()
						
				]).then(resolve, reject);
			})
	}
	
}

