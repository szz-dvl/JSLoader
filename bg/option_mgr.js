function Options (opt) {

	this.jsl = opt.jsl || {
		
		uglify: false,
		uglify_mangle: false
	};
	
	this.editor = opt.editor || {

		showPrintMargin: false,
		showGutter: false,
		fontSize: 10,
		collapsed: false,
		theme: new Theme({})
	};
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

	this.persist = function () {
		
		return new Promise (
			
			(resolve, reject) => {
				self.storage
					.setOptions(new Options({editor: self.editor, jsl: self.jsl}))
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
						
						if (args.action == "update-page")
							self.sendMessage("update-page", args.message);
					}
				);
				
				self.port.onDisconnect.addListener(
					() => {

						self.port.onMessage.removeListener(self.informLists);
						
						self.port = null;
						console.log("Disconnecting port!");
					}
				);
			}
		);
}

