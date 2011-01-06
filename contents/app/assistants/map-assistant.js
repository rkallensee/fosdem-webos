function MapAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

MapAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	this.controller.stageController.setWindowOrientation('free');
	
	this.controller.setupWidget(
	    Mojo.Menu.appMenu, 
	    { omitDefaultItems: true }, 
	    {
		    visible: true,
		    items: [
			    Mojo.Menu.editItem,
        		{ label: $L('Help / About'), command: 'cmdHelp' }
		    ]
	    }
	);

	this.controller.setupWidget('mapView', {}, {});
	this.myMapView = $('mapView');
	
	// setup command menu
	this.controller.setupWidget(
        Mojo.Menu.commandMenu, 
        {}, 
	    this.viewFilterMenuModel = {
	        visible: true,
	        items: [ 
	            {
	                label: $L('Main menu'),
			        items: [ {label: $L('Menu'), submenu: 'view-submenu'} ]
		        },
		        
		        {
	                label: $L('View options'),
			        items: [ {label: $L('Select map'), submenu: 'maps-submenu'} ]
		        }
	        ] 
        }
    );
	
	// setup view submenu, items come from lib/submenu-model.js
	this.controller.setupWidget(
        'view-submenu',
        undefined,
        ScheduleViewSubmenuModel
    );
    
    // setup map submenu, items come from lib/submenu-model.js
	this.controller.setupWidget(
        'maps-submenu',
        undefined,
        MapViewSubmenuModel
    );
	
	/* add event handlers to listen to events from widgets */
}

MapAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
    
    var width  = window.innerWidth;
	var height = window.innerHeight - parseInt(jQuery('#mapView').offset().top, 10);
 
	this.myMapView.mojo.manualSize(width, height);
    
    this.myMapView.mojo.centerUrlProvided('images/campus.png');
}

MapAssistant.prototype.orientationChanged = function(orientation) {
	this.activate();
}

MapAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MapAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

MapAssistant.prototype.handleCommand = function(event) {
	if( event.type == Mojo.Event.command ) {
		switch( event.command )
		{
			case 'cmdCampusMap':
			    this.myMapView.mojo.centerUrlProvided('images/campus.png');
			    break;
			case 'cmdNeighborhoodMap':
				this.myMapView.mojo.centerUrlProvided('images/neighborhood.png');
			    break;
		    case 'cmdMetroMap':
				this.myMapView.mojo.centerUrlProvided('images/20100628-plan_245_3000.png');
			    break;
			case 'cmdTramMap':
				this.myMapView.mojo.centerUrlProvided('images/brussels-trams.png');
			    break;
		}
	}
}
