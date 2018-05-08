function Shortcut (opt) {

	var self = this;
	
	this.name = opt.name || "";
	this.key = {
		
		hold: opt.hold || "Ctrl",
		tab: opt.tab || null

	};

	this.parent = opt.parent;
	
	this.__onTrigger = opt.onTrigger || null;
	
	self.parent.editor.ace.commands.addCommand({
		name: self.name,
		bindKey: {win: self.key.hold + '-' + self.key.tab, mac: 'Command-Option-' + self.key.tab},
		
		exec: function() {
			self.__onTrigger();
		}
	});
	
	shortcut.add(self.key.hold + '+' + self.key.tab, function () {
					 
		self.__onTrigger();
		
	});
	
} 

function EditorFG (id, bg) {

	var self = this;

	this.bg = bg;
	this.events = new EventEmitter();
	this.shortcuts = [
		{
			tab: 'R',
			name: 'run',
			parent: self,
			onTrigger: function () {
				self.runCurrent();
			}
		},
		{
			tab: 'S',
			name: 'save',
			parent: self,
			onTrigger: function () {
				self.saveCurrent();
			}
		}
	]
	
	this.editor = this.bg.editor_mgr.getEditorById(id);
	this.editor.fg = this;

	if (this.editor.script.parent) {

		this.shortcuts.push({
			tab: '1',
			name: 'collapse',
			parent: self,
			onTrigger: function () {

				self.scope.editor_collapsed = !self.scope.editor_collapsed;
				self.scope.$digest();
			}
		})
	}
		
	
	this.collapseHeader = function () {
		
		if (!self.scope.editor_collapsed) {
			
			self.editor_bucket.css("top", "50px");
			self.editor_bucket.css("height", window.innerHeight - 50);
			
		} else {
			
			self.editor_bucket.css("top", 0);
			self.editor_bucket.css("height", "100%");
		}
		
		self.editor.ace.resize();
	};

	this.toggleButtons = function () {
		
		if (self.scope.buttons.shown) {
			
			self.btn_panel.find( ".hidden-elem" ).fadeOut(400, "swing", () => {
				
				self.btn_panel.find( ".hidden-elem" ).css("visibility", "hidden");
				self.btn_panel.find( ".hidden-elem" ).css("display", "block");			

				self.dropdown.fadeOut();
				
			});
			
		} else {
			
			self.btn_panel.find( ".hidden-elem" ).css("display", "none");
			self.btn_panel.find( ".hidden-elem" ).css("visibility", "visible");
			self.btn_panel.find( ".hidden-elem" ).fadeIn();	

			self.dropdown.fadeIn();
		}
		
		self.scope.buttons.shown = !self.scope.buttons.shown
	};
	
	this.getFirstError = function () {

		return self.editor.ace.getSession().getAnnotations()
			.find(
				annotation => {
					
					return annotation.type == 'error';
					
				}
			) || null;
	};
	
	this.runCurrent = function () {
		
		if (!self.scope.buttons.disabled) {
			
			self.scope.disableButtons();
			
			let error = self.getFirstError();

			if (!error) {
				
				self.editor.script.code = self.editor.ace.getValue().toString().trim();
				self.editor.runInTab()
					.then(
						response => {
							
							if (!response[0].status) {
								
								let error = response[0].errors[0];
								
								self.editor.ace.gotoLine(error.line, error.col, true);
								self.bg.notify_mgr.error(error.type + ": " + error.message);
								
							}
							
							self.scope.enableButtons();
							self.scope.$digest();  /* !!! */
						},
						err => {
							
							/* Liada gorda! */
							console.log("Run reject: ");
							console.log(err);
							
							self.scope.enableButtons();
							self.scope.$digest();
						}
					);
				
			} else {
				
				self.bg.notify_mgr.error("Script Errors: Please check your syntax.");
				self.editor.ace.gotoLine(error.row + 1, error.column, true);
				self.scope.enableButtons();
				self.scope.$digest();
			}
		}
	};
	
	this.saveCurrent = function () {
		
		/* May be triggered from shortcut. */
		if (!self.scope.buttons.disabled) {
			
			self.scope.disableButtons();
			
			let error = self.getFirstError();
			
			if (!error) {
				
				let promise = self.editor.script.parent ?
							  (self.editor.script.parent.isGroup()
									  ? self.bg.group_mgr.updateParentFor(self.editor.script, self.scope.url)
									  : self.bg.domain_mgr.updateParentFor(self.editor.script, self.scope.url)):
							  Promise.resolve(self.editor.script);
				
				promise.then (
					script => {
						
						script.code = self.editor.ace.getValue().toString().trim();
						script.persist()
							.then(
								parent => {
									
									self.scope.enableButtons();
									self.scope.$digest();
									
									if (self.editor.tab) {
										
										browser.pageAction.setIcon(
											{
												path: {
													
													16: browser.extension.getURL("fg/icons/red-diskette-16.png"),
													32: browser.extension.getURL("fg/icons/red-diskette-32.png")
														
												},
												
												tabId: self.editor.tab.id
											}
										);
									}
								}
							)
					}, err => { console.error(err); }
				);
				
			} else {
				
				self.bg.notify_mgr.error("Script Errors: Please check your syntax.");
				self.editor.ace.gotoLine(error.row + 1, error.column, true);
				self.scope.enableButtons();
			}
			
		} /* else: Notify? */
	};

	this.onResize = function () {
		
		if (self.scope.editor_collapsed) {
			
			self.editor_bucket.css("top", 0);
			self.editor_bucket.css("height", "100%");
			
		} else {
			
			self.editor_bucket.css("top", "50px");
			self.editor_bucket.css("height", window.innerHeight - 50);
		}
		
		self.editor.ace.resize();
	};
	
	this.resetAce = function () {
		
		self.editor.ace.setPrintMarginColumn(self.bg.option_mgr.editor.printMarginColumn);
		self.editor.ace.renderer.setShowGutter(self.bg.option_mgr.editor.showGutter);
		self.editor.ace.setTheme("ace/theme/" + self.bg.option_mgr.editor.theme);
			
		self.editor.ace.setOptions({
			
			fontSize: self.bg.option_mgr.editor.fontSize + "pt",
			fontFamily: self.bg.option_mgr.editor.font
			
		});
	}
	
	this.app = angular.module('EditorApp', ['jslPartials']);
	
	this.app.controller('editorController', ($scope, $timeout) => {
		
		self.scope = $scope;
		$scope.page = self;
		
		$scope.editor = self.editor;
		$scope.script = self.editor.script;
		$scope.url = $scope.script.getUrl() ? $scope.script.getUrl().name() : $scope.script.getParentName();
		
		$scope.editor_collapsed = false;
		
		$scope.$watch(
			
			function () {
				
				return $scope.editor_collapsed;
				
			},
						
			function (nval, oval) {
				
				if (nval != oval)
					self.collapseHeader();
			}
		);
		
		/* ¿¿ To wdw title ?? */
		$scope.user_action = $scope.script.parent ?
							 (!$scope.script.parent.isGroup() ?
							  (self.editor.mode ? "Adding script for: " : "Editing script for: ") :
							  (self.editor.mode ? "Adding script for group: " : "Editing script for group: ")):
							 null;
		
		$scope.buttons = {
			
			shown: true,
			disabled: false,
			arr: [{text:"Save", id: "save_btn", available: true,
				click: function () {
					
					self.saveCurrent();
					
				}},
				{text:"Run in Page", id: "run_btn", available: self.editor.tab ? true : false,
					click: function () {
						
						self.runCurrent();
						
					}
				}]
		};
		
		$scope.page.events
			.on('validation_start',
				pending => {
					
					console.log("Validation start: " + pending);
					
					if (!$scope.buttons.disabled) {
						
						$scope.disableButtons();
						$scope.$digest();

					}
						
				})
		
			.on('validation_ready',
				validated => {

					$scope.url = validated;

					console.log("Validated: " + validated);
					
					$scope.enableButtons();
					$scope.$digest();
					
				});

		$scope.disableRun = function () {

			$scope.buttons.arr[1].available = false;
			$scope.$digest();

		};

		$scope.enableRun = function () {

			$scope.buttons.arr[1].available = true;
			$scope.$digest();
			
		};
		
		$scope.disableButtons = function () {
			
			$scope.buttons.disabled = true;
		};

		$scope.enableButtons = function () {
			
			$scope.buttons.disabled = false;
			
		};
		
		$scope.buttonToggle = function () {
			
			if (!$scope.buttons.shown)
				self.toggleButtons();
		};
				
		/* After interpolation ready ... */
		$timeout(function () {
			
			$scope.editor.ace = ace.edit("code_area");
			$scope.editor.ace.session.setMode("ace/mode/javascript");
			
			$scope.editor.ace.getSession()
				.on('change',
					() => {
						
						if ($scope.buttons.shown)
							self.toggleButtons();
					});
			
			self.resetAce();
			
			self.editor.ace.gotoLine($scope.editor.pos.line, $scope.editor.pos.col, true);
			
			// $scope.editor.ace.find($scope.script.code);
			// $scope.editor.ace.focus();
			
			window.onresize = self.onResize;
			$scope.editor.setWdw(window);
			
			self.shotcuts = self.shortcuts.map(
				shortcut => {
					return new Shortcut(shortcut);
				}
			);
			
			
			if ($scope.editor.script.parent) {
				
				self.editor_bucket.css("top", "50px");
				self.editor_bucket.css("height", window.innerHeight - 50);
				
			}
				
		});
	});

	browser.runtime.onMessage.addListener(

		request => {
			
			switch (request.action) {
				case "opts":
				
					self.resetAce();
				
				default:
					break;
			}
		}
	);
	
	angular.element(document).ready( () => {
		
		self.editor_bucket = $("#code_container");
		self.dropdown = $("#dropdown-header");
		self.btn_panel = $("#btns_panel");
		self.res_box = $("#result-info");
		self.target = $("#url_pattern");
		
		angular.bootstrap(document, ['EditorApp']);
		
	});
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			
			let id = parseInt(window.location.toString().split("?")[1].split("&")[0]);
			
			EditorFG.call(this, id, page);
			
		},
	);



