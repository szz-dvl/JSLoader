function onError (err) {
	console.log(err);
};

//self.proto = self.url.toString().split("://")[0] + "://";

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

function EditorFG (editor, bg) {

	var self = this;

	this.bg = bg;
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
		},
		{
			tab: 'B',
			name: 'back',
			parent: self,
			onTrigger: function () {
				self.editor.tabToOriginalState();
			}
		},
		{
			tab: '1',
			name: 'collapse',
			parent: self,
			onTrigger: function () {
				self.collapseHeader();
			}
		},
	]

	this.editor = editor;
	this.editor.message = function (msg, err) {
		
		self.res_box.css("visibility", "hidden");
		
		if (err)
			self.res_box.css("color", "red");
		else 			
			self.res_box.css("color", "green");
		
		self.res_box.text(msg);
		self.res_box.css("visibility", "visible");
		
		/* !!! */
		setTimeout(
			() => {
				self.res_box
					.fadeOut(800, "swing",
							 () => {
								 
								 self.res_box.css("visibility", "hidden");
								 self.res_box.css("display", "block");
										 
							 });
				
			}, 5000);
	};
	
	this.editor.updateTarget = function (old) {
		
		if (old == self.editor.scope.url) {
			
			var err = self.editor.script.badParent(self.editor.tab.url);
		
			if(err)
				self.editor.message("Tab url outdated: " + err, true);
			else
				self.editor.scope.updateTarget(self.editor.tab.url);
		}
	};
	
	this.isCollapsed = function () {
		
		return self.editor.scope.dd_text == "<";
		
	};
	
	this.collapseHeader = function () {
		
		//console.log("collapseHeader header: " + self.editor.scope.dd_text);
		
		if (self.isCollapsed()) {
			
			self.dropdown.text("v");
			self.editor.scope.dd_text = "v"; //fails from shortcut.
			
			self.editor_bucket.css("top", "50px");
			self.editor_bucket.css("height", window.innerHeight - 50);
			
		} else {
			
			self.dropdown.text("<");
			self.editor.scope.dd_text = "<"; //fails from shortcut.
			
			self.editor_bucket.css("top", 0);
			self.editor_bucket.css("height", "100%");
		}
		
		self.editor.ace.resize();
	};

	this.toggleButtons = function () {
		
		if (self.editor.scope.buttons.shown) {
			
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
		
		self.editor.scope.buttons.shown = !self.editor.scope.buttons.shown
	};
	
	this.runCurrent = function () {
		
		self.editor.script.code = self.editor.ace.getValue().toString().trim();
		return self.editor.runInTab();
	};
	
	this.saveCurrent = function () {

		if(self.editor.tab) {

			console.log("Saving current: " + self.editor.scope.url);
			
			self.editor.script.updateParent(new URL('https://' + self.editor.scope.url))
				.then(
					script => {
					
						script.code = self.editor.ace.getValue().toString().trim();
						
						console.log("Storing script: ");
						console.log(script);
						
						self.bg.domain_mgr.storeScript(script)
							.then(
								script => {
									script.persist()
										.then(
											domain => {
												
												console.log("Updating PA for " + script.getUrl().href);
												self.bg.updatePA(script.getUrl());
											
											}
										);
								}
							);
					}
				);
			
		} else {
			
			self.editor.script.updateGroup(self.editor.scope.url)
				.then(
					script => {
					
						script.code = self.editor.ace.getValue().toString().trim();
						script.persist();
					}
				);
		}
	};

	this.onResize = function () {
		
		if (self.isCollapsed()) {

			self.editor_bucket.css("top", 0);
			self.editor_bucket.css("height", "100%");
			
		} else {
			
			self.editor_bucket.css("top", "50px");
			self.editor_bucket.css("height", window.innerHeight - 50);
		}

		self.editor.ace.resize();
	};

	this.resetAce = function () {

		self.editor.ace.setShowPrintMargin(self.editor.opts.showPrintMargin);
		self.editor.ace.renderer.setShowGutter(self.editor.opts.showGutter);
		self.editor.ace.setTheme("ace/theme/" + self.editor.opts.theme.name);
			
		self.editor.ace.setOptions({
			fontSize: self.editor.opts.fontSize + "pt"
		});
	}
	
	this.app = angular.module('EditorApp', []);
	
	this.app.controller('editorController', ($scope, $timeout) => {
		
		self.editor.scope = $scope;

		$scope.editor = self.editor;
		$scope.script = self.editor.script;
		
		$scope.url = $scope.script.getUrl() ? $scope.script.getUrl().name() : self.editor.tab ? self.editor.tab.url.name() : $scope.script.parent.name;

		//console.log("My url: " + $scope.url.name() + " hostname: " + $scope.url.hostname + " pathname: " + $scope.url.pathname);
		
		$scope.label = "JSLoader";
		
		$scope.user_action = self.editor.tab ? self.editor.mode ? "Adding script for: " : "Editing script for: " : "Adding script for group: "; /* To wdw title!! */ 
		
		$scope.buttons = {
			
			shown: true,
			arr: [{id:"save_btn", text:"Save", available: true},
				  {id:"run_btn", text:"Run in Page", available: self.editor.tab},
				  {id:"revert_btn", text:"Revert changes", available: self.editor.tab}]

		};
		
		$scope.dd_text = "<";

		$scope.targetChange = function () {
			
			console.log("targetChange:  ");
			
			if ($scope.targetTID)
				clearTimeout($scope.targetTID);
			
			$scope.targetTID = setTimeout(
				() => {

					if (self.editor.tab) {
						
						console.log("url: " + $scope.url);
						console.log("target: " + self.target.text());
						
						var url = new URL("http://" + self.target.text());
						var err = self.editor.script.badParent(url);
						
						if (err) {
							
							$scope.updateTarget(self.editor.script.getUrl() || self.editor.tab.url.name());
							self.editor.message(err, true);
							
						} else 
							$scope.updateTarget(url.name());

					} else 	
						$scope.updateTarget(self.target.text());
					
				}, 750);
		};
		
		$scope.dropdownClick = function () {
			
			self.collapseHeader();
			
		};
		
		$scope.buttonToggle = function () {

			if (!self.editor.scope.buttons.shown)
				self.toggleButtons();
		};
		
		$scope.buttonClick = function (ev) {

			/* !!! */
			switch (ev.target.id) {
			case "save_btn":
				self.saveCurrent();
				break;
			case "run_btn":
				self.runCurrent().then(null, onError);
				break;
			case "revert_btn":
				self.editor.tabToOriginalState();
				break;
			}
			
		};
		
		$scope.updateTarget = function (url) {

			console.log("Updating target: " + url);
			
			$scope.url = url;	
			
			//self.target.text(url.name());
		};
		
		$scope.bodyClick = function () {
			
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
			
			$scope.editor.ace.find($scope.script.code);
			$scope.editor.ace.focus();
			
			window.onresize = self.onResize;
			$scope.editor.setWdw(window);
			
			self.shotcuts = self.shortcuts.map(
				shortcut => {
					return new Shortcut(shortcut);
				}
			);
			
			if (!$scope.editor.opts.collapsed) 
				self.collapseHeader();

			self.target.on('input', () => {
				
				$scope.targetChange();
							   
			});
		});
	});

	browser.runtime.onMessage.addListener(

		request => {
			
			switch (request.action) {
			case "opts":
				
				console.log("New opts!");
				self.editor.opts = request.message; /* ?? */
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

			var id = parseInt(window.location.toString().split("?")[1].split("&")[0]);
			var editor = page.editor_mgr.getEditorById(id);

			EditorFG.call(this, editor, page);
	
		}, onError
	);



