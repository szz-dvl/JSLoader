function onError (error) {
	console.log(`Error: ${error}`);
}

function PA () {

	var self = this;

	this.site_shown = false;
	this.domain_shown = false;
	
	browser.runtime.getBackgroundPage().then(function(page) {
		
		self.bg = page.bg_manager;
		
		self.bg.getMyScripts().then(info => {
			
			self.info = info;

			/* console.log("My Scripts!");
			   console.log(info); */

			$(document).ready(function() {

				self.domain_bucket = $("#domain_scripts");
				self.site_bucket = $("#site_scripts");

				if (self.info.scripts.length) {

					$("#domain_name").text(self.info.name);
					
					for (script of self.info.scripts) {

						self.domain_bucket.append(self.getScriptSkel(script.uuid, script.code));
					}
					
					$("#domain_cont").click(ev => {

						if (!self.domain_shown)
							self.showElems(self.domain_bucket);
						else
							self.hideElems(self.domain_bucket);

						self.domain_shown = !self.domain_shown;
						
					});

					$("#domain_cont").removeClass("hidden-elem");
				}
				
				if (self.info.site) {
					
					$("#site_name").text(self.info.name + self.info.site.url);
					
					for (script of self.info.site.scripts) {

						self.site_bucket.append(self.getScriptSkel(script.uuid, script.code));
					}
					
					$("#site_cont").click(ev => {
						
						if (!self.site_shown)
							self.showElems(self.site_bucket);
						else
							self.hideElems(self.site_bucket);
						
						self.site_shown = !self.site_shown;
					});

					$("#site_cont").removeClass("hidden-elem");
				}
				
				$('pre code').each(function(i, block) {			
					hljs.highlightBlock(block);
				});

				$(".code-uuid").click(ev => {

					var self = $(ev.target).parent();

					console.log("Script click: ");
					console.log(self);
					
					if (self.hasClass("script-shown")) {

						self.find(".hidden-script").fadeOut();
						self.removeClass("script-shown");
						
					} else {

						self.find(".hidden-script").fadeIn();
						self.addClass("script-shown");
						
					}
					
				});
				
				$(".edit-script").click(ev => {
					
					var id = ev.target.id.split("_").pop();

					/* console.log("Editing " + id + " for: " + self.info.name); */
					self.bg.editScriptFor(id, self.info.name);
					
				});
				
				$(".remove-script").click(ev => {
					
					var id = ev.target.id.split("_").pop();
					
					/* console.log("Removing " + id); */
					
					self.bg.removeScriptFor(id, self.info.name);
					$("#" + id).parent().remove();
				});
				
			});
			
		});
		
	}, onError);

	this.getScriptSkel = function (id, code) {

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
			+ '</li>'
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

}

var page_action = new PA();
