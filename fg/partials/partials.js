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
							   
							   console.log("event: " + ev.pageX + " element: " + element.width());
							   
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

	.directive('siteIndex',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   list: "=list",
						   parent: "=parent",
						   mgr: "=mgr"
						   
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/site-index.html");
					   },
					   
					   controller: function ($scope, $timeout) { /* $anchorScroll, $location*/

						   $scope.shown = true;
						   $scope.state = ">";
						   
						   $scope.toggleList = function () {

							   $scope.shown = !$scope.shown;
							   $scope.state = $scope.state == ">" ? "v" : ">";
							   
							   //$scope.$digest();
						   };

						   $scope.removeSite = function (sname) {

							   $scope.mgr.removeSiteFrom($scope.parent.name, sname);
							   
						   };
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
