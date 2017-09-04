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
		
		exec: function(editor) {
			self.__onTrigger;
		}
	});
	
	shortcut.add(self.key.hold + '+' + self.key.tab, function () {
					 
		self.__onTrigger;
		
	});
	
} 

function EditorFG (editor, bg) {

	var self = this;

	this.bg = bg;
	this.shortcuts = [
		{
			tab: 'R',
			name: 'execute',
			parent: self,
			onTrigger: function () {
				self.editor.runInTab();
			}
		},
		{
			tab: 'S',
			name: 'save',
			parent: self,
			onTrigger: function (editor) {
				self.editor.script.persist(editor.getValue().toString().trim());
			}
		},
		{
			tab: 'B',
			name: 'revert',
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
		
		if (err) {

			self.res_box.removeClass("status-success");
			self.res_box.addClass("status-error");
			
		} else {
			
			self.res_box.removeClass("status-error");
			self.res_box.addClass("status-success");
			
		}

		self.scope.error = msg;
		self.res_box.css("visibility", "visible");
		
		/* !!! */
		setTimeout(function() {
			
			self.res_box.fadeOut(800, "swing", function() {
				
				self.res_box.css("visibility", "hidden");
				self.res_box.css("display", "block");
				
			});
			
		}, 5000);
	};

	this.isCollapsed = function () {

		return self.editor.scope.dd_text == "<"

	};
	
	this.collapseHeader = function () {

		if (self.isCollapsed()) {
			
			self.editor.scope.dd_text = "v";
			self.editor_bucket.css("top", "50px");
			self.editor_bucket.css("height", window.innerHeight - 50);
		
		} else {

			self.editor.scope.dd_text = "<";
			self.editor_bucket.css("top", 0);
			self.editor_bucket.css("height", "100%");
		}

		self.editor.ace.resize();
	};

	this.toggleButtons = function () {
	
	
		if (self.editor.scope.buttons.shown) {
		
			self.btn_panel.find( ".hidden-elem" ).fadeOut(400, "swing", function() {
				
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
			
			self.editor.ace.setTheme("ace/theme/" + self.opts.theme);
			
		default:
			break;
		}

	};

	this.app = angular.module('EditorApp', []);
	
	this.app.controller('editorController', function ($scope) {
		
		self.editor.scope = $scope;

		$scope.script = self.editor.script;

		// if (self.code)
		// 	self.editor.setValue(self.code, -1);
		// else
		// self.editor.ace.setValue("/* JS code (jQuery available) ...*/\n");
		
		$scope.label = "JSLoader";
		$scope.user_action = {

			editing: $scope.script.content ? true : false,
			text: self.editor.mode ? "Adding script for: " : "Editing script for: ",
			target: $scope.script.getUrl()

		};

		$scope.buttons = {

			shown: true,
			arr: [{id:"save_btn", text:"Save"},
				  {id:"run_btn", text:"Run in Page"},
				  {id:"revert_btn", text:"Revert changes"}]

		};

		$scope.error = "";
		$scope.dd_text = "v";

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
				self.editor.script.persist(); /* Recover value from editor. !!!*/
			case "run_btn":
				self.editor.runInTab().then(null, onError);
				
			case "revert_btn":
				self.editor.tabToOriginalState();
			}
			
		};

		/* Any official way of doing this? */
		$scope.onDone = function () {

			self.editor.ace = ace.edit("code_area");
			self.editor.ace.setShowPrintMargin(self.editor.opts.showPrintMargin);
			self.editor.ace.renderer.setShowGutter(self.editor.opts.showGutter);
			self.editor.ace.setTheme("ace/theme/" + self.editor.opts.theme);
			self.editor.ace.session.setMode("ace/mode/javascript");
			self.editor.ace.setOptions({
				fontSize: self.editor.opts.fontSize + "pt"
			});

			self.shotcuts = self.shortcuts.map(
				shortcut => {
					return new Shortcut(shortcut);
				}
			);

			self.editor.ace.getSession().on('change', () => {

				if ($scope.buttons.shown)
					self.toggleButtons();
			});
			
			self.editor.ace.find($scope.script.code);
			self.editor.ace.focus();
		};
	});
	

	angular.element(document).ready( () => {

		self.editor_bucket = $("#code_container");
		self.dropdown = $("#dropdown-header");
		self.btn_panel = $("#btns_panel");
		self.res_box = $("#result-info");

		/* !!! */
		self.editor_bucket.css("height", window.innerHeight - 50);
		self.editor_bucket.css("top", "50px");
		
		if (self.editor.opts.collapsed)
			self.collapseHeader();
		
		$("body").click(() => {
			
			if (!self.editor.scope.buttons.shown)
				self.toggleButtons();
		});

		//console.log("My title: " + self.editor.wdw.tabs[0].title);
		
		angular.bootstrap(document, ['EditorApp']);
		
	});
}

browser.runtime.getBackgroundPage().then(page => {

	var id = parseInt(window.location.toString().split("?")[1].split("&")[0]);
	var editor = page.bg_manager.editor_mgr.getEditorById(id);

	editor.setWdw(window);
	
	browser.runtime.onMessage.addListener(
		new EditorFG(editor, page.bg_manager)
			.handleMessage);
	
}, onError);



