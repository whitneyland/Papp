angular.module("ui.bootstrap", ["ui.bootstrap.tpls", "ui.bootstrap.accordion","ui.bootstrap.dialog","ui.bootstrap.dropdownToggle","ui.bootstrap.modal","ui.bootstrap.pagination","ui.bootstrap.tooltip"]);

angular.module("ui.bootstrap.tpls", ["template/accordion/accordion-group.html","template/accordion/accordion.html","template/dialog/message.html","template/pagination/pagination.html","template/tooltip/tooltip-popup.html"]);

angular.module('ui.bootstrap.accordion', ['ui.bootstrap.collapse'])

.constant('accordionConfig', {
  closeOthers: true
})

.controller('AccordionController', ['$scope', '$attrs', 'accordionConfig', function ($scope, $attrs, accordionConfig) {
  
  // This array keeps track of the accordion groups
  this.groups = [];

  // Ensure that all the groups in this accordion are closed, unless close-others explicitly says not to
  this.closeOthers = function(openGroup) {
    var closeOthers = angular.isDefined($attrs.closeOthers) ? $scope.$eval($attrs.closeOthers) : accordionConfig.closeOthers;
    if ( closeOthers ) {
      angular.forEach(this.groups, function (group) {
        if ( group !== openGroup ) {
          group.isOpen = false;
        }
      });
    }
  };
  
  // This is called from the accordion-group directive to add itself to the accordion
  this.addGroup = function(groupScope) {
    var that = this;
    this.groups.push(groupScope);

    groupScope.$on('$destroy', function (event) {
      that.removeGroup(groupScope);
    });
  };

  // This is called from the accordion-group directive when to remove itself
  this.removeGroup = function(group) {
    var index = this.groups.indexOf(group);
    if ( index !== -1 ) {
      this.groups.splice(this.groups.indexOf(group), 1);
    }
  };

}]);

// The accordion directive simply sets up the directive controller
// and adds an accordion CSS class to itself element.
angular.module('ui.bootstrap.accordion').directive('accordion', function () {
  return {
    restrict:'EA',
    controller:'AccordionController',
    transclude: true,
    replace: false,
    templateUrl: 'template/accordion/accordion.html'
  };
});

// The accordion-group directive indicates a block of html that will expand and collapse in an accordion
angular.module('ui.bootstrap.accordion').directive('accordionGroup', ['$parse', '$transition', '$timeout', function($parse, $transition, $timeout) {
  return {
    require:'^accordion',         // We need this directive to be inside an accordion
    restrict:'EA',
    transclude:true,              // It transcludes the contents of the directive into the template
    replace: true,                // The element containing the directive will be replaced with the template
    templateUrl:'template/accordion/accordion-group.html',
    scope:{ heading:'@' },        // Create an isolated scope and interpolate the heading attribute onto this scope
    controller: function($scope) {
        this.setHeading = function(element) {
            this.heading = element;
        };
    },
    link: function(scope, element, attrs, accordionCtrl) {
      var getIsOpen, setIsOpen;

      accordionCtrl.addGroup(scope);

      scope.isOpen = false;
      
      if ( attrs.isOpen ) {
        getIsOpen = $parse(attrs.isOpen);
        setIsOpen = getIsOpen.assign;

        scope.$watch(
          function watchIsOpen() { return getIsOpen(scope.$parent); },
          function updateOpen(value) { scope.isOpen = value; }
        );
        
        scope.isOpen = getIsOpen ? getIsOpen(scope.$parent) : false;
      }

      scope.$watch('isOpen', function(value) {
        if ( value ) {
          accordionCtrl.closeOthers(scope);
        }
        if ( setIsOpen ) {
          setIsOpen(scope.$parent, value);
        }
      });

    }
  };
}]);

