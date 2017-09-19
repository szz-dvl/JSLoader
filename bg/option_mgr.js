function Options (opt) {

	this.jsl = opt.jsl || {
		
		uglify: false,
		uglify_mangle: false
	};
	
	this.editor = opt.editor || {

		showPrintMargin: false,
		showGutter: false,
		fontSize: 10,
		collapsed: false
	};

	this.editor.theme = new Theme(opt.editor.theme) || new Theme({});
}

function OptionMgr (bg) {

	var self = this;
	
	this.bg = bg;
	this.storage = global_storage;
	
	this.storage.getOptions(

		new_options => {

			// console.log("Init Opts: ");
			// console.log(new_options);
			
			Options.call(self, new_options || {});
		}
	);

	this.persist = function () {
		
		return new Promise (
			(resolve, reject) => {

				// console.log("Persisting opts: ");
				// console.log({editor: self.editor, jsl: self.jsl});
				
				self.storage
					.setOptions({editor: self.editor, jsl: self.jsl})
					.then(
						() => {
							
							self.bg.broadcastEditors({action: "opts", message: self.editor});
							resolve({editor: self.editor, jsl: self.jsl});
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

				self.port = port;

				self.port.onMessage.addListener(
					args => {

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
					}
				);
				
				self.port.onDisconnect.addListener(
					() => {

						//self.port.onMessage.removeListener(self.informLists);
						
						self.port = null;
						console.log("Disconnecting port!");
					}
				);
			}
		);

	// this.storeNewOpts = function (changes, area) {
		
	// 	if (area != "local")
	//  		return;
		
	// 	if (changes.options) 
	// 		Options.call(self, changes.options.newValue || {});
	// };

	// browser.storage.onChanged.addListener(this.storeNewOpts);
}

