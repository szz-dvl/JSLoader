var editor;
var bg;

function onError (error) {
	console.log(`Error: ${error}`);
}

function Menu () {

	var self = this;
	
	browser.runtime.getBackgroundPage().then(function(page) {
		
		self.bg = page.bg_manager;

		$(document).ready(function() {

			$( "#script_entry" )
				.mouseenter(function() {
					$( this ).find( ".hidden-elem" ).show();
				})
				.mouseleave(function() {
					$( this ).find( ".hidden-elem" ).hide();
				});
			
			$( "#add_script" ).click(function() {
				
				self.bg.showEditor("add");
				
			});

			$( "#options_page" ).click(function() {

				self.bg.openOptions();
				
			});
			
		});

	}, onError);
	
}

var menu_mgr = new Menu();
