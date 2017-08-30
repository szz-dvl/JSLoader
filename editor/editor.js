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
			self.code = response.code;
			self.uuid = response.uuid; /* Only when editing */

			$(document).ready(function() {

				/* Options Pge !!! */
				self.editor = ace.edit("code_area");
				self.editor.setShowPrintMargin(false);
				self.editor.renderer.setShowGutter(false);
				self.editor.setTheme("ace/theme/twilight");
				self.editor.session.setMode("ace/mode/javascript");

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
				
				$( "#revert_btn" ).click(function() {
					
					self.revertChanges();
					
				});
				
				$("#select-th").on('change', function() {
					
					self.editor.setTheme("ace/theme/" + $(this).val());
					
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

			this.buttons = true;
		}
		
	};

	this.hide_buttons = function () {

		if (this.buttons) {
			
			self.btn_panel.find( ".hidden-elem" ).fadeOut(400, "swing", function() {
				
				self.btn_panel.find( ".hidden-elem" ).css("visibility", "hidden");
				self.btn_panel.find( ".hidden-elem" ).css("display", "block");
				/* self.css("visibility", "hidden"); */
				self.buttons = false;
				
			});
		}
	};

	this.handle_message = function (request) {

		if (request.id == self.id) {

			switch (request.action) {
				case "result":
					self.show_result (request.message, request.err);
					break;
				case "focus":
					window.focus();
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
