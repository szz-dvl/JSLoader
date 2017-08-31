function onError (error) {
	console.log(`Error: ${error}`);
}

console.log("Entering options!");

function OP () {

	var self = this;

	console.log("New OP page");
	
	browser.runtime.getBackgroundPage().then(function(page) {

		console.log("Got BG page");
		self.bg = page.bg_manager;
		
		self.bg.getOptPage().then(info => {
			
			self.info = info;
			console.log("Got info: ");
			console.log(self.info);
			
			$(document).ready(function() {

				self.scripts_bucket = $("#scripts-bucket");
				self.editor_margin = $("#editor-margin");
				self.editor_gutter = $("#editor-gutter");
				self.editor_theme = $("#select-th");
				self.editor_header = $("#editor-header");
				self.editor_font = $("#editor-font");
				self.editor_form = $("#editor-form");
				
				if (self.info.opts.editor.showPrinMargin) 
					self.editor_margin.attr("checked", true);
				else
					self.editor_margin.attr("checked", false);

				if (self.info.opts.editor.showGutter) 
					self.editor_gutter.attr("checked", true);
				else
					self.editor_gutter.attr("checked", false);

				if (self.info.opts.editor.collapsed)
					self.editor_header.attr("checked", true);
				else
					self.editor_header.attr("checked", false);

				self.editor_font.val(self.info.opts.editor.fontSize);
				self.editor_theme.val(self.info.opts.editor.theme);
				
				if (self.info.domains) {

					/* for (domain of self.info.domains) {
					   
					   var new_domain = $(self.getDomainSkel(domain.name)).appendTo(self.scripts_bucket).find("ul");

					   if (domain.scripts) {

					   var root_site = $(self.getSiteSkel ("/", "root_site")).appendTo(new_domain).find("ul");
					   
					   for (script of domain.scripts) {

					   root_site.append(self.getScriptSkel(script.uuid, script.code));
					   
					   }
					   }

					   
					   for (site of domain.sites) {

					   var new_site = $(self.getSiteSkel (site.url, site.url.replace(/\//g, "_"))).appendTo(new_domain).find("ul");
					   
					   for (script of site.scripts) {

					   new_site.append(self.getScriptSkel(script.uuid, script.code));
					   
					   }

					   }

					   
					   
					   
					   } */

					var templ = $("#scripts-template").html();

					console.log("Template: ");
					console.log(templ);
					
					var compiled = Handlebars.compile(templ);
					console.log("Compiled: ");
					console.log(compiled);
					
					$("#scripts-bucket").html(compiled(self.info.domains));

					
					
						
					$('pre code').each(function(i, block) {			
						hljs.highlightBlock(block);
					});

					$(".edit-script").click(ev => {
					
						var id = ev.target.id.split("_").pop();
						
						console.log("Editing " + id + " for: " + self.info.name);
						//self.bg.editScriptFor(id, self.info.name);
					
					});
					
					$(".remove-script").click(ev => {
					
						var id = ev.target.id.split("_").pop();
						
						console.log("Removing " + id);
						
						/* self.bg.removeScriptFor(id, self.info.name);
						   $("#" + id).parent().remove(); */
					});

					/* $(".path-name").click( ev => {

					   $(ev.target).parent().trigger("click");

					   }); */
					
					$(".site-list, .domain-scripts").click(ev => {

						/* console.log(ev); */
						console.log(ev.target);

						var elem;
						
						if (ev.target.tagName == "LI")
							elem = $(ev.target);
						else
							elem = $(ev.target).parent();

						console.log(elem);
						
						if (elem.hasClass("info-shown")) {

							elem.children("ul").find(".hidden-elem").hide();
							elem.removeClass("info-shown");
							
						} else {
							
							elem.children("ul").find(".hidden-elem").show();
							elem.addClass("info-shown");
							
						}
						
						/* self.bg.removeScriptFor(id, self.info.name);
						   $("#" + id).parent().remove(); */
					});

				}
				
				$("#editor-margin").click( ev => {
						
					var elem = $(ev.target);
					
					if (elem.attr("checked"))
						elem.attr("checked", false);
					else
						elem.attr("checked", true);
					
				});
				
				$("#editor-gutter").click( ev => {
						
					var elem = $(ev.target);
					
					if (elem.attr("checked"))
						elem.attr("checked", false);
					else
						elem.attr("checked", true);
					
				});

				$("#editor-header").click( ev => {
						
					var elem = $(ev.target);
					
					if (elem.attr("checked"))
						elem.attr("checked", false);
					else
						elem.attr("checked", true);
					
				});

				self.editor_form.submit(ev => {

					ev.preventDefault();
					var opts = {
						editor: {
							showPrintMargin: self.editor_margin.attr("checked") ? true : false,
							showGutter: self.editor_gutter.attr("checked") ? true : false,
							collapsed: self.editor_header.attr("checked") ? true : false,
							fontSize: self.editor_font.val(),
							theme: self.editor_theme.val()
						}
					}
					
					self.bg.storeOptions(opts);
					
					console.log("Submitting editor settings.");
					
				});

			});
			
		});
		
	}, onError);

	this.getDomainSkel = function (name) {

		return '<h4>' + name + '</h4><br>'
			+ '<div id="' + name + '_bucket" class="panel-section">' 
			+ '<ul id="' + name + '_sites" class="panel-section-list"> </ul>'
			+ '</div>';
	};

	this.getSiteSkel = function (path, id) {

		//var id = path.replace("/", "_");
		
		return '<li id="' + id + '" class="panel-list-item site-list">'
		/* + '<div class="item-wrapper">'  */
			+ '<bdi class="path-name">' + path + '</bdi><br>'
			+ '<ul id="' + id + '_scripts" class="panel-section-list"> </ul>'
		/* + '</div>' */
			+ '</li>';


	};
	
	this.getScriptSkel = function (id, code) {

		//panel-list-item
		return '<li class="script-bucket hidden-elem">'
			+ '<bdi class="code-uuid">' + id.split("-").pop() + '</bdi>'
			+ '<div id="' + id + '" class="code-bucket hidden-script">'
			+ '<pre><code class="lang-js">' + code
			+ '</code></pre>'
			+ '<div class="btn-panel">'
			+ '<button id="edit-btn_' + id + '" class="browser-style mright edit-script"> Edit </button>'
			+ '<button id="remove-btn_' + id + '" class="browser-style mright remove-script"> Remove </button>'
			+ '<div/>'
			+ '</div><br>'
			+ '</li>';
	};

	this.showElems = function (selector) {

		/* selector.find( ".hidden-elem" ).css("display", "none");
		   selector.find( ".hidden-elem" ).css("visibility", "visible"); */
		selector.find( ".hidden-elem" ).fadeIn();
		/* selector.find( ".hidden-elem" ).css("display", "block"); */
		//selector.find( ".hidden-elem" ).css("visibility", "visible");
	};

	this.hideElems = function (selector) {

		selector.find( ".hidden-elem" ).fadeOut();
		//selector.find( ".hidden-elem" ).css("visibility", "hidden");
		
		/* selector.find( ".hidden-elem" ).fadeOut(400, "swing", function() {
		   
		   selector.find( ".hidden-elem" ).css("visibility", "hidden");
		   selector.find( ".hidden-elem" ).css("display", "block");
		   }); */
	}

	//______________________________________________________________//
	
	this.handle_message = function (selector) {

		selector.find( ".hidden-elem" ).fadeOut();
		//selector.find( ".hidden-elem" ).css("visibility", "hidden");
		
		/* selector.find( ".hidden-elem" ).fadeOut(400, "swing", function() {
		   
		   selector.find( ".hidden-elem" ).css("visibility", "hidden");
		   selector.find( ".hidden-elem" ).css("display", "block");
		   }); */
	}

}

var options_page = new OP();
browser.runtime.onMessage.addListener(options_page.handle_message);