// Use accordion-heading below an accordion-group to provide a heading containing HTML
// <accordion-group>
//   <accordion-heading>Heading containing HTML - <img src="..."></accordion-heading>
// </accordion-group>
angular.module('ui.bootstrap.accordion').directive('accordionHeading', function() {
    return {
        restrict: 'E',
        transclude: true,   // Grab the contents to be used as the heading
        template: '',       // In effect remove this element!
        replace: true,
        require: '^accordionGroup',
        compile: function(element, attr, transclude) {
            return function link(scope, element, attr, accordionGroupCtrl) {
                // Pass the heading to the accordion-group controller
                // so that it can be transcluded into the right place in the template
                console.log(scope, transclude(scope));
                accordionGroupCtrl.setHeading(transclude(scope, function(){}));
            };
        }
    };
});

// Use in the accordion-group template to indicate where you want the heading to be transcluded
// You must provide the property on the accordion-group controller that will hold the transcluded element
// <div class="accordion-group">
//   <div class="accordion-heading" ><a ... accordion-transclude="heading">...</a></div>
//   ...
// </div>
angular.module('ui.bootstrap.accordion').directive('accordionTransclude', function() {
    return {
        require: '^accordionGroup',
        link: function(scope, element, attr, controller) {
            scope.$watch(function() { return controller[attr.accordionTransclude]; }, function(heading) {
                if ( heading ) {
                    element.html('');
                    element.append(heading);
                }
            });
        }
    };
});

// The `$dialogProvider` can be used to configure global defaults for your
// `$dialog` service.
var dialogModule = angular.module('ui.bootstrap.dialog', ['ui.bootstrap.transition']);

dialogModule.controller('MessageBoxController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
  $scope.title = model.title;
  $scope.message = model.message;
  $scope.buttons = model.buttons;
  $scope.close = function(res){
    dialog.close(res);
  };
}]);

