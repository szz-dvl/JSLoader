function PAC () { 
	
	this.proxy = null;
	this.host = null;
	
	this.listener = (message) => {

		this.host = message.host;
		this.proxy = message.proxy;
		
		return Promise.resolve(this.host);

	};
	
	/* One proxy per host only. */
	this.FindProxyForURL = (url, host) => {
		
		if (this.host) {
			
			if (host == this.host)
				return [this.proxy];
			else
				return "DIRECT";
			
		} else {
			
			return "DIRECT";
		}
	};
	
	browser.runtime.onMessage.addListener(this.listener);
}

PAC.call(this);
