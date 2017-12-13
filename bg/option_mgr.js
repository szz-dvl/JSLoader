function Options (opt) {

	this.jsl = opt.jsl || {
		
		proxys: {}
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
	
	this.exportSettings = function () {
		
		browser.downloads.download(
			{ url: URL.createObjectURL(
				new File(
					JSON.stringify(self.option_mgr.getFullOpts()).split('\n'),
					"settings.json",
					{type: "application/json"}
				)
			)}
		);
	};
	
	// this.storeNewOpts = function (changes, area) {
		
	// 	if (area != "local")
	//  		return;
		
	// 	if (changes.options) 
	// 		Options.call(self, changes.options.newValue || {});
	// };

	// browser.storage.onChanged.addListener(this.storeNewOpts);
}

