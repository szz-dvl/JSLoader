function Editor (parent, script, tab) {

	var self = this;

	this.parent = parent;
	this.script = script;
	
	this.id = this.parent.__getEID();
	this.tab = tab || null;

	if (this.tab)
		this.tab.attachEditor(this);

	this.opts = self.parent.bg.option_mgr.getCurrentEditor();
	
	/* if (!this.script)
	   this.tab = this.parent.bg.tab_mgr.attachEditor(this); */
	
	self.parent.editors.push(this);
	
	var createData = {
		type: "panel",
		state: "normal",
		url: browser.extension.getURL("editor/editor.html?" + self.id),
		width: 900, /* get wdw width */
		height: 350 /* 40% height?  */
	};
	
	browser.windows.create(createData); /* get the window from the view better than here. */

	this.__getMyTab = function () {
		
		return new Promise ((resolve, reject) => {
			
			if (self.tab)
				resolve (self.tab);
			
			else {
				
				self.parent.bg.tab_mgr.getOrCreateTabFor(self.script.getUrl())
					.then(info => {
						
						self.tab = info.tab;

						if (info.created)
							self.tab.attachEditor(self);

						resolve(self.tab);
						
					}, reject);
			}
			
		});
	};
	
	this.runInMyTab() {
		
		return new Promise ((resolve, reject) => { 
			
			self.__getMyTab().then(tab => {
				
				tab.run(self.script.ensureRunnable())
					.then(resolve, reject);
			});
		});
	};

	this.editorClose = function() {

		self.tab.deattachEditor().then(response => {

			self.parent.editors.remove(
				self.parent.editors.findIndex(
					editor => {
						
						return editor.id == self.id;
						
					});
			);
			
			resolve(response);
			
		}, reject); /* Error handling */		
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
	
	this.openEditorInstance = function (script) {

		/* @script must be present here. */

		return new Promise ((resolve, reject) => {
			self.bg.tab_mgr.getTabFor(self.script.getUrl())
				.then(tab => {

					var editor;
					
					if (tab) {
						
						if (tab.editor) {
							
							tab.editor.script = script;
							
							resolve(tab.editor);
						}
						
						resolve(new Editor(self, script, tab));
					}
					
					resolve(new Editor(self, script));
					
				}, reject);
		});
	};

	this.getEditorById = function (eid) {
		
		return self.editors.filter(editor => {
			
			return editor.id == eid;

		})[0];
	};
	
} 
