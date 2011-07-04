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

    // this setting is very important: it stores the name of the conference!
    this.conference = 'FrOSCon';
    this.conferenceYear = '2011';

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

                {label: $L('Refresh'), icon: 'refresh', command: 'cmdRefresh'},

                {label: $L('View options'), toggleCmd: 'cmdShowAll', items: [
                    { label: $L('Show all'), icon: 'allbtn', command: 'cmdShowAll' },
                    { label: $L('Show only favorites'), icon: 'favbtn', command: 'cmdShowFavs' },
                    { label: $L('Show only upcoming'), icon: 'upcomingbtn', command: 'cmdShowUpcoming' }
                ]}
            ]
        }
    );

    // initialize the view filter state
    this.activeViewFilter = 'all';

    // initialize search filter
    this.filter = '';

    // setup view submenu, items come from lib/submenu-model.js
    this.controller.setupWidget(
        'view-submenu',
        undefined,
        ScheduleViewSubmenuModel
    );

    // Lawnchair bucket
    this.bucket = new Lawnchair({table: 'schedule', adaptor: 'webkit', onError: this.handleDbError.bind(this)});

    // subset of currently displayed items
    this.scheduleItems = [];

    this.showSchedule();

    that = this; // this allows accessing the assistent object from other scopes. Ugly!

    // Set up a few models so we can test setting the widget model:
    this.listModel = {
        listTitle: this.conference + ' ' + this.conferenceYear + ' ' + $L('Schedule')
        //items: [] // we do not provide items for this lazy list.
    };

    // Set up the attributes & model for the List widget:
    this.controller.setupWidget(
        'schedule_list',
        {
            itemTemplate: 'schedule/list/listitem',
            listTemplate: 'schedule/list/listcontainer',
            dividerTemplate: 'schedule/list/divider',
            emptyTemplate: 'schedule/list/empty',
            dividerFunction: this.dividerFunc.bind(this),
            filterFunction: this.filterFunction.bind(this),
            onItemRendered: this.itemRenderedCallback.bind(this),
            renderLimit: 20,
            lookahead: 15,
            delay: 1000 // 1 second delay before filter string is used
        },
        this.listModel
    );

    this.spinnerModel = { spinning: false }
    this.controller.setupWidget("schedule_spinner", {spinnerSize: 'large'}, this.spinnerModel);
    $('schedule_scrim').hide();
}

ScheduleAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */

    // listener for list element tap
    this.listTappedHandler = this.listTapped.bindAsEventListener(this);
    this.controller.listen('schedule_list', Mojo.Event.listTap, this.listTappedHandler);

    // it seems like we have to re-set this variable after the scene was popped in again via back gesture
    that = this; // this allows accessing the assistant object from other scopes. Ugly!

    // refresh fav star icons just in case the fav state was changed
    this.refreshFavStars();
}


ScheduleAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    // listener for list element tap
    this.controller.stopListening('schedule_list', Mojo.Event.listTap, this.listTappedHandler);

    // since "that" is global, maybe it's better to cleanup after scene became inactive.
    that = null;
}

ScheduleAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as
       a result of being popped off the scene stack */

    // listener for list element tap
    this.controller.stopListening('schedule_list', Mojo.Event.listTap, this.listTappedHandler);

    // since "that" is global, maybe it's better to cleanup after scene became inactive.
    that = null;
}

ScheduleAssistant.prototype.showSchedule = function() {
    //console.log("***** STARTING TO LOAD!");

    this.bucket.all( function(r) {
        that.spinner('on');
        that.setEventItems(r);
    });
}

ScheduleAssistant.prototype.handleDbError = function(transaction, error) {
    // console.log(error.message); console.log(error.code);

    if( error.code == 1 && error.message.indexOf('no such table') > -1 ) {
        // This means the database table is unavailable. The only reason could be
        // that there never was a schedule - so it's the first application start.

        //Mojo.Controller.errorDialog($L("There are no schedule events to show."));
        //that.spinner('off');

        that.controller.showAlertDialog({
            onChoose: function(value) {
                if( value == 'refresh' ) {
                    that.refreshSchedule();
                } else {
                    that.spinner('off');
                }
            },
            title: $L("Welcome to the FrOSCon app!"),
            message: $L("There is currently no schedule stored on your phone - do you want to download "
                +"it now from FrOSCon server? This may take a while. Please remember to refresh it periodically."),
            choices:[
                 {label:$L('Yes'), value:"refresh", type:'affirmative'},
                 {label:$L("No"), value:"well", type:'negative'}
            ]
        });
        return;
    }
}