dialogModule.provider("$dialog", function(){

  // The default options for all dialogs.
	var defaults = {
		backdrop: true,
		modalClass: 'modal',
		backdropClass: 'modal-backdrop',
    transitionClass: 'fade',
    triggerClass: 'in',
		resolve:{},
		backdropFade: false,
		modalFade:false,
		keyboard: true, // close with esc key
		backdropClick: true // only in conjunction with backdrop=true
    /* other options: template, templateUrl, controller */
	};

	var globalOptions = {};

  // The `options({})` allows global configuration of all dialogs in the application.
  //
  //      var app = angular.module('App', ['ui.bootstrap.dialog'], function($dialogProvider){
  //        // don't close dialog when backdrop is clicked by default
  //        $dialogProvider.options({backdropClick: false});
  //      });
	this.options = function(value){
		globalOptions = value;
	};

  // Returns the actual `$dialog` service that is injected in controllers
	this.$get = ["$http", "$document", "$compile", "$rootScope", "$controller", "$templateCache", "$q", "$transition", "$injector",
  function ($http, $document, $compile, $rootScope, $controller, $templateCache, $q, $transition, $injector) {

		var body = $document.find('body');

		function createElement(clazz) {
			var el = angular.element("<div>");
			el.addClass(clazz);
			return el;
		}

    // The `Dialog` class represents a modal dialog. The dialog class can be invoked by providing an options object
    // containing at lest template or templateUrl and controller:
    //
    //     var d = new Dialog({templateUrl: 'foo.html', controller: 'BarController'});
    //
    // Dialogs can also be created using templateUrl and controller as distinct arguments:
    //
    //     var d = new Dialog('path/to/dialog.html', MyDialogController);
		function Dialog(opts) {

      var self = this, options = this.options = angular.extend({}, defaults, globalOptions, opts);

      this.backdropEl = createElement(options.backdropClass);
      if(options.backdropFade){
        this.backdropEl.addClass(options.transitionClass);
        this.backdropEl.removeClass(options.triggerClass);
      }

      this.modalEl = createElement(options.modalClass);
      if(options.modalFade){
        this.modalEl.addClass(options.transitionClass);
        this.modalEl.removeClass(options.triggerClass);
      }

      this.handledEscapeKey = function(e) {
        if (e.which === 27) {
          self.close();
          e.preventDefault();
          self.$scope.$apply();
        }
      };

      this.handleBackDropClick = function(e) {
        self.close();
        e.preventDefault();
        self.$scope.$apply();
      };
    }

    // The `isOpen()` method returns wether the dialog is currently visible.
    Dialog.prototype.isOpen = function(){
      return this._open;
    };

    // The `open(templateUrl, controller)` method opens the dialog.
    // Use the `templateUrl` and `controller` arguments if specifying them at dialog creation time is not desired.
    Dialog.prototype.open = function(templateUrl, controller){
      var self = this, options = this.options;

      if(templateUrl){
        options.templateUrl = templateUrl;
      }
      if(controller){
        options.controller = controller;
      }

      if(!(options.template || options.templateUrl)) {
        throw new Error('Dialog.open expected template or templateUrl, neither found. Use options or open method to specify them.');
      }

      this._loadResolves().then(function(locals) {
        var $scope = locals.$scope = self.$scope = $rootScope.$new();

        self.modalEl.html(locals.$template);

        if (self.options.controller) {
          var ctrl = $controller(self.options.controller, locals);
          self.modalEl.contents().data('ngControllerController', ctrl);
        }

        $compile(self.modalEl)($scope);
        self._addElementsToDom();

        // trigger tranisitions
        setTimeout(function(){
          if(self.options.modalFade){ self.modalEl.addClass(self.options.triggerClass); }
          if(self.options.backdropFade){ self.backdropEl.addClass(self.options.triggerClass); }
        });

        self._bindEvents();
      });

      this.deferred = $q.defer();
      return this.deferred.promise;
    };

    // closes the dialog and resolves the promise returned by the `open` method with the specified result.
    Dialog.prototype.close = function(result){
      var self = this;
      var fadingElements = this._getFadingElements();

      if(fadingElements.length > 0){
        for (var i = fadingElements.length - 1; i >= 0; i--) {
          $transition(fadingElements[i], removeTriggerClass).then(onCloseComplete);
        }
        return;
      }

      this._onCloseComplete(result);

      function removeTriggerClass(el){
        el.removeClass(self.options.triggerClass);
      }

      function onCloseComplete(){
        if(self._open){
          self._onCloseComplete(result);
        }
      }
    };

    Dialog.prototype._getFadingElements = function(){
      var elements = [];
      if(this.options.modalFade){
        elements.push(this.modalEl);
      }
      if(this.options.backdropFade){
        elements.push(this.backdropEl);
      }

      return elements;
    };

    Dialog.prototype._bindEvents = function() {
      if(this.options.keyboard){ body.bind('keydown', this.handledEscapeKey); }
      if(this.options.backdrop && this.options.backdropClick){ this.backdropEl.bind('click', this.handleBackDropClick); }
    };

    Dialog.prototype._unbindEvents = function() {
      if(this.options.keyboard){ body.unbind('keydown', this.handledEscapeKey); }
      if(this.options.backdrop && this.options.backdropClick){ this.backdropEl.unbind('click', this.handleBackDropClick); }
    };

    Dialog.prototype._onCloseComplete = function(result) {
      this._removeElementsFromDom();
      this._unbindEvents();

      this.deferred.resolve(result);
    };

    Dialog.prototype._addElementsToDom = function(){
      body.append(this.modalEl);
      if(this.options.backdrop) { body.append(this.backdropEl); }
      this._open = true;
    };

    Dialog.prototype._removeElementsFromDom = function(){
      this.modalEl.remove();
      if(this.options.backdrop) { this.backdropEl.remove(); }
      this._open = false;
    };

    // Loads all `options.resolve` members to be used as locals for the controller associated with the dialog.
    Dialog.prototype._loadResolves = function(){
      var values = [], keys = [], templatePromise, self = this;

      if (this.options.template) {
        templatePromise = $q.when(this.options.template);
      } else if (this.options.templateUrl) {
        templatePromise = $http.get(this.options.templateUrl, {cache:$templateCache})
        .then(function(response) { return response.data; });
      }

      angular.forEach(this.options.resolve || [], function(value, key) {
        keys.push(key);
        values.push(angular.isString(value) ? $injector.get(value) : $injector.invoke(value));
      });

      keys.push('$template');
      values.push(templatePromise);

      return $q.all(values).then(function(values) {
        var locals = {};
        angular.forEach(values, function(value, index) {
          locals[keys[index]] = value;
        });
        locals.dialog = self;
        return locals;
      });
    };

    // The actual `$dialog` service that is injected in controllers.
    return {
      // Creates a new `Dialog` with the specified options.
      dialog: function(opts){
        return new Dialog(opts);
      },
      // creates a new `Dialog` tied to the default message box template and controller.
      //
      // Arguments `title` and `message` are rendered in the modal header and body sections respectively.
      // The `buttons` array holds an object with the following members for each button to include in the
      // modal footer section:
      //
      // * `result`: the result to pass to the `close` method of the dialog when the button is clicked
      // * `label`: the label of the button
      // * `cssClass`: additional css class(es) to apply to the button for styling
      messageBox: function(title, message, buttons){
        return new Dialog({templateUrl: 'template/dialog/message.html', controller: 'MessageBoxController', resolve:
          {model: function() {
            return {
              title: title,
              message: message,
              buttons: buttons
            };
          }
        }});
      }
    };
  }];
});

