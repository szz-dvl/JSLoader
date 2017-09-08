function Options (opt) {

	this.jsloader = opt.jsloader || {
		
		uglify: false,
		uglify_mangle: false
	};
	
	this.editor = opt.editor || {

		showPrintMargin: false,
		showGutter: false,
		fontSize: 10,
		collapsed: false,
		theme: "twilight"
	};
}

function OptionMgr (bg) {

	var self = this;
	
	this.bg = bg;
	this.storage = global_storage;
	
	this.opts = {};
	
	this.storage.getOptions(new_options => {
		
		self.opts = new Options(new_options || {});
		
	});

	this.getCurrent = function () {

		return self.opts;
		
	};

	this.getCurrentEditor = function () {

		return self.opts.editor;
		
	};

	this.getCurrentApp = function () {

		return self.opts.jsloader;
		
	};

	this.setCurrent = function (val) {

		self.opts = val
		self.storage.setOptions(self.opts);
	};

	this.setCurrentEditor = function (val) {

		self.opts.editor = val
		self.storage.setOptions(self.opts)
			.then(
				() => {

					self.bg.broadcastEditors({action: "options", message: self.opts.editor});
				
				}
			);
		
	};

	this.setCurrentApp = function (val) {

		self.opts.jsloader = val
		self.storage.setOptions(self.opts);
		
	};

	this.openPage = function() {

		browser.runtime.openOptionsPage();
		
	};

}
