function onError (err) {
	console.error(err);
};

function Editor (opt) {

	var self = this;

	this.parent = opt.parent;
	this.script = opt.script;
	
	this.id = this.parent.__getEID();
	this.tab = opt.tab || null;
	
	if (this.tab)
		this.tab.attachEditor(this).then(null, onError);
	
	this.mode = opt.mode;
	this.opts = self.parent.bg.option_mgr.getCurrentEditor();
	
	/* if (!this.script)
	   this.tab = this.parent.bg.tab_mgr.attachEditor(this); */
	
	self.parent.editors.push(this);
	
	var createData = {

		type: "popup",
		state: "normal",
		url: browser.extension.getURL("fg/editor/editor.html?" + self.id),
		width: 900, /* get wdw width */
		height: 350 /* 40% height?  */
	};
	
	browser.windows.create(createData).then(wdw => {
		
		self.wdw = wdw;
		
	});
	
	this.__getMyTab = function () {
		
		return new Promise ((resolve, reject) => {
			
			if (self.tab)
				resolve (self.tab);
			
			else {
				
				self.parent.bg.tab_mgr.getOrCreateTabFor(self.script.getUrl()) /* scope.target */
					.then(info => {
						
						self.tab = info.tab;
						
						if (info.created)
							self.tab.attachEditor(self);
						
						resolve(self.tab);
						
					}, reject);
			}
			
		});
	};
	
	this.runInTab = function () {
		
		return new Promise ((resolve, reject) => { 
			
			self.__getMyTab().then(
				tab => {
					
					tab.run(self.script)
						.then(
							response => {
								
								console.log(response);
								resolve(response);
								
							}, reject);
				});
		});
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
			
			self.tab.deattachEditor().then(response => {

				self.parent.editors.remove(
					self.parent.editors.findIndex(
						editor => {
							
							return editor.id == self.id;
							
						})
				);
			
				resolve(response);
			
			}, reject); /* Error handling */		
		});
		
	};

	this.setWdw = function (wdw) {

		self.wdw.child = wdw;
		self.wdw.child.onbeforeunload = self.editorClose;

	}

	this.updateContent = function () {

		/* URL, script, mode*/
		console.log("Unimplemented");

	}
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

		return new Promise ((resolve, reject) => {

			self.bg.domain_mgr.createScriptForUrl(tab.url)
				.then(
					script => {
						
						resolve(new Editor({parent: self, script: script, tab: tab, mode: true}));
						
					}, reject);
		});
	};

	this.getEditorById = function (eid) {
		
		return self.editors.filter(editor => {
			
			return editor.id == eid;

		})[0];
	};
	
} 
