/* To data model ? */
function JSLTab (tabInfo, feeding) {

	let self = this;
	
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

function TabsMgr (bg) {

	let self = this;

	this.bg = bg;
	
	this.updateURLForTab = function (tabId, url) {

		return browser.tabs.update (tabId, {url: url.href});
	};
	
	this.getTabsForURL = function (url) {
		
		return new Promise(
			(resolve,reject) => {
				
				var url_name;
				
				if (typeof(url) == "string") {
					
					if (url.startsWith("*.") || !url.includes("://")) /* !!! */
						url_name = url;
					else
						url_name = new URL(url).name();
					
				} else
					url_name = url.name();

				url_name += (url_name.indexOf("/") < 0) ? "/" : "";

				browser.tabs.query({ url: [ "*://" + url_name + "*", "*://" + url_name ] })
					.then(resolve, reject);
			}
		)
	};
	
	this.getCurrentURL = function () {
		
		return new Promise (
			(resolve, reject) => {
			
				browser.tabs.query({ currentWindow: true, active: true })
					.then(
						tab_info => {
							
							resolve({url: new URL(tab_info[0].url).sort(), tab: tab_info[0].id });

						}, reject);
			});
	};

	this.openOrCreateTab = function (url) {
		
		return new Promise (
			(resolve, reject) => {
						
				self.getTabsForURL(url)
					.then(
						tabs => {
							let tab = tabs[0];
							
							if (tab) {
								
								browser.tabs.update(tab.id, {active: true})
									.then(resolve, reject);

							} else {

								/* !!! */
								browser.windows.getAll({ populate: false, windowTypes: ['normal', 'panel'] })
									.then(wdws => {
										browser.tabs.create({active: true, url: url, windowId: wdws[0].id})
											.then(resolve, reject);
									});
							}
						});
			});
	};
	
	this.showPA = function (tabId, changeInfo, tabInfo) {
		
		browser.tabs.get(tabId.tabId || tabId)
			.then(
				tabInfo => {
		
					var url = new URL(tabInfo.url).sort();
					
					if (url.protocol != "moz-extension:") {
						
						self.bg.domain_mgr.haveInfoForUrl(url)
							.then(
								any => {
									
									let nfo = any ? "red" : "blue";
									
									browser.pageAction.show(tabInfo.id)
										.then(
											() => {
												
												browser.pageAction.setIcon(
													{
														path: {
															16: browser.extension.getURL("fg/icons/" + nfo + "-diskette-16.png"),
															32: browser.extension.getURL("fg/icons/" + nfo + "-diskette-32.png")
																
														},
														tabId: tabInfo.id
													}
												);
											}
										);
								}
							);
					}
					
				});
	};

	this.updateWdws = function (tabId, changeInfo) {

		browser.tabs.get(tabId.tabId || tabId)
			.then(
				tabInfo => {
					
					if (tabInfo.active) {
						
						var url = new URL(tabInfo.url).sort();
						
						if (url.protocol != "moz-extension:") {
							
							for (let editor of self.bg.editor_mgr.editors) 
								editor.newTab(tabInfo);
							
						}
					}
					
				});
	};

	this.factory = function (tabInfo) {

		return new JSLTab(tabInfo, self.bg.content_mgr.forceMainFramesForTab)
			
	}
	
	browser.tabs.onUpdated.addListener(this.updateWdws);
	browser.tabs.onActivated.addListener(this.updateWdws);
	
	browser.tabs.onUpdated.addListener(this.showPA);
	browser.tabs.onActivated.addListener(this.showPA);
}


