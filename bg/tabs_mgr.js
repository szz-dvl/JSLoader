function JSLTab (tabInfo, feeding) {

	Object.assign(this, tabInfo);
	
	this.url = new URL(this.url).sort();
	this.id = parseInt(this.id);
	
	this.feeding = feeding;
	this.run = (scripts) => {
		
		return new Promise(
			(resolve, reject) => {
				
				let pr = [];

				this.feeding(this.id)
					.then(
						frames => {
							
							for (let frame of frames) 
								pr.push(frame.run(scripts));

							Promise.all(pr).then(resolve, reject);
							
						}, reject);		
				
			});
	}
}

function deferredXHR (parent, tabId, scripts, frames) {
	
	this.tabId = tabId;
	this.scripts = scripts;
	this.frames = frames;
	this.running = false;
	
	this.execute = () => {

		this.running = true;

		/* To be tested. */
		console.warn('Re-running scripts at tab: ' + this.tabId);

		/* Only one frame if Main frames ... */
		async.each(this.frames,
			(frame, next) => {
				
				frame.run(this.scripts, 'deferred-res')
					.then(response => { next(); }, err => { next(); });
				
			}, err => {

				parent.deferred.remove(
					parent.deferred.findIndex(
						deferred => {
							
							return deferred.tabId == this.tabId;
							
						}
					)
				);
			}
		);	
	}
	
	this.earlyExecute = () => {
		
		clearTimeout(this.toID);
		this.execute();
		
	}
	
	this.toID = setTimeout(this.execute, 1250);

	parent.deferred.push(this);
}


function TabsMgr (bg) {
	
	this.bg = bg;
	this.deferred = [];
	
	this.updateURLForTab = (tabId, url) => {

		return new Promise(resolve => { chrome.tabs.update (tabId, {url: url.href}, resolve) });
	};
	
	this.getTabsForURL = (url) => {
		
		return new Promise(
			(resolve) => {
				
				var url_name;
				
				if (typeof(url) == "string") {
					
					if (url.includes("://")) 
						url = url.split("://").pop();
					
					if (url.includes("*.")) /* !!! */
						url_name = url;
					else if (url.includes(".*")) {
						
						/* Try to identify tab by pathname ... =S */
						if (url.split("/").length > 1)
							url_name = "*/" + url.split("/").slice(1).join("/");
						else
							url_name = url;
						
					} else {
						
						url_name = url;
					}
					
				} else
					url_name = url.name();
				
				url_name += (url_name.indexOf("/") < 0) ? "/" : "";
				
				chrome.tabs.query({ url: [ "*://" + url_name + "*", "*://" + url_name ] }, resolve)
			}
		)
	};
	
	this.getCurrentURL = () => {
		
		return new Promise (
			(resolve, reject) => {
				
				chrome.tabs.query({ currentWindow: true, active: true },
					tab_info => {

						resolve({url: new URL(tab_info[0].url).sort(), tab: tab_info[0].id });
						
					}
				)
					
			});
	};

	this.openOrCreateTab = (url) => {
		
		return new Promise (
			(resolve, reject) => {
						
				this.getTabsForURL(url)
					.then(
						tabs => {
							
							let tab = tabs[0];
							
							if (tab) {
								
								chrome.tabs.update(tab.id, {active: true}, resolve)

							} else {

								let aux = url.includes("://") ? url : 'https://' + url;
								
								/* !!! */
								chrome.windows.getAll({ populate: false, windowTypes: ['normal', 'panel'] },
									wdws => {
										chrome.tabs.create({ active: true, url: aux, windowId: wdws[0].id }, resolve)		
									})
							}
							
						}, reject);
			});
	};

	this.factory = (tabInfo) => {

		return new JSLTab(tabInfo, this.bg.content_mgr.forceMainFramesForTab)
			
	};

	this.isDeferred = (tabId) => {
		
		return this.deferred.find(
			deferred => {
				
				return deferred.tabId == tabId;
				
			}
		);
	};
	
	this.showPA = (tabId, changeInfo, tabInfo) => {
		
		chrome.tabs.get(tabId.tabId || tabId,
			tabInfo => {
				
				var url = new URL(tabInfo.url).sort();
				
				if (url.hostname && url.protocol != "chrome-extension:") {
					
					this.bg.domain_mgr.haveInfoForUrl(url)
						.then(
							any => {
								
								let nfo = any ? "red" : "blue";									
								
								chrome.pageAction.show(tabInfo.id,
									() => {
										
										chrome.pageAction.setIcon(
											{
												path: {
													16: chrome.extension.getURL("fg/icons/" + nfo + "-diskette-16.png"),
													32: chrome.extension.getURL("fg/icons/" + nfo + "-diskette-32.png")
														
												},
												tabId: tabInfo.id
											}
										);
									})
									
							}, console.error
						);
				}
				
			})
	};
	
	this.updateWdws = (tabId, changeInfo) => {
		
		chrome.tabs.get(tabId.tabId || tabId,
			tabInfo => {
					
				if (tabInfo.active) {
					
					if (changeInfo) {
						
						let deferred = this.isDeferred(tabInfo.id);

						if (deferred && !deferred.running) {
							
							deferred.earlyExecute();
							
						}
						
						if (!deferred) {
							
							if (changeInfo.url && changeInfo.status == "complete") {
								
								/* Try to handle properly pages that load contents via XHR requests (ng-route & friends) */
								
								let frames = this.bg.content_mgr.getMainFramesForTab(tabInfo.id);
								
								if (frames.length) {
									
									this.bg.domain_mgr.getScriptsForUrl(new URL(changeInfo.url).sort())
										.then(
											scripts => {
												
												if (scripts.length) 
													new deferredXHR(this, tabInfo.id, scripts, frames);
												
											}
										);
								}	
							}
						}
					}
					
					let url = new URL(tabInfo.url).sort();
					
					for (let editor of this.bg.editor_mgr.editors) 
						editor.newTab(tabInfo, (url.hostname && url.protocol != "chrome-extension:") ? true : false);
				}
					
		});
	};
	
	chrome.tabs.onUpdated.addListener(this.updateWdws);
	chrome.tabs.onActivated.addListener(this.updateWdws);
	
	chrome.tabs.onUpdated.addListener(this.showPA);
	chrome.tabs.onActivated.addListener(this.showPA);
}


