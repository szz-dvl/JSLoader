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

		if (!message.proxy) {

			/* No proxy, remove any ocurrence of the host */

			self.filtered.remove(
				self.filtered.findIndex(
					registered => {
						return registered.host == message.host;
					}
				)
			);

		} else {

			/* Add or update host entry */
			
			let reg = self.filtered.findIndex(
				registered => {
					return registered.host == message.host;
				}
			)
				
			if (reg >= 0) {

				if (self.filtered[reg].proxy == message.proxy) {
					
					self.filtered[reg].times += message.times; 
					
				} else {

					self.filtered[reg].proxy = message.proxy;
					self.filtered[reg].times = message.times;
				}
				
			} else {
				
				self.filtered.push(message);	
			}
			
		}
		
		// browser.runtime.sendMessage(`Proxy listener: ${message.host} > ` + JSON.stringify(self.filtered));
		
		return Promise.resolve(self.filtered.length);
	};

	/* One proxy per host only. */
	this.FindProxyForURL = function (url, host) {
		
		let record = self.filtered.findIndex(
			
			registered => {
				
				return registered.host == host && registered.temp;
			}
			
		);
		
		if (record < 0) {
			
			record = self.filtered.findIndex(
				
				registered => {

					return self.isSubDomain(host, registered.host);
					
				}
				
			);
		}
		
		if (record < 0) {

			return "DIRECT";
			
		} else {

			let proxys = [self.filtered[record].proxy];
			
			if (! --self.filtered[record].times)
				self.filtered.remove(record);

			return proxys;
			
		}
		
		//browser.runtime.sendMessage(`Proxy for ${host} > ` + (proxys ? JSON.stringify(proxys) : "DIRECT"));
	};
	
	browser.runtime.onMessage.addListener(this.listener);
}

PAC.call(this);
