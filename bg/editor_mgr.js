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
					
					// console.error("Got wdw!");
					// console.log(wdw);
					
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
	this.opts = self.parent.bg.option_mgr.editor;
	
	this.tab = opt.tab || null;
	
	self.parent.editors.push(self);

	if (this.tab) {

		if (this.tab.status == "complete") {
		
			this.tab.attachEditor(this)
				.then(null,
					  err => {
						  
						  console.error("Attach rejected!!");
						  console.error(err);
					  
					  });
		}

	}
	
	this.runInTab = function () {

		if (tab)
			return self.tab.runForEditor(self.script);
		else
			return Promise.resolve();
			
	};

	this.tabToOriginalState = function () {

		if (tab)
			return self.tab.revertChanges();
		else
			return Promise.resolve();
	};

	this.editorClose = function () {

		if (self.tab)
			self.tab.deattachEditor();
			
		//console.log("Removing editor " + self.id);
		
		self.parent.editors.remove(
			self.parent.editors.findIndex(
				editor => {
					
					return editor.id == self.id;
						
				}
			)
		);	
	};

	this.setWdw = function (wdw) {
		
		self.wdw.child = wdw;
		self.wdw.child.onbeforeunload = self.editorClose;
		
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

		// console.log("Editor: ");
		// console.log(script);
		
		return new Promise (
			(resolve, reject) => {
				
				var alive = self.getOwnerOf(script);
				
				if (alive)
					resolve(alive);
				else {

					if (!script.parent.isGroup()) {

						self.bg.tab_mgr.getOrCreateTabFor(script.getUrl())
							.then(
								response => {
							
									// console.error("Got Tab!");
									// console.error(response);
							
									new EditorWdw({parent: self, script: script, tab: response.tab, mode: false})
										.then(resolve, reject);
							
								}, reject
							);
						
					} else {

						new EditorWdw({parent: self, script: script, tab: null, mode: false})
							.then(resolve, reject);
					}
				}
			}
		);
	};

	this.openEditorInstanceForGroup = function (group) {

		return new EditorWdw({parent: self, script: group.upsertScript(new Script({})), tab: null, mode: true});

	}

	this.getOwnerOf = function (script) {

		return self.editors.filter(
			editor => {

				return editor.script.uuid == script.uuid;

			}
		)[0] || null;
		
	};
	
	this.getEditorById = function (eid) {

		// console.error("Getting editor " + eid + ": ");
		// console.error(self.editors);
		
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
