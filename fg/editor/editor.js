function onError (err) {
	console.log(err);
};


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

	/* 
	   To-Do: 
	   
	      * Notify user on run error 
	      * Update URL on tab update, if attached.
	*/

	this.isCollapsed = function () {
		
		return self.editor.scope.dd_text == "<";
		
	};
	
	this.collapseHeader = function () {
		
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
	
	this.getFirstError = function () {

		return self.editor.ace.getSession().getAnnotations()
			.find(
				annotation => {
					
					return annotation.type == 'error';
					
				}
			) || null;
	};
	
	this.runCurrent = function () {

		if (!self.editor.scope.buttons.disabled) {

			self.editor.scope.disableButtons();

			let error = self.getFirstError();

			if (!error) {
				
				self.editor.script.code = self.editor.ace.getValue().toString().trim();
				self.editor.runInTab()
					.then(
						response => {
							
							if (!response[0].status) {
								
								let error = response[0].errors[0];

								self.editor.ace.gotoLine(error.line, error.col, true);
								self.bg.notifyUser("Run Errors", error.type + ": " + error.message);
							}
							
							self.editor.scope.enableButtons();
							
						},
						err => {
							
							/* Liada gorda! */
							self.editor.scope.enableButtons();
							
						});
			} else {
				
				self.bg.notifyUser("Script Errors", "Please check your synthax.");
				self.editor.ace.gotoLine(error.row + 1, error.column, true);
				self.editor.scope.enableButtons();
			}
		}
	};
	
	this.saveCurrent = function () {

		/* May be triggered from shortcut. */
		if (!self.editor.scope.buttons.disabled) {
			
			self.editor.scope.disableButtons();

			let error = self.getFirstError();

			if (!error) {
				
				let promise = self.editor.script.parent.isGroup()
					? self.editor.script.updateGroup(self.editor.scope.url)
					: self.editor.script.updateParent(self.editor.scope.url);
				
				promise.then (
					script => {
						
						script.code = self.editor.ace.getValue().toString().trim();
						script.persist()
							.then(
								parent => {
									
									console.log("Updating PA!");
									self.bg.updatePA(script);
									self.editor.scope.enableButtons();
									
								}
							)
					}
				);

			} else {
				
				self.bg.notifyUser("Script Errors", "Please check your synthax.");
				self.editor.ace.gotoLine(error.row + 1, error.column, true);
				self.editor.scope.enableButtons();
			}
			
		} /* else: Notify? */
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
	
	this.app = angular.module('EditorApp', ['jslPartials']);
	
	this.app.controller('editorController', ($scope, $timeout) => {
		
		self.editor.scope = $scope;

		$scope.editor = self.editor;
		$scope.script = self.editor.script;

		$scope.page = self;

		/* !!! ==> Groups! */
		$scope.url = $scope.script.getUrl() ? $scope.script.getUrl().name() : $scope.script.getParentName(); //self.editor.tab ? self.editor.tab.url.name() : $scope.script.getParentName();
		
		$scope.label = "JSLoader";

		/* !!! ===> tab! */
		$scope.user_action = self.editor.tab ? self.editor.mode ? "Adding script for: " : "Editing script for: " : "Adding script for group: "; /* ¿¿ To wdw title ?? */ 
		
		$scope.buttons = {
			
			shown: true,
			disabled: false,
			arr: [{text:"Save", id: "save_btn", available: true,
				   click: function () {

					   self.saveCurrent();
					   
				   }},
				  {text:"Run in Page", id: "run_btn", available: self.editor.tab,
				   click: function () {
					   
					   self.runCurrent();
					   
				   }}]

		};
		
		$scope.dd_text = "<";
		
		$scope.page.events
			.on('validation_start',
				pending => {
					
					console.log("Validation start: " + pending);
								
					$("#save_btn").attr("disabled", true);
					
				})
		
			.on('validation_ready',
				validated => {

					$scope.url = validated;

					console.log("Validated url: " + validated);
					
					$("#save_btn").attr("disabled", true);
					
				});
		

		$scope.disableButtons = function () {

			for (let button of $scope.buttons.arr) {

				$("#" + button.id).attr("disabled", true); 

			}
			
			$scope.buttons.disabled = true;

		};

		$scope.enableButtons = function () {

			for (let button of $scope.buttons.arr) {

				$("#" + button.id).removeAttr("disabled"); 

			}
			
			$scope.buttons.disabled = false;
			
		};
		
		$scope.dropdownClick = function () {
			
			self.collapseHeader();
			
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
		});
	});

	browser.runtime.onMessage.addListener(

		request => {
			
			switch (request.action) {
			case "opts":
				
				self.editor.opts = request.message;
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



