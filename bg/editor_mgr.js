function onError (err) {
	console.error(err);
};

function EditorWdw (opt) {

	return new Promise (
		(resolve, reject) => {

			var editor = new Editor(opt);
			browser.windows.create({
							
				type: "popup",
				state: "normal",
				url: browser.extension.getURL("fg/editor/editor.html?" + editor.id),
				width: 900, /* get wdw width */
				height: 350 /* 40% height?  */
				
			}).then (
				wdw => {

					console.error("Got wdw!");
					console.log(wdw);
					
					editor.wdw = wdw;

					resolve (editor);
					
				}, reject);
		});
}

function Editor (opt) {

	var self = this;

	this.parent = opt.parent;
	this.script = opt.script;
	
	this.id = this.parent.__getEID();
	this.mode = opt.mode; /* true: New script, false: Editing.*/
	this.opts = self.parent.bg.option_mgr.getCurrentEditor();
	
	this.tab = opt.tab || null;

	self.parent.editors.push(self);

	if (this.tab.status == "complete") {
		
		this.tab.attachEditor(this)
			.then(null,
				  err => {
				  
					  console.error("Attach rejected!!");
					  console.error(err);
					  
				  });
	}
	
	this.__getMyTab = function () {
		
		return new Promise (
			(resolve, reject) => {
			
				if (self.tab)
					resolve (self.tab);
			
				else {

					console.log("No Tab, creating!");
					self.parent.bg.tab_mgr.getOrCreateTabFor(self) /* scope.target */
						.then(
							info => {
						
								self.tab = info.tab;
						
								if (info.created)
									self.tab.attachEditor(self);
						
								resolve(self.tab);
						
							}, reject);
				}
			
			});
	};
	
	this.runInTab = function () {

		/* New script created on run */
		return new Promise (
			(resolve, reject) => { 
			
				self.__getMyTab()
					.then(
						tab => {
							tab.runForEditor(self.script)
								.then(
									response => {
										
										console.log(response);
										resolve(response);
										
									},
									err => {
										
										console.error(err);
										reject(err);
									}
								);
						}
					);
			}
		);
	};

	this.tabToOriginalState = function () {
		
		return new Promise ((resolve, reject) => { 
			
			self.__getMyTab().then(tab => {
				
				tab.revertChanges()
					.then(resolve, reject);
			});
		});
	};

	this.editorClose = function () {

		return new Promise((resolve, reject) => {
			
			self.tab.deattachEditor()
				.then(
					response => {
						
						console.log("Removing editor " + self.id);
						
						self.parent.editors.remove(
							self.parent.editors.findIndex(
								editor => {
									
									return editor.id == self.id;
									
								}
							)
						);

						resolve(response);
				
					}, err => {

						console.log("Error removing editor: ");
						console.log(err);

					}); /* Error handling */		
		});	
	};

	this.setWdw = function (wdw) {
		
		self.wdw.child = wdw;
		self.wdw.child.onbeforeunload = self.editorClose;
		
	};

	this.updateContent = function () {

		/* URL, script, mode*/
		console.log("Unimplemented");
	};


}

function EditorMgr (bg) {

	var self = this;

	this.bg = bg;
	this.eids = 0;
	this.editors = []; //alive instances;
	
	this.__getEID = function () {
		
		return self.eids ++;
		
	};
	
	this.openEditorInstanceForTab = function (tab) {
		
		return new EditorWdw({parent: self, script: new Script({}), tab: tab, mode: true});
		
	};

	this.openEditorInstanceForScript = function (script) {

		return new Promise (
			(resolve, reject) => {
				
				self.bg.tab_mgr.getOrCreateTabFor(script.getUrl())
					.then(
						response => {
							
							// console.error("Got Tab!");
							// console.error(response);
							
							new EditorWdw({parent: self, script: script, tab: response.tab, mode: false})
								.then(resolve, reject);
							
						}, reject);
			}
		);
	};
	
	this.getEditorById = function (eid) {

		console.error("Getting editor " + eid + ": ");
		console.error(self.editors);
		
		return self.editors.filter(
			editor => {
			
				return editor.id == eid;
				
			})[0] || null;
	};

	this.getEditorForTab = function (tab) {
		
		return self.editors.filter(
			editor => {
				
				return editor.tab.id == tab.id;
				
			})[0] || null;
	};
	
} 
