angular.module('jslPartials', ['hljsSearch'])
.directive('scriptName',
		   () => {
			   
			   return {

				   restrict: 'E',

				   scope: {
					   script: "=script"
				   },

				   template: '<bdi id="{{script.uuid}}_name" class="script-name" contenteditable="true"> {{script.name}} </bdi>',
				   
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
						   opts: "=opts"
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
						   
						   console.log("New UUID for " + $scope.parent.parent.name + ": " + $scope.list_uuid);
						   
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

										   if ($scope.parent.parent.name == args.message) {

											   console.log("List update for: " + $scope.parent.parent.name + $scope.parent.url);
											   
											   if (!$scope.list.length)
										   		   $scope.$destroy();
											   else {
												   
										   		   for(script of $scope.list)	   
										   			   script.insertElem($scope.list_uuid, $scope.shown);
										   		   
										   		   $scope.$digest();
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
