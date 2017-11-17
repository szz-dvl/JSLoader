function CSUtils () {

	var self = this;

	this.video = ["webm", "mp4", "ogg"];
	
	this.isNativeVideoExtension = function (ext) {

		return self.video.includes(ext);

	}


}

function CSApi (port) {

	var self = this;

	this.port = port
	this.JSLUtils = new CSUtils();

	this.JSLAddSiteToGroup = function (site_name, group_name) {

		self.port.postMessage({action: "site-to-group", message: {site: site_name, group: group_name}});
		
	};

	this.JSLAddDomainToGroup = function (domain_name, group_name) {

		self.port.postMessage({action: "domain-to-group", message: {domain: domain_name, group: group_name}});

	}

	this.JSLNotifyUser = function (title, message) {
		
		self.port.postMessage({action: "notify", message: {title: title, body: message}});
		
	}
	
}

