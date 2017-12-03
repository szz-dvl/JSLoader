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
			self.logs.push(
				{		
					stamp: error.stamp,
					offender: error.id,
					name: error.name,
					message: error.type + ": " + error.message,
					line: error.line,
					col: error.col,
					at: error.at,
					parent: error.parent
				}
			);
		
		self.storage.setLogs(self.logs)
		
	}

	this.flushLogs = function () {

		self.logs = [];
		self.storage.removeLogs();

	};
	
	this.__getOffender = function (parent_name, offender_id) {

		return new Promise (
			(resolve, reject) => {
				
				let promise = parent_name.includes(".")
					? self.bg.domain_mgr.getOrBringCached(parent_name)
					: self.bg.group_mgr.getOrBringCached(parent_name)

				promise.then(
					parent => {

						if (parent) {
							
							let offender = parent.haveScript(offender_id);
						
							if (offender)
								resolve(offender);
							else
								reject(offender);

						} else
							reject(parent);
						
					}, reject);
				
			}
		)
	};

	this.openOffender = function (parent_name, offender_id) {

		return new Promise (
			(resolve, reject) => {
				
				self.__getOffender(parent_name, offender_id)
					.then(self.bg.editor_mgr.openEditorInstanceForScript, reject);
			}
		);
	};
}