/*
 * dropdownToggle - Provides dropdown menu functionality in place of bootstrap js
 * @restrict class or attribute
 * @example:
   <li class="dropdown">
     <a class="dropdown-toggle">My Dropdown Menu</a>
     <ul class="dropdown-menu">
       <li ng-repeat="choice in dropChoices">
         <a ng-href="{{choice.href}}">{{choice.text}}</a>
       </li>
     </ul>
   </li>
 */

angular.module('ui.bootstrap.dropdownToggle', []).directive('dropdownToggle', 
['$document', '$location', '$window', function ($document, $location, $window) {
  var openElement = null, close;
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      scope.$watch(function dropdownTogglePathWatch(){return $location.path();}, function dropdownTogglePathWatchAction() {
        if (close) { close(); }
      });

      element.parent().bind('click', function(event) {
        if (close) { close(); }
      });

      element.bind('click', function(event) {
        event.preventDefault();
        event.stopPropagation();

        var iWasOpen = false;

        if (openElement) {
          iWasOpen = openElement === element;
          close();
        }

        if (!iWasOpen){
          element.parent().addClass('open');
          openElement = element;

          close = function (event) {
            if (event) {
              event.preventDefault();
              event.stopPropagation();
            }
            $document.unbind('click', close);
            element.parent().removeClass('open');
            close = null;
            openElement = null;
          };

          $document.bind('click', close);
        }
      });
    }
  };
}]);

