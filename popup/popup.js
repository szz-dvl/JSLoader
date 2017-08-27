var editor;
var bg;

function onError (error) {
	console.log(`Error: ${error}`);
}

/* getTabNfo: function (tabInfo) {

   var tab = tabInfo[0];
   
   console.log("TabInfo: ");
   console.log(tab);
   
   browser.tabs.sendMessage(
   
   tab.id,
   {func: }
   
   ).then(response => {
   
   console.log("Message from the content script: " + response.response);
   
   }).catch(self.onError);

   runInTab(self.editor.getValue().toString().trim());
   }, */

function init () {

	browser.runtime.getBackgroundPage().then(function(page) {
		
		bg = page.bg_manager;

	}, onError);
	
	$( "#script_entry" )
		.mouseenter(function() {
			$( this ).find( ".hidden-elem" ).show();
		})
		.mouseleave(function() {
			$( this ).find( ".hidden-elem" ).hide();
		});
	
	$( "#add_script" ).click(function() {
		
		bg.showEditor("Adding script for: ");
		
	});

	$( "#edit_script" ).click(function() {
		
		bg.showEditor("Editing script for: ");
		
	});

	/* $( "#options_entry" ).click(function() {

	   browser.runtime.openOptionsPage();
	   
	   }); */
	
	
	
}

/* $(document).ready(function() { */
	init();
//});
