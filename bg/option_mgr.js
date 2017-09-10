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
	
	this.storage.getOptions(

		new_options => {
			
			Options.call(self, new_options || {});
		}
	);

	this.__persist = function () {

		return self.storage.setOptions(new Options({editor: self.editor, jsloader: self.jsloader}));

	};
	
	this.getCurrent = function () {

		return {editor: self.editor, jsloader: self.jsloader};
		
	};

	this.getCurrentEditor = function () {

		return self.editor;
		
	};

	this.getCurrentApp = function () {

		return self.jsloader;
		
	};

	this.setCurrent = function (val) {

		Object.assign(self, val);
		self.__persist();
	};

	this.setCurrentEditor = function (val) {

		Object.assign(self.editor, val);
		return new Promise (
			(resolve, reject) => {

				self.__persist()
					.then(
						() => {
							
							self.bg.broadcastEditors({action: "opts", message: self.editor});
							resolve(self.editor);
							
						}, reject
					);
			}
		);
		
	};

	this.setCurrentApp = function (val) {
		
		Object.assign(self.jsloader, val);
		self.__persist();
		
	};

	this.openPage = function() {

		browser.runtime.openOptionsPage();
		
	};
}
