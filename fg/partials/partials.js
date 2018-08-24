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
		($timeout) => {
			
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

					$scope.el = element;
					$scope.obj = 'item' in attrs;
					$scope.height = 'height' in attrs ? $scope.height : '20';
					$scope.width = 'width' in attrs ? $scope.width : '20';
					
				},
				
				controller: function ($scope) {
					
					$scope.mostra = $scope.obj ? $scope.item.visible : $scope.$parent[$scope.shown];
					
					$scope.$watch(
						
						function () {
							
							return $scope.obj ? $scope.item.visible : $scope.$parent[$scope.shown];
							
						},
						
						function (nval, oval) {
							
							/* if (nval != oval) */
							$scope.mostra = nval;
						}
					);
					
					$scope.toggleDD = function (ev) {

						ev.stopPropagation();
						ev.stopImmediatePropagation();
						ev.preventDefault();
						
						$scope.mostra = !$scope.mostra;
						
						if ($scope.obj)
							$scope.item.visible = $scope.mostra;
						else 
							$scope.$parent[$scope.shown] = $scope.mostra;
					}

					$timeout(() => {

						/* Workaround: images loaded from self marked as unsafe ...*/
						
						$scope.el.attr('src', $scope.el.attr('src').split(":").slice(1).join(":"));

					})
				}	
			}
		})
	
	.directive('ddTitle',
		() => {
			
			return {

				restrict: 'E',
				replace: true,
				/* transclude: true, */
				
				scope: {
					val: '=',
					text: '='
				},
				
				templateUrl: function (elem, attr) {
					return browser.extension.getURL("fg/partials/drop-title.html");
				},

				controller: function ($scope) {

					/* Strange on PA: propagation? ...*/
					
					$scope[$scope.val] = $scope.$parent[$scope.val];
					
					$scope.$watch(
						
						function () {
							
							return $scope[$scope.val];
							
						},
						
						function (nval, oval) {

							/* if (nval != oval) */
							$scope.$parent[$scope.val] = nval;
							
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
					
					let color = $scope.status == "0" ? 'lightgray' : ($scope.status == "1" ? 'green' : 'red');
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
				
				element.on('change', scope.ngOnChange());
			}
		};
	})

	.directive('paginator', function() {
		
		return {
			
			restrict: "A",
			scope: {
				target: '=?',
				site:'=?',
				parent: '&',
				feeding: '&',
				filter: '=?',
				slice: '=',
				actual: '=',
				total:'='
			},

			templateUrl: function (elem, attr) {
				
				return browser.extension.getURL("fg/partials/paginator.html");
				
			},

			link: function ($scope, element, attrs) {
				
				$scope.size = "pagSmall" in attrs ? '16' : '20';
			},
			
			controller: function ($scope) {

				$scope.last_page = Math.ceil($scope.total / $scope.slice);
				$scope.current_page = $scope.last_page - Math.ceil(($scope.total - $scope.actual) / $scope.slice) + 1;
				
				$scope.prevSlice = () => {

					if ($scope.current_page > 1) {

						$scope.feeding()($scope.actual - $scope.slice, $scope.slice, $scope.target, $scope.site, [])
							.then(
								slice => {

									$scope.actual = slice.actual;
									$scope.total = slice.total;
									$scope.last_page = Math.ceil($scope.total / $scope.slice);
									$scope.current_page = $scope.last_page - Math.ceil(($scope.total - $scope.actual) / $scope.slice) + 1;	
									$scope.parent()(slice, $scope.target, $scope.site);
								}
							);
					}
				}

				$scope.nextSlice = () => {
					
					if ( $scope.current_page < $scope.last_page ) {

						$scope.feeding()($scope.actual + $scope.slice, $scope.slice, $scope.target, $scope.site, [])
							.then(
								slice => {

									$scope.actual = slice.actual;
									$scope.total = slice.total;
									$scope.last_page = Math.ceil($scope.total / $scope.slice);
									$scope.current_page = $scope.last_page - Math.ceil(($scope.total - $scope.actual) / $scope.slice) + 1;
									$scope.parent()(slice, $scope.target, $scope.site);
								}
							);
					}
				}

				if ($scope.filter) {
					$scope.filter.on('change', (filter) => {

						$scope.feeding()(0, $scope.slice, $scope.target, $scope.site, [], filter)
							.then(
								slice => {
									
									$scope.actual = slice.actual;
									$scope.total = slice.total;
									$scope.last_page = Math.ceil($scope.total / $scope.slice);
									$scope.current_page = $scope.last_page - Math.ceil(($scope.total - $scope.actual) / $scope.slice) + 1;
									$scope.parent()(slice, $scope.target, $scope.site);
								}
							);
					});
				}
				
			}
		}
	})
	
	.directive('editorSettings', function() {
		
		return {
			
			restrict: "E",
			replace: true,
			scope: {
				onChange: '&',
				opts: '=',
				rows: '=?'
			},

			templateUrl: function (elem, attr) {
				
				return browser.extension.getURL("fg/partials/editor-sett.html");
				
			},

			link: function ($scope, elem, attrs) {

				$scope.rows = 'rows' in attrs ? $scope.rows : false;
				
			},
			
			controller: function ($scope) {
				
				$scope.fonts = [
					
					"serif",
					"sans-serif",
					"monospace"
				];
				
				$scope.themes = [
					
					"monokai",
					"ambiance",
					"chaos", 
					"chrome",
					"clouds",
					"clouds_midnight",
					"cobalt",
					"crimson_editor",
					"dawn",
					"dreamweaver",
					"eclipse",
					"github",
					"gob", 
					"gruvbox",
					"idle_fingers",
					"iplastic",
					"katzenmilch",
					"kr_theme",
					"kuroir",
					"merbivore",
					"merbivore_soft",
					"mono_industrial",
					"pastel_on_dark",
					"solarized_dark",
					"solarized_light",
					"sqlserver",
					"terminal",
					"textmate",
					"tomorrow",
					"tomorrow_night_blue", 
					"tomorrow_night_bright",
					"tomorrow_night_eighties",
					"tomorrow_night", 
					"twilight",
					"vibrant_ink",
					"xcode"
				];

				$scope.onOptChange = (opt) => {

					$scope.onChange()(opt);
					
				};
				
			}
		};
	})

	.directive('inputFile', function($interval) {
		
		return {
			
			restrict: "E",
			replace: true,
			transclude: true,
			scope: {
				text: "=?",
				padding: "=?",
				ngFileSelected: '&'
				
			},

			template: '<div style="display: inline;">' +
				'<input ng-show="false" type="file" ng-on-change="inptChange" class="browser-style"/>' +
				'<button class="browser-style" ng-click="inptClick()"> {{ copy }} </button>' +
				'</div>',

			link: function ($scope, element, attrs) {
				
				$scope.input = element.find('input');
				$scope.button = element.find('button');
				$scope.text = 'text' in attrs ? $scope.text : 'Import File';
				$scope.padding = 'padding' in attrs ? $scope.padding : 30;
				$scope.backup = $scope.text;
				
			},
			
			controller: function ($scope) {
				
				$scope.waiting = false;
				$scope.copy = new String($scope.text);
				
				$scope.inptChange = () => {
					
					$scope.__selectCheck();
					
				};
				
				$scope.inptClick = () => {

					if ($scope.waiting)
						$interval.cancel($scope.fID);
					
					$scope.input.click();
					
				};
				
				$scope.__handleDone = (state) => {
					
					$scope.waiting = false;
					$scope.copy = $scope.backup;
					$scope.button.css({
						
						'background' : '',
						'padding-right' : '',
						'padding-left' : ''
						
					});
				};

				$scope.__resolved = () => {
					
					$scope.__handleDone();
					$scope.ngFileSelected()($scope.input[0].files[0]);
				};
				
				$scope.__selectCheck = () => {
					
					$scope.times = 100;
					$scope.copy = $scope.input[0].files[0].name;
					
					$scope.button.css({
						
						'padding-right' : $scope.padding  + 'px',
						'padding-left' : $scope.padding  + 'px'
						
					}); 
					
					$scope.fID = $interval(
						() => {
							
							$scope.times --;
							$scope.button.css({ 'background' : 'linear-gradient\(90deg, #ebebeb ' + (100 - $scope.times) + '%, #fbfbfb 0%\)' });
							
						}, 50, 100
					);
					
					$scope.fID.then($scope.__resolved, $scope.__handleDone);
					
					$scope.waiting = true;
				}
				
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
		($timeout, $interval, $compile) => {
			
			return {
				
				restrict: 'E',
				replace: true,
				scope: {
					items: "=",
					name: "=",
					mgr: "=",
					events: "=",
					locale: "="
				},
				
				
				templateUrl: function (elem, attr) {
					
					return browser.extension.getURL("fg/partials/resource-dir.html");
					
				},

				link: function ($scope, elem, attrs) {

					$scope.elem = elem;
					$scope.ul = elem.find('ul');
					
					$scope.resetUl = () => {

						$scope.elem.css(
							{
								"border": "0px",
								"background-color": "white"
							});

					};
					
					$scope.elem.on('dragenter', ev => {
						
						ev.preventDefault();
						ev.stopImmediatePropagation();
						ev.stopPropagation();
						
						$scope.elem.css(
							{
								"border": "1px dashed black",
								"background-color": "LightGray"
							});
						
						if ($scope.$parent.resetUl)
							$scope.$parent.resetUl();
					});

					$scope.elem.on('dragexit', ev => {
						
						ev.preventDefault();
						$scope.resetUl();
						
					});

					$scope.elem.on('dragover', ev => {
						
						ev.preventDefault();
						
					});
					
					$scope.elem.on('drop', ev => {
						
						ev.preventDefault();
						ev.stopImmediatePropagation();
						ev.stopPropagation();
						
						$scope.resetUl();

						
						if (ev.originalEvent.dataTransfer.files.length) {

							async.eachSeries(ev.originalEvent.dataTransfer.files,
								(file, next) => {

									$scope.resourceFile(file)
										.then(next, err => { next(); });
									
								})
								
						} else {

							let resource = JSON.parse(ev.originalEvent.dataTransfer.getData("resource"));
							
							if (resource) {

								$scope.events.emit("dropped", resource.name);
								
								let new_name = $scope.name + resource.name.split("/").pop();
								
								if (new_name != resource.name) {

									$scope.mgr.renameResource(resource.name, new_name)
										.then(renamed => {

											resource.name = renamed.name
											$scope.showChild(resource);
											
										}, console.error);

								}
							}
						}
					});
					
				},
				
				controller: function ($scope) {

					$scope.dir_shown = true;
					$scope.item_type = $scope.locale.findText('dir');
					$scope.adding = false;
					$scope.new_name = "";
					$scope.idname = $scope.name.replace(/\//g, '-');
					
					$scope.addItem = () => {

						$scope.adding = true;
						$('#' + $scope.idname)
							.keypress(
								e => {
									
									if (e.which == 13)
										$scope.newDir();
									
									return true;
									
								}
							);
					}

					$scope.selectItemType = (nval) => {
						
						$scope.item_type = nval;
						
					}

					$scope.__findAppropiateNameFor = (repeated) => {
						
						let cnt = 1;
						let name = repeated;
						let ext = repeated.split(".").pop();
						let orig = repeated;
						let is_dir = repeated.slice(-1) == "/";
						
						let found = $scope.items.find(
							res => {
								
								return res.name == name;
								
							}
							
						);
						
						while (found) {
							
							if (is_dir)
								name = name.slice(0, -1) + cnt.toString() + "/";
							else 
								name = name.split(".").slice(0, -1).join(".") + cnt.toString() + "." + ext;
							
							found = $scope.items.find(
								res => {
									
									return res.name == name;
									
								}
							);
							
							cnt ++;
							
							if (found)
								name = orig;
						}
						
						return name;
					};
					
					$scope.__resourceNameValidation = (name) => {

						
						let pathname = $scope.name + name;
						let valid = $scope.__findAppropiateNameFor(pathname);
						
						return name.slice(-1) == "/" ? valid.split("/").slice(-2)[0] : valid.split("/").pop();
						
					}

					$scope._resourceNameValidation = (child) => {

						if ($scope.nameID)
							$timeout.cancel($scope.nameID);
						
						$scope.nameID = $timeout(
							(name) => {

								let aux = name.split(".").slice(0, -1).join(".");
								let ext = name.split(".").pop();
								
								while (aux.endsWith("/"))
									aux = aux.slice(0, -1);
								
								return $scope.__resourceNameValidation(aux + "." + ext);
								
							}, 2500, true, child
						);
						
						return $scope.nameID;
					}
					
					$scope.removeChild = (name, persist) => {
						
						$scope.mgr.removeResource(name)
							.then(() => {
								
								$scope.items.remove(
									$scope.items.findIndex(item => { return item.name == name }));
								
								if (!$scope.items.length && $scope.name != "/") 	   
									$scope.removeSelf();
								
							});
					}

					$scope.hideChild = (resource) => {

						$scope.items.remove(
							$scope.items.findIndex(item => { return item.name == resource.name }));

						$scope.$digest();

					};
					
					$scope.removeSelf = () => {

						$scope.$parent.removeChild($scope.name);
						
					}
					
					$scope.editTextResource = (resource) => {

						let res = resource || { name: $scope.name + UUID.generate().split('-').pop() + '.js' };
						
						$scope.mgr.editTextResource(res)
							.then(() => {

								$scope.adding = false;
								
							});

					}

					$scope.setHover = (val) => {
						
						if ($scope.hovID)
							$timeout.cancel($scope.hovID);
						
						if (val) 
							$scope.onadding = true;
						else 
							$scope.hovID = $timeout(() => { $scope.onadding = false; }, 750);
					}
					
					$scope.resourceFile = (file) => {

						return new Promise (
							(resolve, reject) => {
								
								if (file.type) { // && file.size
									
									$scope.adding = false;
									
									let validated = $scope.__resourceNameValidation(file.name);
									
									$scope.mgr.storeResource($scope.name + validated, file)
										.then(resource => {

											$scope.items.push({
												
												name: resource.name, 
												type: resource.type,
												size: resource.getSizeString()
													
											});
											
											resolve();
											
										}, $scope.mgr.bg.notify_mgr.error);
									
								} else {
									
									$scope.mgr.bg.notify_mgr.error(file.name +  ": Missing file extension.");
									reject(new Error("Missing file extension"));
								};

							});
					}

					$scope.displayName = () => {

						return $scope.name == "/"
											? $scope.name
											: $scope.name.split("/").slice(-2)[0];
						
					}
					
					$scope.newDir = () => {
						
						let dirname = $scope.new_name + "/";
						let validated = $scope.new_name ? $scope.__resourceNameValidation(dirname) : null;
						
						if (validated == $scope.new_name) {
							
							$scope.items.push({
								
								name: $scope.name + $scope.new_name + "/", 
								items: []
								
							});
							
							$('#' + $scope.idname).off('keypress');
							$scope.adding = false;
							
						} else {

							if ($scope.errID)
								$interval.cancel($scope.errID);
							
							let times = 21;
							
							$scope.errID = $interval(
								() => {

									times --;		   
									$('#' + $scope.idname).css({
										
										'box-shadow' : '0 0 20px ' + times + 'px red',
										'-moz-box-shadow' : '0 0 20px ' + times + 'px red',
										'-webkit-box-shadow' : '0 0 20px ' + times + 'px red'
									});
									
								}, 20, 21, true);

							$scope.errID.then(
								() => {
									
									$('#' + $scope.idname).css({
										
										'box-shadow' : '',
										'-moz-box-shadow' : '',
										'-webkit-box-shadow' : ''
										
									});

								}, ok => {});
						}
					}
					
					$scope.cancelResource = () => {

						$('#' + $scope.idname).off('keypress');
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
					events: "=",
					locale: "="
				},
				
				templateUrl: function (elem, attr) {
					
					return browser.extension.getURL("fg/partials/resource-item.html");
					
				},

				link: function ($scope, elem, attrs) {
					
					elem.on('dragstart', ev => {
						
						ev.originalEvent.dataTransfer.setData("resource", JSON.stringify($scope.resource));
						
					});

					$scope.events.on('dropped',
						(name) => {

							/* Drop event is not allowed to modify dataTransfer, 
							   and dragend cannot know if the element has been dropped. */
							
							if (name == $scope.resource.name) 
								$scope.$parent.hideChild($scope.resource);
						}
					);
					
				},
				
				controller: function ($scope) {

					$scope.hover = false;
					$scope.editing = false;
					$scope.in_progress = false;
					$scope.ext = $scope.resource.name.split(".").pop();
					$scope.id = UUID.generate().split("-").pop();
					
					$scope.setHover = (val, elem) => {

						if ($scope.hovID)
							$timeout.cancel($scope.hovID);
						
						if (val) 
							$scope.hover = true;
						else 
							$scope.hovID = $timeout(() => { $scope.hover = false; }, 750);
					}
					
					$scope.removeSelf = () => {
						
						$scope.$parent.removeChild($scope.resource.name, true);
						$scope.editing = false;
						
					}
					
					$scope.editSelf = () => {
						
						$scope.edit_name = $scope.displayName().split(".").slice(0, -1).join(".");
						$scope.editing = true;
						
					}
					
					$scope.viewSelf = () => {
						
						$scope.$parent.mgr.viewResource($scope.resource.name);
						
					}

					$scope.resourceNameValidation = () => {

						$scope.in_progress = true;
						
						$scope.$parent._resourceNameValidation($scope.edit_name + "." + $scope.ext).then(
							validated => {

								$scope.edit_name = validated.split(".").slice(0, -1).join(".");
								
								$scope.$parent.mgr.renameResource($scope.resource.name, $scope.$parent.name + validated)
									.then(resource => {
										
										$scope.resource.name = resource.name;
										$scope.in_progress = false;
										
									}, console.error);
								
							}, ok => {});
					}

					$scope.displayName = () => {
						
						return $scope.resource.name.split("/").pop();
						
					}
					
					$scope.editResource = () => {
						
						$scope.$parent.editTextResource($scope.resource);
						$scope.editing = false;

					}

					$scope.cancelEdit = () => {
						
						$scope.editing = false;
						
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
					padding: '=?',
					locale: "="
				},
				
				template: '<button class="browser-style" ng-click="clickCheck()"> {{copy}} </button>',
				
				link: function($scope, element, attrs){
					
					$scope.el = element;
					$scope.padding = 'padding' in attrs ? $scope.padding : 15;
				},
				
				controller: function ($scope) {
					
					$scope.waiting = false;
					$scope.copy = new String($scope.text);
					$scope.backup = $scope.text;
					
					$scope.__handleDone = () => {
						
						$scope.waiting = false;
						$scope.copy = $scope.backup;
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
							$scope.copy = $scope.locale.findText("sure");

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

	.directive('resourceName',
		($timeout) => {

			return {
				
				restrict: 'E',
				replace: true,
				scope: {
					
 					name: "=",
					ev: "=?"
					
				},

				template: '<input class="browser-style" type="text" ng-model="text" ng-change="textChange()" />',

				controller: function ($scope) {
					
					$scope.allowed = ['js', 'html', 'json', 'css'];
					
					$scope.text = $scope.name.split("/").pop();
					$scope.parent = $scope.name.split("/").slice(0, -1).join("/") + "/";
					
					$scope.backup = $scope.text;
					$scope.ext = $scope.text.split(".").pop();
					
					$scope.textChange = () => {
						
						$scope.__textValidate($scope.text)
							.then(
								state => {
									
									if ($scope.ev)
										$scope.ev.emit('resource_name', $scope.parent + $scope.text, state);
									
								}, ok => {});
					}
					
					$scope.__textValidate = (text) => {
						
						if ($scope.ev)
							$scope.ev.emit('validation_start', text);
						
						if ($scope.valID)
							$timeout.cancel($scope.valID);
						
						$scope.valID = $timeout(
							(pending) => {
								
								let ok = pending.slice(-1) != "/" && $scope.allowed.includes(pending.split(".").pop());
								
								if (ok) 	
									$scope.backup = $scope.text = pending;
								else 
									$scope.text = $scope.backup;
								
								return ok;
								
							}, 2500, true, text
						);
						
						return $scope.valID;
					}
				},	
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
					events: "=?ev",
					locale: "="
					
				},

				templateUrl: function (elem, attr) {
					
					return browser.extension.getURL("fg/partials/group-chooser.html");
					
				},

				controller: function ($scope) {
					
					$scope.groups.push($scope.locale.findText("new_group"));
					$scope.current = $scope.groups[0];
					$scope.adding = true;
					$scope.disabled_btns = false;
					
					$scope.selectChange = (nval) => {
						
						if (nval == $scope.locale.findText("new_group")) {
							
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
							$scope.groups.indexOf($scope.locale.findText("new_group"))
						);

						if (!$scope.groups.includes(validated))
							$scope.groups.push(validated);
						
						$scope.groups.push($scope.locale.findText("new_group"));
						
						$scope.current = validated;
						
						$scope.adding = false;

						if ($scope.events) 
							$scope.events.emit("new_selection", $scope.current);
						
					};

					$scope.cancelAdd = () => {
						
						$scope.adding = false;

						if ($scope.events) 
							$scope.events.emit("new_selection", $scope.current);
						
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
								let regexh = new RegExp(/^(\*\.)?(?:[A-Za-z0-9\-]+\.)+(?:[A-Za-z1-9\-]+|(\*))$/).exec(hostname);
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

