
function BG_mgr () {

	var self = this;
	
	this.ignoreChange = false;
	this.currTab = null;
	this.editors = [];
	this.domains = [];
	this.eids = 0;
	this.pa_shown = false;
	
	global_storage.bg = this;

	global_storage.__getDomains(function (new_domains) {

		if (new_domains)
			self.domains = new_domains;
		
	});
	
	this.editor_msg = function(eid, action, msg, err) {

		browser.runtime.sendMessage({
			id: eid,
			action: action,
			message: msg,
			err: err
		});
	};

	this.error_msg = function(eid, msg) {

		console.error(msg);

		this.editor_msg (eid, "result", msg, true);
	};

	this.info_msg = function(eid, msg) {

		this.editor_msg (eid, "result", msg, false);
	};
	
	this.handle_response = function(response) {

		
		browser.runtime.sendMessage({
			message: obj.err ? obj.err : obj.response,
			err: obj.err ? true : false
		});
		
	};
	
	this.update = function (tabId, changeInfo, tabInfo) {

		if (self.domains.length) {

			for (domain of self.domains) {
				
				if ( tabInfo.url.indexOf(domain) >= 0) {
					
					global_storage.getDomain(full_domain => {

						var url = new URL(tabInfo.url);
						var sources = full_domain.scripts;
						var site = full_domain.has(url.pathname);
						
						if (site) 
							sources = sources.concat(site.scripts);
						
						if (sources.length) {
							
							window.setTimeout(function() {
								
								browser.tabs.sendMessage(
									
									parseInt(tabId),
									{scripts: sources.map(script => {

										return script.get();
										
									}), action: "run"}
									
								).then(response => {

									if (response.err)
										onError(response.err);
									
								}, onError);
								
							}, 500);
						}
						
					}, domain);
				}
			}
		}
	};

	this.__showPageAction = function (tabInfo) {

		if (self.pa_shown)
			return;
		
		for (domain of self.domains) {

			if ( tabInfo.url.indexOf(domain) >= 0) {
				
				global_storage.getDomain(full_domain => {
					
					var url = new URL(tabInfo.url);
					
					if (full_domain.haveScripts() || full_domain.has(url.pathname))
						browser.pageAction.show(tabInfo.id);

					self.pa_shown = true;
					
				}, domain);
			}
		}
	};

	this.PAClose = function () {

		self.pa_shown = false;
		
	};
	
	this.getMyScripts = function () {
		
		return new Promise (function (resolve, reject) {

			var url = new URL(self.currTab.url);
					
			global_storage.getDomain(full_domain => {
				
				resolve(full_domain.getEditInfo(url.pathname));
				
			}, url.hostname);
				
			
		});
	};
	
	this.change = function (actInfo) {
		
		if (!self.ignoreChange) {

			if (actInfo.tabId) {

				browser.tabs.get(actInfo.tabId).then(tab => {

					self.currTab = tab;
					self.__showPageAction(tab);
					
					/* console.log("New Tab: " + tab.id); */
				});

			} else {

				self.currTab = actInfo[0];
				self.__showPageAction(actInfo[0]);
				/* console.log("New Tab: " + self.currTab.id); */
			}
			
			
		} else {
			
			self.ignoreChange = false;
			
		}
	};

	this.__getEditorByID = function (eid) {

		for (editor of self.editors) {

			if (editor.id == eid)
				return editor;

		}
		
		return null;
	};

	this.__getEditorIdx = function (eid) {

		var i = 0;
		for (editor of self.editors) {
			
			if (editor.id == eid)
				return i;

			i ++;
		}
		
		return -1;
	};

	this.__editorForTab = function (tid) {

		for (editor of self.editors) {

			if (editor.info.id == tid)
				return true;

		}
		
		return false;
	};
	
	this.runInTab = function (literal, eid) {

		/* console.log("Test ID: " + eid); */
		
		browser.tabs.sendMessage(
			
			parseInt(self.__getEditorByID(eid).info.id),
			{ action: "run", scripts: [literal] }
		
		).then(response => {

			if (response.err)
				self.error_msg(eid, response.err);
			
		}, onError);

	};
	
	this.editorClose = function(eid) {
		
		this.editors.remove(this.__getEditorIdx(eid));
		
		/* console.log("Editor closed: " + self.editors.length); */
	};

	this.__openEditor =  function (action, cb) {


		var createData = {
			type: "panel",
			state: "normal",
			url: browser.extension.getURL("editor/editor.html?" + action + "&" + self.eids),
			width: 900,
			height: 350
		};
			
		browser.windows.create(createData).then(wdw => {	

			var ret = self.eids;
			
			self.editors.push({
				
				info: action == "add" ? self.currTab : null,
				wdw: wdw,
				id: self.eids

			});
			
			self.eids ++;
			console.log("Editor opened: " + self.eids);

			if (cb)
				cb(ret);
		});	
	};
	
	this.showEditor = function (action, cb) {

		/* console.log("Tab before editor: " + currTab); */

		self.ignoreChange = true;
		
		if (action == "add") {

			if (self.__editorForTab(self.currTab.id)) {
				
				self.editor_msg (i, "focus"); /* Not working */
				return;
				
			}
			
			browser.tabs.sendMessage(
				
				parseInt(self.currTab.id),
				{ action: "backup" }
				
			).then(response => {
				
				this.__openEditor(action, cb);

			});
			
		} else {

			this.__openEditor(action, cb);

		}
	};
	
	this.revertChanges = function (eid) {

		browser.tabs.sendMessage(
						
			parseInt(self.__getEditorByID(eid).info.id),
			{action: "revert"}
			
		);
	};

	this.saveScriptFor = function (literal, endpoint, uuid) {

		var url = new URL(endpoint);

		global_storage.getOrCreateDomain(domain => {

			/* console.log("Literal: ");
			   console.log(literal); */
			
			if (url.pathname == "/")
				domain.upsertScript(literal, uuid);
			else 
				domain.getOrCreateSite(url.pathname).upsertScript(literal, uuid);
			
			domain.persist();

			if (self.pa_shown) {

				/* Send message to update the script */

			}
			
		}, url.hostname);
		
		/* console.log("Host: " + url.hostname + " href: " + url.href + " pathname: " + url.pathname); */
	};

	this.editScriptFor = function (uuid, domain_name) {

		var eid = this.showEditor("edit", eid => {

			self.editors[self.__getEditorIdx(eid)].info = {
				id: uuid,
				domain: domain_name,
				editing: true
			}
		});
	};

	this.getEditorInfo = function (eid) {

		return new Promise (function (resolve, reject) {

			var editor_info = self.__getEditorByID(eid).info;
			
			if (editor_info.editing) {
				
				global_storage.getDomain(domain => {
					
					var script = domain.findScript(editor_info.id);
					
					resolve({
						url: "http://" + script.getUrl(),
						code: script.get(),
						uuid: script.uuid
					});
					
				}, editor_info.domain);
				
			} else {
				
				resolve({url: self.currTab.url});
				
			}
		});
		
	};

	this.removeScriptFor = function (uuid, domain_name) {
		
		global_storage.getDomain(domain => {
					
			domain.findScript(uuid).remove();
			domain.persist();
			
		}, domain_name);
	};
}

var bg_manager = new BG_mgr();		

browser.tabs.onUpdated.addListener(bg_manager.update);
browser.tabs.onActivated.addListener(bg_manager.change);

browser.tabs.query({currentWindow: true, active: true})
	.then(bg_manager.change, onError); 
