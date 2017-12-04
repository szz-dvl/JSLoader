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

function TabsMgr (bg) {

	let self = this;

	this.bg = bg;

	this.__showPageAction = function (tabInfo) {

		return new Promise (
			(resolve, reject) => {

				browser.tabs.get(tabInfo.tabId || tabInfo)
					.then(
						tab => {
							
							var url = new URL(tab.url).sort();
							
							if (["http:", "https:"].includes(url.protocol)) {
								
								self.bg.domain_mgr.haveInfoForUrl(url) /* !! */
									.then(
										any => {
											
											if (any)
												browser.pageAction.show(tab.id).then(resolve, reject);
											else 
												browser.pageAction.hide(tab.id).then(resolve, reject);
											

										}, reject);	
								
							}
							
						}, reject);
			});
	};

	this.__updateEditors = function (tabId, changeInfo, tabInfo) {
		
		var url = new URL(tabInfo.url).sort();
					
		if (url.protocol != "moz-extension:") {
			
			if (changeInfo.url) {
				
				let editor = self.bg.editor_mgr.getEditorForTab(tabId);
				
				if (editor)
					editor.newTabURL(new URL(changeInfo.url).sort());				
			}
		}
	};
	
	this.updateURLForTab = function (tabId, url) {

		return browser.tabs.update (tabId, {url: url.href});
	};
	
	this.getTabsForURL = function (url) {
		
		return new Promise(
			(resolve,reject) => {
				
				var url_name;
				
				if (typeof(url) == "string") {
					
					if (url.startsWith("*."))
						url_name = url;
					else
						url_name = new URL(url).name();
					
				} else
					url_name = url.name();
				
				browser.tabs.query({url: "*://" + url_name + "*"})
					.then(
						tabs => {
							
							resolve(tabs);
							
						}
					);
			}
		)
	};

	this.getCurrentURL = function () {
		
		return new Promise (
			(resolve, reject) => {
			
				browser.tabs.query({currentWindow: true, active: true})
					.then(tab_info => {
						resolve(new URL(tab_info[0].url).sort());
					}, reject)
			}
		);
		
	};

	/* If any content script needs to run a script this method will be called, so no need to worry about it on "tabs.onUpdated" */
	this.updatePA = function (script) {

		let urls = [];

		switch (typeof(script)) {
			
		case "object":
			{
				
				let url = script.getUrl();
			
				if (url) /* parent instance of Site */
					urls.push(url);
				else if (script.parent.isSubdomain()) 
					urls.push(script.getParentName());
				else /* parent instance of Group */
					urls.push.apply(urls, script.parent.sites);
			}

			break;
			
		case "string":
			urls.push(script);
			break;

		default:
			break;
		}
		
		async.each(urls,
				   (url, next) => {

					   self.getTabsForURL(url)
						   .then(
							   tabs => {
								   async.each(tabs,
											  (tab, tab_next) => {
												  
												  self.__showPageAction(tab.id).then(tab_next, tab_next);
												  
											  },
											  err => {

												  if (err)
													  console.error("updatePA (tabs): " + err.message);
												  
												  next(err);
											  })
									   }
						   );
					   
				   },
				   err => {

					   if (err)
						   console.error("updatePA (urls): " + err.message);
					   
				   });
	};
	
	browser.tabs.onActivated.addListener(this.__showPageAction);
	browser.tabs.onUpdated.addListener(this.__updateEditors);
}
