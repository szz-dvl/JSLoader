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
	
	this.app = angular.module('EditorApp', ['jslPartials']);
	
	this.app.controller('editorController', function ($scope, $timeout, $compile) {

		$scope.page = self;

		$scope.editor_bucket = $("#code_container");
		$scope.dropdown = $("#dropdown-header");
		$scope.btn_panel = $("#btns_panel");
		$scope.settings_btn = $("#settings_btn");

		$scope.editor = self.bg.editor_mgr.getEditorById(id);
		$scope.script = $scope.editor.script;

		/* Groups */
		$scope.groups_copy = self.bg.group_mgr.groups.slice(0);
		$scope.gotit = true;
		$scope.mine = true;
		$scope.adding_group = !$scope.groups_copy.includes($scope.script.getParentName());
		
		$scope.url = $scope.script.getUrl() ? $scope.script.getUrl().name() : $scope.groups_copy[0];
		$scope.resource_name = $scope.script.parent && $scope.script.parent.isResource() ? $scope.script.parent.name : null; 
		
		
		$scope.editor_collapsed = false;
		$scope.settings_shown = false;
		$scope.run_shown = $scope.editor.tab ? true : false;

		$scope.buttons = {
			
			disabled: !$scope.script.parent ? false : ($scope.script.getUrl() ? false : ($scope.script.parent.isResource() ? false : $scope.adding_group))

		};
		
		$scope.shortcuts = [
			{
				tab: 'R',
				name: 'run',
				parent: $scope,
				onTrigger: () => {
					$scope.runCurrent();
				}
			},
			{
				tab: 'S',
				name: 'save',
				parent: $scope,
				onTrigger: () => {
					$scope.saveCurrent();
				}
			},
			{
				tab: 'B',
				name: 'remove',
				parent: $scope,
				onTrigger: () => {

					$scope.removeCurrent();
				}
			},
			{
				tab: '2',
				name: 'settings',
				parent: $scope,
				onTrigger: () => {
					
					$scope.toggleSettings();
					$scope.$digest();
				}
			}
			
		]
		
		if ($scope.editor.script.parent) {
			
			$scope.shortcuts.push({
				tab: '1',
				name: 'collapse',
				parent: $scope,
				onTrigger: () => {
					
					$scope.editor_collapsed = !$scope.editor_collapsed;
					$scope.$digest();
				}
			})
		}
		
		$scope.$watch(
			
			() => {
				
				return $scope.editor_collapsed;
				
			},
			
			(nval, oval) => {
				
				if (nval != oval)
					$scope.collapseHeader();
			}
		);

		$scope.collapseHeader = () => {
			
			if (!$scope.editor_collapsed) {
			
				$scope.editor_bucket.css("top", "50px");
				$scope.editor_bucket.css("height", window.innerHeight - 50);
				
			} else {
			
				$scope.editor_bucket.css("top", 0);
				$scope.editor_bucket.css("height", "100%");
			}
			
			$scope.editor.ace.resize();
		};

		$scope.resetAce = (args) => {

			let opts = args || self.bg.option_mgr.editor;
			
			$scope.editor.ace.setPrintMarginColumn(opts.printMarginColumn);
			$scope.editor.ace.renderer.setShowGutter(opts.showGutter);
			$scope.editor.ace.setTheme("ace/theme/" + opts.theme);
			
			$scope.editor.ace.setOptions({
				
				fontSize: opts.fontSize + "pt",
				fontFamily: opts.font
				
			});
		}

		$scope.onResize = () => {
			
			if ($scope.editor_collapsed) {
				
				$scope.editor_bucket.css("top", 0);
				$scope.editor_bucket.css("height", "100%");
				
			} else {
				
				$scope.editor_bucket.css("top", "50px");
				$scope.editor_bucket.css("height", window.innerHeight - 50);
			}
			
			$scope.editor.ace.resize();
		};

		$scope.toggleButtons = () => {
			
			if ($scope.buttons.shown) {
				
				$scope.btn_panel.find( ".hidden-elem" ).fadeOut(400, "swing", () => {
					
					$scope.btn_panel.find(".hidden-elem")
						.css({
							"visibility" : "hidden",
							"display": "block"
						});
					
					$scope.settings_btn.find(".hidden-elem")
						.css({
							"visibility" : "hidden",
							"display": "block"
						});
					
					$scope.dropdown.fadeOut();
					
				});
				
			} else {
				
				$scope.btn_panel.find(".hidden-elem").css({

					"display" : "none",
					"visibility": "visible"

				});

				$scope.btn_panel.find( ".hidden-elem" ).fadeIn();
				
				$scope.settings_btn.find(".hidden-elem").css({
					
					"display" : "none",
					"visibility": "visible"
					
				});
				
				$scope.settings_btn.find( ".hidden-elem" ).fadeIn();
				

				$scope.dropdown.fadeIn();
			}
			
			$scope.buttons.shown = !$scope.buttons.shown
		};
		
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

		$scope.getFirstError = () => {

			return $scope.editor.ace.getSession().getAnnotations()
				.find(
					annotation => {
						
						return annotation.type == 'error';
						
					}
				) || null;
		};

		$scope.runCurrent = () => {
			
			if ($scope.canRun()) {
				
				$scope.disableButtons();
				
				let error = $scope.getFirstError();
				
				if (!error) {
					
					$scope.editor.script.code = $scope.editor.ace.getValue().toString().trim();
					$scope.editor.runInTab()
						.then(
							response => {
								
								if (!response[0].status) {
									
									let error = response[0].errors[0];
									
									$scope.editor.ace.gotoLine(error.line, error.col, true);
									self.bg.notify_mgr.error(error.type + ": " + error.message);
									
								}
								
								$scope.enableButtons();
								$scope.$digest();  /* !!! */
							},
							err => {

								/* Must never happens */
								console.error(err);
								
								$scope.enableButtons();
								$scope.$digest();
							}
						);
					
				} else if ($scope.buttons.disabled) {
					
					self.bg.notify_mgr.error("Script Errors: Please check your syntax.");
					$scope.editor.ace.gotoLine(error.row + 1, error.column, true);
					$scope.enableButtons();
				}
			}
		};

		$scope.saveCurrent = () => {
			
			/* May be triggered from shortcut. */
			if ($scope.canSave()) {
				
				$scope.disableButtons();
				
				let error = $scope.getFirstError();
				
				if (!error) {

					let promise = $scope.editor.script.parent ?
								  ($scope.editor.script.parent.isGroup()
										  ? self.bg.group_mgr.updateParentFor($scope.editor.script, $scope.url)
										  : (!$scope.editor.script.parent.isResource() ?
											 self.bg.domain_mgr.updateParentFor($scope.editor.script, $scope.url) :
											 self.bg.resource_mgr.solveHierarchyForEditor($scope.editor.script.parent, $scope.resource_name))) :
								  Promise.resolve();

					promise.then (
						data => {
							
							if (data && data.constructor.name == 'Resource') 
								$scope.editor.script.parent = data;

							let new_code = $scope.editor.ace.getValue().toString().trim();
							let reload = $scope.editor.script.code.trim() != new_code;
							
							if (reload)
								$scope.editor.script.code = new_code;
							
							$scope.editor.script.persist()
								.then(	
									prnt => {
										
										$scope.enableButtons();
										
										if (prnt) {
											
											if (prnt.isResource()) {
												
												if (self.bg.option_mgr.events) 
													self.bg.option_mgr.events.emit("new-resource", prnt);
												
											} else {

												if (prnt.isGroup()) {

													/* New group created yet unpersisted */
													if ($scope.adding_group)
														$scope.adding_group = false;

													if (!$scope.mine)
														$scope.mine = true;
												}
												
												if (reload) 
													self.bg.content_mgr.reloadScript($scope.editor.script);
												
											}
										}
										
										$scope.$digest();

									}, err => {

										$scope.enableButtons();
										$scope.$digest();
										
										console.error(err);
									}
								)

						}, err => {

							$scope.enableButtons();
							$scope.$digest();
							
							console.error(err);
						}
					);
					
				} else {
					
					self.bg.notify_mgr.error("Script Errors: Please check your syntax.");
					$scope.editor.ace.gotoLine(error.row + 1, error.column, true);
					$scope.enableButtons();
				}	
			}
		};

		$scope.removeCurrent = () => {

			if ($scope.canRemove()) {

				$scope.disableButtons();
				
				$scope.script.remove()
					.then(prnt => {

						$scope.enableButtons();
						
						if (prnt.isGroup()) {
							$scope.mine = false;

						} else {

							if ($scope.url != $scope.editor.tab.url.name()) {

								$scope.url = $scope.editor.tab.url.name();
			
								$("#site_validator")
									.replaceWith($compile('<site-validator id="site_validator"' +
										' style="display: inline-block; width: 80%;margin: 0;"' +
										' ng-if="!script.parent.isGroup()"' +
										' ev="editor" url="url">' +
										' </site-validator>')($scope));

								$scope.run_shown = true;
							}
						}
						
						$scope.$digest();

					}, err => {

						$scope.enableButtons();
						$scope.$digest();
						console.error(err);
						
					})
			}
		}
		
		$scope.opts = [

			{text:self.bg.texts.findText('show_gutter'), value: self.bg.option_mgr.editor.showGutter, id: "showGutter", type: "checkbox"},
			{text:self.bg.texts.findText('margin_col'), value: self.bg.option_mgr.editor.printMarginColumn, id: "printMarginColumn", type: "text"},
			{text:self.bg.texts.findText('font_size'), value: self.bg.option_mgr.editor.fontSize, id: "fontSize", type: "text"},
			{text:self.bg.texts.findText('edit_theme'), value: self.bg.option_mgr.editor.theme, id: "theme", type: "select"},
			{text:self.bg.texts.findText('font_fam'), value: self.bg.option_mgr.editor.font, id: "font", type: "select"}

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
		
		$scope.editor
			.on('validation_start',
				pending => {
					
					$scope.adding_group = true;
					
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

					/* new group */
					
					$scope.page.bg.group_mgr.getItem(selected)
						.then(
							group => {
								
								$scope.adding_group = false;
								
								if (group.haveScript($scope.script.uuid)) 
									$scope.mine = true;
								else 
									$scope.mine = false;

								if (group.isMySite($scope.editor.tab.url.name())) 
									$scope.gotit = true;
								else 
									$scope.gotit = false;

								$scope.$digest();

							}, err => {

								$scope.mine = false;
								$scope.gotit = false;
								$scope.adding_group = true;
								$scope.$digest();
							}
						)
						
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
					
				})
			.on('new_tab',
				(must_run, unpersisted) => {
					
					if ($scope.script.parent.isGroup()) {

						if (!$scope.adding_group) {

							$scope.page.bg.group_mgr.getItem($scope.url)
								.then(
									group => {
										
										if (group.isMySite($scope.editor.tab.url.name())) 
											$scope.gotit = true;
										else 
											$scope.gotit = false;
										
										$scope.$digest();
										
									}, console.error)
						}
					}
					
					if (unpersisted) {

						if (!$scope.script.parent.isGroup()) {

							$scope.url = $scope.editor.tab.url.name();
			
							$("#site_validator")
								.replaceWith($compile('<site-validator id="site_validator"' +
									' style="display: inline-block; width: 80%;margin: 0;"' +
									' ng-if="!script.parent.isGroup()"' +
									' ev="editor" url="url">' +
									' </site-validator>')($scope));

						} 

					}

					if (must_run) {
						
						$scope.enableRun();
						
						
					} else {
						
						$scope.disableRun();
	
					}
				})
			.on('broadcast',
				request => {
					
					switch (request.action) {
						case "opts":

							$scope.resetAce(request.message);

							for (let key of Object.keys(request.message)) {

								$scope.opts.find(opt => { return opt.id == key })
									.value = request.message[key];
								
							}

							$scope.$digest();
							
						default:
							break;
					}
				});


		$scope.tabSiteToCurrentGroup = () => {

			if ($scope.gotit) {

				if ($scope.mine)
					$scope.script.parent.removeSite($scope.editor.tab.url.name());
				else
					self.bg.group_mgr.removeSiteFrom($scope.url, $scope.editor.tab.url.name());

			} else { 

				if ($scope.mine)
					$scope.script.parent.appendSite($scope.editor.tab.url.name());
				else
					self.bg.group_mgr.addSiteTo($scope.url, $scope.editor.tab.url.name());
				
			}
			
			$scope.gotit = !$scope.gotit;

			if ($scope.gotit && $scope.mine)
				$scope.run_shown = true;
		}
			
		$scope.disableRun = () => {

			$scope.run_shown = false;
			$scope.$digest();
		};

		$scope.enableRun = () => {

			$scope.run_shown = true;
			$scope.$digest();
			
		};

		$scope.canRun = () => {

			return !$scope.buttons.disabled && $scope.run_shown;
		}

		$scope.canSave = () => {

			if ($scope.buttons.disabled)
				return false;
			else {

				if (self.bg.db.connected)
					return self.bg.db.writeable && self.bg.db.removeable;
				else
					return !$scope.script.parent || $scope.script.parent.isResource() || $scope.script.inStorage() || $scope.script.created;				

			}
		}

		$scope.canRemove = () => {

			if ($scope.buttons.disabled)
				return false;
			else {

				if (self.bg.db.connected)
					return self.bg.db.removeable;
				else
					return $scope.script.inStorage() || $scope.script.created;

			}
		}
		
		$scope.disableButtons = () => {
			
			$scope.buttons.disabled = true;
		};

		$scope.enableButtons = () => {
			
			$scope.buttons.disabled = false;
			
		};
		
		$scope.buttonToggle = () => {
			
			if (!$scope.buttons.shown)
				$scope.toggleButtons();
		};

		$scope.buttonHide = () => {
			
			if ($scope.buttons.shown)
				$scope.toggleButtons();
		};
				
		/* After interpolation ready ... */
		$timeout(() => {
			
			$scope.editor.ace = ace.edit("code_area");
			$scope.editor.ace.session.setMode("ace/mode/" + $scope.editor.mode);
			
			$scope.editor.ace.getSession()
				.on('change', () => {
					
					if ($scope.buttons.shown)
						$scope.toggleButtons();
				});
			
			$scope.resetAce();
			
			$scope.editor.ace.gotoLine($scope.editor.pos.line, $scope.editor.pos.col, true);
			
			window.onresize = $scope.onResize;
			$scope.editor.setWdw(window);
			
			$scope.shotcuts = $scope.shortcuts.map(
				shortcut => {
					return new Shortcut(shortcut);
				}
			);
			
			if ($scope.editor.script.parent) {
				
				$scope.editor_bucket.css("top", "50px");
				$scope.editor_bucket.css("height", window.innerHeight - 50);
				
			}
			
			
			if ($("#persisted_mark").attr("src"))
				$("#persisted_mark").attr("src", $("#persisted_mark").attr("src").split(":").slice(1).join(":"));
			
			$("#settings_img").attr("src", $("#settings_img").attr("src").split(":").slice(1).join(":")); //* Workaround: images loaded from self marked as unsafe ...*/
			
		});
	});

	angular.element(document).ready( () => {
		
		angular.bootstrap(document, ['EditorApp']);
		
	});
	
}

chrome.runtime.getBackgroundPage(page => {
			
	let id = parseInt(window.location.toString().split("?")[1].split("&")[0]);
	
	new EditorFG(id, page);
	
	//@ https://stackoverflow.com/questions/17372885/block-f5-key-using-javascript
	$(document).on("keydown", (e) => {
		if ((e.which || e.keyCode) == 116) e.preventDefault();
	});
	
})
