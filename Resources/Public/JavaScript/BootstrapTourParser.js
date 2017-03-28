/**
 * this module provide the functionality to parse a json string from the TYPO3 Backend to a valid tour configuration
 */
define(['jquery', 'TYPO3/CMS/Guide/Logger'], function (jQuery, Logger) {


	var TourParser = function() {

	};

	/**
	 * Parse json notation to steps
	 * @param unprocessedSteps
	 */
	TourParser.prototype.parseSteps = function(unprocessedSteps) {
		var steps = [];
		Logger.log(unprocessedSteps);
		if(typeof unprocessedSteps === 'undefined') {
			return steps;
		}

		jQuery.each( unprocessedSteps, function(key, current) {

			steps.push({
				// a identifier that add the ability jump to this step
				id: current.id,
				// the element jQuery selector to that the popover will be attached
				element: current.selector,
				// the title of the popover
				title: current.title,
				// The content of the popover
				content: current.content,

				/**
				 * placement of the popover
				 *
				 * for example: top, bottom, left, right
				 */
				placement: current.placement,
				smartPlacement: true,

				// function that will be executed shown the current step will be shown
				show: current.show,
				shown: current.shown,
				backdrop: current.backdrop,
				backdropPadding: current.backdropPadding,
				// function parameters to jump to another tour and step
				nextStep: current.next,
				showArrow: current.showArrow,
				// Events which will be executed onHide
				hide: current.hide,
				// Enable the reflex mode: attach an handler on click on the step element to continue the tour.
				// In order to bind the handler to a custom event, you can pass a string with its name.
				reflex: current.click
			});
		});

		return steps;
	};

	TourParser.prototype.parseTour = function(current) {

		return new Tour({
			// the module name which is used for requirement checks
			name: current.name,

			// the module id that is used for requirement checks
			moduleId: current.moduleName,

			// Template for the tour steps
			template: top.TYPO3.Guide.getTemplate(),

			//
			storage: false,

			/**
			 * Function to execute when the tour starts.
			 *
			 * Here we check for the prerequirements
			 * @param tour
			 */
			onStart:    function(tour) {
				/*
				Logger.log(tour);
				if (tour._options.moduleId != 'core') {
					if(top.TYPO3.ModuleMenu.App.loadedModule != tour._options.moduleId) {
						Logger.log('jump to: ', tour._options.moduleId);
						top.jump('', tour._options.moduleId, '', 0);
					}
				}
				*/
			},

			/**
			 * Function to execute right shown each step is shown.
			 * @param tour
			 */
			onShow: function(tour) {
				var stepIndex = tour.getCurrentStep();
				if(stepIndex != null) {
					var step = tour.getStep(stepIndex + 1);
					if(typeof step !== "undefined" && typeof step.show !== "undefined") {
						tour._options.handleEvents(step.show, 'onShow', tour, step);
					}
				}
			},

			/**
			 * Function to execute right after the step is shown.
			 * @param tour
			 */
			onShown:    function(tour) {
				var stepIndex = tour.getCurrentStep();
				var stepIdentifier = '.tour-' + tour._options.name + '.tour-' + tour._options.name + '-' + stepIndex;
				jQuery(stepIdentifier).animate({'opacity': '1'}, 500);
				var $popover = jQuery('.popover.tour');
				var $next = $popover.find('[data-role="next"]');
				tour._options.sendStatus(tour);
				if(stepIndex != null) {
					var step = tour.getStep(stepIndex);
					if(typeof step.nextStep !== 'undefined' && !top.TYPO3.Guide.TourData[step.nextStep.tour].disabled) {
						$next.removeClass('disabled').prop('disabled', false);
					}
					// Hide Arrow if needed
					if(!step.showArrow) {
						Logger.log("hide the arrow");
						jQuery('.tour-' + tour._options.name + '.tour-' + tour._options.name + '-' + tour.getCurrentStep() + '> .arrow').hide();
					}
					// Handle requirements which are executed shown the step is shown
					if(typeof step.shown !== "undefined") {
						tour._options.handleEvents(step.shown, 'onShown', tour, step);
					}
				}
			},

			/**
			 * Function which is executing on hiding a step
			 * @param tour
			 */
			onHide: function(tour) {
				var stepIndex = tour.getCurrentStep();
				if(stepIndex != null) {
					var step = tour.getStep(stepIndex);
					// Handle requirements which are executed before the step is shown
					if(typeof step.before !== "undefined") {
						tour._options.handleEvents(step.hide, 'onHide', tour, step);
					}
				}
			},

			/**
			 * Function to execute when the tour ends.
			 * @param tour
			 */
			onEnd: function(tour) {
				var $popover = jQuery('.popover.tour');
				top.TYPO3.Guide.currentTourName = '';
				if ($popover.find('[data-role=show-again]').is(':checked')) {
					jQuery.ajax({
						dataType: 'json',
						url: TYPO3.settings.ajaxUrls['GuideController::ajaxRequest'],
						data: {
							cmd: 'disableTour',
							tour: tour._options.name,
							stepNo: tour.getCurrentStep()
						},
						success: function (result) {
							Logger.log("Disable Tour", result);
							top.TYPO3.Guide.TourData[tour._options.name].disabled = true;
						},
						error: function (result) {
							Logger.error('Upps, an error occured. Message was: ', result);
						}
					});
				}
			},

			/**
			 * Function to execute when next step is called.
			 * @param tour
			 */
			onNext:     function(tour) {
				var stepIndex = tour.getCurrentStep();
				var step = tour.getStep(stepIndex);
				Logger.log('onNext: ', typeof step.nextStep !== "undefined", ', tour:', tour, ', step:', step);
				if(typeof step.nextStep !== "undefined") {

					var newTourName = step.nextStep.tour;
					var newTour = top.TYPO3.Guide.TourData[step.nextStep.tour];

					tour.end();

					if(typeof newTour !== "undefined") {
						if (newTour.moduleName !== 'core') {
							if(top.TYPO3.ModuleMenu.App.loadedModule != newTour.moduleName) {
								Logger.log('jump to: ', newTour.moduleName);
								tour.end();
								top.jump('', newTour.moduleName, '', 0);
								return;
							}
						}
					}
					var stepId = parseInt(step.nextStep.step, 10);
					Logger.log('switch to tour: ', newTourName, ', step: ', stepId);
					if(stepId>0) {
						top.TYPO3.Guide.startTourWithStep(newTourName, stepId);
					}
					else {
						top.TYPO3.Guide.startTour(newTourName);
					}
				}
			},

			steps: this.parseSteps(current.steps),

			handleEvents: function(events, eventType, tour, step) {
				Logger.log("Handle Events for " + eventType);

				if(typeof events !== "undefined" ) {
					jQuery.each(events, function(key, data) {
						switch(key) {
							case 'addClass':
								Logger.log("Execute add class");
								jQuery(data.selector).addClass(data.class);
								break;
							case 'removeClass':
								Logger.log("Execute remove class");
								jQuery(data.selector).removeClass(data.class);
								break;
							case 'openSelectBox':
								var selectBox = jQuery(data.selector);
								Logger.log('OPEN: ', selectBox);

								if (document.createEvent) {
									var event = document.createEvent("MouseEvents");
									event.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
									selectBox[0].dispatchEvent(event);
								} else if (element.fireEvent) {
									selectBox[0].fireEvent("onmousedown");
								}
								break;
							case 'renameNextButton':
								var $popover = jQuery('.tour-' + tour._options.name + '.tour-' + tour._options.name + '-' + tour.getCurrentStep());
								var $next = $popover.find('[data-role="next"]');
								$next.html(data);
								break;
						}
					});

				}
			},

			/**
			 * Sends the current tour status to the backend for reminding it in user configuration
			 * @param tour
			 */
			sendStatus: function(tour) {
				jQuery.ajax({
					dataType: 'json',
					url: TYPO3.settings.ajaxUrls['GuideController::ajaxRequest'],
					data: {
						cmd: 'setStepNo',
						tour: tour._options.name,
						stepNo: tour.getCurrentStep()
					},
					success: function (result) {
						Logger.log('SET STEP: ', result);

						if(typeof result['cmd']['setStepNo'] != 'undefined') {
							var tour = result.cmd.setStepNo.tour;
							var stepNo = result.cmd.setStepNo.stepNo;
							if(typeof top.TYPO3.Guide.TourData[tour] != 'undefined') {
								top.TYPO3.Guide.TourData[tour].currentStepNo = stepNo;
								Logger.log('SET STEP: ', top.TYPO3.Guide.TourData[tour]);
							}
						}

					},
					error: function (result) {
						Logger.error('Upps, an error occured. Message was: ', result);
					}
				});
			}

		});
	};
	
	/**
	 * Tour parser
	 * @param unprocessedTours
	 */
	TourParser.prototype.parse = function(unprocessedTours) {
		var processedTours = [];
		for (var i = 0; i < unprocessedTours.length; i++) {
			var current = unprocessedTours[i];
			processedTours.push(this.parseTour(current));
		}
	};
	return TourParser;
});