angular.module('ui.bootstrap.modal', [])
.constant('modalConfig', {
  backdrop: true,
  escape: true
})
.directive('modal', ['$parse', 'modalConfig', function($parse, modalConfig) {
  var backdropEl;
  var body = angular.element(document.getElementsByTagName('body')[0]);
  return {
    restrict: 'EA',
    link: function(scope, elm, attrs) {
      var opts = angular.extend({}, modalConfig, scope.$eval(attrs.uiOptions || attrs.bsOptions || attrs.options));
      var shownExpr = attrs.modal || attrs.show;
      var setClosed;

      if (attrs.close) {
        setClosed = function() {
          scope.$apply(attrs.close);
        };
      } else {
        setClosed = function() {
          scope.$apply(function() {
            $parse(shownExpr).assign(scope, false);
          });
        };
      }
      elm.addClass('modal');

      if (opts.backdrop && !backdropEl) {
        backdropEl = angular.element('<div class="modal-backdrop"></div>');
        backdropEl.css('display','none');
        body.append(backdropEl);
      }
      
      function setShown(shown) {
        scope.$apply(function() {
          model.assign(scope, shown);
        });
      }

      function escapeClose(evt) {
        if (evt.which === 27) { setClosed(); }
      }
      function clickClose() { 
        setClosed();
      }
      
      function close() {
        if (opts.escape) { body.unbind('keyup', escapeClose); }
        if (opts.backdrop) {
          backdropEl.css('display', 'none').removeClass('in');
          backdropEl.unbind('click', clickClose);
        }
        elm.css('display', 'none').removeClass('in');
        body.removeClass('modal-open');
      }
      function open() {
        if (opts.escape) { body.bind('keyup', escapeClose); }
        if (opts.backdrop) {
          backdropEl.css('display', 'block').addClass('in');
          if(opts.backdrop != "static") {
            backdropEl.bind('click', clickClose);
          }
        }
        elm.css('display', 'block').addClass('in');
        body.addClass('modal-open');
      }

      scope.$watch(shownExpr, function(isShown, oldShown) {
        if (isShown) {
          open();
        } else {
          close();
        }
      });
    }
  };
}]);

angular.module('ui.bootstrap.pagination', [])

.directive('pagination', function() {
  return {
    restrict: 'EA',
    scope: {
      numPages: '=',
      currentPage: '=',
      maxSize: '=',
      onSelectPage: '&',
      nextText: '@',
      previousText: '@'
    },
    templateUrl: 'template/pagination/pagination.html',
    replace: true,
    link: function(scope) {
      scope.$watch('numPages + currentPage + maxSize', function() {
        scope.pages = [];
        
        //set the default maxSize to numPages
        var maxSize = ( scope.maxSize && scope.maxSize < scope.numPages ) ? scope.maxSize : scope.numPages;
        var startPage = scope.currentPage - Math.floor(maxSize/2);
        
        //adjust the startPage within boundary
        if(startPage < 1) {
            startPage = 1;
        }
        if ((startPage + maxSize - 1) > scope.numPages) {
            startPage = startPage - ((startPage + maxSize - 1) - scope.numPages );
        }

        for(var i=0; i < maxSize && i < scope.numPages ;i++) {
          scope.pages.push(startPage + i);
        }
        if ( scope.currentPage > scope.numPages ) {
          scope.selectPage(scope.numPages);
        }
      });
      scope.noPrevious = function() {
        return scope.currentPage === 1;
      };
      scope.noNext = function() {
        return scope.currentPage === scope.numPages;
      };
      scope.isActive = function(page) {
        return scope.currentPage === page;
      };

      scope.selectPage = function(page) {
        if ( ! scope.isActive(page) ) {
          scope.currentPage = page;
          scope.onSelectPage({ page: page });
        }
      };

      scope.selectPrevious = function() {
        if ( !scope.noPrevious() ) {
          scope.selectPage(scope.currentPage-1);
        }
      };
      scope.selectNext = function() {
        if ( !scope.noNext() ) {
          scope.selectPage(scope.currentPage+1);
        }
      };
    }
  };
});
/**
 * The following features are still outstanding: popup delay, animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, html tooltips, and selector delegatation.
 */
