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

	this.isSubDomain = function (orig, modified) {

		if (orig == modified || modified == '*')
			return true;
		else if (!modified.startsWith("*."))
			return false
		
		// if (orig.endsWith("/"))
		// 	orig = orig.slice(0, -1);
		
		// if (modified.endsWith("/"))
		// 	modified = modified.slice(0, -1);
		
		var mod_arr = modified.split(".");
		var orig_arr = orig.split(".");
		
		var cursor_mod = mod_arr.length - 1;
		var cursor_orig = orig_arr.length - 1;
		
		while ( (mod_arr[cursor_mod] != "*") &&
				(mod_arr[cursor_mod] == orig_arr[cursor_orig])
			  ) {
			
			cursor_mod --;
			cursor_orig --;	
		}
		
		return mod_arr[cursor_mod] == "*";
	};
	
	this.listener = function (message) {

		if (!message.temp) {
			
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
		} else
			self.filtered.push(message);
		
		// browser.runtime.sendMessage(`Proxy listener: ${message.host} > ` + JSON.stringify(self.filtered));
		
		return Promise.resolve(self.filtered.length);
	};
	
	this.FindProxyForURL = function (url, host) {
		
		let proxys = self.filtered.filter(
			
			registered => {
				return registered.host == host && registered.temp;
			}
			
		).map(elem => { return elem.proxy }).slice(0);
		
		if (!proxys.length) {
			
			proxys = self.filtered.filter(
				
				registered => {
					return self.isSubDomain(host, registered.host);
				}
				
			).map(elem => { return elem.proxy });

		} else {

			let idx = self.filtered.findIndex(
				registered => {
					return registered.host == host && registered.temp;
				}
			)

			while (idx >= 0) {

				self.filtered.remove(idx);
				
				idx = self.filtered.findIndex(
					registered => {
						return registered.host == host && registered.temp;
					}
				)
			}
		}
		
		browser.runtime.sendMessage(`Proxy for ${host} > ` + (proxys ? JSON.stringify(proxys) : "DIRECT"));
		
		return proxys.length ? proxys : "DIRECT";
	};
	
	browser.runtime.onMessage.addListener(this.listener);
}

PAC.call(this);
