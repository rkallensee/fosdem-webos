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
    this.conference = 're:publica';
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

    // listener for list element tap
    this.controller.listen('schedule_list', Mojo.Event.listTap, this.listTapped.bindAsEventListener(this));

    // bind propertyChange event of list model to handler (used for favorites)
    this.controller.listen('schedule_list', Mojo.Event.propertyChange, this.listPropertyChanged.bindAsEventListener(this));

    this.spinnerModel = { spinning: false }
    this.controller.setupWidget("schedule_spinner", {spinnerSize: 'large'}, this.spinnerModel);
    $('schedule_scrim').hide();

    // setup favorite checkbox widgets in item details drawer
    this.controller.setupWidget('listCheckBox', {property: 'favorite', modelProperty: 'favorite'});
}

ScheduleAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */

    // it seems like we have to re-set this variable after the scene was popped in again via back gesture
    that = this; // this allows accessing the assistant object from other scopes. Ugly!
}


ScheduleAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    // since "that" is global, maybe it's better to cleanup after scene became inactive.
    that = null;
}

ScheduleAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as
       a result of being popped off the scene stack */

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
            title: $L("Welcome to the re:publica app!"),
            message: $L("There is currently no schedule stored on your phone - do you want to download it now from re:publica server? This may take a while. Please remember to refresh it periodically."),
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
                    message: $L("Do you really want to refresh the schedule stored on your device? An internet connection is required. The refresh may take a while. Favorites are preserved."),
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
    try {
        var drawer = "eventDrawer-" + event.item.id;
        this.controller.get(drawer).mojo.toggleState();
    } catch (e) {}
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

                var xcalURL = "http://re-publica.de/11/rp2011.json"; // re:publica 2011 JSON
                var speakerURL = "http://re-publica.de/11/speakers.json"; // re:publica 2011 speaker JSON

                var request = new Ajax.Request(speakerURL, {

                    method: 'get',
                    evalJSON: true, // json!
                    evalJS: false,
                    onSuccess: function(transport){
                        that.tmpSpeakers = Mojo.parseJSON( transport.responseText );
                        that.refreshScheduleSecondPart();
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

ScheduleAssistant.prototype.refreshScheduleSecondPart = function() {
    //console.log("***** STARTING REFRESH SCHEDULE...");

    console.log("***** STARTING SECOND AJAX REQUEST...");

    var xcalURL = "http://re-publica.de/11/rp2011.json"; // re:publica 2011 JSON

    var request = new Ajax.Request(xcalURL, {

        method: 'get',
        evalJSON: true, // json!
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

ScheduleAssistant.prototype.incubateSetAndSaveResponse = function( transport ) {
    console.log("starting incubating response...");

    // temporarily save favorites' uid here to reassign state later
    that.tempFavorites = [];  // TODO: Store favs in depot?
    for( var i=0; i<this.scheduleItems.length; i++ ) {
        if( this.scheduleItems[i].favorite == true ) {
            that.tempFavorites.push(this.scheduleItems[i].eventid);
        }
    }

    console.log("starting to process json items...");

    var scheduleJSON = Mojo.parseJSON( transport.responseText );

    this.scheduleItems = [];

    jQuery.each( scheduleJSON, function( day, dayEvents ) {
        myday = day;
        jQuery.each( dayEvents, function( location, locationEvents ) {
            mylocation = location;
            jQuery.each( locationEvents, function( time, event ) {

                var isFavorite = jQuery.inArray(
                    event.id,
                    that.tempFavorites
                ) >= 0; // returns -1 if not found, otherwise the index

                var day = myday.toString().split('.');
                var time = time.toString().split(':');

                if( !time[1] ) {
                    time[1] = '00'; // fix broken times
                }

                // simulate xcal dtstart
                var dtstart = day[2] + '' + day[1] + '' + day[0] + 'T' + time[0] + '' + time[1] + '00'; // 20100822T174500

                var dateObj = that.parseDate( dtstart );

                var speakerName = [];
                var speakerDescText = '';

                for( var i = 0; i < that.tmpSpeakers.length; i++ ) {
                    if( jQuery.inArray( that.tmpSpeakers[i].id, event.speaker ) >= 0 ) {
                        speakerName.push( that.tmpSpeakers[i].name );

                        speakerDescText += '<div class="speakerDesc">';

                        if( that.tmpSpeakers[i].imageurl != null ) {
                            speakerDescText += '<img src="'+that.tmpSpeakers[i].imageurl+'" width="100" class="speakerImg" />';
                        }

                        speakerDescText += '<a href="'+that.tmpSpeakers[i].permalink+'">'
                            +that.tmpSpeakers[i].name+'</a><br /><br />'
                            +that.strip_tags( that.tmpSpeakers[i].bio )+'<div class="speakerClear"></div></div>';
                    }
                }

                event.description = that.strip_tags( event.description );

                var eventLengthText = '<br /><br /><i>Länge: <b>'+event.length+' Minuten</b></i>';

                that.scheduleItems.push({
                    id: event.id,
                    date: $L(dateObj.day + '. ' + dateObj.monthname + ' ' + dateObj.year),
                    dtstart: dtstart,
                    time: $L(dateObj.hour + ':' + dateObj.minute),
                    location: mylocation,
                    locationImg: '',
                    title: event.title,
                    description: event.description + eventLengthText + speakerDescText,
                    attendee: speakerName.join(', '),
                    url: event.permalink,
                    eventid: event.id,
                    pbfeventid: event.id,
                    favorite: isFavorite
                });

            });
        });
    });

    this.saveScheduleItems();
}

ScheduleAssistant.prototype.saveScheduleItems = function() {
    console.log("processed json, now saving...");

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

// only "favorite" list property changes. this is handled here.
ScheduleAssistant.prototype.listPropertyChanged = function(event) {
    for( var i=0; i<this.scheduleItems.length; i++ ) {

        // if model found and key is not undefined (prevent inserting a new item)
        if( event.model.eventid == this.scheduleItems[i].eventid ) { //&& event.model.key != undefined ) {

            if( event.value == true ) {
                jQuery('#star-'+event.model.id).addClass('starActive');
                this.scheduleItems[i].favorite = true;
            } else {
                jQuery('#star-'+event.model.id).removeClass('starActive');
                this.scheduleItems[i].favorite = false;
            }

            // set open property to false to prevent saving drawer
            // open/close state
            this.scheduleItems[i].open = false;

            // save the item
            //this.bucket.save( this.scheduleItems[i] );
            //console.log(this.scheduleItems[i].key);
            this.bucket.save( this.scheduleItems[i], function(r) {
                console.log( 'Updated item ' + r.key );
            });
        }
    }
    //console.log(event.property+"#"+event.value+"##"+event.model.key+"##"+event.model.favorite+"###"+event.model.pbfeventid);
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
    allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}