angular.module( 'ui.bootstrap.tooltip', [] )
.directive( 'tooltipPopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { tooltipTitle: '@', placement: '@', animation: '&', isOpen: '&' },
    templateUrl: 'template/tooltip/tooltip-popup.html'
  };
})
.directive( 'tooltip', [ '$compile', '$timeout', '$parse', function ( $compile, $timeout, $parse ) {
  
  var template = 
    '<tooltip-popup '+
      'tooltip-title="{{tt_tooltip}}" '+
      'placement="{{tt_placement}}" '+
      'animation="tt_animation()" '+
      'is-open="tt_isOpen"'+
      '>'+
    '</tooltip-popup>';
  
  return {
    scope: true,
    link: function ( scope, element, attr ) {
      var tooltip = $compile( template )( scope ), 
          transitionTimeout;

      attr.$observe( 'tooltip', function ( val ) {
        scope.tt_tooltip = val;
      });

      attr.$observe( 'tooltipPlacement', function ( val ) {
        // If no placement was provided, default to 'top'.
        scope.tt_placement = val || 'top';
      });

      attr.$observe( 'tooltipAnimation', function ( val ) {
        scope.tt_animation = $parse( val );
      });

      // By default, the tooltip is not open.
      scope.tt_isOpen = false;
      
      // Calculate the current position and size of the directive element.
      function getPosition() {
        return {
          width: element.prop( 'offsetWidth' ),
          height: element.prop( 'offsetHeight' ),
          top: element.prop( 'offsetTop' ),
          left: element.prop( 'offsetLeft' )
        };
      }
      
      // Show the tooltip popup element.
      function show() {
        var position,
            ttWidth,
            ttHeight,
            ttPosition;

        //don't show empty tooltips
        if (!scope.tt_tooltip) {
          return;
        }

        // If there is a pending remove transition, we must cancel it, lest the
        // toolip be mysteriously removed.
        if ( transitionTimeout ) {
          $timeout.cancel( transitionTimeout );
        }
        
        // Set the initial positioning.
        tooltip.css({ top: 0, left: 0, display: 'block' });
        
        // Now we add it to the DOM because need some info about it. But it's not 
        // visible yet anyway.
        element.after( tooltip );
        
        // Get the position of the directive element.
        position = getPosition();
        
        // Get the height and width of the tooltip so we can center it.
        ttWidth = tooltip.prop( 'offsetWidth' );
        ttHeight = tooltip.prop( 'offsetHeight' );
        
        // Calculate the tooltip's top and left coordinates to center it with
        // this directive.
        switch ( scope.tt_placement ) {
          case 'right':
            ttPosition = {
              top: (position.top + position.height / 2 - ttHeight / 2) + 'px',
              left: (position.left + position.width) + 'px'
            };
            break;
          case 'bottom':
            ttPosition = {
              top: (position.top + position.height) + 'px',
              left: (position.left + position.width / 2 - ttWidth / 2) + 'px'
            };
            break;
          case 'left':
            ttPosition = {
              top: (position.top + position.height / 2 - ttHeight / 2) + 'px',
              left: (position.left - ttWidth) + 'px'
            };
            break;
          default:
            ttPosition = {
              top: (position.top - ttHeight) + 'px',
              left: (position.left + position.width / 2 - ttWidth / 2) + 'px'
            };
            break;
        }
        
        // Now set the calculated positioning.
        tooltip.css( ttPosition );
          
        // And show the tooltip.
        scope.tt_isOpen = true;
      }
      
      // Hide the tooltip popup element.
      function hide() {
        // First things first: we don't show it anymore.
        //tooltip.removeClass( 'in' );
        scope.tt_isOpen = false;
        
        // And now we remove it from the DOM. However, if we have animation, we 
        // need to wait for it to expire beforehand.
        // FIXME: this is a placeholder for a port of the transitions library.
        if ( angular.isDefined( scope.tt_animation ) && scope.tt_animation() ) {
          transitionTimeout = $timeout( function () { tooltip.remove(); }, 500 );
        } else {
          tooltip.remove();
        }
      }
      
      // Register the event listeners.
      element.bind( 'mouseenter', function() {
        scope.$apply( show );
      });
      element.bind( 'mouseleave', function() {
        scope.$apply( hide );
      });
    }
  };
}]);


angular.module('ui.bootstrap.collapse',['ui.bootstrap.transition'])

