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
	                label: $L('Main menu'),
			        items: [ {label: $L('Menu'), submenu: 'view-submenu'} ]
		        },
		        
		        { label: $L('Refresh'), icon: 'refresh', command: 'cmdRefreshFeed' },
	            
	            {
	                label: $L('View options'),
			        items: [ {label: $L('Select feed'), submenu: 'feeds-submenu'} ]
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
    
    // setup feeds submenu, items come from lib/submenu-model.js
	this.controller.setupWidget(
        'feeds-submenu',
        undefined,
        FeedViewSubmenuModel
    );
    
    
    // set up sources
    this.feedSources = {
        webFeed: 'http://fosdem.org/rss.xml',
        snAccount: 'http://identi.ca/api/statuses/user_timeline/116316.atom',
        snGroup: 'http://identi.ca/api/statusnet/groups/timeline/400.atom',
        snTag: 'http://identi.ca/api/statusnet/tags/timeline/fosdem.atom',
        twAccount: 'http://twitter.com/statuses/user_timeline/10680142.atom',
        twTag: 'http://search.twitter.com/search.atom?q=%23fosdem'
    };
    
    // keeps track of active feed (key)
    this.activeFeed = '';
    
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
    this.controller.setupWidget("feeds_spinner", {spinnerSize: 'large'}, this.spinnerModel);
    $('feeds_scrim').show();
    
    that = this; // this allows accessing the assistent object from other scopes. Ugly!
    
    this.showFeed( 'webFeed' );
	
	/* add event handlers to listen to events from widgets */
};

FeedsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	
	// it seems like we have to re-set this variable after the scene was popped in again via back gesture
	that = this; // this allows accessing the assistent object from other scopes. Ugly!
};

FeedsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	   
	// since "that" is global, maybe it's better to cleanup after scene became inactive.
    that = null;
};

FeedsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};


FeedsAssistant.prototype.showFeed = function( feedId ) {
	//console.log("***** START SETTING ITEMS... ");

    this.spinnerModel.spinning = true;
    this.controller.modelChanged(this.spinnerModel);
    $('feeds_scrim').show();
    
    this.activeFeed = feedId;
    this.getFeedItems( this.feedSources[ feedId ] );
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
    jQuery(transport.responseXML.documentElement).find('entry, item').each(function() {
        
        var title = author = time = url = '';
        
        // set vars feed-type-specific, could be a bit handier...
        if( that.activeFeed == 'webFeed' ) {
            title = $L(jQuery(this).children('title').text());
            author = 'FOSDEM team';
            time = Date.parseHttpTimeFormat(jQuery(this).children('pubDate').text());
            url = jQuery(this).children('link').text();
        } else if( that.activeFeed == 'twTag'
                || that.activeFeed == 'twAccount'
                || that.activeFeed == 'snAccount'
                || that.activeFeed == 'snGroup'
                || that.activeFeed == 'snTag'
        ) {
            title = $L(jQuery(this).children('title').text());
            author = jQuery(this).children('author').children('name').text();
            time = Date.parseIso8601(jQuery(this).children('published').text());
            url = jQuery(this).children('link[type="text/html"][rel="alternate"]').attr('href');
        }
        if( that.activeFeed == 'snAccount' ) {
            author = jQuery(this).parent().children('author').children('name').text();
        }
        
        time = jQuery.timeago(time);
        
        that.listModel.items.push({
            id: feedCounter,
            title: title,
            author: author,
            time: time,
            url: url
        });
        
        feedCounter++;
    });
    
    if( that.listModel.items.length > 0 ) {

        //console.log("***** INCUBATED, NOW SETTING...");
        

        //console.log("***** SETTING ITEMS: " + items.length);
        
        if( that.activeFeed == 'webFeed' ) {
            that.listModel.listTitle = $L('FOSDEM website');
        }
        if( that.activeFeed == 'snAccount' ) {
            that.listModel.listTitle = $L('identi.ca account');
        }
        if( that.activeFeed == 'snGroup' ) {
            that.listModel.listTitle = $L('identi.ca group');
        }
        if( that.activeFeed == 'snTag' ) {
            that.listModel.listTitle = $L('identi.ca tag');
        }
        if( that.activeFeed == 'twAccount' ) {
            that.listModel.listTitle = $L('twitter account');
        }
        if( that.activeFeed == 'twTag' ) {
            that.listModel.listTitle = $L('twitter tag');
        }
        
        that.controller.modelChanged(that.listModel);
        
        that.spinnerModel.spinning = false;
        that.controller.modelChanged(that.spinnerModel);
        $('feeds_scrim').hide();
        
        that.controller.instantiateChildWidgets($('feed_list'));
        
        setTimeout(function() {
            that.controller.getSceneScroller().mojo.scrollTo(0,0);
        }, 500);
        
        //Mojo.Controller.getAppController().showBanner(
        //    $L("Refreshed feed items."),
        //    { source: 'notification' }
        //);

    }
}

FeedsAssistant.prototype.listTapped = function(event){
	try {
		window.location = event.item.url;
	} catch (e) {}
}

FeedsAssistant.prototype.handleCommand = function(event) {
	if( event.type == Mojo.Event.command ) {
		switch( event.command )
		{
			case 'cmdRefreshFeed':
			    this.showFeed( this.activeFeed );
			    break;
			case 'cmdFeedWebsite':
				this.showFeed( 'webFeed' );
			    break;
		    case 'cmdFeedSnAccount':
				this.showFeed( 'snAccount' );
			    break;
			case 'cmdFeedSnGroup':
				this.showFeed( 'snGroup' );
			    break;
			case 'cmdFeedSnTag':
				this.showFeed( 'snTag' );
			    break;
			case 'cmdFeedTwAccount':
				this.showFeed( 'twAccount' );
			    break;
			case 'cmdFeedTwTag':
				this.showFeed( 'twTag' );
			    break;
		}
	}
}
