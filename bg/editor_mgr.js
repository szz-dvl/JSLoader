function EditorWdw (opt) {
	
	return new Promise (
		(resolve, reject) => {

			let editor = new Editor(opt);
			let wc = editor.script.getUrl() ? editor.script.getUrl().name().length : editor.script.getParentName().length;
			
			browser.windows.create({
				
				type: "popup",
				state: "normal",
				url: browser.extension.getURL("fg/editor/editor.html?" + editor.id),
				width: Math.min(Math.max(1024, (200 + (wc * 10))), screen.width), 
				height: 420 
				
			}).then (
				wdw => {
					
					editor.wdw = wdw;

					/* 
					   Workaround to avoid blank windows: 
					   
					   @https://discourse.mozilla.org/t/ff57-browser-windows-create-displays-blank-panel-detached-panel-popup/23644/3 
					 
					 */

					var updateInfo = {
						width: wdw.width,
						height: wdw.height + 1, // 1 pixel more than original size...
					};
					
					browser.windows.update (wdw.id, updateInfo)
						.then(
							newWdw => {
								
								resolve(editor);								
							}
						);
					
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
	
	this.newTab = function (tabInfo) {

		if (self.fg) {

			if (self.script.includedAt(new URL(tabInfo.url))) {
			
				self.tab = new JSLTab(tabInfo, self.parent.bg.content_mgr.forceMainFramesForTab);
				self.fg.scope.enableRun();
			
			} else {
			
				self.fg.scope.disableRun();
			}
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
										
										new EditorWdw({ parent: self, script: script, tab: null, mode: false, line: line, col: col })
											.then(resolve, reject);
									}
									
								}, reject
							);
						
					} else {
						
						new EditorWdw({ parent: self, script: script, tab: null, mode: false, line: line, col: col })
							.then(resolve, reject);
						
					}
				}
			}
		)
	};

	this.openEditorInstanceForGroup = function (group) {
		
		new EditorWdw({ parent: self,
						script: new Script({ parent: group }),
						tab: null,
						mode: true });

	};

	this.getOwnerOf = function (script) {

		return self.editors.find(
			editor => {
				
				return editor.script.uuid == script.uuid;
				
			}
		) || null;
	};
	
	this.getEditorById = function (eid) {
		
		return self.editors.find(
			editor => {
				
				return editor.id == eid;
				
			}) || null;
	};

	this.broadcastEditors = function (message) {
		
		try {
			
			browser.runtime.sendMessage(message);
			
		} catch(e) {};	
	};
	
} 
