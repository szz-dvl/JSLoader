// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	
	if (from < 0)
		return;
	
	let rest = this.slice((to || from) + 1 || this.length);
	this.length = from; //from < 0 ? this.length + from : from;
	
	return this.push.apply(this, rest);
};

function PAC () { 
	
	this.filtered = [];

	this.isSubDomain = (orig, modified) => {

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
	
	this.listener = (message) => {

		if (!message.proxy) {

			/* No proxy, remove any ocurrence of the host */

			this.filtered.remove(
				this.filtered.findIndex(
					registered => {
						return registered.host == message.host;
					}
				)
			);

		} else {

			/* Add or update host entry */
			
			let reg = this.filtered.findIndex(
				registered => {
					return registered.host == message.host;
				}
			)
				
			if (reg >= 0) {

				if (this.filtered[reg].proxy == message.proxy) {
					
					this.filtered[reg].times += message.times; 
					
				} else {

					this.filtered[reg].proxy = message.proxy;
					this.filtered[reg].times = message.times;
				}
				
			} else {
				
				this.filtered.push(message);	
			}
			
		}
		
		// browser.runtime.sendMessage(`Proxy listener: ${message.host} > ` + JSON.stringify(this.filtered));
		
		return Promise.resolve(this.filtered.length);
	};

	/* One proxy per host only. */
	this.FindProxyForURL = (url, host) => {
		
		let record = this.filtered.findIndex(
			
			registered => {
				
				return registered.host == host && registered.temp;
			}
			
		);
		
		if (record < 0) {
			
			record = this.filtered.findIndex(
				
				registered => {

					return this.isSubDomain(host, registered.host);
					
				}
				
			);
		}
		
		if (record < 0) {

			return "DIRECT";
			
		} else {

			let proxys = [this.filtered[record].proxy];
			
			if (! --this.filtered[record].times)
				this.filtered.remove(record);

			return proxys;
			
		}
		
		//browser.runtime.sendMessage(`Proxy for ${host} > ` + (proxys ? JSON.stringify(proxys) : "DIRECT"));
	};
	
	browser.runtime.onMessage.addListener(this.listener);
}

PAC.call(this);
