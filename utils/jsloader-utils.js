/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
var UUID = (function() {
	var self = {};
	var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }

	self.generate = function() {
		var d0 = Math.random()*0xffffffff|0;
		var d1 = Math.random()*0xffffffff|0;
		var d2 = Math.random()*0xffffffff|0;
		var d3 = Math.random()*0xffffffff|0;
		return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
			   lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
			   lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
			   lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
	}

	return self;
	
})();


// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {

	if (from < 0)
		return;
	
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from; //from < 0 ? this.length + from : from;

	return this.push.apply(this, rest);

};

Array.prototype.insert = function(elem) {
	
	if (this.includes(elem))
		return this.length;
	else
		return this.push(elem);
	
};

Array.prototype.unique = function() {
	
	return this.filter(
		(item, idx) => {
			
			return this.indexOf(item) == idx;

		}
	);
}

URL.prototype.match = function(url) {

	return url ? (this.pathname == url.pathname && this.hostname == url.hostname) : false;

};

URL.prototype.name = function() {

	let retval = this.hostname + this.pathname;
	
	if (retval.slice(-1) == "/")
		retval = retval.slice(0, -1);
	
	return retval;
};

URL.prototype.sort = function() {
	
	if (this.protocol === "wyciwyg:") 
		return new URL(this.pathname.split(/^\/\/[0-9]+\//).pop());
	else
		return this;
};

class JSLUrl {
	
	constructor(url) {

		if (typeof url === "string") {
			
			try {
				
				let aux = new URL(url);
				
				if (aux.protocol === "wyciwyg:") 
					aux = new URL(aux.pathname.split(/^\/\/[0-9]+\//).pop());
				
				this.hostname = aux.hostname;
				this.pathname = aux.pathname;
				
			} catch (err) {
				
				/* "*" in the URL */
				this.hostname = url.split("://").pop().split("/")[0];
				this.pathname = "/" + url.split("://").pop().split("/").slice(1).join("/");
			}
			
		} else {
			
			if (url.protocol && url.protocol === "wyciwyg:") 
				url = new URL(url.pathname.split(/^\/\/[0-9]+\//).pop());
			
			this.hostname = url.hostname;
			this.pathname = url.pathname;
			
		}

		if (this.pathname.slice(-1) == "/") 
			this.pathname = this.pathname.slice(0, -1);

		this.name = this.hostname + this.pathname;
		
		this.match = url => {
			
			return url.hostname == this.hostname && url.pathname == this.pathname;
			
		},

		this.includes = url => {
			
			if (this.hostname.startsWith("*.") && this.hostname.endsWith(".*")) {
				
				let parent_group = this.hostname.slice(2).slice(0, -2);
				let aux = url.hostname.split(".");
				
				do {
					
					aux = aux.slice(1).slice(0, -1);
					
				} while (aux.length && aux.join(".") != parent_group);

				return aux.length ? url.pathname.startsWith(this.pathname) : false;
				
			} else if (this.hostname.startsWith("*.")) {
				
				let parent_group = this.hostname.slice(2);
				
				return url.hostname.endsWith(parent_group) && url.pathname.startsWith(this.pathname);
				
			} else if (this.hostname.endsWith(".*")) {

				let parent_group = this.hostname.slice(0, -2);
				
				return url.hostname.startsWith(parent_group) && url.pathname.startsWith(this.pathname);

			} else {

				return url.name.startsWith(this.name);
				
			}
			
		}
		
		this.includedBy = url => {

			return url.includes(this);
			
		}
	}
}
