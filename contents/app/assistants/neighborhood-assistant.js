function NeighborhoodAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

NeighborhoodAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
	/* setup widgets here */
	
	this.controller.stageController.setWindowOrientation('free');
	
	this.appMenuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem
		]
	};

	this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
	
	this.controller.setupWidget('neighborhoodMapView', {}, {});
	this.myNeighborhoodMapView = $('neighborhoodMapView');
	
	// setup command menu
	this.controller.setupWidget(
        Mojo.Menu.commandMenu, 
        {}, 
	    this.viewFilterMenuModel = {
	        visible: true,
	        items: [ 
	            {
	                label: $L('View menu'),
			        items: [ {label: $L('Show'), submenu: 'view-submenu'} ]
		        },
	        ] 
        }
    );
	
	// setup view submenu, items come from lib/viewmenu-model.js
	this.controller.setupWidget(
        'view-submenu',
        undefined,
        ScheduleViewSubmenuModel
    );
	
	/* add event handlers to listen to events from widgets */
};

NeighborhoodAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	
	var width  = window.innerWidth;
	var height = window.innerHeight - parseInt(jQuery('#neighborhoodMapView').offset().top, 10);
 
	this.myNeighborhoodMapView.mojo.manualSize(width, height);
    
    this.myNeighborhoodMapView.mojo.centerUrlProvided('images/neighborhood.png');
};

NeighborhoodAssistant.prototype.orientationChanged = function(orientation) {
	this.activate();
}

NeighborhoodAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

NeighborhoodAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};