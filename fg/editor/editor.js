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
				self.res_box.fadeOut(800, "swing",
									 () => {
										 
										 self.res_box.css("visibility", "hidden");
										 self.res_box.css("display", "block");
										 
									 });
				
			}, 5000);
	};
	
	this.editor.updateTarget = function () {
		
		self.editor.script.updateParent(self.editor.tab.url);
		self.target.text(self.editor.tab.url.hostname + self.editor.tab.url.pathname);	
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

	this.handleMessage = function (request) {

		switch (request.action) {
		case "opts":
			self.editor.opts = request.message;
			self.editor.ace.setShowPrintMargin(self.editor.opts.showPrintMargin);
			self.editor.ace.renderer.setShowGutter(self.editor.opts.showGutter);
			self.editor.ace.setOptions({
				fontSize: self.editor.opts.fontSize + "pt"
			});
			
			self.editor.ace.setTheme("ace/theme/" + self.editor.opts.theme);
			
		default:
			break;
		}

	};
	
	this.runCurrent = function () {
		
		self.editor.script.code = self.editor.ace.getValue().toString().trim();
		return self.editor.runInTab();
	};
	
	this.saveCurrent = function () {

		self.editor.script.code = self.editor.ace.getValue().toString().trim();

		console.log("New Code: " + self.editor.script.code);
		
		self.bg.domain_mgr.storeScript(self.editor.script)
			.then(
				script => {

					console.log("Persisting: " + script.uuid);
					
					script.persist().then(
						domain => {

							self.bg.informApp("script", {domain_name: domain.name, uuid: script.uuid});
						}
					);
					
				}
			);
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
	
	this.app = angular.module('EditorApp', []);
	
	this.app.controller('editorController', function ($scope, $timeout) {
		
		self.editor.scope = $scope;

		$scope.editor = self.editor;
		$scope.script = self.editor.script;
		
		var url = $scope.script.getUrl() || self.editor.tab.url;
		
		$scope.label = "JSLoader";
		
		$scope.user_action = {
			
			text: self.editor.mode ? "Adding script for: " : "Editing script for: ", /* To wdw title!! */
			target: url.hostname + url.pathname

		};

		$scope.buttons = {

			shown: true,
			arr: [{id:"save_btn", text:"Save"},
				  {id:"run_btn", text:"Run in Page"},
				  {id:"revert_btn", text:"Revert changes"}]

		};
		
		$scope.dd_text = "<";
		
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

		/* After interpolation ready ... */
		$timeout(function () {
			
			$scope.editor.ace = ace.edit("code_area");
			$scope.editor.ace.setShowPrintMargin($scope.editor.opts.showPrintMargin);
			$scope.editor.ace.renderer.setShowGutter($scope.editor.opts.showGutter);
			$scope.editor.ace.setTheme("ace/theme/" + $scope.editor.opts.theme);
			$scope.editor.ace.session.setMode("ace/mode/javascript");
			$scope.editor.ace.setOptions({
				fontSize: $scope.editor.opts.fontSize + "pt"
			});
			
			$scope.editor.ace.getSession()
				.on('change',
					() => {
						
						if ($scope.buttons.shown)
							self.toggleButtons();
					});
			
			$scope.editor.ace.find($scope.script.code);
			$scope.editor.ace.focus();
			
			window.onresize = $scope.onResize;
			$scope.editor.setWdw(window);
			
			self.shotcuts = self.shortcuts.map(
				shortcut => {
					return new Shortcut(shortcut);
				}
			);
			
			if (!$scope.editor.opts.collapsed) 
				self.collapseHeader();
					
			$scope.bodyClick = function () {
				
				if (!$scope.buttons.shown)
					self.toggleButtons();
				
			};

			/* protocol missing */
			if (self.editor.mode) {
				
				console.log("Tab url: ");
				
				console.log(self.editor.tab.url);
				self.editor.script.updateParent(self.editor.tab.url);
				
			}
				
		});
		
	});
	
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
			var editor = page.bg_manager.editor_mgr.getEditorById(id);
	
			browser.runtime.onMessage.addListener(
				new EditorFG(editor, page.bg_manager)
					.handleMessage);
	
		}, onError
	);



