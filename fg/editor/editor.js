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
		},
		{
			tab: '2',
			name: 'settings',
			parent: self,
			onTrigger: () => {
				
				self.scope.toggleSettings();
				self.scope.$digest();
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
				
				this.btn_panel.find(".hidden-elem")
					.css({
						"visibility" : "hidden",
						"display": "block"
					});
				
				this.settings_btn.find(".hidden-elem")
					.css({
						"visibility" : "hidden",
						"display": "block"
					});
				
				this.dropdown.fadeOut();
				
			});
			
		} else {
			
			this.btn_panel.find(".hidden-elem").css({

				"display" : "none",
				"visibility": "visible"

			});

			this.btn_panel.find( ".hidden-elem" ).fadeIn();
			
			this.settings_btn.find(".hidden-elem").css({
				
				"display" : "none",
				"visibility": "visible"
				
			});
			
			this.settings_btn.find( ".hidden-elem" ).fadeIn();
			

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
									  : (!this.editor.script.parent.isResource() ?
										 this.bg.domain_mgr.updateParentFor(this.editor.script, this.scope.url) :
										 this.bg.resource_mgr.solveHierarchyForEditor(this.editor.script.parent, this.scope.resource_name))) :
							  Promise.resolve();

				promise.then (
					data => {
						
						if (data && data.constructor.name == 'Resource') 
							this.editor.script.parent = data;

						let new_code = this.editor.ace.getValue().toString().trim();
						let reload = this.editor.script.code.trim() != new_code;
						
						if (reload)
							this.editor.script.code = new_code;
						
						this.editor.script.persist()
							.then(	
								parent => {
									
									this.scope.enableButtons();
									
									if (parent) {
										
										if (parent.isResource()) {
										
											if (self.bg.option_mgr.events) 
												self.bg.option_mgr.events.emit("new-resource", parent);

										} else if (reload) {

											self.bg.content_mgr.reloadScript(this.editor.script);
											
										}
									}
									
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
	
	this.resetAce = (args) => {

		let opts = args || this.bg.option_mgr.editor;
		
		this.editor.ace.setPrintMarginColumn(opts.printMarginColumn);
		this.editor.ace.renderer.setShowGutter(opts.showGutter);
		this.editor.ace.setTheme("ace/theme/" + opts.theme);
		
		this.editor.ace.setOptions({
			
			fontSize: opts.fontSize + "pt",
			fontFamily: opts.font
			
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
		$scope.resource_name = $scope.script.parent && $scope.script.parent.isResource() ? $scope.script.parent.name : null; 
		
		$scope.editor_collapsed = false;
		$scope.settings_shown = false;
		
		$scope.$watch(
			
			() => {
				
				return $scope.editor_collapsed;
				
			},
						
			(nval, oval) => {
				
				if (nval != oval)
					self.collapseHeader();
			}
		);

		$scope.onOptChange = (opt) => {
			
			switch(opt.id) {

				case "showGutter":
					$scope.editor.ace.renderer.setShowGutter(opt.value);
					break;
				case "printMarginColumn":
					$scope.editor.ace.setPrintMarginColumn(opt.value);
					break;
				case "fontSize":
					$scope.editor.ace.setOptions({ fontSize: opt.value + "pt" });
					break;
				case "theme":
					$scope.editor.ace.setTheme("ace/theme/" + opt.value);
					break;
				case "font":
					$scope.editor.ace.setOptions({ fontFamily: opt.value });
					break;
				default:
					break;
			}
			
		};
		
		$scope.opts = [

			{text:'Show gutter line', value: self.bg.option_mgr.editor.showGutter, id: "showGutter", type: "checkbox"},
			{text:'Margin column', value: self.bg.option_mgr.editor.printMarginColumn, id: "printMarginColumn", type: "text"},
			{text:'Font size', value: self.bg.option_mgr.editor.fontSize, id: "fontSize", type: "text"},
			{text:'Editor theme', value: self.bg.option_mgr.editor.theme, id: "theme", type: "select"},
			{text:'Font family', value: self.bg.option_mgr.editor.font, id: "font", type: "select"}
			
		];

		$scope.keyOnHeader = (ev) => {

			/* Tab = 0; */
			return ev.which;
			
		}
		
		$scope.toggleSettings = () => {
			
			$scope.settings_shown = !$scope.settings_shown;

		}

		$scope.settingsSrc = (enter) => {
			
			let next = "../icons/settings_gears" + (enter ? '.gif' : '.png');
			$('#settings_img').attr('src', next);
			
		}
		
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

					console.log("Validating: " + pending);
					
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
					
				})

			.on('resource_name',
				(resource_name, state) => {

					if (state) {

						let mode = resource_name.split(".").pop() == "js" ? "javascript" : resource_name.split(".").pop();
						
						$scope.resource_name = resource_name;
						$scope.editor.ace.session.setMode("ace/mode/" + mode);
						
					}
					
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

		$scope.buttonHide = () => {
			
			if ($scope.buttons.shown)
				self.toggleButtons();
		};
				
		/* After interpolation ready ... */
		$timeout(() => {
			
			$scope.editor.ace = ace.edit("code_area");
			$scope.editor.ace.session.setMode("ace/mode/" + $scope.editor.mode);
			
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

			/* @ https://github.com/ajaxorg/ace/issues/2737 */
			$scope.editor.ace.session.on("changeScrollTop", $scope.buttonHide);
			$scope.editor.ace.session.on("changeScrollLeft", $scope.buttonHide);
			
		});
	});

	browser.runtime.onMessage.addListener(

		request => {
			
			switch (request.action) {
				case "opts":
				
					self.resetAce(request.message);
				
				default:
					break;
			}
		}
	);
	
	angular.element(document).ready( () => {
		
		this.editor_bucket = $("#code_container");
		this.dropdown = $("#dropdown-header");
		this.btn_panel = $("#btns_panel");
		this.settings_btn = $("#settings_btn");
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



