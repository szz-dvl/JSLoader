function onError (err) {
	console.error(err);
};

function JSLTab (tabInfo, feeding) {

	var self = this;
	
	Object.assign(this, tabInfo);
	
	this.url = new URL(this.url).sort();
	this.id = parseInt(this.id);
	this.feeding = feeding;
	
	this.run = function (scripts) {
		
		return new Promise(
			(resolve, reject) => {
				
				let pr = [];

				self.feeding(self.id)
					.then(
						frames => {
							
							for (let frame of frames) 
								pr.push(frame.run(scripts));

							Promise.all(pr).then(resolve, reject);
							
						}, reject);		
				
			});
	}
}

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
	
	this.id = this.parent.__getEID();
	this.mode = opt.mode; /* true: New script, false: Editing.*/
	this.opts = self.parent.bg.option_mgr.editor;
	
	this.tab = opt.tab ? new JSLTab(opt.tab, self.parent.bg.content_mgr.forceMainFramesForTab) : null;
	
	self.parent.editors.push(self);
	
	this.runInTab = function () {

		if (self.tab) 
			return self.tab.run([self.script.code]);	
		else
			return Promise.reject();			
	};

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

	this.openEditorInstanceForScript = function (script) {
		
		return new Promise (
			(resolve, reject) => {
				
				var alive = self.getOwnerOf(script);
				
				if (alive)
					resolve(alive);
				else {
					
					if (!script.parent.isGroup()) {

						let endpoint = script.getUrl() || script.getParentName();
						
						self.bg.getTabsForURL(endpoint)
							.then(
								tabs => {
							
									let tab = tabs[0];
									
									if (tab) {
										
										browser.tabs.update(tab.id, {active: true})
											.then(
												tab => {
													
													new EditorWdw({parent: self, script: script, tab: tab, mode: false})
														.then(resolve, reject);
													
												}
											);
									
									} else {
										
										new EditorWdw({parent: self, script: script, tab: null, mode: false})
											.then(resolve, reject);
										
									}
									
								}, reject
							);
						
					} else {
						
						new EditorWdw({parent: self, script: script, tab: null, mode: false})
							.then(resolve, reject);
						
					}
				}
			}
		)
	};

	this.openEditorInstanceForGroup = function (group) {
		
		return new EditorWdw({parent: self, script: group.upsertScript(new Script({})), tab: null, mode: true});

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

	this.getEditorForTab = function (tab) {
		
		return self.editors.filter(
			editor => {
				
				return editor.tab.id == tab.id;
				
			})[0] || null;
	};
	
} 
