angular.module('jslPartials', ['hljsSearch', 'jsonFormatter', 'autocomplete'])

	.directive('noInfo',
			   () => {
				   
				   return {
					   restrict: 'E',
					   replace: true,
					   scope: {
						   text: "=?"
					   },
					   template : '<div class="noInfoContainer"> {{ text || "No Data" }} </div>'
				   }
			   })

	.directive('scriptName',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   script: "=script",
						   parent: "=parent"
					   },
					   
					   template: '<bdi contenteditable="true"> {{script.name}} </bdi>',
					   
					   link: function($scope, element, attr) {
						   
						   element.on('input', function(ev) {
							   
							   if ($scope.tID)
								   clearTimeout($scope.tID);
							   
							   $scope.tID = setTimeout(
								   ev => {

									   let name = $(ev.target).text().trim();
									   
									   if (name.match(/^[a-z0-9]+$/i)) {

										   $scope.script.name = name;
										   $scope.script.persist();
										   
									   } else 
										   $(ev.target).text($scope.script.name);
									   
								   }, 1000, ev
							   );
						   });
						   
						   element.keypress(ev => { return ev.which != 13; });
						   
						   element.on('click', ev => {
						   	   
							   if (ev.pageX > element.width()) {
								    
								   if (element.hasClass("shown"))
									   element.removeClass("shown");
								   else
									   element.addClass("shown");
								   
							   } else 
								   ev.stopImmediatePropagation();							      
						   });
					   }
				   }
			   })

	.directive('scriptIndex',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   scope: {
						   
						   list: "=list",
						   parent: "=?parent",
						   editor: "=editor",
						   shown: "=shown",
						   opts: "=opts",
						   pa: "=pa",
						   uuid: "=?uuid",
						   external: "=?external"
					   },

					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/script-index.html");
					   },
					   
					   controller: function ($scope, $timeout) {

						   if (!$scope.parent)
							   $scope.parent = $scope.list[0].parent;
						   
						   if ($scope.parent.isGroup())
							   $scope.parent.elems = [];
						   
						   $scope.list_uuid = $scope.uuid || UUID.generate();
						   
						   $scope.parent.insertElem($scope.list_uuid, $scope.shown);
						   
						   $scope.list = $scope.list.map(
						   	   script => {
								   
								   /* Either this or remove script from shown list on script removal ... */
								   var elem = script.insertElem($scope.list_uuid, $scope.shown);
								   
								   if (elem.shown)
									   $scope.parent.elemFor($scope.list_uuid).show();
								   
								   return script;
						   	   }
						   );
						   
						   $scope.removeScript = function(script) {

							   var url = script.getUrl(); 
							   script.remove();
							   
							   if (url)
								   $scope.pa(url.href); /* Solve for groups: URL array. */
							   
						   };
						   
						   //console.log("New UUID for " + $scope.parent.parent.name + ": " + $scope.list_uuid);
						   
						   $timeout(() => {
							   
							   $('#' + $scope.list_uuid).find('code').each(
								   (i, block) => {
									   $(block).css("font-size", $scope.opts.fontSize + "pt");
								   }
							   );
						   });
					   } 
				   }
			   })

	.directive('httpRequest',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   replace: true,
					   
					   scope: {
						   req: '=',
						   urlclick: '=',
						   toggle: '=',
						   remove: '=',
						   proxys: '='
					   },

					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/http-request.html");
					   },
					   
					   controller : function ($scope) {

						   $scope.proxying = false;
						   $scope.currentProxy = $scope.req.currentProxy;
						   $scope.open_lvl = 1;
						   $scope.config = false;
						   
						   $scope.showConfig = function () {

							   $scope.config = true;
							   
						   };
						   
						   $scope.showRuleAdder = function (req) {
							   
							   $scope.open_lvl = 2;
							   $scope.req.adding = true;
							   
						   };
						   
						   $scope.persistRule = function (action, data, headers) {
							   
							   $scope.open_lvl = 1;
							   $scope.req.listener.addFilter($scope.req.request,
															 {
																 action: action,
																 data: data,
																 headers: headers 
															 });
							   $scope.req.adding = false;
							   
							   if (!$scope.proxying)
								   $scope.config = false;
						   };

						   $scope.dismissRule = function () {

							   $scope.open_lvl = 1;
							   $scope.req.adding = false;
							   
							   if (!$scope.proxying)
								   $scope.config = false;
						   };

						   $scope.proxyChange = function () {
							   
							   $scope.req.listener.addProxyForHost($scope.currentProxy, $scope.req.request.url);
							   $scope.proxying = false;

							   if (!$scope.req.adding)
								   $scope.config = false;
						   };

						   $scope.showProxyOps = function () {
							   
							   $scope.proxying = true;
						   };

						   $scope.dismissProxy = function () {
							   
							   $scope.proxying = false;

							   if (!$scope.req.adding)
								   $scope.config = false;
						   };
					   }
				   }
			   })

	.directive('ruleAdder',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   req: '=',
						   dismiss: '=',
						   add: '=',
					   },
					   
					   template: '<rule-chooser policies="policies" add="persist" dismiss="dismiss"></rule-chooser>',
					   
					   controller: function ($scope) {
						   
						   $scope.policies = ['block', 'redirect'];
						   $scope.headers = [];
						   
						   if ($scope.req)
							   $scope.policies.push('headers only');
						   
						   $scope.persist = function (policy, data) {

							   $scope.add(
								   policy,
								   data,
								   $scope.headers
							   )
						   };
						   
						   if ($scope.req) {
							   
							   $scope.req.events.on('header-change', (text, name) => {
								   
								   $scope.headers.push({ name: name, value: text });
								   
							   });
						   }
					   },
				   }
			   })

	.directive('ruleChooser',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   policies: '=',
						   dismiss: '=',
						   add: '=',
						   url: '=?',
						   policy: '=?',
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/rule-chooser.html");
					   },

					   controller: function ($scope) {

						   $scope.policy = $scope.policy || 'block';
						   $scope.backup = '';
						   $scope.validated = $scope.url ? true : false;
						   $scope.redirectUrl = $scope.url || '';
						   
						   $scope.urlChange = function () {
							   
							   $scope.validated = false;
							   
							   if($scope.ID)
								   clearTimeout($scope.ID);
							   
							   $scope.ID = setTimeout(
								   () => {
									   
									   if ($scope.redirectUrl != "") { 
										   
										   try {
											   
											   let url = new URL($scope.redirectUrl.startsWith("http") ? $scope.redirectUrl : "http://" + $scope.redirectUrl);
											   
											   $scope.redirectUrl = url.href;
											   $scope.backup = $scope.redirectUrl;
											   
										   } catch (e if e instanceof TypeError) {

											   console.error(e);
											   $scope.redirectUrl = $scope.backup;
										   }
										   
										   $scope.validated = true;
										   $scope.$digest();
										   
									   } else
										   $scope.validated = false;
									   
								   }, 800
							   );

						   };

						   $scope.persist = function () {
							   
							   $scope.add(
								   $scope.policy.split(' ')[0],
								   ($scope.policy == 'redirect' ? $scope.redirectUrl : null),
							   );
						   };
					   }, 
				   }
			   })

	.directive('headerName',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   name: '='
					   },
					   
					   template: '<array-validator style="display: inline-block;" text="name" valids="array"></array-validator><span style="display: inline-block;">: </span>',

					   controller: function ($scope) {

						   $scope.array = [
							   "Accept",
							   "Accept-Charset",
							   "Accept-Datetime",
							   "Accept-Encoding",
							   "Accept-Language",
							   "Access-Control-Request-Method",
							   "Access-Control-Request-Headers",
							   "Authorization",
							   "Cache-Control",
							   "Connection",
							   "User-Agent" /* ... */
						   ];
					   }
				   }
			   })

	.directive('attrKey',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   name: '='
					   },
					   
					   template: '<array-validator style="display: inline-block;" text="name" valids="array"></array-validator><span style="display: inline-block;">: </span>',

					   controller: function ($scope) {

						   $scope.array = [
							   "frameId",
							   "parentFrameId",
							   "method",
							   "type",
							   "url",
							   "originUrl",
							   "documentUrl"
						   ];
					   }
				   }
			   })

	.directive('arrayValidator',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   text: '=',
						   valids: '='
					   },

					   template: '<autocomplete ng-model="text" data="valids" on-type="updateItems"></autocomplete>',
					   
					   controller: function ($scope) {
						   
						   $scope.disabled = false;
						   
						   $scope.updateItems = function (query) {
							   
							   return $scope.valids.filter(
								   item => {
									   
									   return item.startsWith(query);

								   }
							   );
						   }
					   }
				   }
			   })

	.directive('scriptList',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   transclude: true,
					   
					   scope: {
						   
						   list: "=list",
						   parent: "=?parent",
						   port: "=port",
						   editor: "=editor",
						   shown: "=shown",
						   opts: "=opts",
						   pa: "=pa"
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/script-list.html");
					   },
					   
					   controller: function ($scope, $timeout) {

						   if (!$scope.parent)
							   $scope.parent = $scope.list[0].parent;
						   
						   $scope.list_uuid = UUID.generate();
						   //$scope.name = $scope.parent.isGroup() ? $scope.parent.name : $scope.parent.parent.name;
						   $scope.name = $scope.parent.url || ( ( $scope.parent.name.slice(-1) == "/" && $scope.parent.name.length ) > 1 ? $scope.parent.name.slice(0, -1) : $scope.parent.name );
						   
						   $scope.addScript = function() {
							   
							   $scope.editor($scope.parent.factory());
							   
						   };
						   
						   if ($scope.port) {
							   
							   $scope.port.onMessage.addListener(
								   args => {
									   
									   switch (args.action) {
									   case "list-update":
										   
										   if ($scope.name == args.message) {
											   
											   //console.log("List update for: " + $scope.parent.parent.name + $scope.parent.url);
											   
											   if (!$scope.list.length)
										   		   $scope.$destroy();
											   else {
												   
										   		   for(script of $scope.list)   
													   script.insertElem($scope.list_uuid, $scope.shown);
												   
										   		   $scope.$digest();

												   $('#' + $scope.list_uuid).find('code').each(
													   (i, block) => {
														   $(block).css("font-size", $scope.opts.fontSize + "pt");
													   }
												   );
											   }
										   }
										   
										   break;
									   }
								   }
							   )
						   }
					   }   
				   }
			   })

	.directive('groupValidator',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
 						   group: "=group",
						   ev: "=ev"
						   
					   },

					   transclude: true,

					   template: '<bdi style="display: inline-flex; flex-shrink: 0;" contenteditable="true"> {{group}} </bdi>',
					   
					   link: function($scope, element) {
					   
						   
						   element.on('input', $scope.validateGroup);
						   
						   element.keypress(ev => { return ev.which != 13; });
						   element.click(ev => { return false; });
						   
						   /* !!! Ctrl-C - Ctrl-V */
					   },

					   controller: function ($scope) {

						   $scope.backup = $scope.group;
						   
						   $scope.validateGroup = function (ev) {
	   
							   $scope.group = $(ev.target).text().trim();
							   
							   if ($scope.ev)
								   $scope.ev.emitEvent("validation_start", [$scope.group]);
							   
							   if($scope.changeID)
								   clearTimeout($scope.changeID);
							   
							   $scope.changeID = setTimeout(
								   ev => {
									   
									   if ($scope.group.match(/^[a-z0-9]+$/i))
										   $scope.backup = $scope.group;
									   else
										   $scope.group = $scope.backup;
									   
									   $(ev.target).text($scope.group);

									   if ($scope.ev)
										   $scope.ev.emitEvent("validation_ready", [$scope.group]);
									   
									   $scope.$digest();
									   
								   }, 800, ev);
						   }
					   }
				   }
			   })

	.directive('siteValidator',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
 						   url: "=url",
						   ev: "=ev"
						   
					   },

					   transclude: true,

					   template: '<bdi style="display: inline-flex; flex-shrink: 0;" contenteditable="true"> {{url}} </bdi>',
					   
					   link: function($scope, element) {
					   
						   // element.css({
						   // 	   "min-width": ((window.innerWidth/2) - 30) + "px"
						   // });
						   
						   element.on('input', $scope.validateSite);
						   
						   element.keypress(ev => { return ev.which != 13; });
						   element.click(ev => { return false; });
						   
						   /* !!! Ctrl-C - Ctrl-V */
					   },
					   
					   controller: function ($scope) {

						   try {

							   $scope.backup = new URL('http://' + $scope.url).sort();

						   } catch (e) {

							   $scope.backup = $scope.url;
						   }
						   
						   $scope.isSubDomain = function (orig, modified) {
							   
							   if (orig.endsWith("/"))
								   orig = orig.slice(0, -1);

							   if (modified.endsWith("/"))
								   modified = modified.slice(0, -1);
							   
							   var mod_arr = modified.split(".");
							   var orig_arr = orig.split(".");
							   
							   var cursor_mod = mod_arr.length - 1;
							   var cursor_orig = orig_arr.length - 1;
							   
							   while ( (mod_arr[cursor_mod] != "*") &&
									   (mod_arr[cursor_mod] == orig_arr[cursor_orig])
									 ) {

								   cursor_mod --;
								   cursor_orig --;	
							   }
							   
							   return mod_arr[cursor_mod] == "*";
						   };

						   $scope.isSubSet = function (orig, modified) {
							   
							   if (orig.endsWith("/"))
								   orig = orig.slice(0, -1);

							   if (modified.endsWith("/"))
								   modified = modified.slice(0, -1);
							   
							   var mod_arr = modified.split(".");
							   var orig_arr = orig.split(".");
							   
							   var cursor_mod = mod_arr.length - 1;
							   var cursor_orig = orig_arr.length - 1;
							   
							   while ((mod_arr[cursor_mod] == orig_arr[cursor_orig])) {

								   cursor_mod --;
								   cursor_orig --;	
							   }
							   
							   return mod_arr[cursor_mod] == "*" || orig_arr[cursor_orig] == "*";
						   };
						   
						   $scope.validateSite = function (ev) {
							   
							   $scope.url = $(ev.target).text().trim();
							   
							   if ($scope.ev)
								   $scope.ev.emitEvent("validation_start", [$scope.url]);
							   
							   if($scope.changeID)
								   clearTimeout($scope.changeID);
							   
							   $scope.changeID = setTimeout(
								   ev => {
									   
									   try {
										   
										   var temp = new URL("http://" + $scope.url);

										   try {
											   
											   if (temp.hostname != $scope.backup.hostname)
												   $scope.url = $scope.backup.name();	
											   else
												   $scope.backup = temp;

										   } catch (err) {
											   
											   /* String backup */
											   
											   if ($scope.isSubDomain(temp.hostname, $scope.backup))
												   $scope.backup = temp; 
											   else
												   $scope.url = $scope.backup;
											   
										   }
										   
									   } catch (e if e instanceof TypeError) {
										   
										   if (!$scope.url.startsWith("*.")) 
											   $scope.url = $scope.backup.name();
										   else {

											   if ($scope.isSubDomain($scope.backup.hostname || $scope.backup, $scope.url.split("/")[0])) {
												   
												   $scope.url = $scope.url.split("/")[0]; /* "All subdomains" shortcut ... */
												   $scope.backup = $scope.url;
												   
											   } else {

												   if ($scope.isSubSet($scope.backup.hostname || $scope.backup, $scope.url.split("/")[0])) 
													   $scope.backup = $scope.url;
												   else 
													   $scope.url = typeof($scope.backup) == "string" ? $scope.backup : $scope.backup.name();
											   }
										   }
									   }	  

									   if ($scope.url.slice(-1) == "/")
										   $scope.url = $scope.url.slice(0, -1);
										   
									   $(ev.target).text($scope.url);

									   if ($scope.ev)
										   $scope.ev.emitEvent("validation_ready", [$scope.url]);
									   
									   $scope.$digest();
									   
								   }, 800, ev);
						   };
						   
					   }
				   }
			   })

	.directive('siteIndex',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   transclude: true,
					   
					   scope: {
						   
						   list: "=list",
						   parent: "=parent",
						   mgr: "=mgr"
						   
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/site-index.html");
					   },
					   
					   controller: function ($scope) {

						   $scope.shown = true;
						   $scope.state = ">";
						   
						   $scope.toggleList = function () {
							   
							   $scope.shown = !$scope.shown;
							   $scope.state = $scope.state == ">" ? "v" : ">";
						   };
						   
						   $scope.removeSite = function (sname) {
							   
							   $scope.mgr.removeSiteFrom($scope.parent.name, sname);
							   
						   };
						   
					   }
				   }
			   })

	.directive('groupList',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   scripts: "=scripts",
						   parent: "=parent",
						   port: "=port",
						   editor: "=editor",
						   shown: "=shown",
						   opts: "=opts",
						   pa: "=pa",
						   sites: "=sites",
						   mgr: "=mgr"
						   
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/group-list.html");
					   },
				   }
			   })

	.directive('aceInline',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   feeding: "=feeding",
						   height: "=h",
						   width: "=w"
						   
					   },
					   
					   templateUrl: function (elem, attr) {

						   return browser.extension.getURL("fg/partials/ace-frame.html");

					   },
					   
					   controller: function ($scope) {
						   
						   $scope.src = browser.extension.getURL("fg/partials/ace-inline.html") + "?feeding=" + $scope.feeding;

					   }
					   
				   }
			   })

	.directive('optionMenu',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   list: "=list",
						   key: "=key",
						   title: '=title',
						   port: "=port"
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/option-menu.html");
					   },
					   
					   controller: function ($scope) {

						   if ($scope.port) {
							   
							   $scope.port.onMessage.addListener(

								   (args) => {
								   
									   switch (args.action) {
									   
									   case "import-opts":
										   
										   for (opt of $scope.list) {
											   
											   opt.setVal(args.message[$scope.key][opt.id]);
											   
											   for (subopt of opt.sub_opts) 
												   subopt.setVal(args.message[$scope.key][subopt.id]); 
										   }
										   
										   $scope.$digest();
									   
										   break;
									   }
								   }
							   )
						   }
					   }
				   }
			   });
