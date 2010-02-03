function ScheduleAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

ScheduleAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	this.controller.stageController.setWindowOrientation('free');
	
	/* add event handlers to listen to events from widgets */
	
	//console.log("***** INITIALIZING SCHEDULE...");
	
	this.appMenuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{ label: $L('Campus map'), command: 'cmdMap' },
    		{ label: $L('Help / About'), command: 'cmdHelp' }
		]
	};

	this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
	
    this.controller.setupWidget(
        Mojo.Menu.commandMenu, 
        undefined, 
	    {
	        items: [ 
	            { label: $L('Refresh'), icon: 'refresh', command: 'cmdRefresh' },
	            { label: $L('hide expired'), command:'cmdHideExpired' }
	        ] 
        }
    );
    
    this.scheduleItems = [];
    
    that = this; // this allows accessing the assistent object from other scopes. Ugly!
    
    // open database storage
	this.depot = new Mojo.Depot(
	    {
		    name: "fosdemSchedule", // Name used for the HTML5 database name. (required)
		    replace: false // open an existing depot
	    }, 
	    that.dbInitialized,
	    that.dbError
    );
    
    // Set up a few models so we can test setting the widget model:
	this.listModel = {
	    listTitle: $L('FOSDEM 2010 Schedule'), 
	    items: this.scheduleItems
    };
	
	// Set up the attributes & model for the List widget:
	this.controller.setupWidget(
	    'schedule_list', 
        { 
            itemTemplate: 'schedule/list/listitem', 
            listTemplate: 'schedule/list/listcontainer',
            dividerTemplate: 'schedule/list/divider', 
            dividerFunction: this.dividerFunc.bind(this),
            filterFunction: this.filterFunction.bind(this),
            delay: 1000 // 1 second delay before filter string is used
        },
        this.listModel
    );
	
	this.controller.listen('schedule_list',Mojo.Event.listTap, this.listTapped.bindAsEventListener(this));
	
    this.spinnerModel = {
		spinning: true
	}
    
    this.controller.setupWidget("schedule_spinner", {spinnerSize: 'small'}, this.spinnerModel);
}

ScheduleAssistant.prototype.dbInitialized = function( result ) {
	//console.log("***** DB INITIALIZED!");
	
	that.depot.simpleGet(
	    'schedule', 
	    that.setEventItems, 
	    that.dbError
    );
}

ScheduleAssistant.prototype.setEventItems = function( items ) {
	//console.log("***** START SETTING ITEMS... ");

    if( items == null ) {
        that.controller.showAlertDialog({
            onChoose: function(value) {
                if( value == 'refresh' ) {
                    that.refreshSchedule();
                } else {
                    //stop the animation and hide the spinner
                    that.spinnerModel.spinning = false;
                    that.controller.modelChanged(that.spinnerModel);
                }
            },
            title: $L("Welcome!"),
            message: $L("There is currently no FOSDEM schedule stored on your phone. Do you want to download it now? Please use the help function in application menu for more information."),
            choices:[
                 {label:$L('Yes'), value:"refresh", type:'affirmative'},  
                 {label:$L("No"), value:"well", type:'negative'}
            ]
        });
        return;
    }

    if( items.items ) {
        // this seems to be a db response, so extract items property
        var items = items.items;
    }
    
    //console.log("***** THERE ARE "+items.length+" items!");
    
    if( items.length == 0 ) {
        Mojo.Controller.errorDialog($L('No events found. If you tapped "hide expired", there are no upcoming events. If you tried to refresh events, the request failed - please refresh again.'));
        return;
    }
    
    items.sort( that.orderSchedule );
        
	that.scheduleItems = items;
	
    //console.log("***** SETTING ITEMS: " + items.length);
    
    that.listModel.items = that.scheduleItems;
    that.controller.modelChanged(that.listModel);

    //stop the animation and hide the spinner
    that.spinnerModel.spinning = false;
    that.controller.modelChanged(that.spinnerModel);
}

ScheduleAssistant.prototype.dbError = function( transaction, result ) {
	Mojo.Controller.errorDialog($L('A database error occured!'));
	//console.log("***** DB ERROR:");
}

ScheduleAssistant.prototype.dividerFunc = function(itemModel) {
	return itemModel.date; // We're using the item's date as the divider label.
}

ScheduleAssistant.prototype.filterFunction = function(filterString, listWidget, offset, count) {
    var subset = [];
	var totalSubsetSize = 0;
	
	//loop through the original data set & get the subset of items that have the filterstring 
	var i = 0;
	while( i <  this.scheduleItems.length ) {
		
        if( this.scheduleItems[i].time.toLowerCase().include(filterString.toLowerCase())
         || this.scheduleItems[i].location.toLowerCase().include(filterString.toLowerCase())
         || this.scheduleItems[i].title.toLowerCase().include(filterString.toLowerCase())
         || this.scheduleItems[i].attendee.toLowerCase().include(filterString.toLowerCase())
        ) {
			if( subset.length < count && totalSubsetSize >= offset) {
				subset.push( this.scheduleItems[i] );
			}
			totalSubsetSize++;
		}
		i++;
	}
	
	subset.sort( this.orderSchedule );
	
	//update the items in the list with the subset
	listWidget.mojo.noticeUpdatedItems( offset, subset );
	
	//set the list's lenght & count if we're not repeating the same filter string from an earlier pass
	if( this.filter !== filterString ) {
		listWidget.mojo.setLength( totalSubsetSize );
		listWidget.mojo.setCount( totalSubsetSize );
	}
	this.filter = filterString;
};

