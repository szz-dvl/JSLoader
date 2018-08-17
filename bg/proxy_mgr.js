function ProxyMgr (bg) {

	this.updatePAC = (hostname, proxy, times) => {

		if (times < 1)

			return Promise.reject(new Error("Bad amount: " + times));
		
		else {
			
			return new Promise(
				(resolve, reject) => {
					
					let error = false;
					
					if (proxy) {
						
						if (!proxy.host || !proxy.port || !proxy.type) {
							
							reject(new Error("Bad proxy: " + JSON.stringify(proxy)));
							error = true;
						} 
					} 

					if (!error) {

						try {
							
							browser.runtime.sendMessage(
							
								{ host: hostname, proxy: proxy, times: times },
								{ toProxyScript: true }
								
							).then(resolve, reject);

						} catch(e) {

							console.error("SendMessage fails: ");
							console.error(e);
							reject(e);
						}
					}
					
				});
		}
	}
	
	browser.proxy.onProxyError.addListener(error => {
		console.error(`JSL Proxy error: ${error.message}`);
	});
	
	browser.proxy.register("pac.js");
}