// The collapsible directive indicates a block of html that will expand and collapse
.directive('collapse', ['$transition', function($transition) {
  // CSS transitions don't work with height: auto, so we have to manually change the height to a
  // specific value and then once the animation completes, we can reset the height to auto.
  // Unfortunately if you do this while the CSS transitions are specified (i.e. in the CSS class
  // "collapse") then you trigger a change to height 0 in between.
  // The fix is to remove the "collapse" CSS class while changing the height back to auto - phew!
  var fixUpHeight = function(scope, element, height) {
    // We remove the collapse CSS class to prevent a transition when we change to height: auto
    element.removeClass('collapse');
    element.css({ height: height });
    // It appears that  reading offsetWidth makes the browser realise that we have changed the
    // height already :-/
    var x = element[0].offsetWidth;
    element.addClass('collapse');
  };

  return {
    link: function(scope, element, attrs) {

      var isCollapsed;
      var initialAnimSkip = true;
      scope.$watch(function (){ return element[0].scrollHeight; }, function (value) {
        //The listener is called when scollHeight changes
        //It actually does on 2 scenarios: 
        // 1. Parent is set to display none
        // 2. angular bindings inside are resolved
        //When we have a change of scrollHeight we are setting again the correct height if the group is opened
        if (element[0].scrollHeight !== 0) {
          if (!isCollapsed) {
            if (initialAnimSkip) {
              fixUpHeight(scope, element, element[0].scrollHeight + 'px');
            } else {
              fixUpHeight(scope, element, 'auto');
            }
          }
        }
      });
      
      scope.$watch(attrs.collapse, function(value) {
        if (value) {
          collapse();
        } else {
          expand();
        }
      });
      

      var currentTransition;
      var doTransition = function(change) {
        if ( currentTransition ) {
          currentTransition.cancel();
        }
        currentTransition = $transition(element,change);
        currentTransition.then(
          function() { currentTransition = undefined; },
          function() { currentTransition = undefined; }
        );
        return currentTransition;
      };

      var expand = function() {
        if (initialAnimSkip) {
          initialAnimSkip = false;
          if ( !isCollapsed ) {
            fixUpHeight(scope, element, 'auto');
          }
        } else {
          doTransition({ height : element[0].scrollHeight + 'px' })
          .then(function() {
            // This check ensures that we don't accidentally update the height if the user has closed
            // the group while the animation was still running
            if ( !isCollapsed ) {
              fixUpHeight(scope, element, 'auto');
            }
          });
        }
        isCollapsed = false;
      };
      
      var collapse = function() {
        isCollapsed = true;
        if (initialAnimSkip) {
          initialAnimSkip = false;
          fixUpHeight(scope, element, 0);
        } else {
          fixUpHeight(scope, element, element[0].scrollHeight + 'px');
          doTransition({'height':'0'});
        }
      };
    }
  };
}]);

angular.module('ui.bootstrap.transition', [])

/**
 * $transition service provides a consistent interface to trigger CSS 3 transitions and to be informed when they complete.
 * @param  {DOMElement} element  The DOMElement that will be animated.
 * @param  {string|object|function} trigger  The thing that will cause the transition to start:
 *   - As a string, it represents the css class to be added to the element.
 *   - As an object, it represents a hash of style attributes to be applied to the element.
 *   - As a function, it represents a function to be called that will cause the transition to occur.
 * @return {Promise}  A promise that is resolved when the transition finishes.
 */
