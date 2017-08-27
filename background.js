"use strict"

var literal = '(function parse_content () {' +
	'$(".info_notice").hide();' +
	'$("div").each(function() {' +
	
		'if( $(this).attr("name") == "page")' +
          '$(this).css("display", "block");' +
	
	'});' +
	'}());';

function onError (err) {
	console.error(err);
}

function BG_mgr () {

	var self = this;
	
	this.ignoreChange = false;
	this.currTab = null;
	this.editors = [];
	
	this.editor_msg = function(msg, err) {

		browser.runtime.sendMessage({
			message: msg,
			err: err
		});
	};

	this.error_msg = function(msg) {

		console.error(msg);
		
		browser.runtime.sendMessage({
			message: msg,
			err: true
		});
	};

	this.info_msg = function(msg) {

		browser.runtime.sendMessage({
			message: msg,
			err: false
		});
	};
	
	this.handle_response = function(response) {

		
		browser.runtime.sendMessage({
			message: obj.err ? obj.err : obj.response,
			err: obj.err ? true : false
		});
		
	};
	
	this.update = function (tabId, changeInfo, tabInfo) {

		global_storage.__getDomains(domains => {

			for (var i = 0; i < domains.length; i++) {
			
				if ( tabInfo.url.indexOf(domains[i]) >= 0) {
					
					global_storage.__getDomain(domain => {

						var sources = domain.scripts;

						if (domain.has(tabInfo.url))
							sources = sources.concat(domain.getSite(tabInfo.url).scripts);

						if (sources.length) {
							
							window.setTimeout(function() {
						
								browser.tabs.sendMessage(
							
									parseInt(tabId),
									{scripts: sources.map(script => {

										return script.code;
										
									}), action: "run"}
									
								).then(response => {

									if (response.err)
										this.log_error(response.err);
									
									/* console.log("Hitted target site ---> " + tabInfo.url);
									   console.log("Message from the content script: " + response.response); */
									
								}, onError);
							
							}, 500);
						}
						
					}, domains[i]);
				}
			}
		});	
	};

	this.change = function (actInfo) {
		
		if (!self.ignoreChange) {

			if (actInfo.tabId) {

				browser.tabs.get(actInfo.tabId).then(tab => {

					self.currTab = tab;

				});

			} else {

				self.currTab = actInfo[0];
				
			}
			
			
			/* console.log("CurrentTab: " + currTab); */
			
		} else {
			
			self.ignoreChange = false;
			
		}
	};

	this.runInTab = function (literal, tabId) {

		/* console.log("Test tab: " + tabId); */
	
		browser.tabs.sendMessage(
			//new Script({code: literal})
			parseInt(tabId),
			{ action: "run", scripts: [literal] }
		
		).then(response => {

			if (response.err)
				self.error_msg(response.err);
			
		}, onError);

	};
	
	this.editorClose = function(eid) {

		this.editors.remove(eid);
		
		console.log("Editor closed: " + self.editors.length);
	};
	
	this.showEditor = function (action) {

		self.ignoreChange = true;
		/* console.log("Tab before editor: " + currTab); */

		for (var i = 0; i < this.editors.length; i++) {

			if (this.editors[i].tab.id == self.currTab.id) {
				this.editors[i].wdw.focus();
				return;
			}
		}
		
		browser.tabs.sendMessage(
			
			parseInt(self.currTab.id),
			{ action: "backup" }
			
		).then(response => {
			
			var createData = {
				type: "popup",
				url: browser.extension.getURL("editor/editor.html?" + action + "&" + self.currTab.id + "&" + self.editors.length),
				width: 800,
				height: 600
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
	
	this.revertChanges = function (tabId) {

		browser.tabs.sendMessage(
						
			parseInt(tabId),
			{action: "revert"}
			
		);
	};

	this.getCurrTab = function () {

		return browser.tabs.get(self.currTab.id); 

	};

}

var bg_manager = new BG_mgr();		

browser.tabs.onUpdated.addListener(bg_manager.update);
browser.tabs.onActivated.addListener(bg_manager.change);

var gettingCurrent = browser.tabs.query({currentWindow: true, active: true});
gettingCurrent.then(bg_manager.change, bg_manager.log_error); 
