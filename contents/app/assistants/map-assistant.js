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
    
    this.spinnerModel = { spinning: true }
    this.controller.setupWidget("maps_spinner", {spinnerSize: 'large'}, this.spinnerModel);
    $('maps_scrim').show();

    that = this; // this allows accessing the assistent object from other scopes. Ugly!
	
	/* add event handlers to listen to events from widgets */
	
	Mojo.Event.listen(this.controller.get("mapView"), Mojo.Event.imageViewChanged, this.imageLoaded.bindAsEventListener(this));
}

MapAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	   
	// it seems like we have to re-set this variable after the scene was popped in again via back gesture
	that = this; // this allows accessing the assistent object from other scopes. Ugly!
    
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
	
	// since "that" is global, maybe it's better to cleanup after scene became inactive.
    that = null;
}

MapAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	   
	// since "that" is global, maybe it's better to cleanup after scene became inactive.
    that = null;
}

MapAssistant.prototype.handleCommand = function(event) {
	if( event.type == Mojo.Event.command ) {
		switch( event.command )
		{
			case 'cmdCampusMap':
			    this.spinner('on');
			    this.myMapView.mojo.centerUrlProvided('images/campus.png');
			    break;
			case 'cmdNeighborhoodMap':
				this.spinner('on');
				this.myMapView.mojo.centerUrlProvided('images/neighborhood.png');
			    break;
		    case 'cmdMetroMap':
				try {
		            window.location = 'http://m.stib.be/index.php?lang=en';
	            } catch (e) {}
			    break;
			case 'cmdTramMap':
				this.spinner('on');
				this.myMapView.mojo.centerUrlProvided('images/brussels-trams.png');
			    break;
		}
	}
}

MapAssistant.prototype.imageLoaded = function() {
    that.spinner('off');
}

MapAssistant.prototype.spinner = function(mode) {
    if( mode == 'on' ) {
        $('maps_scrim').show();
        that.spinnerModel.spinning = true;
    } else {
        $('maps_scrim').hide();
        that.spinnerModel.spinning = false;
    }
    that.controller.modelChanged(that.spinnerModel);
}
