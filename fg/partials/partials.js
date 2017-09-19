angular.module('jslPartials', ['hljsSearch'])
	.directive('scriptList',
			   () => {

				   return {

					   restrict: 'E',

					   scope: {
						   
						   list: "=list",
						   parent: "=parent",
						   editor: "=editor",
						   port: "=port",
						   shown: "=shown",
						   opts: "=opts"
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/script-list.html");
					   },
					   
					   controller: function ($scope, $timeout, $anchorScroll, $location) {
						   
						   $scope.list_uuid = UUID.generate();
						   $scope.list_shown = false;
						   
						   console.log("New UUID for " + $scope.parent.parent.name + ": " + $scope.list_uuid);
						   
						   $scope.__toggleParent =  function (elem) {
							   
							   if (elem.hasClass("info-shown")) {
								   
								   elem.children(".script-list").find(".hidden-elem").hide();
								   elem.removeClass("info-shown");
								   $scope.list_shown = false;
								   
							   } else {
								   
								   elem.children(".script-list").find(".hidden-elem").show();
								   elem.addClass("info-shown");
								   $scope.list_shown = true;
							   }
						   };

						   $scope.__toggleScript =  function (elem, cb) {
							   
							   var id = elem.prevObject[0].id;
							   
							   if (elem.hasClass("script-shown")) {

								   elem.find(".hidden-script").hide();
								   elem.removeClass("script-shown");
								   $scope.shown.remove($scope.shown.indexOf(id));
								   
							   } else {
								   
								   elem.find(".hidden-script").show();
								   elem.addClass("script-shown");
								   
								   if (!$scope.shown.includes(id))
									   $scope.shown.push(id);
							   }
						   };
						   
						   $scope.clickParent = function (ev) {
							   
							   var elem = $(ev.currentTarget).parent();
							   
							   $scope.__toggleParent(elem);
						   };
						   
						   $scope.clickScript = function (ev) {
							   
							   var elem = $(ev.currentTarget).parent();
							   
							   $scope.__toggleScript(elem);
						   };
						   
						   $scope.removeScript = function (ev) {
							   
							   var id = ev.target.id.split("_").pop();
							   
							   $scope.list.filter(
								   script => {
									   
									   return script.uuid == id;

								   }
							   )[0].remove();

							   //console.log("New List Length: " + $scope.list.length + "(" + $scope.last_length + ")");
							   
							   if (!$scope.list.length) 
								   $scope.$destroy();
							   
							   $scope.shown.remove($scope.shown.indexOf(id));
							   
						   };
						   
						   $scope.editScript = function (ev) {

							   var id = ev.target.id.split("_").pop();

							   var script = $scope.list.filter(
								   script => {
									   
									   return script.uuid == id;
									   
								   }
							   )[0];
							   
							   $scope.editor(script);
						   };


						   $scope.showShown = function () {

							   var hash_backup = $location.hash();
							   
							   async.eachSeries(
								   $scope.list.map (
									   script => {
										   
										   return $scope.shown.includes(script.uuid) ? $("#" + script.uuid).parent() : false;
										   
									   }

								   ).filter (
									   elem => {
										   
										   return elem ? !elem.hasClass("script-shown") : elem;
										   
									   }	
								   ),
								   (elem, cb) => {
									   
									   if (!$scope.list_shown)
										   $scope.__toggleParent($("#" + $scope.list_uuid).parent());
									   
									   $scope.__toggleScript(elem);
									   cb();
								   },
								   () => {
									   
									   $location.hash(hash_backup);
									   $anchorScroll();	
								   }
							   );
						   };
						   
						   $timeout (
							   () => {
								   
								   $scope.showShown();

							   }
						   );
						   
						   if ($scope.port) {
							   
							   $scope.port.onMessage.addListener(

								   (args) => {
									   
									   switch (args.action) {
										   
									   case "list-update":
										   
										   /* 
											  Underlying structures already updated by editor, need to trigger $scope.$digest() to re-render data however ...
											  ?? => "scriptsController" not aware of changes made in other pages, even for the same "object"??
										   */
										   
										   if (args.message == $scope.parent.parent.name) {

											   if ($scope.list.length) {
												   
												   if ($scope.list_shown) {

													   // Neither apply nor digest seems to do the job here.
													   $("#" + $scope.list_uuid).click();
													   $("#" + $scope.list_uuid).click();
												   }

												   $scope.showShown();
												   
											   } else
												   $scope.$destroy();
										   }
										   
										   break;
									   }	
								   }
							   );
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