ScheduleAssistant.prototype.setEventItems = function( items ) {
    //console.log("***** START SETTING ITEMS... ");

    if( items == null || items.length == 0 ) {
        // use empty array. an error message is shown in handleDbError() when there
        // was an error.
        items = [];
    }

    // dynamically update the items if they don't have the locationImg
    // property (which is new since 0.2.3)
    if( items[0] && items[0].location && !items[0].locationImg ) {
        for( var i=0; i<items.length; i++ ) {
            items[i].locationImg = items[i].location.toLowerCase().split('.').join('');
            this.bucket.save( items[i] );
        }
    }

    //console.log("***** THERE ARE "+items.length+" items!");

    items.sort( that.orderSchedule );

    //console.log("***** SETTING ITEMS: " + items.length);

    that.scheduleItems = items;
    that.controller.modelChanged(that.listModel);

    that.refreshFavStars();

    // close filterfield if open
    that.controller.get('schedule_list').mojo.close();

    setTimeout(function() {
        that.controller.getSceneScroller().mojo.scrollTo(0,0);
    }, 500);

    that.spinner('off');
}

ScheduleAssistant.prototype.spinner = function(mode) {
    if( mode == 'on' ) {
        $('schedule_scrim').show();
        that.spinnerModel.spinning = true;
    } else {
        $('schedule_scrim').hide();
        that.spinnerModel.spinning = false;
    }
    that.controller.modelChanged(that.spinnerModel);
}

ScheduleAssistant.prototype.refreshFavStars = function() {
    for( var i=0; i<that.scheduleItems.length; i++ ) {
        if( that.scheduleItems[i].favorite == true ) {
            jQuery('#star-'+that.scheduleItems[i].id).addClass('starActive');
        } else {
            jQuery('#star-'+that.scheduleItems[i].id).removeClass('starActive');
        }
    }
}

ScheduleAssistant.prototype.itemRenderedCallback = function(listWidget, itemModel, itemNode) {
    //console.log(itemModel.favorite);
    if( itemModel.favorite == true ) {
        jQuery('#star-'+itemModel.id).addClass('starActive');
    } else {
        jQuery('#star-'+itemModel.id).removeClass('starActive');
    }
}

