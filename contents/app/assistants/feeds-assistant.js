function FeedsAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

FeedsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed */
	
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
    
    
    // set up sources
    this.feedSources = {
        webFeed: 'http://fosdem.org/rss.xml',
        snGroup: 'http://identi.ca/api/statusnet/groups/timeline/400.atom',
        snTag: 'http://identi.ca/api/statusnet/tags/timeline/fosdem.atom',
        twAccount: 'http://twitter.com/statuses/user_timeline/10680142.rss',
        twTag: 'http://search.twitter.com/search.atom?q=%23fosdem'
    };
    
    // Set up a list model
	this.listModel = {
	    listTitle: $L('Feeds'), 
	    items: []
    };
	
	// Set up the attributes & model for the List widget:
	this.controller.setupWidget(
	    'feed_list', 
        { 
            itemTemplate: 'feeds/list/listitem', 
            listTemplate: 'feeds/list/listcontainer',
            //itemsCallback:this.itemsCallback.bind(this),
            renderLimit: 200,
            //lookahead: 15,
            delay: 1000 // 1 second delay before filter string is used
        },
        this.listModel
    );
    
    this.controller.listen('feed_list', Mojo.Event.listTap, this.listTapped.bindAsEventListener(this));
    
    // spinner
    this.spinnerModel = { spinning: true }
    this.controller.setupWidget("schedule_spinner", {spinnerSize: 'large'}, this.spinnerModel);
    
    that = this; // this allows accessing the assistent object from other scopes. Ugly!
    
    this.showFeed( this.feedSources.twTag );
	
	/* add event handlers to listen to events from widgets */
};

FeedsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

FeedsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

FeedsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};


FeedsAssistant.prototype.showFeed = function( uri ) {
	//console.log("***** START SETTING ITEMS... ");

    this.spinnerModel.spinning = true;
    this.controller.modelChanged(this.spinnerModel);
    
    this.getFeedItems( uri );
}

FeedsAssistant.prototype.getFeedItems = function( uri ) {
    //console.log("***** STARTING REFRESH SCHEDULE...");

    this.controller.serviceRequest('palm://com.palm.connectionmanager', {
	    method: 'getstatus',
	    parameters: {subscribe:false},
	    onSuccess: function(response) {
	        if( response.isInternetConnectionAvailable !== true ) {
	            Mojo.Controller.errorDialog($L('Can\'t connect to server. Please make sure your internet connection is available.'));
	        }
	    },
	    onFailure: function(response) {
	        Mojo.Controller.errorDialog($L('Failed to get connection status. Please try again.'));
	    }
	});
	
    //console.log("***** STARTING AJAX REQUEST...");
    
    var request = new Ajax.Request(uri, {

        method: 'get',
        evalJSON: 'false',
        onSuccess: function(transport) {
            that.processIncomingFeedItems( transport );
        },
        onFailure: function(){  
            Mojo.Controller.errorDialog($L('Can\'t connect to server. Please make sure your internet connection is available.'));
        }

    });
}

FeedsAssistant.prototype.processIncomingFeedItems = function( transport ) {
    //console.log("***** STARTING INCUBATING...");

    if( transport.responseXML === null && transport.responseText !== null ) {
        transport.responseXML = new DOMParser().parseFromString(transport.responseText, 'text/xml');
    }
    
    feedCounter = 0;
    
    that.listModel.items = [];
    
    // Find each 'vevent' node
    jQuery(transport.responseXML.documentElement).find('entry').each(function() {
        
        that.listModel.items.push({
            id: feedCounter,
            title: $L(jQuery(this).children('title').text()),
            author: jQuery(this).children('author').children('name').text(),
            time: ScheduleUtils.prettyDate(jQuery(this).children('published').text()),
            url: jQuery(this).children('link[type="text/html"][rel="alternate"]').attr('href')
            /*date: $L(dateObj.day + '. ' + dateObj.monthname + ' ' + dateObj.year), 
            dtstart: $L(jQuery(this).children('dtstart').text()), 
            time: $L(dateObj.hour + ':' + dateObj.minute), 
            location: $L(jQuery(this).children('location').text()), 
            title: $L(jQuery(this).children('summary').text()), 
            description: $L(jQuery(this).children('description').text()),
            attendee: $L(jQuery(this).children('attendee').text()),
            url: url,
            eventid: jQuery(this).children('uid').text(),
            pbfeventid: jQuery(this).children("[nodeName=pentabarf:event-id]").text(),
            favorite: isFavorite*/
        });
        
        feedCounter++;
    });
    
    if( that.listModel.items.length > 0 ) {

        //console.log("***** INCUBATED, NOW SETTING...");
        

        //console.log("***** SETTING ITEMS: " + items.length);
        
        that.controller.modelChanged(that.listModel);
        
        that.spinnerModel.spinning = false;
        that.controller.modelChanged(that.spinnerModel);
        
        that.controller.instantiateChildWidgets($('feed_list'));
        
        Mojo.Controller.getAppController().showBanner(
            $L("Refreshed feed items."),
            { source: 'notification' }
        );

    }
}

FeedsAssistant.prototype.listTapped = function(event){
	try {
		window.location = event.item.url;
	} catch (e) {}
}