.factory('$transition', ['$q', '$timeout', '$rootScope', function($q, $timeout, $rootScope) {

  var $transition = function(element, trigger, options) {
    options = options || {};
    var deferred = $q.defer();
    var endEventName = $transition[options.animation ? "animationEndEventName" : "transitionEndEventName"];

    var transitionEndHandler = function(event) {
      $rootScope.$apply(function() {
        element.unbind(endEventName, transitionEndHandler);
        deferred.resolve(element);
      });
    };

    if (endEventName) {
      element.bind(endEventName, transitionEndHandler);
    }

    // Wrap in a timeout to allow the browser time to update the DOM before the transition is to occur
    $timeout(function() {
      if ( angular.isString(trigger) ) {
        element.addClass(trigger);
      } else if ( angular.isFunction(trigger) ) {
        trigger(element);
      } else if ( angular.isObject(trigger) ) {
        element.css(trigger);
      }
      //If browser does not support transitions, instantly resolve
      if ( !endEventName ) {
        deferred.resolve(element);
      }
    });

    // Add our custom cancel function to the promise that is returned
    // We can call this if we are about to run a new transition, which we know will prevent this transition from ending,
    // i.e. it will therefore never raise a transitionEnd event for that transition
    deferred.promise.cancel = function() {
      if ( endEventName ) {
        element.unbind(endEventName, transitionEndHandler);
      }
      deferred.reject('Transition cancelled');
    };

    return deferred.promise;
  };

  // Work out the name of the transitionEnd event
  var transElement = document.createElement('trans');
  var transitionEndEventNames = {
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'oTransitionEnd',
    'msTransition': 'MSTransitionEnd',
    'transition': 'transitionend'
  };
  var animationEndEventNames = {
    'WebkitTransition': 'webkitAnimationEnd',
    'MozTransition': 'animationend',
    'OTransition': 'oAnimationEnd',
    'msTransition': 'MSAnimationEnd',
    'transition': 'animationend'
  };
  function findEndEventName(endEventNames) {
    for (var name in endEventNames){
      if (transElement.style[name] !== undefined) {
        return endEventNames[name];
      }
    }
  }
  $transition.transitionEndEventName = findEndEventName(transitionEndEventNames);
  $transition.animationEndEventName = findEndEventName(animationEndEventNames);
  return $transition;
}]);

angular.module("template/accordion/accordion.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/accordion/accordion.html",
    "<div class=\"accordion\" ng-transclude></div>");
}]);

angular.module("template/accordion/accordion-group.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/accordion/accordion-group.html",
    "<div class=\"accordion-group\">" +
    "  <div class=\"accordion-heading\" ><a class=\"accordion-toggle\" ng-click=\"isOpen = !isOpen\" accordion-transclude=\"heading\">{{heading}}</a></div>" +
    "  <div class=\"accordion-body\" collapse=\"!isOpen\">" +
    "    <div class=\"accordion-inner\" ng-transclude></div>  </div>" +
    "</div>");
}]);

angular.module("template/dialog/message.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/dialog/message.html",
    "<div class=\"modal-header\">" +
    "	<h1>{{ title }}</h1>" +
    "</div>" +
    "<div class=\"modal-body\">" +
    "	<p>{{ message }}</p>" +
    "</div>" +
    "<div class=\"modal-footer\">" +
    "	<button ng-repeat=\"btn in buttons\" ng-click=\"close(btn.result)\" class=btn ng-class=\"btn.cssClass\">{{ btn.label }}</button>" +
    "</div>" +
    "");
}]);

angular.module("template/pagination/pagination.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/pagination/pagination.html",
    "<div class=\"pagination\"><ul>" +
    "  <li ng-class=\"{disabled: noPrevious()}\"><a ng-click=\"selectPrevious()\">{{previousText || 'Previous'}}</a></li>" +
    "  <li ng-repeat=\"page in pages\" ng-class=\"{active: isActive(page)}\"><a ng-click=\"selectPage(page)\">{{page}}</a></li>" +
    "  <li ng-class=\"{disabled: noNext()}\"><a ng-click=\"selectNext()\">{{nextText || 'Next'}}</a></li>" +
    "  </ul>" +
    "</div>" +
    "");
}]);

angular.module("template/tooltip/tooltip-popup.html", []).run(["$templateCache", function($templateCache){
  $templateCache.put("template/tooltip/tooltip-popup.html",
    "<div class=\"tooltip {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">" +
    "  <div class=\"tooltip-arrow\"></div>" +
    "  <div class=\"tooltip-inner\" ng-bind=\"tooltipTitle\"></div>" +
    "</div>" +
    "");
}]);
