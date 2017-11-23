angular.module('jslPartials', ['hljsSearch'])

	.directive('scriptName',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   script: "=script",
						   parent: "=parent"
					   },
					   
					   template: '<bdi contenteditable="true"> {{script.name}} </bdi>', //'<a contenteditable="true" href="#{{script.uuid}}">{{script.name}}</a>', id="{{script.uuid}}_name"
					   
					   link: function($scope, element, attr) {
						   
						   // element.css({
						   // 	   position: 'relative',
						   // 	   border: '1px solid red',
						   // 	   backgroundColor: 'lightgrey',
						   // 	   cursor: 'pointer'
						   // });
						   
						   element.on('input', function(ev) {
							   
							   if ($scope.tID)
								   clearTimeout($scope.tID);
							   
							   $scope.tID = setTimeout(
								   () => {
									   
									   $scope.script.name = element.text();
									   $scope.script.persist();
									   
								   }, 1500
							   );
						   });
						   
						   element.keypress(ev => { return ev.which != 13; });
						   
						   element.on('click', ev => {
						   	   
							   if (ev.pageX > element.width()) {
								   
								   //console.log("event: " + ev.pageX + " element: " + element.width());
								   
								   // console.log($scope.parent);
								   
								   // $scope.script.elemFor($scope.parent).toggle();
								   // $scope.$digest();
								   
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

	.directive('scriptList',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   transclude: true,
					   
					   scope: {
						   
						   list: "=list",
						   parent: "=parent",
						   port: "=port",
						   editor: "=editor",
						   shown: "=shown",
						   opts: "=opts",
						   pa: "=pa"
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/script-list.html");
					   },
					   
					   controller: function ($scope, $timeout) { /* $anchorScroll, $location*/
						   
						   $scope.list_uuid = UUID.generate();

						   if ($scope.parent.isGroup())
							   $scope.parent.elems = [];
							   
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

						   $scope.name = $scope.parent.isGroup() ? $scope.parent.name : $scope.parent.parent.name;
						   
						   $scope.removeScript = function(script) {

							   var url = script.getUrl(); /* Solve for groups: URL array. */
							   script.remove();

							   if (url)
								   $scope.pa(url.href);
							   
						   };
						   
						   //console.log("New UUID for " + $scope.parent.parent.name + ": " + $scope.list_uuid);
						   
						   $timeout(() => {
							   
							   $('#' + $scope.list_uuid).find('code').each(
								   (i, block) => {
									   $(block).css("font-size", $scope.opts.fontSize + "pt");
								   }
							   );
						   });
						   
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
						   
						   $scope.backup = new URL('http://' + $scope.url).sort();

						   $scope.trimStart = function (character, string) {
							   var startIndex = 0;
							   
							   while (string[startIndex] === character) {
								   startIndex++;
							   }
							   
							   return string.substr(startIndex);
						   }
						   
						   $scope.isSubDomain = function (orig, modified) {
							   
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
						   
						   $scope.validateSite = function (ev) {

							   $scope.url = $scope.trimStart(" ", $(ev.target).text().trim());

							   if ($scope.ev)
								   $scope.ev.emitEvent("validation_start", [$scope.url]);
							   
							   if($scope.changeID)
								   clearTimeout($scope.changeID);
							   
							   $scope.changeID = setTimeout(
								   ev => {
									   
									   try {
										   
										   var temp = new URL("http://" + $scope.url);
										   
										   if (temp.hostname != $scope.backup.hostname)
											   $scope.url = $scope.backup.name();	
										   else
											   $scope.backup = temp;
							
									   } catch (e if e instanceof TypeError) {

										   console.log("TypeError: " + e.message);
										   
										   if ($scope.url.indexOf("*") != 0) 
											   $scope.url = $scope.backup.name();
										   else {

											   if ($scope.isSubDomain($scope.backup.hostname, $scope.url.split("/")[0])) {
												   
												   $scope.url = $scope.url.split("/")[0] + "/"; /* "All subdomains" shortcut ... */
												   
											   } else
												   $scope.url = $scope.backup.name();
										   }
									   }	  
									   
									   $(ev.target).text($scope.url);

									   if ($scope.ev)
										   $scope.ev.emitEvent("validation_ready", [$scope.url]);
									   
									   $scope.$digest();
									   
								   }, 500, ev);
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

	.directive('globalList',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   //transclude: true,
					   
					   scope: {

						   globals: "=globals",
						   mgr: "=mgr"
						   
					   },
					   
					   templateUrl: function (elem, attr) {

						   return browser.extension.getURL("fg/partials/global-list.html");

					   },
					   
					   controller: function ($scope, $compile) {
						   
						   $scope.shown = true;
						   $scope.state = ">";
						   
						   $scope.getUniqName = function (name) {

							   let actual_name = name;
							   let counter = 1;
							   
							   let exists = $scope.globals.findIndex(
								   gl => {
									   
									   return gl.key == actual_name;
									   
								   }
							   );
							   
							   while (exists >= 0) {

								   actual_name = name + counter.toString();
								   counter ++;
								   
								   exists = $scope.globals.findIndex(
									   gl => {
										   return gl.key == actual_name;
									   }
								   );
							   }
							   
							   return actual_name;
						   };
						   
						   $scope.toggleList = function () {
							   
							   $scope.shown = !$scope.shown;
							   $scope.state = $scope.state == ">" ? "v" : ">";
						   };
						   
						   $scope.addGlobal = function (ev) {
							   
							   ev.preventDefault();
							   $scope.mgr.upsertGlobal({id: UUID.generate().split("-").pop(), key: $scope.getUniqName("key"), value: "value"});
							   
						   };
						   
						   $scope.removeGlobal = function (global) {

							   $scope.mgr.removeGlobal(global);
							   
						   };

						   
					   }
				   }
			   })

	.directive('globalKey',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   global: "=global",
						   uniq: "=uniq",
						   mgr: "=mgr"
					   },
					   
					   //transclude: true,
					   replace: true,
					   template: '<label> <bdi contenteditable="true">{{global.key}}</bdi><span>: </span></label>',
					   
					   link: function($scope, element) {

						   $scope.el = element.children("bdi");
						   
						   $scope.el.on('input', $scope.validateKey);
					   
						   $scope.el.keypress(ev => { return ev.which != 13; });
					   
						   /* !!! Ctrl-C - Ctrl-V */
					   },
				   
					   controller: function ($scope, $compile) {
						   
						   $scope.bk = $scope.global.key;

						   $scope.validateKey = function (ev) {
							   
							   if ($scope.myID)
								   clearTimeout($scope.myID);

							   $scope.myID = setTimeout(
								   ev => {

									   try {
										   
										   (new Function("var " + $scope.el.text().toString().trim() + ";")());
										   
										   $scope.global.key = $scope.uniq($scope.el.text().toString().trim());
										   $scope.bk = $scope.global.key;

										   $scope.mgr.upsertGlobal($scope.global);
										   
									   } catch (e) {
										   
										   console.error(e);  
										   $scope.global.key = $scope.bk;
										   
									   }

									   $scope.el.text($scope.global.key);
									   
								   }, 2500, ev);
						   };
					   }
				   }
			   })

	.directive('globalValidator',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   //transclude: true,
					   
					   scope: {
						   
						   global: "=global",
						   mgr: "=mgr"
						   
					   },

					   replace: true,
					   template: '<label><bdi contenteditable="true"> {{ getRenderVal() }} </bdi></label>',

					   link: function($scope, element) {

						   $scope.el = element.children("bdi");
						   $scope.el.on('input', $scope.validateValue);
						   
						   $scope.el.keypress(ev => { return ev.which != 13; });
						   
						   /* !!! Ctrl-C - Ctrl-V */
					   },
					   
					   controller: function ($scope) {
						   
						   $scope.bk = $scope.global.value;
						   
						   $scope.validateValue = function (ev) {

							   if($scope.myID)
								   clearTimeout($scope.myID);

							   $scope.myID = setTimeout(
								   ev => {

									   try {
										   
										   $scope.global.value = JSON.parse($scope.el.text().toString().trim());
										   $scope.bk = $scope.global.value;

										   $scope.mgr.upsertGlobal($scope.global);
										   
										   console.log("Validated value: " + $scope.global.value);
										   
									   } catch (e) {

										   console.error(e);  
										   $scope.global.value = $scope.bk;
										   
										   console.log("Restaured value: " + $scope.global.value);
										   
										   $scope.el.text($scope.getRenderVal());
										   // $scope.$digest();
									   }
									   
								   }, 2500, ev);
						   };

						   $scope.getRenderVal = function () {
							   
							   return JSON.stringify($scope.global.value);
							   
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
			   });
