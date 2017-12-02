function LogsMgr (bg) {

	let self = this;
	
	this.bg = bg;
	this.storage = global_storage;
	this.logs = [];

	this.storage.getLogs(
		logs => {

			self.logs = logs;
			
		}
	);
	
	this.logErrors = function (errors) {
		
		for (let error of errors)
			self.logs.push({ stamp: error.stamp, offender: error.id, name: error.name, message: error.type + ": " + error.message, line: error.line, col: error.col, at: error.at, parent: error.parent });
			
		self.storage.setLogs(self.logs)
		
	}

	this.flushLogs = function () {

		self.logs = [];
		self.storage.removeLogs();

	}

	this.openOffender = function (parent_name, offender_id) {
		
		let promise = parent_name.includes(".")
			? self.bg.domain_mgr.getOrBringCached(parent_name)
			: self.bg.group_mgr.getOrBringCached(parent_name)

		promise.then(
			parent => {

				self.bg.editor_mgr.openEditorInstanceForScript(parent.findScript(offender_id));
				

			});

	}

}
