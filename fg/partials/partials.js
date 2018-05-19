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
			   ($timeout) => {
				   
				   return {
					   
					   restrict: 'E',
					   replace: true,
					   scope: {
						   script: "=script",
						   onlyval: '=?'
					   },
					   
					   template: '<input type="text" class="browser-style" ng-model="temp" ng-change="validateScriptName()"/>',

					   controller: function ($scope) {

						   $scope.temp = $scope.script.name;

						   $scope.validateScriptName = () => {
							   
							   if ($scope.tID)
								   $timeout.cancel($scope.tID);
							   
							   $scope.tID = $timeout(
								   () => {
									   
									   if ($scope.temp.includes(".")) 
										   $scope.temp = $scope.script.name;
									   else {
										   
										   $scope.script.name = $scope.temp;
										   
										   if (!$scope.onlyval)
											   $scope.script.persist();
									   }
									   
								   }, 1000);
						   }
					   }
				   }
			   })

	.directive('resourceDirectory',
			   ($timeout) => {
				   
				   return {
					   
					   restrict: 'E',
					   replace: true,
					   scope: {
						   items: "=",
						   name: "=",
						   parent: "=",
						   mgr: "="
					   },
					   
					   templateUrl: function (elem, attr) {
					
						   return browser.extension.getURL("fg/partials/resource-dir.html");
					
					   },
					   
					   controller: function ($scope) {
						   
						   $scope.path = $scope.parent + $scope.name + "/";
						   $scope.dir_shown = true;
						   $scope.item_type = "directory";
						   $scope.file_type = "text/javascript";
						   $scope.adding = false;
						   $scope.have_file = false;
						   
						   $scope.file_types = [

							   "text/html",
							   "text/javascript",
							   "text/css",
							   "image/*",
							   "video/*",
							   "audio/*"
						   ];

						   $scope.persistable = () => {

							   return $scope.item_type == "directory" ? $scope.validated : $scope.validated && $scope.have_file;
						   }
						   
						   $scope.addItem = () => {

							   $scope.adding = true;

						   }

						   $scope.selectItemType = (nval) => {
							   
							   $scope.item_type = nval;
							   
						   }

						   $scope.selectFileType = (nval) => {
							   
							   $scope.file_type = nval;
							   
						   }

						   $scope.__findAppropiateNameFor = (repeated) => {
							   
							   let cnt = 1;
							   let name = repeated;
							   let found = $scope.items.find(
								   res => {
									   
									   return res.name == name;
									   
								   }
								   
							   );
							   
							   while (found) {
								   
								   name += cnt.toString();
								   
								   found = $scope.items.find(
									   res => {
										   
										   return res.name == name;
											
									   }
								   );
								   
								   cnt ++;
								   
								   if (found)
									   name = name.slice(0, -1);
							   }
							   
							   return name;
						   };
						   
						   $scope.resourceNameValidation = () => {

							   $scope.validated = false;
							   
							   if ($scope.nameID)
									$timeout.cancel($scope.nameID);
								
								$scope.nameID = $timeout(
									() => {
										
										let exists = $scope.items
											.find(res => {
												
												return res.name == $scope.new_name;
												
											});

										if (exists)
											$scope.new_name = $scope.__findAppropiateNameFor($scope.new_name);
		
										$scope.validated = $scope.new_name ? true : false;
										
									}, 3500, true
								);
						   }

						   $scope.removeChild = (name) => {

							   /* Persist */
							   $scope.items.remove(
								   $scope.items.findIndex(item => { return item.name == name }));
							   
						   }
						   
						   $scope.removeSelf = () => {

							   /* Persist */
							   $scope.$parent.removeChild($scope.name);

						   }
						   
						   $scope.editTextResource = (resource) => {
							   
							   $scope.mgr.editTextResource(resource);

						   }

						   $scope.setHover = (val) => {

							   if ($scope.hovID)
								   $timeout.cancel($scope.hovID);
							   
							   if (val) 
								   $scope.onadding = true;
							   else 
								   $scope.hovID = $timeout(() => { $scope.onadding = false; }, 750);
													 
						   }
						   
						   $scope.resourceFile = () => {
							   
							   $scope.have_file = true;

						   }

						   $scope.persistResource = () => {

							   if ($scope.item_type == "directory") {
								   
								   $scope.items.push({
								   
									   name: $scope.new_name, 
									   items: []
									   
								   });
								   
							   } else {
								   
								   $scope.mgr.storeResource($scope.path + $scope.new_name, $scope.file_type, $("#import_data_new")[0].files[0])
									   .then(resource => {
										   
										   /* Persist */
										   $scope.items.push({
											   
											   name: $scope.new_name, 
											   type: $scope.file_type
											   
										   });
										   
									   }, console.error);
							   }
							   
							   $scope.have_file = false;
							   $scope.adding = false;
						   }

						   $scope.cancelResource = () => {

							   $scope.have_file = false;
							   $scope.adding = false;
						   }
					   }
					   
				   }
			   })

	.directive('resourceItem',
			   ($timeout) => {
				   
				   return {
					   
					   restrict: 'E',
					   replace: true,
					   scope: {
						   resource: "=",
					   },
					   
					   templateUrl: function (elem, attr) {
						   
						   return browser.extension.getURL("fg/partials/resource-item.html");
					
					   },
					   
					   controller: function ($scope) {

						   $scope.hover = false;
						   $scope.editing = false;
						   $scope.validated = true;
						   $scope.path = $scope.parent + $scope.name;
						   
						   $scope.setHover = (val, elem) => {
							   
							   if ($scope.hovID)
								   $timeout.cancel($scope.hovID);
							   
							   if (val) 
								   $scope.hover = true;
							   else 
								   $scope.hovID = $timeout(() => { $scope.hover = false; }, 750);
						   }
						   
						   $scope.removeSelf = () => {

							   /* Persist */
							   $scope.$parent.removeChild($scope.resource.name);
							   
						   }
						   
						   $scope.editSelf = () => {
							   
							   $scope.backup = $scope.resource.name;
							   $scope.editing = true;
							   
						   }

						   $scope.viewSelf = () => {
							   
							   $scope.viewing = true;
							   
						   }

						   $scope.resourceNameValidation = () => {
							   
							   $scope.validated = false;
							   
							   if ($scope.nameID)
								   $timeout.cancel($scope.nameID);
							   
							   $scope.nameID = $timeout(
								   () => {
									   
									   let exists = $scope.$parent.items
										   .filter(res => {
											   
											   return res.name == $scope.resource.name;
											   
										   }).length;
									   
									   if (exists > 1)
										   $scope.resource.name = $scope.$parent.__findAppropiateNameFor($scope.resource.name);
									   
									   $scope.validated = $scope.resource.name ? true : false;
									   
								   }, 3500, true
							   );
						   }
						   
						   $scope.resourceFile = () => {

							   $scope.have_file = true;
							   
						   }
						   
						   $scope.editResource = () => {
							   
							   $scope.$parent.mgr.editTextResource($scope.resource);

						   }

						   $scope.cancelEdit = () => {
							   
							   $scope.editing = false;
							   $scope.resource.name = $scope.backup;
							   $scope.backup = "";
							   
						   }

						   $scope.persistEdit = () => {

							   /* Persist */
							   $scope.editing = false;
							   $scope.backup = "";

						   }
					   }
				   }
			   })
	
	.directive('areUSure',
			   ($interval) => {
				   
				   return {
					   
					   restrict: 'E',
					   replace: true,
					   scope: {
						   action: "&",
						   text: '=',
						   padding: '=?'
					   },
					   
					   template: '<button class="browser-style" ng-click="clickCheck()"> {{text}} </button>',
					   
					   link: function($scope, element, attrs){
						   
						   $scope.el = element;
						   $scope.padding = 'padding' in attrs ? $scope.padding : 15;
					   },
					   
					   controller: function ($scope) {
						   
						   $scope.waiting = false;
						   $scope.backup = $scope.text;
	   
						   $scope.__handleDone = () => {
							   
							   $scope.waiting = false;
							   $scope.text = $scope.backup;
							   $scope.el.css({
								   
								   'background' : '',
								   'padding-right' : '',
								   'padding-left' : ''
								   
							   });
							   
						   };
						   
						   $scope.clickCheck = () => {

							   if ($scope.waiting) {

								   $interval.cancel($scope.wID);
								   $scope.action();
								   
							   } else {
								   
								   $scope.times = 100;
								   $scope.text = "Sure?";
								   
								   $scope.el.css({
									   
									   'padding-right' : $scope.padding  + 'px',
									   'padding-left' : $scope.padding  + 'px'
									   
								   }); 
								   
								   $scope.wID = $interval(
									   () => {

										   $scope.times --;
										   $scope.el.css({ 'background' : 'linear-gradient\(90deg, #ebebeb ' + (100 - $scope.times) + '%, #fbfbfb 0%\)' });
										   
									   }, 50, 100
								   );

								   $scope.wID.then($scope.__handleDone, $scope.__handleDone);
							   }
							   
							   $scope.waiting = !$scope.waiting;
						   }   
					   }
				   }
			   })

	.directive('groupChooser',
		() => {

			return {
				
				restrict: 'E',
				replace: true,
				scope: {
					
 					groups: "=groups",
					validating: "=validating",
					events: "=?ev"
					
				},

				templateUrl: function (elem, attr) {
					
					return browser.extension.getURL("fg/partials/group-chooser.html");
					
				},

				controller: function ($scope) {
					
					$scope.groups.push(".New group.");
					$scope.current = $scope.groups[0];
					$scope.adding = $scope.groups.length <= 1;
					$scope.disabled_btns = false;
					
					$scope.selectChange = (nval) => {
						
						if (nval == ".New group.") {
							
							$scope.adding = true;
							
							if ($scope.events)
								$scope.events.emit("validation_start", $scope.current, true);
							
						} else {

							$scope.current = nval;
							
							if ($scope.events)
								$scope.events.emit("new_selection", $scope.current);
						}
					};
					
					$scope.addGroup = (validated) => {

						$scope.groups.remove(
							$scope.groups.indexOf(".New group.")
						);

						if (!$scope.groups.includes(validated))
							$scope.groups.push(validated);
						
						$scope.groups.push(".New group.");
						
						$scope.current = validated;
						
						$scope.adding = false;

						if ($scope.events)
							$scope.events.emit("validation_ready", $scope.current, true);
					};

					$scope.cancelAdd = () => {
						
						$scope.adding = false;

						if ($scope.events)
							$scope.events.emit("validation_ready", $scope.current, false);
					};

					if ($scope.events) {
						
						$scope.events
							.on('validation_start',
								(pending, directive) => {

									if (!directive)
										$scope.disabled_btns = true;
									
								})
							
							.on('validation_finish',
								(validated, state) => {
									
									$scope.disabled_btns = false;
									$scope.validated = validated;
									
								});
					}
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
					events: "=?ev",
					time: "=?"
				},
				
				template: '<input type="text" class="browser-style" ng-model="group" ng-change="validateGroup()"/>',

				link: function($scope, element, attrs){
					
					$scope.time = 'time' in attrs ? parseInt($scope.time) : 3000;
				},
				
				controller: function ($scope) {
					
					$scope.backup = $scope.group;
					
					$scope.validateGroup = () => {
						
						if ($scope.events) 
							$scope.events.emit("validation_start", $scope.group);
						
						if($scope.changeID)
							$timeout.cancel($scope.changeID);
						
						$scope.changeID = $timeout(
							() => {
								
								let ok = true;
								
								if ($scope.group.includes(".")) {
									
									$scope.group = $scope.backup;
									ok = false;
									
								} else {
									
									$scope.backup = $scope.group;
								}
								
								return ok;
								
							}, $scope.time);
						
						$scope.changeID.then(
							state => {
								
								if ($scope.events)
									$scope.events.emit("validation_finish", $scope.group, state);
								
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
						   
 						   url: "=",
						   events: "=?ev",
						   time: "=?"
					   },

					   template: '<input type="text" class="browser-style" type="text" ng-model="url" ng-change="validateSite()"/>',
					   
					   link: function($scope, element, attrs){
						   
						   $scope.time = 'time' in attrs ? $scope.time : 3000;
						   
					   },
					   
					   controller: function ($scope) {
						   
						   $scope.backup = $scope.url;
						   
						   $scope.validateSite = () => {
							 
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
									   let regexh = new RegExp(/^(\*\.)?(?:[A-Za-z1-9\-]+\.)+(?:[A-Za-z1-9\-]+|(\*))$/).exec(hostname);
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
									   
								   }, $scope.time);

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
