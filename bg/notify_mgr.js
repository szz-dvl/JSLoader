function NotificationMgr (bg) {
	
	this.bg = bg;
	
	this.error = (message) => {

		let id = UUID.generate().split("-").pop();
		
		browser.notifications.create(id, {
			"type": "basic",
			"iconUrl": browser.extension.getURL("fg/icons/error.png"),
			"priority": 2,
			"title": 'Error',
			"message": message instanceof Error ? message.message : message,
		});
		
		return id;
	}

	this.info = (message) => {

		let id = UUID.generate().split("-").pop();
		
		browser.notifications.create(id, {
			"type": "basic",
			"iconUrl": browser.extension.getURL("fg/icons/info.png"),
			"priority": 2,
			"title": "Info",
			"message": message
		});
		
		return id;
	}
	
	this.user = (title, message) => {

		let id = UUID.generate().split("-").pop();
		
		browser.notifications.create(id, {
			"type": "basic",
			"iconUrl": browser.extension.getURL("fg/icons/Diskette_32.png"),
			"priority": 2,
			"title": title,
			"message": message
		});
		
		return id;
	}
}
