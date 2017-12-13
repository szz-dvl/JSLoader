// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {

	if (from < 0)
		return;
	
	let rest = this.slice((to || from) + 1 || this.length);
	this.length = from; //from < 0 ? this.length + from : from;

	return this.push.apply(this, rest);

};

function PAC () { 

	let self = this;
	
	this.filtered = [];
	
	this.listener = function (message) {
		
		let reg = self.filtered.findIndex(
			registered => {
				return registered.host == message.host;
			}
		);
		

		if (reg >= 0) {

			if (message.proxy) 
				self.filtered[reg].proxy = message.proxy;
			else
				self.filtered.remove(reg);
			
		} else if (message.proxy) 
			self.filtered.push(message);
		
		// browser.runtime.sendMessage(`Proxy listener: ${message.host} > ` + JSON.stringify(self.filtered));
		
		return Promise.resolve(self.filtered.length);
	};
	
	this.FindProxyForURL = function (url, host) {
		
		/* To-Do: complex matching */
		
		let got = self.filtered.find(
			registered => {
				return registered.host == host;
			}
		);

		// browser.runtime.sendMessage(`Proxy for ${host} > ` + (got ? JSON.stringify(got.proxy) : "DIRECT"));
		
		return got ? [got.proxy] : "DIRECT";
	};
	
	browser.runtime.onMessage.addListener(this.listener);
}

PAC.call(this);
