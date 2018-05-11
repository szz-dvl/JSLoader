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

									   /* Discard only dots [.] */
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
										   
									   } catch (e) {

										   if (e instanceof TypeError) {
											   
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
