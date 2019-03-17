function JSLTab (tabInfo, feeding) {

	Object.assign(this, tabInfo);
	
	this.url = new URL(this.url).sort();
	this.id = parseInt(this.id);
	
	this.feeding = feeding;
	this.run = function (scripts) {
		
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

		return browser.tabs.update (tabId, {url: url.href});
	};
	
	this.getTabsForURL = (url) => {
		
		return new Promise(
			(resolve,reject) => {

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
					url_name = url.name;
				
				url_name += (url_name.indexOf("/") < 0) ? "/" : "";
				
				browser.tabs.query({ url: [ "*://" + url_name + "*", "*://" + url_name ] })
					.then(resolve, reject);
			}
		)
	};
	
	this.getCurrentURL = () => {
		
		return new Promise (
			(resolve, reject) => {
				
				browser.tabs.query({ currentWindow: true, active: true })
					.then(
						tab_info => {

							resolve({url: new JSLUrl(tab_info[0].url), tab: tab_info[0].id });

						}, reject);
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
								
								browser.tabs.update(tab.id, {active: true})
									.then(resolve, reject);

							} else {

								let aux = url.includes("://") ? url : 'https://' + url;
								
								/* !!! */
								browser.windows.getAll({ populate: false, windowTypes: ['normal', 'panel'] })
									.then(wdws => {
										browser.tabs.create({ active: true, url: aux, windowId: wdws[0].id })
											   .then(resolve, reject);
									}, reject);
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
		
		browser.tabs.get(tabId.tabId || tabId)
			.then(
				tabInfo => {
		
					var url = new JSLUrl(tabInfo.url);
					
					if (url.hostname && url.protocol != "moz-extension:") {
						
						this.bg.domain_mgr.haveInfoForUrl(url)
							.then(
								any => {

									console.log(any);
									
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
									
								}, console.error
							);
					}
					
				});
	};
	
	this.updateWdws = (tabId, changeInfo) => {
		
		browser.tabs.get(tabId.tabId || tabId)
			.then(
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
							editor.newTab(tabInfo, (url.hostname && url.protocol != "moz-extension:") ? true : false);
					}
					
				});
	};
	
	browser.tabs.onUpdated.addListener(this.updateWdws);
	browser.tabs.onActivated.addListener(this.updateWdws);
	
	browser.tabs.onUpdated.addListener(this.showPA);
	browser.tabs.onActivated.addListener(this.showPA);
}


