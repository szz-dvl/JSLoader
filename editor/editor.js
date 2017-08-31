function onError (error) {
	console.log(`Error: ${error}`);
}

function Editor () {

	var self = this;

	this.buttons = true;
	this.btn_panel = null;
	this.res_box = null;
	
	browser.runtime.getBackgroundPage().then(function(page) {
		
		self.bg = page.bg_manager;

		self.action = unescape(window.location.toString().split("?")[1].split("&")[0]);
		self.id = parseInt(window.location.toString().split("?")[1].split("&")[1]);

		self.bg.getEditorInfo(self.id).then(response => {

			self.url = response.url;
			self.opts = response.opts;		
			self.code = response.code; /* Only when editing */
			self.uuid = response.uuid; /* Only when editing */

			$(document).ready(function() {
				
				self.header = $("#editor-header");
				
				self.editor_bucket = $("#code_container");
				self.dropdown = $("#dropdown-header");
				
				self.header_shown = true;
				self.editor_bucket.css("height", window.innerHeight - 50);
				self.editor_bucket.css("top", "50px");
				$( "#dropdown-header" ).text("v");
				
				if (self.opts.collapsed)
					self.collapseHeader();
				
				self.editor = ace.edit("code_area");
				self.editor.setShowPrintMargin(self.opts.showPrintMargin);
				self.editor.renderer.setShowGutter(self.opts.showGutter);
				self.editor.setTheme("ace/theme/" + self.opts.theme);
				self.editor.session.setMode("ace/mode/javascript");
				self.editor.setValue("/* JS code (jQuery available) ...*/\n");
				self.editor.setOptions({
					fontSize: self.opts.fontSize + "pt"
				});

				/* self.editor.selection.moveCursorToPosition({row: 2, column: 0});
				   self.editor.selection.selectLine(); */
				
				if (self.code)
					self.editor.setValue(self.code, -1);
				
				self.editor.commands.addCommand({
					name: 'execute',
					bindKey: {win: 'Ctrl-R', mac: 'Command-Option-R'},

					exec: function(editor) {
						self.runScript(self.editor.getValue().toString().trim());
					}
				});

				shortcut.add("Ctrl+R", function() {

					self.runScript(self.editor.getValue().toString().trim());
					
				});
				
				self.editor.commands.addCommand({
					name: 'save',
					bindKey: {win: 'Ctrl-S', mac: 'Command-Option-S'},

					exec: function(editor) {
						self.saveScript(self.editor.getValue().toString().trim());
					}
				});

				shortcut.add("Ctrl+S", function () {

					self.saveScript(self.editor.getValue().toString().trim());

				});
				
				self.editor.commands.addCommand({
					name: 'revert',
					bindKey: {win: 'Ctrl-B', mac: 'Command-Option-B'},

					exec: function(editor) {
						self.revertChanges();
					}
				});
				
				shortcut.add("Ctrl+B", function () {
					self.revertChanges();
				});

				shortcut.add("Ctrl+1", function () {
					self.collapseHeader();
				});

				self.editor.getSession().on('change', function() {

					self.hide_buttons();
				});
				
				$("#user_action").text(self.getActionText());
				$("#url_pattern").text(self.url.toString().split("://")[1] || self.url);

				self.proto = self.url.toString().split("://")[0] + "://";
				
				self.btn_panel = $("#btns_panel");
				self.res_box = $("#result-info");

				$( "#save_btn" ).text(self.getSaveText());
				
				$( "#save_btn" ).click(function() {
					
					self.saveScript(self.editor.getValue().toString().trim());
					
				});
				
				self.btn_panel.mouseenter(function() {
					
					self.show_buttons();
					
				});
				
				$( "#test_btn" ).click(function() {
					
					self.runScript(self.editor.getValue().toString().trim());
					
				});
				
				self.dropdown.click(function() {

					self.collapseHeader();
					
				});
				
				$( "#revert_btn" ).click(function() {
					
					self.revertChanges();
					
				});
				
				$("body").click(function() {
					
					self.show_buttons();
					
				});
				
				/* console.log("My title: " + window.document.title);
				   window.document.title = "JS Editor"; */
				
				window.onbeforeunload = function(ev) {
					
					self.bg.editorClose(self.id);
					
				}
				
			});
		});
		
	}, onError);

	this.collapseHeader = function () {

		if (!self.header_shown) {

			$( "#dropdown-header" ).text("v");
			self.editor_bucket.css("top", "50px");
			self.editor_bucket.css("height", window.innerHeight - 50);
	
		} else {
			
			$( "#dropdown-header" ).text("<");
			self.editor_bucket.css("top", 0);
			self.editor_bucket.css("height", "100%");
		}

		//console.log("wdw innerHeigh: " + window.innerHeight + " header: " + self.header.outerHeight());

		self.editor.resize();
		self.header_shown = !self.header_shown;
	};
	
	this.getActionText = function() {
		
		if (self.action == "add")
			return "Adding script for: ";
		else
			return "Editing script for: ";
	};

	this.getSaveText = function() {

		if (self.action == "add")
			return "Store";
		else
			return "Save";
	};
	
	this.runScript = function (literal) {

		this.bg.runInTab(literal, this.id);

	};

	this.saveScript = function (literal) {

		/* console.log(literal); */
		this.bg.saveScriptFor(literal, self.proto + $("#url_pattern").text(), self.uuid);

	};

	this.revertChanges = function () {

		this.bg.revertChanges(this.id);

	};
	
	this.show_buttons = function () {
		
		if (!this.buttons) {
			
			self.btn_panel.find( ".hidden-elem" ).css("display", "none");
			self.btn_panel.find( ".hidden-elem" ).css("visibility", "visible");
			self.btn_panel.find( ".hidden-elem" ).fadeIn();	

			self.dropdown.show();
			
			this.buttons = true;
		}
		
	};

	this.hide_buttons = function () {
		
	
		if (this.buttons) {
			
			self.btn_panel.find( ".hidden-elem" ).fadeOut(400, "swing", function() {
				
				self.btn_panel.find( ".hidden-elem" ).css("visibility", "hidden");
				self.btn_panel.find( ".hidden-elem" ).css("display", "block");

				self.dropdown.hide();
				
				/* self.css("visibility", "hidden"); */
				self.buttons = false;
				
			});
		}
	};

	this.handle_message = function (request) {

		if (request.id == self.id || request.id < 0) {

			switch (request.action) {
				case "result":
					self.show_result (request.message, request.err);
					break;
				case "focus":
					window.focus();
				case "opts":
					self.opts = request.message;
					self.editor.setShowPrintMargin(self.opts.showPrintMargin);
					self.editor.renderer.setShowGutter(self.opts.showGutter);
					self.editor.setOptions({
						fontSize: self.opts.fontSize + "pt"
					});
					
					self.editor.setTheme("ace/theme/" + self.opts.theme);
						
				default:
					break;
			}

		}
	};
	
	this.show_result = function (msg, err) {

		self.res_box.css("visibility", "hidden");
	
		if (err) {

			self.res_box.removeClass("status-success");
			self.res_box.addClass("status-error");
			
		} else {
			
			self.res_box.removeClass("status-error");
			self.res_box.addClass("status-success");
			
		}
		
		self.res_box.text(msg);
		self.res_box.css("visibility", "visible");
		
		/* !!! */
		setTimeout(function() {
			
			self.res_box.fadeOut(800, "swing", function() {
				
				self.res_box.css("visibility", "hidden");
				self.res_box.css("display", "block");
				
			});
			
		}, 5000);
	};
}

var editor_instance = new Editor();
browser.runtime.onMessage.addListener(editor_instance.handle_message);
