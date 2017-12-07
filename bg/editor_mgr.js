function onError (err) {
	console.error(err);
};

function EditorWdw (opt) {
	
	return new Promise (
		(resolve, reject) => {

			let editor = new Editor(opt);
			
			browser.windows.create({
				
				type: "popup",
				state: "normal",
				url: browser.extension.getURL("fg/editor/editor.html?" + editor.id),
				width: 1024, 
				height: 420 
				
			}).then (
				wdw => {

					editor.wdw = wdw;
					resolve (editor);
					
				}, reject);
		});
}

function Editor (opt) {

	let self = this;
	
	this.parent = opt.parent;
	this.script = opt.script;

	this.pos = {line: opt.line || 0, col: opt.col || 0};
	this.id = this.parent.__getEID();
	this.mode = opt.mode; /* true: New script, false: Editing.*/
	this.opts = self.parent.bg.option_mgr.editor;
	
	this.tab = opt.tab ? new JSLTab(opt.tab, self.parent.bg.content_mgr.forceMainFramesForTab) : null;
	
	self.parent.editors.push(self);
	
	this.runInTab = function () {

		if (self.tab) 
			return self.tab.run([self.script]);	
		else
			return Promise.reject();			
	};
	
	this.newTabURL = function (url) {

		if (self.tab) {
			
			if (url.hostname !== self.tab.url.hostname) 	
				self.fg.scope.disableRun();
			else if (url.match(self.tab.url))
				self.fg.scope.enableRun();
		}
	}
	
	this.editorClose = function () {
		
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
	this.editors = []; //Alive instances
	
	this.__getEID = function () {
		
		return self.eids ++;
		
	};
	
	this.openEditorInstanceForTab = function (tab) {
		
		/* Focus editor if existent! */
		
		return new Promise(
			(resolve, reject) => {
				
				let url = new URL(tab.url).sort();

				self.bg.domain_mgr.getOrCreateItem(url.hostname, false)
					.then(
						domain => {

							/* Set the alleged parent for the script, DO NOT upsert the script into its bucket until persist happens. */
							let parent = domain.getOrCreateSite(url.pathname);
							
							new EditorWdw({ parent: self,
											script: new Script({parent: parent}),
											tab: tab,
											mode: true }).then(resolve, reject);
							
						}
					);
			}
		)
	};

	this.openEditorInstanceForScript = function (script, line, col) {
		
		return new Promise (
			(resolve, reject) => {
				
				var alive = self.getOwnerOf(script);
				
				if (alive)
					resolve(alive);
				else {
					
					if (!script.parent.isGroup()) {
						
						let endpoint = script.getUrl() || script.getParentName();
						
						self.bg.tabs_mgr.getTabsForURL(endpoint)
							.then(
								tabs => {
									
									let tab = tabs[0];
									
									if (tab) {
										
										browser.tabs.update(tab.id, {active: true})
											.then(
												tab => {

													new EditorWdw({parent: self, script: script, tab: tab, mode: false, line: line, col: col })
														.then(resolve, reject);
													
												}
											);
									
									} else {
										
										new EditorWdw({parent: self, script: script, tab: null, mode: false, line: line, col: col})
											.then(resolve, reject);
										
									}
									
								}, reject
							);
						
					} else {
						
						new EditorWdw({parent: self, script: script, tab: null, mode: false, line: line, col: col})
							.then(resolve, reject);
						
					}
				}
			}
		)
	};

	this.openEditorInstanceForGroup = function (group) {
		
		new EditorWdw({ parent: self,
						script: new Script({parent: group}),
						tab: null,
						mode: true });

	};

	this.getOwnerOf = function (script) {

		return self.editors.filter(
			editor => {

				return editor.script.uuid == script.uuid;

			}
		)[0] || null;
		
	};
	
	this.getEditorById = function (eid) {
		
		return self.editors.filter(
			editor => {
				
				return editor.id == eid;
				
			})[0] || null;
	};

	this.getEditorForTab = function (tab_id) {
		
		return self.editors.filter(
			editor => {
				
				return editor.tab ? editor.tab.id == tab_id : false;
				
			})[0] || null;
	};

	this.broadcastEditors = function (message) {
		
		try {
			
			browser.runtime.sendMessage(message);
			
		} catch(e) {};	
	};
	
} 
