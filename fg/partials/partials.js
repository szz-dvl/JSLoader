angular.module('jslPartials', [])

	.directive('noInfo',
		() => {
				   
			return {
				
				restrict: 'E',
				replace: true,
				scope: {
					text: "=?"
				},
				template: '<div class="noInfoContainer"> {{ text || "No Data" }} </div>'
			}
		})
	
	.directive('dropDown',
		() => {
			
			return {
				restrict: 'E',
				replace: true,
				transclude: true,
				
				scope: {
					
					item: '=?',
					shown: '=?',
					flipped: '=?',
					width: "=?",
					height: "=?"
				},
				
				templateUrl: function (elem, attr) {
					return browser.extension.getURL("fg/partials/drop-down.html");
				},

				link: function($scope, element, attrs){
					
					$scope.obj = 'item' in attrs;
					
				},
				
				controller: function ($scope) {
					
					$scope.mostra = $scope.obj ? $scope.item.visible : $scope.$parent[$scope.shown];

					/* 
					   Strange on PA:

					   console.log("dropDown " + ($scope.mostra ? "true" : "false"));
					   console.log("dropDownObj " + ($scope.obj ? "true" : "false"));
					   console.log("dropDownItm ");
					   console.log($scope.item); 
					 
					 */
					
					$scope.$watch(
						
						function () {
							
							return $scope.obj ? $scope.item.visible : $scope.$parent[$scope.shown];
							
						},
						
						function (nval, oval) {
							
							if (nval != oval)
								$scope.mostra = nval;
						}
					);
					
					$scope.toggleDD = function (ev) {
						
						$(ev.currentTarget).blur(); /* Avoid outline */
						$scope.mostra = !$scope.mostra;
						
						if ($scope.obj)
							$scope.item.visible = $scope.mostra;
						else 
							$scope.$parent[$scope.shown] = $scope.mostra;
					}
				}	
			}
		})
	
	.directive('ddTitle',
		() => {
			
			return {

				restrict: 'E',
				replace: true,
				transclude: true,
				
				scope: {
					val: '=',
					text: '='
				},
				
				templateUrl: function (elem, attr) {
					return browser.extension.getURL("fg/partials/drop-title.html");
				},

				controller: function ($scope) {
					
					$scope[$scope.val] = $scope.$parent[$scope.val];
					
					$scope.$watch(
						
						function () {
							
							return $scope[$scope.val];
							
						},
						
						function (modelValue) {
							
							$scope.$parent[$scope.val] = modelValue;
							
						}
					);
				}
			}
		})

	.directive('infoProtected', function() {
		
		return {
			
			restrict: "A",
			scope: false,
			
			link: function (scope, element) {
				
				element.on('blur', () => {

					element.attr('type', 'password');

				});

				element.on('focus', () => {

					element.attr('type', 'text');

				});
			}
		};
	})
	
	.directive('scriptStatus',
		() => {
			
			return {

				restrict: 'E',
				replace: true,
				scope: {
					status: "="
				},
				
				template: '<canvas width="24px" height="24px"></canvas>',
				
				link: function($scope, element, attr) {
					
					let color = $scope.status == "0" ? 'yellow' : ($scope.status == "1" ? 'green' : 'red');
					let context = element[0].getContext('2d');
					let centerX = element[0].width / 2;
					let centerY = element[0].height / 2;
					let radius = 10;
					
					context.beginPath();
					context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
					context.fillStyle = color;
					context.fill();
					context.lineWidth = 0;
					context.strokeStyle = color;
					context.stroke();
					
				}
			}
		})

	.directive('ngOnChange', function() {
		
		return {
			
			restrict: "A",
			scope: {
				ngOnChange: '&'
			},
			
			link: function (scope, element) {
				
				element.on('change', scope.ngOnChange);
			}
		};
	})
	
	.directive('scriptName',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   script: "=script",
						   onlyval: '=?'
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

										   if (!$scope.onlyval)
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

	.directive('groupValidator',
			   ($timeout) => {
				   
				   return {
					   
					   restrict: 'E',
					   replace: true,
					   scope: {
						   
 						   group: "=group",
						   events: "=?ev"
						   
					   },
					   
					   template: '<input class="browser-style" ng-model="group" ng-change="validateGroup()"/>',
					   
					   controller: function ($scope) {

						   $scope.backup = $scope.group;
						   
						   $scope.validateGroup = function () {
							   
							   if ($scope.ev)
								   $scope.ev.emit("validation_start", $scope.group);
							   
							   if($scope.changeID)
								   $timeout.cancel($scope.changeID);
							   
							   $scope.changeID = $timeout(
								   () => {
									   
									   let ok = true;
									   
									   if ($scope.group.includes("."))
										   $scope.group = $scope.backup;	   
									   else {
										   
										   ok = false;
										   $scope.backup = $scope.group;
									   }
									   
									   return ok;
									   
								   }, 3000);

							   $scope.changeID.then(
								   state => {
									   
									   if ($scope.events)
										   $scope.events.emit("validation_ready", $scope.group, state);
									   
								   }, ok => {}
							   )
						   }
					   }
				   }
			   })

	.directive('siteValidator',
			   ($timeout) => {
				   
				   return {
					   
					   restrict: 'E',
					   replace: true,
					   scope: {
						   
 						   url: "=url",
						   events: "=?ev"
						   
					   },

					   template: '<input class="browser-style" type="text" ng-model="url" ng-change="validateSite()"/>',
					    
					   controller: function ($scope) {

						   $scope.backup = $scope.url;
						   
						   $scope.validateSite = function () {
							 
							   if ($scope.events)
								   $scope.events.emit("validation_start", $scope.url);
							   
							   if ($scope.changeID)
								   $timeout.cancel($scope.changeID);
							   
							   $scope.changeID = $timeout(
								   () => {

									   let ok = false;
									   let hostname = $scope.url.split("/")[0].trim();
									   let pathname = $scope.url.split("/").slice(1).join("/").trim();

									   /* Won't match "*" (must it?), Will match "*.NAME.NAME2.NAME3.{...}.NAMEN.*" */
									   let regexh = new RegExp(/^(\*\.)?(?:[A-Za-z1-9\-]+\.)+(?:[A-Za-z1-9]+|(\*)?)$/).exec(hostname);
									   let regexp = new RegExp(/^(?:[a-zA-Z0-9\.\-\_\~\!\$\&\'\(\)\+\,\;\=\:\@\/\*]*)?$/).exec(pathname);

									   let newhost = regexh ? regexh[0] : null;
									   let newpath = regexp ? regexp[0] : null;

									   
									   if (newhost && (newpath || newpath == "")) {
										   	   
										   $scope.url = $scope.backup = newhost + "/" + newpath;
										   ok = true;
										   
									   } else {
										   
										   $scope.url = $scope.backup;
										   
									   }
									   
									   if ($scope.url.slice(-1) == "/")
										   $scope.url = $scope.url.slice(0, -1);
   
									   return ok;
									   
								   }, 3000);

							   $scope.changeID.then(
								   state => {
									   
									   if ($scope.events)
										   $scope.events.emit("validation_ready", $scope.url, state);
									   
								   }, ok => {}
							   );
						   };
					   }
				   }
			   })

	.directive('aceInline',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   height: "=h",
						   width: "=w"
						   
					   },
					   
					   templateUrl: function (elem, attr) {
						   
						   return browser.extension.getURL("fg/partials/ace-frame.html");

					   },
					   
					   controller: function ($scope) {
						   
						   $scope.src = browser.extension.getURL("fg/partials/ace-inline.html");

					   }
					   
				   }
			   });
