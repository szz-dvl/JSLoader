function EditorWdw (opt) {
	
	return new Promise (
		(resolve, reject) => {

			let promise = (opt.tab || opt.script.persisted) ? Promise.resolve() : browser.tabs.query({ active: true, windowType: "normal" });

			promise.then(
				tabs => {

					let editor = new Editor(opt);
					
					if (tabs) {
						
						let url = new URL(tabs[0].url).sort();

						if (url.hostname && url.protocol != "moz-extension:")
							editor.tab = editor.parent.bg.tabs_mgr.factory(tabs[0]);
					}
					
					browser.windows.create({
				
						type: "popup",
						state: "normal",
						url: browser.extension.getURL("fg/editor/editor.html?" + editor.id),
						width: Math.min(1024, screen.width), 
						height: 420 
						
					}).then (
						wdw => {
							
							editor.wdw = wdw;
							
							/* 
							   Workaround to avoid blank windows: 
							   
							   @https://discourse.mozilla.org/t/ff57-browser-windows-create-displays-blank-panel-detached-panel-popup/23644/3 
					 
							 */
							
							let updateInfo = {
								
								width: wdw.width,
								height: wdw.height + 1, // 1 pixel more than original size...
								
							};
							
							browser.windows.update(wdw.id, updateInfo)
								.then(
									newWdw => {
										
										resolve(editor);								
										
									}, reject
								);
							
						}, reject);
					
				}, reject);
		});	
}

function Editor (opt) {
	
	this.parent = opt.parent;
	this.script = opt.script;

	this.pos = {

		line: opt.line || 0,
		col: opt.col || 0
	};
	
	this.id = this.parent.__getEID.next().value;
	this.mode = opt.mode || "javascript";
	
	this.tab = opt.tab ? this.parent.bg.tabs_mgr.factory(opt.tab) : null;
	
	this.parent.editors.push(this);
	
	this.runInTab = () => {
		
		if (this.tab) 
			return this.tab.run([this.script]);	
		else
			return Promise.reject();
	};
	
	this.newTab = (tabInfo, valid) => {

		if (valid) {
			
			if (this.fg && this.script.parent) {
				
				if (this.script.persisted) {
					
					if (this.script.includedAt(new URL(tabInfo.url))) {
						
						this.tab = this.parent.bg.tabs_mgr.factory(tabInfo);
						this.fg.scope.enableRun();
						
					} else {
						
						this.fg.scope.disableRun();
					}
					
				} else {
					
					this.tab = this.parent.bg.tabs_mgr.factory(tabInfo);
					this.fg.scope.tabForUnpersisted(this.script.parent.isGroup());
					
				}
			}
			
		} else {
			
			if (this.fg && !this.parent.isEditorWdw(tabInfo.windowId))
				this.fg.scope.disableRun();
		}
	}
	
	this.editorClose = () => {
		
		this.parent.editors.remove(
			this.parent.editors.findIndex(
				editor => {
					
					return editor.id == this.id;
					
				}
			)
		);	
	};
	
	this.setWdw = (wdw) => {
		
		this.wdw.child = wdw;
		this.wdw.child.onbeforeunload = this.editorClose;
		
	};
}

function EditorMgr (bg) {

	let self = this;
	
	this.bg = bg;
	this.editors = []; //Alive instances
	
	this.__getEID = function* () {
		
		let index = 0;
		
		while(true)
			yield index++;
		
	}();
	
	this.openEditorInstanceForTab = (tab) => {
		
		
		return new Promise(
			(resolve, reject) => {
				
				let url = new URL(tab.url).sort();
				
				self.bg.domain_mgr.getOrCreateItem(url.hostname, false)
					.then(
						domain => {
							
							let parent = domain.getOrCreateSite(url.pathname);
							
							new EditorWdw({

								parent: self,
								script: new Script({parent: parent}),
								tab: tab,
								mode: "javascript"

							}).then(resolve, reject);
						});
			}
		)
	};

	this.openEditorInstanceForScript = (script, line, col) => {
		
		return new Promise (
			(resolve, reject) => {
				
				var alive = this.getOwnerOf(script);
				
				if (alive)
					resolve(alive);
				else {

					if (script.parent) {
						
						if (!script.parent.isGroup()) {
							
							let endpoint = script.getUrl() || script.getParentName();
							
							this.bg.tabs_mgr.getTabsForURL(endpoint)
								.then(
									tabs => {
										
										let tab = tabs[0];
										
										if (tab) {
											
											browser.tabs.update(tab.id, {active: true})
												.then(
													tab => {
														
														new EditorWdw({parent: self, script: script, tab: tab, mode: "javascript", line: line, col: col })
															.then(resolve, reject);
														
													}
												);
											
										} else {

											new EditorWdw({ parent: self, script: script, tab: null, mode: "javascript", line: line, col: col })
												.then(resolve, reject);
										}
										
									}, reject
								);
							
						} else {
						
							new EditorWdw({ parent: self, script: script, tab: null, mode: "javascript", line: line, col: col })
								.then(resolve, reject);
						
						}
						
					} else {

						/*  User definitions */
						new EditorWdw({ parent: self, script: script, tab: null, mode: "javascript", line: line, col: col })
							.then(resolve, reject);
					}
				}
			}
		)
	};

	this.openEditorInstanceForGroup = (group) => {
		
		new EditorWdw({
					
			parent: self,
			script: new Script({ parent: group }),
			tab: null,
			mode: "javascript"
			
		});
	};

	this.getOwnerOf = (script) => {

		return this.editors.find(
			editor => {
				
				return editor.script.uuid == script.uuid;
				
			}
		) || null;
	};
	
	this.getEditorById = (eid) => {
		
		return this.editors.find(
			editor => {
				
				return editor.id == eid;
				
			}) || null;
	};

	this.isEditorWdw = (wid) => {

		return this.editors.find(
			editor => {
				
				return editor.wdw.id == wid;
				
			}) ? true : false;
	};
	
	this.broadcastEditors = (message) => {
		
		try {
			
			browser.runtime.sendMessage(message);
			
		} catch(e) {};	
	};
	
} 
