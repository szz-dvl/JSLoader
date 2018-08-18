function ProxyMgr (bg) {

	this.setProxyFor = (hostname, proxy) => {

		return new Promise (
			resolve => {
				chrome.proxy.settings.set(
					{value: {
						mode: "pac_script",
						pacScript: {
							data: "function FindProxyForURL(url, host) {\n" +
								"  if (host == '" + hostname + "')\n" +
								"    return 'PROXY " + proxy.host + ":" + proxy.port + "';\n" +
								"  return 'DIRECT';\n" +
								"}"
						}
						
					}, scope: 'regular'}, resolve)
			}
		);
	}

	this.clearProxy = () => {

		return new Promise (
			resolve => {

				chrome.proxy.settings.clear(
					{scope: 'regular'},
					resolve
				);
			
			}
		);
	}
}

