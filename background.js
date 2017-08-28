
var literal = '(function parse_content () {' +
	'$(".info_notice").hide();' +
	'$("div").each(function() {' +
	
		'if( $(this).attr("name") == "page")' +
          '$(this).css("display", "block");' +
	
	'});' +
	'}());';

function BG_mgr () {

	var self = this;
	
	this.ignoreChange = false;
	this.currTab = null;
	this.editors = [];
	this.domains = [];

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
						
						var sources = full_domain.scripts;
						var site = full_domain.has(tabInfo.url);
						
						if (site) 
							sources = sources.concat(site.scripts);

						console.log("Sources: ");
						console.log(sources);
						
						if (sources.length) {

							var tocontent = []

							for (source of sources) { 
								tocontent.push(source.get());
								
								/* sources.map(function(script) {

								   return script.code;
								   
								   }); */
							}
							console.log(tocontent);
							window.setTimeout(function() {
								
								browser.tabs.sendMessage(
									
									parseInt(tabId),
									{scripts: sources.map(script => {

										return script.code;
										
									}), action: "run"}
									
								).then(response => {

									if (response.err)
										onError(response.err);
									
									/* console.log("Hitted target site ---> " + tabInfo.url);
									   console.log("Message from the content script: " + response.response); */
									
								}, onError);
								
							}, 500);
						}
						
					}, domain);
				}
			}
		}
	};

	this.change = function (actInfo) {
		
		if (!self.ignoreChange) {

			if (actInfo.tabId) {

				browser.tabs.get(actInfo.tabId).then(tab => {

					self.currTab = tab;
					console.log("New Tab: " + tab.id);
				});

			} else {

				self.currTab = actInfo[0];
				console.log("New Tab: " + self.currTab.id);
			}
			
			
			/* console.log("CurrentTab: " + currTab); */
			
		} else {
			
			self.ignoreChange = false;
			
		}
	};

	this.runInTab = function (literal, eid) {

		/* console.log("Test ID: " + eid); */
		
		browser.tabs.sendMessage(
			
			parseInt(self.editors[eid].tab.id),
			{ action: "run", scripts: [literal] }
		
		).then(response => {

			if (response.err)
				self.error_msg(eid, response.err);
			
		}, onError);

	};
	
	this.editorClose = function(eid) {

		this.editors.remove(eid);
		
		console.log("Editor closed: " + self.editors.length);
	};
	
	this.showEditor = function (action) {

		/* console.log("Tab before editor: " + currTab); */

		var i = 0;
		for (editor of self.editors) {

			if (editor.tab.id == self.currTab.id) {
				console.log("Discarting editor: " + i + " for tab: " + self.currTab.id)
				self.editor_msg (i, "focus");
				return;
			}
			
			i++;
		}
		
		browser.tabs.sendMessage(
			
			parseInt(self.currTab.id),
			{ action: "backup" }
			
		).then(response => {

			self.ignoreChange = true;

			var createData = {
				type: "panel",
				state: "normal",
				url: browser.extension.getURL("editor/editor.html?" + action + "&" + self.editors.length),
				width: 900,
				height: 350
			};
			
			browser.windows.create(createData).then(wdw => {

				self.editors.push({
					tab: self.currTab,
					wdw: wdw
				});
				
				console.log("Editor opened: " + self.editors.length);
			});	
		
		});
	};
	
	this.revertChanges = function (eid) {

		browser.tabs.sendMessage(
						
			parseInt(self.editors[eid].tab.id),
			{action: "revert"}
			
		);
	};

	this.getCurrUrl = function () {

		return self.currTab.url; 

	};

	this.saveScriptFor = function (literal, endpoint) {

		var url = new URL(endpoint);

		global_storage.getOrCreateDomain(domain => {

			/* console.log("New domain: ");
			   console.log(domain); */
			
			if (url.pathname == "/")

				domain.scripts.push(new Script(unescape(literal.toString())) );

			else {
				
				var site = domain.getOrCreateSite(endpoint);
				
				site.scripts.push(new Script(unescape(literal.toString())) );
				
			}

			domain.persist();
			
		}, url.hostname);
		
		/* console.log("Host: " + url.hostname + " href: " + url.href + " pathname: " + url.pathname); */
	}

}

var bg_manager = new BG_mgr();		

browser.tabs.onUpdated.addListener(bg_manager.update);
browser.tabs.onActivated.addListener(bg_manager.change);

var gettingCurrent = browser.tabs.query({currentWindow: true, active: true});
gettingCurrent.then(bg_manager.change, onError); 