ScheduleAssistant.prototype.orderSchedule = function( a, b ) {
    if( a.dtstart < b.dtstart ) {
        return -1;
    }
    if( a.dtstart == b.dtstart ) {
        if( a.title < b.title ) {
            return -1;
        }
        if( a.title == b.title ) {
            return 0;
        }
        if( a.title > b.title ) {
            return 1;
        }
    }
    if( a.dtstart > b.dtstart ) {
        return 1;
    }
}

ScheduleAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ScheduleAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

ScheduleAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

ScheduleAssistant.prototype.handleCommand = function(event) {
	this.controller = Mojo.Controller.stageController.activeScene();
	
	if( event.type == Mojo.Event.command ) {
		switch( event.command )
		{
			case 'cmdRefresh':
				this.refreshSchedule();
			    break;
			case 'cmdHideExpired':
				this.hideExpired();
			    break;
			case 'cmdHelp':
				Mojo.Controller.stageController.pushScene("help");
			    break;
			case 'cmdMap':
				Mojo.Controller.stageController.pushScene("map");
			    break;
		}
	}
}

ScheduleAssistant.prototype.listTapped = function(event){
	try {
		var drawer = "eventDrawer-" + event.item.id;
		this.controller.get(drawer).mojo.toggleState();
	} catch (e) {}
}

ScheduleAssistant.prototype.refreshSchedule = function() {
    //console.log("***** STARTING REFRESH SCHEDULE...");

    //show and start the animated spinner
    this.spinnerModel.spinning = true;
	this.controller.modelChanged(this.spinnerModel);
	
    this.controller.serviceRequest('palm://com.palm.connectionmanager', {
	    method: 'getstatus',
	    parameters: {subscribe:false},
	    onSuccess: function(response) {
	        if( response.isInternetConnectionAvailable !== true ) {
	            Mojo.Controller.errorDialog($L('<b>Can\'t connect to FOSDEM server.</b><br /><br />Please make sure your internet connection is available.'));
	        }
	    },
	    onFailure: function(response) {
	        Mojo.Controller.errorDialog($L('Failed to get connection status. Please try again.'));
	    }
	});
	
    //console.log("***** STARTING AJAX REQUEST...");

    var request = new Ajax.Request("http://www.fosdem.org/schedule/xcal", {

        method: 'get',
        evalJSON: 'false',
        onSuccess: function(transport){
            that.incubateSetAndSaveResponse( transport );
        },
        onFailure: function(){  
            Mojo.Controller.errorDialog($L('Can\'t connect to FOSDEM server. Please make sure your internet connection is available.'));
        }

    });
}

ScheduleAssistant.prototype.incubateSetAndSaveResponse = function( transport ) {
    //console.log("***** STARTING INCUBATING...");

    if( transport.responseXML === null && transport.responseText !== null ) {
        transport.responseXML = new DOMParser().parseFromString(transport.responseText, 'text/xml');
    }
    
    eventCounter = 0;
    
    that.scheduleItems = [];
    
    // Find each 'vevent' node
    jQuery(transport.responseXML.documentElement).find('vevent').each(function() {
        // Parse the text string into an object using the above function
        var dateObj = that.parseDate(jQuery(this).children('dtstart').text());
        
        var url = jQuery(this).children('url').text();
        
        if( url.indexOf( "/2010/schedule//2010/schedule/" ) != -1 ) {
            // fixing defect urls from xcal
            url = url.replace( "/2010/schedule/", "" );
        }
        
        that.scheduleItems.push({
            id: eventCounter,
            date:$L(dateObj.day + '. ' + dateObj.monthname + ' ' + dateObj.year), 
            dtstart:$L(jQuery(this).children('dtstart').text()), 
            time:$L(dateObj.hour + ':' + dateObj.minute), 
            location: $L(jQuery(this).children('location').text()), 
            title:$L(jQuery(this).children('summary').text()), 
            description:$L(jQuery(this).children('description').text()),
            attendee:$L(jQuery(this).children('attendee').text()),
            url:url
        });
        
        eventCounter++;
    });

    //console.log("***** INCUBATED, NOW SETTING...");

    this.setEventItems( that.scheduleItems );
    
    if( that.scheduleItems.length > 0 ) {
        // save to db if there are results
        this.depot.simpleAdd( 
            'schedule', 
            { items: that.scheduleItems }, 
            function() {
                Mojo.Controller.getAppController().showBanner(
                    $L("Refreshed FOSDEM schedule items."),
                    { source: 'notification' }
                );
                //console.log("***** SUCCESSFULLY SAVED.");
            }, 
            this.dbError 
        );
    }
}

ScheduleAssistant.prototype.hideExpired = function() {
    //console.log("***** STARTING HIDING EXPIRED...");

    var items = this.scheduleItems;
    this.scheduleItems = [];
    
    var date = new Date();

    for( var i=0; i<items.length; i++ ) {
        
        var xcaldate = this.parseDate( items[i].dtstart );
        var dtstart = new Date( 
            xcaldate.year,
            xcaldate.month,
            xcaldate.day,
            xcaldate.hour,
            xcaldate.minute,
            00
        );
        
        var diffHours = Math.round( (date-dtstart) / (1000*60*60 ) );
        
        if( diffHours < 1 ) { // use a tolerance of one hour
            this.scheduleItems.push( items[i] );
        }
        
    }

    this.setEventItems( this.scheduleItems );
}

ScheduleAssistant.prototype.parseDate = function(xCalDate){
    var months = new Array(
        'January', 'February', 'March', 'April', 'May', 
        'June', 'July', 'August', 'September', 'October', 
        'November', 'December'
    );

    return {
        'year'      : xCalDate.substr(0,4),
        'month'     : xCalDate.substr(4,2),
        'monthname' : months[xCalDate.substr(4,2)-1],
        'day'       : xCalDate.substr(6,2),
        'hour'      : xCalDate.substr(9,2),
        'minute'    : xCalDate.substr(11,2)
    }
}
