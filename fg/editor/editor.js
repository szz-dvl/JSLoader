function Shortcut (opt) {

	let self = this;
	
	this.name = opt.name || "";
	this.key = {
		
		hold: opt.hold || "Ctrl",
		tab: opt.tab || null

	};

	this.parent = opt.parent;
	
	this.__onTrigger = opt.onTrigger || null;
	
	this.parent.editor.ace.commands.addCommand({
		name: self.name,
		bindKey: {win: self.key.hold + '-' + self.key.tab, mac: 'Command-Option-' + self.key.tab},
		
		exec: () => {
			self.__onTrigger();
		}
	});
	
	shortcut.add(self.key.hold + '+' + self.key.tab,
		() => {
			
			this.__onTrigger();
		}
	);
	
} 

function EditorFG (id, bg) {

	let self = this;
	
	this.bg = bg;
	this.events = new EventEmitter();
	this.shortcuts = [
		{
			tab: 'R',
			name: 'run',
			parent: self,
			onTrigger: () => {
				self.runCurrent();
			}
		},
		{
			tab: 'S',
			name: 'save',
			parent: self,
			onTrigger: () => {
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
			onTrigger: () => {

				self.scope.editor_collapsed = !self.scope.editor_collapsed;
				self.scope.$digest();
			}
		})
	}
		
	
	this.collapseHeader = () => {
		
		if (!this.scope.editor_collapsed) {
			
			this.editor_bucket.css("top", "50px");
			this.editor_bucket.css("height", window.innerHeight - 50);
			
		} else {
			
			this.editor_bucket.css("top", 0);
			this.editor_bucket.css("height", "100%");
		}
		
		this.editor.ace.resize();
	};

	this.toggleButtons = () => {
		
		if (this.scope.buttons.shown) {
			
			this.btn_panel.find( ".hidden-elem" ).fadeOut(400, "swing", () => {
				
				this.btn_panel.find( ".hidden-elem" ).css("visibility", "hidden");
				this.btn_panel.find( ".hidden-elem" ).css("display", "block");			

				this.dropdown.fadeOut();
				
			});
			
		} else {
			
			this.btn_panel.find( ".hidden-elem" ).css("display", "none");
			this.btn_panel.find( ".hidden-elem" ).css("visibility", "visible");
			this.btn_panel.find( ".hidden-elem" ).fadeIn();	

			this.dropdown.fadeIn();
		}
		
		this.scope.buttons.shown = !this.scope.buttons.shown
	};
	
	this.getFirstError = () => {

		return this.editor.ace.getSession().getAnnotations()
			.find(
				annotation => {
					
					return annotation.type == 'error';
					
				}
			) || null;
	};
	
	this.runCurrent = () => {
		
		if (!this.scope.buttons.disabled && this.scope.canRun()) {
			
			this.scope.disableButtons();
			
			let error = this.getFirstError();

			if (!error) {
				
				this.editor.script.code = this.editor.ace.getValue().toString().trim();
				this.editor.runInTab()
					.then(
						response => {
							
							if (!response[0].status) {
								
								let error = response[0].errors[0];
								
								this.editor.ace.gotoLine(error.line, error.col, true);
								this.bg.notify_mgr.error(error.type + ": " + error.message);
								
							}
							
							this.scope.enableButtons();
							this.scope.$digest();  /* !!! */
						},
						err => {
							
							/* Liada gorda! */
							console.log("Run reject: ");
							console.log(err);
							
							this.scope.enableButtons();
							this.scope.$digest();
						}
					);
				
			} else if (this.scope.buttons.disabled) {
				
				this.bg.notify_mgr.error("Script Errors: Please check your syntax.");
				this.editor.ace.gotoLine(error.row + 1, error.column, true);
				this.scope.enableButtons();
				this.scope.$digest();
			}
		}
	};
	
	this.saveCurrent = () => {
		
		/* May be triggered from shortcut. */
		if (!this.scope.buttons.disabled) {
			
			this.scope.disableButtons();
			
			let error = this.getFirstError();
			
			if (!error) {
				
				let promise = this.editor.script.parent ?
							  (this.editor.script.parent.isGroup()
									  ? this.bg.group_mgr.updateParentFor(this.editor.script, this.scope.url)
									  : this.bg.domain_mgr.updateParentFor(this.editor.script, this.scope.url)):
							  Promise.resolve();
				
				promise.then (
					() => {
						
						this.editor.script.code = this.editor.ace.getValue().toString().trim();
						this.editor.script.persist()
							.then(
								
								parent => {
									
									this.scope.enableButtons();
									
									if (this.editor.tab) {

										if (this.editor.script.includedAt(this.editor.tab.url)) {
											
											browser.pageAction.setIcon(
												{
													path: {
														
														16: browser.extension.getURL("fg/icons/red-diskette-16.png"),
														32: browser.extension.getURL("fg/icons/red-diskette-32.png")
															
													},
													
													tabId: self.editor.tab.id
												}
											);

											this.scope.enableRun();
											
										} else {

											this.scope.disableRun();
										
										}
									}
									
									this.scope.$digest();
								}
							)

					}, err => { console.error(err); }
				);
				
			} else {
				
				this.bg.notify_mgr.error("Script Errors: Please check your syntax.");
				this.editor.ace.gotoLine(error.row + 1, error.column, true);
				this.scope.enableButtons();
			}
			
		}
	};

	this.onResize = () => {
		
		if (this.scope.editor_collapsed) {
			
			this.editor_bucket.css("top", 0);
			this.editor_bucket.css("height", "100%");
			
		} else {
			
			this.editor_bucket.css("top", "50px");
			this.editor_bucket.css("height", window.innerHeight - 50);
		}
		
		this.editor.ace.resize();
	};
	
	this.resetAce = () => {
		
		this.editor.ace.setPrintMarginColumn(this.bg.option_mgr.editor.printMarginColumn);
		this.editor.ace.renderer.setShowGutter(this.bg.option_mgr.editor.showGutter);
		this.editor.ace.setTheme("ace/theme/" + this.bg.option_mgr.editor.theme);
		
		this.editor.ace.setOptions({
			
			fontSize: self.bg.option_mgr.editor.fontSize + "pt",
			fontFamily: self.bg.option_mgr.editor.font
			
		});
	}
	
	this.app = angular.module('EditorApp', ['jslPartials']);
	
	this.app.controller('editorController', function ($scope, $timeout, $compile) {
		
		self.scope = $scope;
		$scope.page = self;
		
		$scope.editor = self.editor;
		$scope.script = self.editor.script;
		$scope.groups_copy = self.bg.group_mgr.groups.slice(0);
		$scope.url = $scope.script.getUrl() ? $scope.script.getUrl().name() : $scope.groups_copy[0];
		
		$scope.editor_collapsed = false;
		
		$scope.$watch(
			
			() => {
				
				return $scope.editor_collapsed;
				
			},
						
			(nval, oval) => {
				
				if (nval != oval)
					self.collapseHeader();
			}
		);
		
		$scope.buttons = {
			
			shown: true,
			disabled: false,
			arr: [{text:"Save", id: "save_btn", available: true,
				click: () => {
					
					self.saveCurrent();
					
				}},
				{text:"Run in Page", id: "run_btn", available: self.editor.tab ? true : false,
					click: () => {
						
						self.runCurrent();
						
					}
				}]
		};
		
		$scope.page.events
			.on('validation_start',
				pending => {

					if (!$scope.buttons.disabled)	
						$scope.disableButtons();
					
				})
			
			.on('validation_ready',
				(validated, state) => {
					
					$scope.url = validated;	
					$scope.enableButtons();
					
				})
			
			.on('new_selection',
				selected => {
					
					$scope.url = selected;	
					$scope.enableButtons();
					
				});

		$scope.disableRun = () => {

			$scope.buttons.arr[1].available = false;
			$scope.$digest();
		};

		$scope.enableRun = () => {

			$scope.buttons.arr[1].available = true;
			$scope.$digest();
			
		};

		$scope.canRun = () => {

			return $scope.buttons.arr[1].available;
		}

		$scope.tabForUnpersisted = (isgroup) => {
			
			if (!isgroup) {
				
				$scope.url = $scope.editor.tab.url.name();
			
				$("#site_validator")
					.replaceWith($compile('<site-validator id="site_validator" style="display: inline-block; width: 80%;margin: 0;" ng-if="!script.parent.isGroup()" ev="page.events" url="url"> </site-validator>')($scope));
				
			}
			
			$scope.enableRun();
		};
		
		$scope.disableButtons = () => {
			
			$scope.buttons.disabled = true;
		};

		$scope.enableButtons = () => {
			
			$scope.buttons.disabled = false;
			
		};
		
		$scope.buttonToggle = () => {
			
			if (!$scope.buttons.shown)
				self.toggleButtons();
		};
				
		/* After interpolation ready ... */
		$timeout(() => {
			
			$scope.editor.ace = ace.edit("code_area");
			$scope.editor.ace.session.setMode("ace/mode/javascript"); /* editor.mode */
			
			$scope.editor.ace.getSession()
				.on('change', () => {
					
					if ($scope.buttons.shown)
						self.toggleButtons();
				});
			
			self.resetAce();
			
			self.editor.ace.gotoLine($scope.editor.pos.line, $scope.editor.pos.col, true);
			
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
		
		this.editor_bucket = $("#code_container");
		this.dropdown = $("#dropdown-header");
		this.btn_panel = $("#btns_panel");
		this.res_box = $("#result-info");
		this.target = $("#url_pattern");
		
		angular.bootstrap(document, ['EditorApp']);
		
	});
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			
			let id = parseInt(window.location.toString().split("?")[1].split("&")[0]);
			
			new EditorFG(id, page);
			
		},
	);



