﻿/* entities.module.js */

/**
* @desc this module manages the application home desktop screen
*/

(function () {
	'use strict';

	angular
        .module('webvellaAreas') //only gets the module, already initialized in the base.module of the plugin. The lack of dependency [] makes the difference.
        .config(config)
		.controller('CreateRelationFieldModalController', CreateRelationFieldModalController)
        .controller('WebVellaAreasRecordCreateController', controller);

	//#region << Configuration >> ///////////////////////////////////
	config.$inject = ['$stateProvider'];
	function config($stateProvider) {
		$stateProvider.state('webvella-area-view-create', {
			parent: 'webvella-area-base',
			url: '/view-create/:viewName/:regionName?returnUrl',
			params: {
				regionName: { value: "header", squash: true }
			},
			views: {
				"topnavView": {
					controller: 'WebVellaAreasTopnavController',
					templateUrl: '/plugins/webvella-areas/topnav.view.html',
					controllerAs: 'topnavData'
				},
				"sidebarView": {
					controller: 'WebVellaAreasSidebarController',
					templateUrl: '/plugins/webvella-areas/sidebar.view.html',
					controllerAs: 'sidebarData'
				},
				"contentView": {
					controller: 'WebVellaAreasRecordCreateController',
					templateUrl: '/plugins/webvella-areas/area-view-create.view.html',
					controllerAs: 'ngCtrl'
				}
			},
			resolve: {
				loadDependency: loadDependency,
				loadPreloadScript: loadPreloadScript
			},
			data: {

			}
		}).state('webvella-area-view-create-with-relation', {
			parent: 'webvella-area-base',
			url: '/view-create/:viewName/relation/:relationName/:targetRecordId/:regionName?returnUrl',
			params: {
				regionName: { value: "header", squash: true }
			},			
			views: {
				"topnavView": {
					controller: 'WebVellaAreasTopnavController',
					templateUrl: '/plugins/webvella-areas/topnav.view.html',
					controllerAs: 'topnavData'
				},
				"sidebarView": {
					controller: 'WebVellaAreasDetachedItemSidebarController',
					templateUrl: '/plugins/webvella-areas/detached-item-sidebar.view.html',
					controllerAs: 'sidebarData'
				},
				"contentView": {
					controller: 'WebVellaAreasRecordCreateController',
					templateUrl: '/plugins/webvella-areas/area-view-create.view.html',
					controllerAs: 'ngCtrl'
				}
			},
			resolve: {
				loadDependency: loadDependency,
				loadPreloadScript: loadPreloadScript
			},
			data: {

			}
		});
	};
	//#endregion

	//#region << Resolve Function >>

	////////////////////////
	loadDependency.$inject = ['$ocLazyLoad', '$q', '$http', '$stateParams', 'resolvedCurrentEntityMeta', 'wvAppConstants'];
	function loadDependency($ocLazyLoad, $q, $http, $stateParams, resolvedCurrentEntityMeta, wvAppConstants) {
		var lazyDeferred = $q.defer();

		var listServiceJavascriptPath = wvAppConstants.apiBaseUrl + 'meta/entity/' + $stateParams.entityName + '/view/' + $stateParams.viewName + '/service.js?v=' + resolvedCurrentEntityMeta.hash;

		var loadFilesArray = [];
		loadFilesArray.push(listServiceJavascriptPath);

		return $ocLazyLoad.load({
			cache: false,
			files: loadFilesArray
		}).then(function () {
			return lazyDeferred.resolve("ready");
		});

	}
	////////////////////////
	loadPreloadScript.$inject = ['loadDependency', 'webvellaViewActionService', '$q', '$http', '$state'];
	function loadPreloadScript(loadDependency, webvellaViewActionService, $q, $http, $state) {
		var defer = $q.defer();

		if (webvellaViewActionService.preload === undefined || typeof (webvellaViewActionService.preload) != "function") {
			console.log("No webvellaViewActionService.preload function. Skipping");
			defer.resolve();
			return defer.promise;
		}
		else {
			webvellaViewActionService.preload(defer, $state);
		}
	}

	//#endregion

	//#region << Controller  >> ///////////////////////////////
	controller.$inject = ['$filter', '$uibModal', '$log', '$q', '$rootScope', '$state', '$stateParams', '$scope', 'pageTitle', 'webvellaCoreService', 'webvellaViewActionService',
        'resolvedAreas', '$timeout', 'ngToast', 'wvAppConstants', 'resolvedCurrentEntityMeta', 'resolvedEntityRelationsList', '$anchorScroll', '$location', '$sessionStorage',
		'resolvedCurrentUser','resolvedEntityList'];
	function controller($filter, $uibModal, $log, $q, $rootScope, $state, $stateParams, $scope, pageTitle, webvellaCoreService, webvellaViewActionService,
        resolvedAreas, $timeout, ngToast, wvAppConstants, resolvedCurrentEntityMeta, resolvedEntityRelationsList, $anchorScroll, $location, $sessionStorage,
		resolvedCurrentUser,resolvedEntityList) {

		//#region << ngCtrl initialization >>
		var ngCtrl = this;
		ngCtrl.validation = {};
		ngCtrl.currentState = $state.current;
		//#endregion

		//#region <<Set Page meta>>
		ngCtrl.pageTitle = "Area Entities | " + pageTitle;
		webvellaCoreService.setPageTitle(ngCtrl.pageTitle);
		ngCtrl.currentArea = webvellaCoreService.getCurrentAreaFromAreaList($stateParams.areaName, resolvedAreas.data);
		webvellaCoreService.setBodyColorClass(ngCtrl.currentArea.color);
		//#endregion

		//#region << Initialize main objects >>
		ngCtrl.view = {};
		ngCtrl.view.data = {}; //Initially now, will be later filled in by the user
		ngCtrl.view.meta = webvellaCoreService.getEntityRecordViewFromEntitiesMetaList($stateParams.viewName, $stateParams.entityName, resolvedEntityList);
		ngCtrl.entity = fastCopy(resolvedCurrentEntityMeta);
		ngCtrl.entityRelations = fastCopy(resolvedEntityRelationsList);
		ngCtrl.areas = fastCopy(resolvedAreas.data);
		ngCtrl.currentUser = fastCopy(resolvedCurrentUser);
		ngCtrl.$sessionStorage = $sessionStorage;
		ngCtrl.stateParams = $stateParams;
		//#endregion

		//#region << Set environment >> /////////////////////
		ngCtrl.createViewRegion = null;
		for (var j = 0; j < ngCtrl.view.meta.regions.length; j++) {
			if (ngCtrl.view.meta.regions[j].name === "header") {
				ngCtrl.createViewRegion = ngCtrl.view.meta.regions[j];
			}
		}
		//#endregion

		//#region << Run  webvellaViewActionService.onload >>
		if (webvellaViewActionService.onload === undefined || typeof (webvellaViewActionService.onload) != "function") {
			$log.warn("No webvellaViewActionService.onload function. Skipping");
		}
		else {
			var actionsOnLoadResult = webvellaViewActionService.onload(ngCtrl, $rootScope, $state);
			if (actionsOnLoadResult != true) {
				ngCtrl.validation.hasError = true;
				ngCtrl.validation.errorMessage = $sce.trustAsHtml(actionsOnLoadResult);
			}
		}
		//#endregion

		//#region << Initialize fields defaults >>
		ngCtrl.files = {}; // this is the data wrapper for the temporary upload objects that will be used in the html and for which we will generate watches below
		ngCtrl.progress = {}; //Needed for file and image uploads
		var availableViewFields = [];
		//Init default values of fields
		if (ngCtrl.createViewRegion != null) {
			availableViewFields = webvellaCoreService.getItemsFromRegion(ngCtrl.createViewRegion);
			for (var j = 0; j < availableViewFields.length; j++) {
				if (availableViewFields[j].type === "field") {
					switch (availableViewFields[j].meta.fieldType) {

						case 2: //Checkbox
							ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							break;

						case 3: //Currency
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 4: //Date
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								if (availableViewFields[j].meta.useCurrentTimeAsDefaultValue) {
									ngCtrl.view.data[availableViewFields[j].meta.name] = moment().toISOString();
								}
								else if (availableViewFields[j].meta.defaultValue) {
									ngCtrl.view.data[availableViewFields[j].meta.name] = moment(availableViewFields[j].meta.defaultValue).toISOString();
								}
							}
							break;
						case 5: //Date
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								if (availableViewFields[j].meta.useCurrentTimeAsDefaultValue) {
									ngCtrl.view.data[availableViewFields[j].meta.name] = moment().toISOString();
								}
								else if (availableViewFields[j].meta.defaultValue) {
									ngCtrl.view.data[availableViewFields[j].meta.name] = moment(availableViewFields[j].meta.defaultValue).toISOString();
								}
							}
							break;
						case 6: //Email
							break;
						case 7: //File
							ngCtrl.progress[availableViewFields[j].meta.name] = 0;
							if (availableViewFields[j].meta.required) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 8: //HTML
							if (availableViewFields[j].meta.required) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 9: //Image
							ngCtrl.progress[availableViewFields[j].meta.name] = 0;
							if (availableViewFields[j].meta.required) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 10: //TextArea
							if (availableViewFields[j].meta.required) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 11: //Multiselect
							if (availableViewFields[j].meta.required) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 12: //Number
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 13: //Password
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								//Does not have default value
								//ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 14: //Percent
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								//Need to convert the default value to percent x 100
								//TODO: apply this after the defaultValue, maxValue and minValue properties are stored as decimals - Ref. Issue #18

								//JavaScript has bugs when multiplying decimals
								//The way to correct this is to multiply the decimals before multiple their values,
								//var resultPercentage = 0.00;
								//resultPercentage = multiplyDecimals(availableViewFields[j].meta.defaultValue, 100, 3);
								//ngCtrl.view.data[availableViewFields[j].meta.name] = resultPercentage;
							}
							break;
						case 15: //Phone
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 16: //Guid
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 17: //Dropdown
							if (availableViewFields[j].meta.required && availableViewFields[j].meta.defaultValue) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
						case 18: //Text
							//if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
							//	ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							//}
							break;
						case 19: //URL
							if (availableViewFields[j].meta.required || (!availableViewFields[j].meta.required && !availableViewFields[j].meta.placeholderText)) {
								ngCtrl.view.data[availableViewFields[j].meta.name] = fastCopy(availableViewFields[j].meta.defaultValue);
							}
							break;
					}


				}
			}
		}

		// << File >>
		ngCtrl.uploadedFileName = "";
		ngCtrl.upload = function (file, item) {
			if (file != null) {
				ngCtrl.uploadedFileName = item.dataName;
				ngCtrl.moveSuccessCallback = function (response) {
					$timeout(function () {
						ngCtrl.view.data[ngCtrl.uploadedFileName] = response.object.url;
					}, 1);
				}

				ngCtrl.uploadSuccessCallback = function (response) {
					var tempPath = response.object.url;
					var fileName = response.object.filename;
					var targetPath = "/fs/" + ngCtrl.entity.name + "/" + newGuid() + "/" + fileName;
					var overwrite = false;
					webvellaCoreService.moveFileFromTempToFS(tempPath, targetPath, overwrite, ngCtrl.moveSuccessCallback, ngCtrl.uploadErrorCallback);
				}
				ngCtrl.uploadErrorCallback = function (response) {
					alert(response.message);
				}
				ngCtrl.uploadProgressCallback = function (response) {
					$timeout(function () {
						ngCtrl.progress[ngCtrl.uploadedFileName] = parseInt(100.0 * response.loaded / response.total);
					}, 1);
				}
				webvellaCoreService.uploadFileToTemp(file, item.meta.name, ngCtrl.uploadProgressCallback, ngCtrl.uploadSuccessCallback, ngCtrl.uploadErrorCallback);
			}
		};

		ngCtrl.deleteFileUpload = function (item) {
			var fieldName = item.dataName;
			var filePath = ngCtrl.view.data[fieldName];

			function deleteSuccessCallback(response) {
				$timeout(function () {
					ngCtrl.view.data[fieldName] = null;
					ngCtrl.progress[fieldName] = 0;
				}, 0);
				return true;
			}

			function deleteFailedCallback(response) {
				ngToast.create({
					className: 'error',
					content: '<span class="go-red">Error:</span> ' + response.message,
					timeout: 7000
				});
				return "validation error";
			}

			webvellaCoreService.deleteFileFromFS(filePath, deleteSuccessCallback, deleteFailedCallback);

		}

		// << Html >>
		//Should use scope as it is not working with ngCtrl
		$scope.editorOptions = {
			language: GlobalLanguage,
			skin: 'moono',
			height: '160',
			contentsCss: '/plugins/webvella-core/css/editor.css',
			extraPlugins: "sourcedialog",
			allowedContent: true,
			toolbarLocation: 'top',
			toolbar: 'full',
			toolbar_full: [
				{ name: 'basicstyles', items: ['Save', 'Bold', 'Italic', 'Strike', 'Underline'] },
				{ name: 'paragraph', items: ['BulletedList', 'NumberedList', 'Blockquote'] },
				{ name: 'editing', items: ['JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'] },
				{ name: 'links', items: ['Link', 'Unlink', 'Anchor'] },
				{ name: 'tools', items: ['SpellChecker', 'Maximize'] },
				{ name: 'clipboard', items: ['Undo', 'Redo'] },
				{ name: 'styles', items: ['Format', 'FontSize', 'TextColor', 'PasteText', 'PasteFromWord', 'RemoveFormat'] },
				{ name: 'insert', items: ['Image', 'Table', 'SpecialChar', 'Sourcedialog'] }, '/',
			]
		};

		ngCtrl.toggleSectionCollapse = function (section) {
			section.collapsed = !section.collapsed;
		}

		ngCtrl.calendars = {};
		ngCtrl.openCalendar = function (event, name) {
			ngCtrl.calendars[name] = true;
		}

		//#endregion

		//#region << Entity relations functions >>

		ngCtrl.getRelation = function (relationName) {
			for (var i = 0; i < ngCtrl.entityRelations.length; i++) {
				if (ngCtrl.entityRelations[i].name == relationName) {
					//set current entity role
					if (ngCtrl.entity.id == ngCtrl.entityRelations[i].targetEntityId && ngCtrl.entity.id == ngCtrl.entityRelations[i].originEntityId) {
						ngCtrl.entityRelations[i].currentEntityRole = 3; //both origin and target
					}
					else if (ngCtrl.entity.id == ngCtrl.entityRelations[i].targetEntityId && ngCtrl.entity.id != ngCtrl.entityRelations[i].originEntityId) {
						ngCtrl.entityRelations[i].currentEntityRole = 2; //target
					}
					else if (ngCtrl.entity.id != ngCtrl.entityRelations[i].targetEntityId && ngCtrl.entity.id == ngCtrl.entityRelations[i].originEntityId) {
						ngCtrl.entityRelations[i].currentEntityRole = 1; //origin
					}
					else if (ngCtrl.entity.id != ngCtrl.entityRelations[i].targetEntityId && ngCtrl.entity.id != ngCtrl.entityRelations[i].originEntityId) {
						ngCtrl.entityRelations[i].currentEntityRole = 0; //possible problem
					}
					return ngCtrl.entityRelations[i];
				}
			}
			return null;
		}

		ngCtrl.hasFieldFromRelationValue = function (itemDataName) {
			var dataNameArray = itemDataName.split('$');
			if (ngCtrl.view.data["$" + dataNameArray[2] + "." + "id"]) {
				return true;
			}
			else {
				return false;
			}
		}

		ngCtrl.removeFieldFromRelationValue = function (itemDataName) {
			var dataNameArray = itemDataName.split('$');
			$timeout(function () {
				delete ngCtrl.view.data["$" + dataNameArray[2] + "." + "id"];
				delete ngCtrl.dummyFields[itemDataName];
			}, 10);
		}


		//#endregion

		//#region << Render >>
		ngCtrl.activeTabName = ngCtrl.stateParams.regionName;
		ngCtrl.view.meta.regions.sort(sort_by({name:'weight', primer: parseInt, reverse: false}));
		if(ngCtrl.activeTabName == "header"){
			//Set the first tab as active
			if(ngCtrl.view.meta.regions[0].name != "header"){
				ngCtrl.activeTabName = ngCtrl.view.meta.regions[0].name;
			}
			else if(ngCtrl.view.meta.regions.length > 1) {
				ngCtrl.activeTabName = ngCtrl.view.meta.regions[1].name;
			}
			else {
				ngCtrl.activeTabName = null;
			}

		}
		ngCtrl.renderTabBar = false;
		ngCtrl.view.meta.regions.forEach(function(region){
			if(region.render && region.name != "header"){
				ngCtrl.renderTabBar = true;		
			}		
		});

		ngCtrl.userHasRecordPermissions = function (permissionsCsv) {
			return webvellaCoreService.userHasRecordPermissions(ngCtrl.entity, permissionsCsv);
		}
		ngCtrl.getRelationLabel = function (item) {
			if (item.fieldLabel) {
				return item.fieldLabel
			}
			else {
				var relationName = item.relationName;
				var relation = findInArray(ngCtrl.entityRelations, "name", relationName);
				if (relation) {
					return relation.label;
				}
				else {
					return "";
				}
			}
		}
		//#endregion

		//#region << Save >>
		ngCtrl.create = function (redirectTarget) {
			//Validate 
			ngCtrl.validation = {};
			ngCtrl.validation.hasError = false;
			ngCtrl.validation.errorMessage = "";
			for (var k = 0; k < availableViewFields.length; k++) {
				if (availableViewFields[k].type === "field" && availableViewFields[k].meta.required) {
					if (ngCtrl.view.data[availableViewFields[k].dataName] == null || ngCtrl.view.data[availableViewFields[k].dataName] == "") {
						ngCtrl.validation[availableViewFields[k].dataName] = true;
						ngCtrl.validation.hasError = true;
						ngCtrl.validation.errorMessage = "A required data is missing!";
					}
					else{
						ngCtrl.validation[availableViewFields[k].dataName] = false;
					}
				}
				if (availableViewFields[k].type === "fieldFromRelation" && availableViewFields[k].fieldRequired) {
					//The field requested to be visualized is "$field$role_n_n_project_team$name", but we store in the data and submit the "$role_n_n_project_team.id" 
					//as the record Id is always unique which we cannot be sure for the selected visualization field
					//Here the trick is to check and validate the visualized field based on the submitted data. This can be done based on how the data names are generated
					//which is always " '$' + elementType + '$' + relation_name + '$' + elementName".
					//The format to create relation automatically on record creation is " '$' + relation_name + '.id'"
					//So we can check based on the relation name
					var relationNameFoundInData = false;
					var dataNameArray = availableViewFields[k].dataName.split('$');
					for (var propertyName in ngCtrl.view.data) {
						if(propertyName.indexOf(dataNameArray[2]) != -1 ){
							if (ngCtrl.view.data[propertyName] != null && ngCtrl.view.data[propertyName] != "") {
								relationNameFoundInData = true;
							}
							break;
						}
					}

					if (!relationNameFoundInData) {
						ngCtrl.validation[availableViewFields[k].dataName] = true;
						ngCtrl.validation.hasError = true;
						ngCtrl.validation.errorMessage = "A required data is missing!";
					}
					else {
						ngCtrl.validation[availableViewFields[k].dataName] = false;
					}
				}
			}
			if (!ngCtrl.validation.hasError) {
				//Alter some data before save
				for (var k = 0; k < availableViewFields.length; k++) {
					if (availableViewFields[k].type === "field") {
						switch (availableViewFields[k].meta.fieldType) {
							case 4: //Date
								if (ngCtrl.view.data[availableViewFields[k].dataName] != null) {
									ngCtrl.view.data[availableViewFields[k].dataName] = moment(ngCtrl.view.data[availableViewFields[k].dataName]).startOf('day').utc().toISOString();
								}
								break;
							case 5: //Date & Time
								if (ngCtrl.view.data[availableViewFields[k].dataName] != null) {
									ngCtrl.view.data[availableViewFields[k].dataName] = moment(ngCtrl.view.data[availableViewFields[k].dataName]).startOf('minute').utc().toISOString();
								}
								break;
							case 14: //Percent
								//need to convert to decimal 0 <= val <= 100 Divide by 100
								//Hack for proper javascript division
								$scope.Math = window.Math;
								var helpNumber = 10000000;
								var multipliedValue = $scope.Math.round(ngCtrl.view.data[availableViewFields[k].dataName] * helpNumber);
								ngCtrl.view.data[availableViewFields[k].dataName] = multipliedValue / (100 * helpNumber);
								break;
						}
					}
					else if (availableViewFields[k].type === "fieldFromRelation") {
						//Currently no need to remove field from relations that are not id, as they are not attached to the entityData anyway
					}
				}

				/// Aux
				ngCtrl.successCallback = function (response) {
					ngToast.create({
						className: 'success',
						content: '<span class="go-green">Success:</span> ' + response.message
					});
					if ($stateParams.returnUrl) {
						var returnUrl = decodeURI($stateParams.returnUrl);
						$location.search("returnUrl", null);
						$location.path(returnUrl);
					}
					else {
						switch (redirectTarget) {
							case "details":
								alert("the details view name should be generated")
								//$state.go("webvella-areas-record-view", {
								//	areaName: $stateParams.areaName,
								//	entityName: $stateParams.entityName,
								//	recordId: response.object.data[0].id,
								//	viewName: detailsViewName,
								//	auxPageName: "*",
								//	page: $stateParams.page

								//}, { reload: true });
								break;
							case "list":
								$state.go("webvella-area-list-general", {
									areaName: $stateParams.areaName,
									entityName: $stateParams.entityName,
									listName: $stateParams.listName,
									page: $stateParams.page

								}, { reload: true });
								break;
						}
					}
				}

				webvellaCoreService.createRecord(ngCtrl.entity.name, ngCtrl.view.data, ngCtrl.successCallback, errorCallback);
			}
			else {
				//Scroll top
				// set the location.hash to the id of
				// the element you wish to scroll to.
				$location.hash('page-title');

				// call $anchorScroll()
				$anchorScroll();

			}
		};

		ngCtrl.cancel = function () {
			if ($stateParams.returnUrl) {
				var returnUrl = decodeURI($stateParams.returnUrl);
				$location.search("returnUrl", null);
				$location.path(returnUrl);
			}
			else {
				$timeout(function () {
					$state.go("webvella-area-list-general", {
						areaName: $stateParams.areaName,
						entityName: $stateParams.entityName,
						listName: $stateParams.listName,
						page: $stateParams.page

					}, { reload: true });
				}, 0);
			}
		};

		/// Aux
		function errorCallback(response) {
			alert(response.message);
		}

		//#endregion

		//#region << Modals >>

		//#region << Relation field >>
		ngCtrl.dummyFields = {};  //These fields will present data to the user that will not be submitted
		////////////////////
		// Single selection modal used in 1:1 relation and in 1:N when the currently viewed entity is a target in this relation
		ngCtrl.openManageRelationFieldModal = function (item, relationType, dataKind) {
			//relationType = 1 (one-to-one) , 2(one-to-many), 3(many-to-many)
			//dataKind - target, origin, origin-target

			//Select ONE item modal
			if (relationType == 1 || (relationType == 2 && dataKind == "target")) {
				var modalInstance = $uibModal.open({
					animation: false,
					templateUrl: 'manageRelationFieldModal.html',
					controller: 'CreateRelationFieldModalController',
					controllerAs: "popupCtrl",
					size: "lg",
					resolve: {
						ngCtrl: function () {
							return ngCtrl;
						},
						selectedItem: function () {
							return item;
						},
						selectedRelationType: function () {
							return relationType;
						},
						selectedDataKind: function () {
							return dataKind;
						},
						resolvedLookupRecords: function () {
							return resolveLookupRecords(item, relationType, dataKind);
						},
						modalMode: function () {
							return "single-selection";
						},
					}
				});
				//On modal exit
				modalInstance.result.then(function (returnObject) {
					var selectedRecord = {};
					//1.the field name needed for the view (item.fieldName) and the other's entity name	(item.entityName)
					//2.get the record by returnObject.selectedRecordId, with the value of the field in the view 
					function modalCase1SuccessCallback(response) {
						//3.set the value of the dummy field (dummyFields[item.dataName] in the create to match the found view field value
						var dummyFieldValue = null;
						var dataNameArray = item.dataName.split('$');
						var dummyFieldName = dataNameArray[3];
						ngCtrl.dummyFields[item.dataName] = webvellaCoreService.renderFieldValue(response.object.data[0][dummyFieldName], item.meta);
						//4.set in the create model $field$relation_name$id -> is this is the only way to be sure that the value will be unique and the api will not produce error
						ngCtrl.view.data["$" + dataNameArray[2] + "." + "id"] = returnObject.selectedRecordId;
					}
					function modalCase1ErrorCallback(response) {
						ngToast.create({
							className: 'error',
							content: '<span class="go-red">Error:</span> ' + response.message,
							timeout: 7000
						});
					}
					webvellaCoreService.getRecord(returnObject.selectedRecordId, "*", item.entityName, modalCase1SuccessCallback, modalCase1ErrorCallback);
				});
			}
				//Select MULTIPLE item modal
			else if ((relationType == 2 && dataKind == "origin") || relationType == 3) {
				var modalInstance = $uibModal.open({
					animation: false,
					templateUrl: 'manageRelationFieldModal.html',
					controller: 'CreateRelationFieldModalController',
					controllerAs: "popupCtrl",
					size: "lg",
					resolve: {
						ngCtrl: function () {
							return ngCtrl;
						},
						selectedItem: function () {
							return item;
						},
						selectedRelationType: function () {
							return relationType;
						},
						selectedDataKind: function () {
							return dataKind;
						},
						resolvedLookupRecords: function () {
							return resolveLookupRecords(item, relationType, dataKind);
						},
						modalMode: function () {
							return "multi-selection";
						},
					}
				});
				//On modal exit
				modalInstance.result.then(function (returnObject) {
					var selectedRecords = [];
					var dataNameArray = item.dataName.split('$');
					var dummyFieldName = dataNameArray[3];
					var idFieldPrefix = "$" + dataNameArray[2] + ".";
					//1.the field name needed for the view (item.fieldName) and the other's entity name	(item.entityName)
					//2.get the record by returnObject.selectedRecordId, with the value of the field in the view 
					//2.get the record by returnObject.selectedRecordId, with the value of the field in the view 
					function modalCase1SuccessCallback(response) {
						//3.set the value of the dummy field (dummyFields[item.dataName] in the create to match the found view field value
						var dummyFieldValue = null;
						ngCtrl.dummyFields[item.dataName] = [];
						ngCtrl.view.data[idFieldPrefix + "id"] = [];
						for (var i = 0; i < response.object.data.length; i++) {
							ngCtrl.dummyFields[item.dataName].push(webvellaCoreService.renderFieldValue(response.object.data[i][dummyFieldName], item.meta));
							//4.set in the create model $field$relation_name$id -> is this is the only way to be sure that the value will be unique and the api will not produce error
							ngCtrl.view.data[idFieldPrefix + "id"].push(response.object.data[i]["id"]);
						}
					}
					function modalCase1ErrorCallback(response) {
						ngToast.create({
							className: 'error',
							content: '<span class="go-red">Error:</span> ' + response.message,
							timeout: 7000
						});
					}
					var fieldsArray = [];
					fieldsArray.push(dummyFieldName);

					if (returnObject.selectedRecordIdArray.length == 0) {
						ngCtrl.dummyFields[item.dataName] = [];
						ngCtrl.view.data[idFieldPrefix + "id"] = [];
					}
					else {
						var recordIdCSV = returnObject.selectedRecordIdArray.join(',');
						var fieldCSV = fieldsArray.join(',');
						webvellaCoreService.getRecordsWithoutList(recordIdCSV, fieldCSV,null, item.entityName, modalCase1SuccessCallback, modalCase1ErrorCallback);
					}
				});
			}
		}
		ngCtrl.modalSelectedItem = {};
		ngCtrl.modalRelationType = -1;
		ngCtrl.modalDataKind = "";

		//Resolve function lookup records
		var resolveLookupRecords = function (item, relationType, dataKind) {
			// Initialize
			var defer = $q.defer();
			var defaultLookupList = null;
			ngCtrl.modalSelectedItem = fastCopy(item);
			ngCtrl.modalRelationType = fastCopy(relationType);
			ngCtrl.modalDataKind = fastCopy(dataKind);
			// Process
			function errorCallback(response) {
				ngToast.create({
					className: 'error',
					content: '<span class="go-red">Error:</span> ' + response.message,
					timeout: 7000
				});
				defer.reject();
			}
			function getListRecordsSuccessCallback(response) {
				var responseObj = {};
				responseObj.success = true;
				responseObj.object = {};
				responseObj.object.meta = defaultLookupList;
				responseObj.object.data = response.object;
				defer.resolve(responseObj); //Submitting the whole response to manage the error states
			}

			function getEntityMetaSuccessCallback(response) {
				var entityMeta = response.object;
				var selectedLookupListName = ngCtrl.modalSelectedItem.fieldLookupList;
				var selectedLookupList = null;
				//Find the default lookup field if none return null.
				for (var i = 0; i < entityMeta.recordLists.length; i++) {
					//Check if the selected lookupList Exists
					if (entityMeta.recordLists[i].name == selectedLookupListName) {
						selectedLookupList = entityMeta.recordLists[i];
					}
					if (entityMeta.recordLists[i].default && entityMeta.recordLists[i].type == "lookup") {
						defaultLookupList = entityMeta.recordLists[i];
					}
				}

				if (selectedLookupList == null && defaultLookupList == null) {
					response.message = "This entity does not have selected or default lookup list";
					response.success = false;
					errorCallback(response);
				}
				else {

					//var gg = ngCtrl.modalSelectedItem;
					//ngCtrl.modalRelationType;
					//ngCtrl.modalDataKind;
					if (selectedLookupList != null) {
						defaultLookupList = selectedLookupList;
					}

					//Current record is Origin
					if (ngCtrl.modalDataKind == "origin") {
						//Find if the target field is required
						var targetRequiredField = false;
						var modalCurrrentRelation = ngCtrl.getRelation(ngCtrl.modalSelectedItem.relationName);
						for (var m = 0; m < entityMeta.fields.length; m++) {
							if (entityMeta.fields[m].id == modalCurrrentRelation.targetFieldId) {
								targetRequiredField = entityMeta.fields[m].required;
							}
						}
						if (targetRequiredField && ngCtrl.modalRelationType == 1) {
							//Case 1 - Solves the problem when the target field is required, but we are currently looking on the origin field holding record. 
							//In this case we cannot allow this relation to be managed from this origin record as the change will leave the old target record with null for its required field
							var lockedChangeResponse = {
								success: false,
								message: "This is a relation field, that cannot be managed from this record. Try managing it from the related <<" + entityMeta.label + ">> entity record",
								object: null
							}
							getListRecordsSuccessCallback(lockedChangeResponse);
						}
						else {
							webvellaCoreService.getRecordsByListMeta(defaultLookupList, entityMeta.name, 1, null, null, getListRecordsSuccessCallback, errorCallback);
						}
					}
					else if (ngCtrl.modalDataKind == "target") {
						//Current records is Target
						webvellaCoreService.getRecordsByListMeta(defaultLookupList, entityMeta.name, 1, null, null, getListRecordsSuccessCallback, errorCallback);
					}
				}
			}

			webvellaCoreService.getEntityMeta(item.entityName, getEntityMetaSuccessCallback, errorCallback);

			return defer.promise;
		}

		//#endregion


		//#endregion

		//#region << List actions and webvellaViewActionService bind >>
		ngCtrl.actionService = webvellaViewActionService;
		ngCtrl.pageTitleActions = [];
		ngCtrl.pageTitleDropdownActions = [];
		ngCtrl.createBottomActions = [];
		ngCtrl.pageBottomActions = [];
		ngCtrl.view.meta.actionItems.sort(sort_by('menu', { name: 'weight', primer: parseInt, reverse: false }));
		ngCtrl.view.meta.actionItems.forEach(function (actionItem) {
			switch (actionItem.menu) {
				case "page-title":
					ngCtrl.pageTitleActions.push(actionItem);
					break;
				case "page-title-dropdown":
					ngCtrl.pageTitleDropdownActions.push(actionItem);
					break;
				case "create-bottom":
					ngCtrl.createBottomActions.push(actionItem);
					break;
				case "page-bottom":
					ngCtrl.pageBottomActions.push(actionItem);
					break;
			}
		});
		//#endregion

		//#region << Run  webvellaViewActionService.postload >>
		if (webvellaViewActionService.postload === undefined || typeof (webvellaViewActionService.postload) != "function") {
			$log.warn("No webvellaViewActionService.postload function. Skipping");
		}
		else {
			var actionsOnLoadResult = webvellaViewActionService.postload(ngCtrl, $rootScope, $state);
			if (actionsOnLoadResult != true) {
				ngCtrl.validation.hasError = true;
				ngCtrl.validation.errorMessage = $sce.trustAsHtml(actionsOnLoadResult);
			}
		}
		//#endregion
	}
	//#endregion

	//#region < Modal Controllers >
	CreateRelationFieldModalController.$inject = ['ngCtrl', '$uibModalInstance', '$log', '$q', '$stateParams', 'modalMode', 'resolvedLookupRecords',
        'selectedDataKind', 'selectedItem', 'selectedRelationType', 'webvellaCoreService', 'ngToast', '$timeout', '$state'];
	function CreateRelationFieldModalController(ngCtrl, $uibModalInstance, $log, $q, $stateParams, modalMode, resolvedLookupRecords,
        selectedDataKind, selectedItem, selectedRelationType, webvellaCoreService, ngToast, $timeout, $state) {


		var popupCtrl = this;
		popupCtrl.currentPage = 1;
		popupCtrl.parentData = fastCopy(ngCtrl);
		popupCtrl.selectedItem = fastCopy(selectedItem);
		popupCtrl.modalMode = fastCopy(modalMode);
		popupCtrl.hasWarning = false;
		popupCtrl.warningMessage = "";
		//Init
		var index = selectedItem.dataName.lastIndexOf('$') + 1;
		var dummyFieldName = selectedItem.dataName.slice(index, selectedItem.dataName.length);
		var idFieldPrefix = selectedItem.dataName.slice(0, index);
		popupCtrl.currentlyAttachedIds = [];
		popupCtrl.getRelationLabel = popupCtrl.parentData.getRelationLabel;


		//Get the default lookup list for the entity
		if (resolvedLookupRecords.success) {
			popupCtrl.relationLookupList = fastCopy(resolvedLookupRecords.object);
		}
		else {
			popupCtrl.hasWarning = true;
			popupCtrl.warningMessage = resolvedLookupRecords.message;
		}

		//#region << Search >>
		popupCtrl.checkForSearchEnter = function (e) {
			var code = (e.keyCode ? e.keyCode : e.which);
			if (code == 13) { //Enter keycode
				popupCtrl.submitSearchQuery();
			}
		}
		popupCtrl.submitSearchQuery = function () {
			function successCallback(response) {
				popupCtrl.relationLookupList = fastCopy(response.object);
			}
			function errorCallback(response) { }

			if (popupCtrl.searchQuery) {
				popupCtrl.searchQuery = popupCtrl.searchQuery.trim();
			}
			webvellaCoreService.getRecordsByListMeta(popupCtrl.relationLookupList.meta, popupCtrl.selectedItem.entityName, 1,  null,null, successCallback, errorCallback);
		}
		//#endregion

		//#region << Paging >>
		popupCtrl.selectPage = function (page) {
			// Process
			function successCallback(response) {
				popupCtrl.relationLookupList = fastCopy(response.object);
				popupCtrl.currentPage = page;
			}

			function errorCallback(response) {

			}

			webvellaCoreService.getRecordsByListMeta(popupCtrl.relationLookupList.meta, popupCtrl.selectedItem.entityName, page, null, null, successCallback, errorCallback);
		}

		//#endregion

		//#region << Logic >>

		//Render field values
		popupCtrl.renderFieldValue = webvellaCoreService.renderFieldValue;

		popupCtrl.isSelectedRecord = function (recordId) {
			if (popupCtrl.currentlyAttachedIds) {
				return popupCtrl.currentlyAttachedIds.indexOf(recordId) > -1
			}
			else {
				return false;
			}
		}

		//Single record before save
		popupCtrl.selectSingleRecord = function (record) {
			var returnObject = {
				relationName: popupCtrl.selectedItem.relationName,
				dataKind: selectedDataKind,
				selectedRecordId: record.id
			};
			$uibModalInstance.close(returnObject);
		};

		// Multiple records before save
		popupCtrl.attachRecord = function (record) {
			//Update the currentlyAttachedIds
			var elementIndex = popupCtrl.currentlyAttachedIds.indexOf(record.id);
			if (elementIndex == -1) {
				//this is the normal case
				popupCtrl.currentlyAttachedIds.push(record.id);
			}
			else {
				//if it is already in the highlighted list there is probably some miscalculation from previous operation, but for now we will do nothing
			}

		}
		popupCtrl.detachRecord = function (record) {
			//Update the currentlyAttachedIds for highlight
			var elementIndex = popupCtrl.currentlyAttachedIds.indexOf(record.id);
			if (elementIndex > -1) {
				//this is the normal case
				popupCtrl.currentlyAttachedIds.splice(elementIndex, 1);
			}
			else {
				//if it is already not in the highlighted list there is probably some miscalculation from previous operation, but for now we will do nothing
			}
		}
		popupCtrl.saveRelationChanges = function () {
			var returnObject = {
				relationName: popupCtrl.selectedItem.relationName,
				dataKind: selectedDataKind,
				selectedRecordIdArray: popupCtrl.currentlyAttachedIds
			};
			$uibModalInstance.close(returnObject);
			//category_id
		};


		//#endregion


		popupCtrl.cancel = function () {
			$uibModalInstance.dismiss('cancel');
		};

	};
	//#endregion


})();



