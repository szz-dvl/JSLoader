var bg;
var editor;
var action;
var buttons = true;
var my_tab;
var my_id;

function onError (error) {
	console.log(`Error: ${error}`);
}

browser.runtime.getBackgroundPage().then(function(page) {
		
	bg = page.bg_manager;

}, onError);

browser.runtime.onMessage.addListener(request => {

	$("#result-info").css("visibility", "hidden");
	
	if (request.err) {

		$("#result-info").removeClass("status-success");
		$("#result-info").addClass("status-error");

	} else {

		$("#result-info").removeClass("status-error");
		$("#result-info").addClass("status-success");
		
	}

	$("#result-info").text(request.message);
	$("#result-info").css("visibility", "visible");

	/* !!! */
	setTimeout(function() {
		
		$("#result-info").fadeOut(400, "swing", function() {
			
			$("#result-info").css("visibility", "hidden");
			$("#result-info").css("display", "block");
			
		});
		
	}, 3000);
		
});

function btnShow (self) {

	if (!buttons) {

		/* self.css("visibility", "visible"); */
		self.find( ".hidden-elem" ).css("display", "none");
		self.find( ".hidden-elem" ).css("visibility", "visible");
		self.find( ".hidden-elem" ).fadeIn();//css("visibility", "visible");
		buttons = true;
	}
}

function btnHide (self) {

	if (buttons) {
		
		self.find( ".hidden-elem" ).fadeOut(400, "swing", function() {

			self.find( ".hidden-elem" ).css("visibility", "hidden");
			self.find( ".hidden-elem" ).css("display", "block");
			/* self.css("visibility", "hidden"); */
			buttons = false;
			
		});
		
	}
}

function saveScript (code) {


	console.log(code);

}

function runScript (code) {

	bg.runInTab(code, my_tab);

}

function revertChanges() {

	bg.revertChanges(my_tab);

}

$(document).ready(function() {
	
	editor = ace.edit("code_area");
	editor.setShowPrintMargin(false);
	editor.renderer.setShowGutter(false);
	editor.setTheme("ace/theme/twilight");
	editor.session.setMode("ace/mode/javascript");

	editor.commands.addCommand({
		name: 'execute',
		bindKey: {win: 'Ctrl-R', mac: 'Command-Option-R'},

		exec: function(editor) {
			runScript(editor.getValue().toString().trim());
			//ace.config.loadModule("ace/ext/searchbox", function(e) {e.Search(editor, true)});
		}/* ,
			readOnly: true */
	});

	shortcut.add("Ctrl+R", function() {

		runScript(editor.getValue().toString().trim());
		
	});
	
	editor.commands.addCommand({
		name: 'save',
		bindKey: {win: 'Ctrl-S', mac: 'Command-Option-S'},

		exec: function(editor) {
			saveScript(editor.getValue().toString().trim());
			//ace.config.loadModule("ace/ext/searchbox", function(e) {e.Search(editor, true)});
		}/* ,
			readOnly: true */
	});

	shortcut.add("Ctrl+S", function () {

		saveScript(editor.getValue().toString().trim());

	});
	
	editor.commands.addCommand({
		name: 'revert',
		bindKey: {win: 'Ctrl-B', mac: 'Command-Option-B'},

		exec: function(editor) {
			revertChanges();
			//ace.config.loadModule("ace/ext/searchbox", function(e) {e.Search(editor, true)});
		}/* ,
			readOnly: true */
	});
	
	shortcut.add("Ctrl+B", function () {

		revertChanges();

	});
	
	$( "#save_btn" ).click(function() {
		
		saveScript(editor.getValue());
		
	});

	$( "#btns_panel" ).mouseenter(function() {
		
		btnShow($( "#btns_panel" ));
		
	});

	editor.getSession().on('change', function() {
		btnHide($("#btns_panel"));
	});
	
	$( "#test_btn" ).click(function() {
				
		runScript(editor.getValue().toString().trim());
		
	});

	$( "#revert_btn" ).click(function() {
				
		revertChanges();
		
	});
	
	bg.getCurrTab().then(function(tabInfo) {
		
		console.log("URL_PATTERN: " + tabInfo.url);
		
		$("#url_pattern").text(tabInfo.url.toString().split("://")[1] || tabInfo.url);
		
	}, onError);

	
	action = unescape(window.location.toString().split("?")[1].split("&")[0]);
	$("#user_action").text(action);

	my_tab = window.location.toString().split("?")[1].split("&")[1];
	my_id = window.location.toString().split("?")[1].split("&")[2];
	
	$("#select-th").on('change', function() {
		
		editor.setTheme("ace/theme/" + $(this).val());

	});

	$("body").click(function() {

		btnShow($("#btns_panel"));

		/* 
		   if ($("#btns_panel").css("visibility") == "hidden") 
		   btnShow($("#btns_panel"));
		   else 
		   btnHide($("#btns_panel")); */
		
	});

	console.log("My title: " + window.document.title);
	window.document.title = "JS Editor";

	window.onbeforeunload = function(ev) {

		bg.editorClose(my_id);

	}

});