ScheduleAssistant.prototype.filterFunction = function(filterString, listWidget, offset, count) {

    //console.log("offset = " + offset);
    //console.log("count = " + count);
    //console.log("filter string = " + filterString);

    if( filterString != '' ) {

        var subset = [];
        var totalSubsetSize = 0;

        //loop through the original data set & get the subset of items that have the filterstring
        var i = 0;
        while( i < this.scheduleItems.length ) {

            if( this.scheduleItems[i].time.toLowerCase().include(filterString.toLowerCase())
             || this.scheduleItems[i].location.toLowerCase().include(filterString.toLowerCase())
             || this.scheduleItems[i].title.toLowerCase().include(filterString.toLowerCase())
             || this.scheduleItems[i].description.toLowerCase().include(filterString.toLowerCase())
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

        this.refreshFavStars();

        //set the list's lenght & count if we're not repeating the same filter string from an earlier pass
        //if( this.filter !== filterString ) {
            listWidget.mojo.setLength( totalSubsetSize );
            listWidget.mojo.setCount( totalSubsetSize );
        //}

        this.filter = filterString;

    } else if( filterString == '' && this.filter != '' ) {
        // search was cleared, so re-initialize the list!
        this.filter = '';
        //listWidget.mojo.setLength( this.scheduleItems.length );
        //listWidget.mojo.setCount( this.scheduleItems.length );
        //listWidget.mojo.invalidateItems( 0 );
        //this.controller.modelChanged(this.listModel);
        //this.showFiltered( this.activeViewFilter );
        listWidget.mojo.noticeUpdatedItems( 0, that.scheduleItems );
    } else {
        //if( that.listModel.items.length > 0 ) {
        //    that.listModel.items.push.apply( that.listModel.items, that.getItems( count, that.listModel.items.length ) );
        //}

        this.updateListWithNewItems.delay(.1, listWidget, offset, this.scheduleItems.slice(offset, offset + count));

        // tell the list how many overall items are available. has effect only at first call.
        listWidget.mojo.setLength( this.scheduleItems.length );
    }
}

ScheduleAssistant.prototype.updateListWithNewItems = function(listWidget, offset, items) {
    listWidget.mojo.noticeUpdatedItems(offset, items);
}

ScheduleAssistant.prototype.dividerFunc = function(itemModel) {
    // We're using the localized item's date as the divider label.

    var dateDetails = this.parseDate( itemModel.dtstart );
    var dateObj = new Date(
        dateDetails.year,
        dateDetails.month - 1, // as index!
        dateDetails.day,
        dateDetails.hour,
        dateDetails.minute,
        00
    );

    return Mojo.Format.formatDate( dateObj, {date: 'long'} );
}

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

ScheduleAssistant.prototype.handleCommand = function(event) {
    this.controller = Mojo.Controller.stageController.activeScene();

    if( event.type == Mojo.Event.command ) {
        switch( event.command )
        {
            case 'cmdRefresh':
                this.controller.showAlertDialog({
                    onChoose: function(value) {
                        if( value == 'refresh' ) {
                            that.refreshSchedule();
                        }
                    },
                    title: $L("Refresh schedule"),
                    message: $L("Do you really want to refresh the schedule stored on your device? An internet "
                        +"connection is required. The refresh may take a while. Favorites are preserved."),
                    choices:[
                         {label:$L('Yes'), value:"refresh", type:'affirmative'},
                         {label:$L("No"), value:"well", type:'negative'}
                    ]
                });
                break;
            case 'cmdShowAll':
                this.showFiltered('all');
                break;
            case 'cmdShowFavs':
                this.showFiltered('favs');
                break;
            case 'cmdShowUpcoming':
                this.showFiltered('upcoming');
                break;
        }
    }
}

ScheduleAssistant.prototype.listTapped = function(event) {
    // fire up detail scene
    //this.controller.stageController.pushScene('scheduleDetail', {event: event.item});
    this.controller.stageController.assistant.pushMyScene('scheduleDetail', {event: event.item});
}

ScheduleAssistant.prototype.refreshSchedule = function() {
    //console.log("***** STARTING REFRESH SCHEDULE...");

    that.spinner('on');

    this.controller.serviceRequest('palm://com.palm.connectionmanager', {
        method: 'getstatus',
        parameters: {subscribe: false},
        onSuccess: function(response) {
            if( response.isInternetConnectionAvailable !== true ) {
                Mojo.Controller.errorDialog($L('Can\'t connect to server. Please make sure your internet connection is available.'));
                that.spinner('off');
            } else {
                console.log("***** STARTING AJAX REQUEST...");

                //var xcalURL = "http://www.fosdem.org/schedule/xcal"; // FOSDEM
                //var xcalURL = "http://www.fosdem.org/2010/schedule/xcal"; // FOSDEM 2010
                //var xcalURL = "http://programm.froscon.org/2010/schedule.de.xcs"; // FrOSCon 2010
                var xcalURL = "http://programm.froscon.org/2011/schedule.xcal"; // FrOSCon 2011

                var request = new Ajax.Request(xcalURL, {

                    method: 'get',
                    evalJSON: false,
                    evalJS: false,
                    onSuccess: function(transport){
                        that.incubateSetAndSaveResponse( transport );
                    },
                    onFailure: function(){
                        Mojo.Controller.errorDialog($L('Can\'t connect to server. Please make sure your internet connection is available.'));
                        that.spinner('off');
                    }

                });
            }
        },
        onFailure: function(response) {
            Mojo.Controller.errorDialog($L('Failed to get connection status. Please try again.'));
        }
    });
}

ScheduleAssistant.prototype.incubateSetAndSaveResponse = function( transport ) {
    console.log("starting incubating response...");

    if( transport.responseXML === null && transport.responseText !== null ) {
        console.log("starting to parse response string...");
        transport.responseXML = new DOMParser().parseFromString(transport.responseText, 'text/xml');
    }

    eventCounter = 0;

    // temporarily save favorites' uid here to reassign state later
    that.tempFavorites = [];  // TODO: Store favs in depot?
    for( var i=0; i<this.scheduleItems.length; i++ ) {
        if( this.scheduleItems[i].favorite == true ) {
            that.tempFavorites.push(this.scheduleItems[i].eventid);
        }
    }

    var vevents = jQuery(transport.responseXML.documentElement).find('vevent');

    if( vevents.size() > 0 ) {
        this.scheduleItems = [];
    }

    console.log("starting to process xml items...");

    // CALL A RECURSIVE FUNCTION TO AVOID THE 10sec SCRIPT KILLER
    // after the recursion is finished, the function calls
    // saveScheduleItems() to save all processed items.
    this.processItem(0, vevents);
}

ScheduleAssistant.prototype.processItem = function(i, results) {

    var item = jQuery(results).get(i);

    var dateObj = that.parseDate(jQuery(item).children('dtstart').text());

    var url = jQuery(item).children('url').text();

    if( url.indexOf( "/2010/schedule//2010/schedule/" ) != -1 ) {
        // fixing defect urls from xcal
        url = url.replace( "/2010/schedule/", "" );
    }
    if( url.indexOf( "/2011/schedule//2011/schedule/" ) != -1 ) {
        // fixing defect urls from xcal
        url = url.replace( "/2011/schedule/", "" );
    }

    var isFavorite = jQuery.inArray(
        jQuery(item).children('uid').text(),
        that.tempFavorites
    ) >= 0; // returns -1 if not found, otherwise the index

    this.scheduleItems.push({
        id: i,
        date: $L(dateObj.day + '. ' + dateObj.monthname + ' ' + dateObj.year),
        dtstart: $L(jQuery(item).children('dtstart').text()),
        time: $L(dateObj.hour + ':' + dateObj.minute),
        location: $L(jQuery(item).children('location').text()),
        locationImg: jQuery(item).children('location').text().toLowerCase().split('.').join(''),
        title: $L(jQuery(item).children('summary').text()),
        description: $L(jQuery(item).children('description').text()),
        attendee: $L(jQuery(item).children('attendee').text()),
        url: url,
        eventid: jQuery(item).children('uid').text(),
        pbfeventid: jQuery(item).children("[nodeName=pentabarf:event-id]").text(),
        favorite: isFavorite
    });

    if( i >= jQuery(results).size()-1 ) {
        this.saveScheduleItems();
    } else {
        if( i < jQuery(results).size() ) {
            this.processItem.bind(this).defer(i+1, results)
        }
    }
}

ScheduleAssistant.prototype.saveScheduleItems = function() {
    console.log("processed xml, now saving...");

    if( this.scheduleItems.length > 0 ) {
        // nuke all documents
        this.bucket.nuke();

        // save all documents
        for( var i=0; i<this.scheduleItems.length; i++ ) {
            this.bucket.save( this.scheduleItems[i] );
        }

        // re-load all items from bucket to get all models with their keys
        this.bucket.all( function(r) {
            that.setEventItems(r);
            that.controller.instantiateChildWidgets($('schedule_list'));

            Mojo.Controller.getAppController().showBanner(
                $L("Refreshed schedule items."),
                { source: 'notification' }
            );

            that.viewFilterMenuModel.items[1].toggleCmd = 'cmdShowAll';
            that.controller.modelChanged(that.viewFilterMenuModel);

            console.log("successfully saved.");
        });
    }
}

ScheduleAssistant.prototype.showFiltered = function(type) {
    // type = all, favs, upcoming

    //console.log("***** STARTING HIDING EXPIRED...");

    this.spinner('on');

    this.filter = '';

    switch( type ) {

        case 'favs':
            this.bucket.all( function(r) {
                r = r.filter( function( element, index, array ) {
                    if( element.favorite == true ) {
                        return true;
                    }
                    return false;
                } );
                that.setEventItems(r);
            } );
            this.activeViewFilter = 'favs';
            break;

        case 'upcoming':
            this.bucket.all( function(r) {
                r = r.filter( function( element, index, array ) {
                    var date = new Date();
                    //var date = new Date(2010, 1, 6, 15, 30, 00); // month as index!

                    var xcaldate = that.parseDate( element.dtstart );
                    var dtstart = new Date(
                        xcaldate.year,
                        xcaldate.month - 1, // as index!
                        xcaldate.day,
                        xcaldate.hour,
                        xcaldate.minute,
                        00
                    );

                    var diffHours = Math.round( (date-dtstart) / (1000*60*60 ) );

                    if( diffHours < 1 ) { // use a tolerance of one hour
                        return true;
                    }

                    return false;
                } );
                that.setEventItems(r);
            } );
            this.activeViewFilter = 'upcoming';
            break;

        case 'all':
        default:
            // TODO: set filter back - maybe like filterFunction OR with disabled property of list?
            // Also make sure saving favorites in fav filter mode doesn't clear all
            // of the non-fav entries.
            this.bucket.all( function(r){
                that.setEventItems(r);
            });
            this.activeViewFilter = 'all';
            break;

    }
}

ScheduleAssistant.prototype.parseDate = function(xCalDate){
    var months = new Array(
        $L('January'), $L('February'), $L('March'), $L('April'),
        $L('May'), $L('June'), $L('July'), $L('August'),
        $L('September'), $L('October'), $L('November'), $L('December')
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

ScheduleAssistant.prototype.strip_tags = function(input, allowed) {
    // FUNCTION FOUND HERE:
    // http://phpjs.org/functions/strip_tags:535
    // (GPL / MIT licenses)
    allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string contai
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}
