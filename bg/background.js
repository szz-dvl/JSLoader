
function BG_mgr () {

	var self = this;

	this.tab_mgr = new TabMgr(self);
	this.domain_mgr = new DomainMgr(self);
	this.option_mgr = new OptionMgr(self);
	this.editor_mgr = new EditorMgr(self);
	
	this.app = {
		
		ba: null,
		pa: null,
		op: null
	}

	this.notification_ID = "jsloader-notification";

	this.notifyUser = function (title, message) {
		
		browser.notifications.create(self.notification_ID, {
			"type": "basic",
			"iconUrl": browser.extension.getURL("fg/icons/Diskette_32.png"),
			"priority": 2,
			"title": title,
			"message": message
		});

	};
	
	this.__showPageAction = function (tabInfo) {
		
		browser.tabs.get(tabInfo.tabId).then(tab => {
			
			var url = new URL(tab.url);
			
			if (["http:", "https:"].indexOf(url.protocol) >= 0) {
				
				self.domain_mgr.haveInfoForUrl(url)
					.then(
						any => {
							
							if (any)
								browser.pageAction.show(tab.id);
							
						});
			}
		});
	};

	
	this.getOptPage = function () {

		self.app.op = null;
		return new Promise (
			(resolve, reject) => {
				
				self.domain_mgr.getFullDomains(
					arr => {
						resolve({domains: arr, opts: self.option_mgr.getCurrent()});
					}
				);
			}
		);
	};

	this.logJSLError = function (err) {
		
		console.error(err);
	}

	this.informApp = function (action, message) {
		
		
		for (key of Object.keys(self.app)) {
		
			if (self.app[key]) {
				
				switch (action) {
				case "script":
					
					try {
						self.app[key].scriptChange();
					} catch (err) {
						
						console.error(err);

						if (err.message.includes("dead object"))
							self.app[key] = null;
					}

					break;
					
				default:
					console.error("Bad action: " + action);
					break;
				}

			} 	
		}
		
	};
	
	this.showEditorForCurrentTab = function () {
		
		self.tab_mgr.getCurrentTab()
			.then(
				tab => {
					
					console.error("Got Tab!");
					console.error(tab);
					
					if (tab.editor)
						tab.editor.wdw.child.focus();
					else 
						self.editor_mgr.openEditorInstanceForTab(tab)
						.then(null, self.logJSLError);
					
				}, self.logJSLError);
	};

	this.broadcastEditors = function (message) {

		browser.runtime.sendMessage(message);
		
	};
}

var bg_manager = new BG_mgr();		

browser.tabs.onActivated.addListener(bg_manager.__showPageAction);
browser.commands.onCommand.addListener(bg_manager.showEditorForCurrentTab);
