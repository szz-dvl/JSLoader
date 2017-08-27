var bg;
var editor;
var action;
var buttons = true;

function onError (error) {
	console.log(`Error: ${error}`);
}

browser.runtime.getBackgroundPage().then(function(page) {
		
	bg = page;

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

$(document).ready(function() {
	
	editor = ace.edit("code_area");
	editor.setShowPrintMargin(false);
	editor.renderer.setShowGutter(false);
	editor.setTheme("ace/theme/twilight");
	editor.session.setMode("ace/mode/javascript");
	
	
	$( "#save_btn" ).click(function() {
		
		console.log(editor.getValue());
		
	});

	$( "#btns_panel" ).mouseenter(function() {

		console.log("mouse enter!!");
		btnShow($( "#btns_panel" ));
		
	});

	editor.getSession().on('change', function() {
		btnHide($("#btns_panel"));
	});
	
	$( "#test_btn" ).click(function() {
				
		bg.runInTab(editor.getValue().toString().trim());
		
	});
	
	bg.getCurrTab().then(function(tabInfo) {
		
		console.log("URL_PATTERN: " + tabInfo.url);
		
		$("#url_pattern").text(tabInfo.url.toString().split("://")[1] || tabInfo.url);
		
	}, onError);

	
	action = unescape(window.location.toString().split("?")[1]);
	$("#user_action").text(action);

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
});
