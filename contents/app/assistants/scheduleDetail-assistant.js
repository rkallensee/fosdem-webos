function ScheduleDetailAssistant(params) {
    /* this is the creator function for your scene assistant object. It will be passed all the
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */

    // the event object is passed as param by the schedule assistant.
    this.event = params.event;
}

ScheduleDetailAssistant.prototype.setup = function() {
    /* this function is for setup tasks that have to happen when the scene is first created */

    /* use Mojo.View.render to render view templates and add them to the scene, if needed */

    that = this; // this allows accessing the assistent object from other scopes. Ugly!

    // Lawnchair bucket
    this.bucket = new Lawnchair({table: 'schedule', adaptor: 'webkit', onError: this.handleDbError.bind(this)});

    /* setup widgets here */

    // configure app menu
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

    // add event content to template
    jQuery('#ScheduleDetailContainer .event-title').text(this.event.title);
    if( this.event.favorite == true ) {
        jQuery('#ScheduleDetailContainer .star').addClass('starActive');
    } else {
        jQuery('#ScheduleDetailContainer .star').removeClass('starActive');
    }
    jQuery('#ScheduleDetailContainer .event-speaker span').text(this.event.attendee);
    var dateDetails = this.parseDate( this.event.dtstart );
    var dateObj = new Date(
        dateDetails.year,
        dateDetails.month - 1, // as index!
        dateDetails.day,
        dateDetails.hour,
        dateDetails.minute,
        00
    );
    jQuery('#ScheduleDetailContainer .event-date span').text(Mojo.Format.formatDate( dateObj, {date: 'long'} ));
    jQuery('#ScheduleDetailContainer .event-date strong').text(this.event.time);
    jQuery('#ScheduleDetailContainer .event-location strong').text(this.event.location);
    if( this.event.locationImg != '' ) {
        jQuery('#ScheduleDetailContainer .event-location-image img').attr('src', 'images/rooms/'+this.event.locationImg+'.png');
        jQuery('#ScheduleDetailContainer .event-location-image img').show();
    } else {
        jQuery('#ScheduleDetailContainer .event-location-image img').hide();
    }
    jQuery('#ScheduleDetailContainer .event-description').text(this.event.description);
    jQuery('#ScheduleDetailContainer .event-url').html(
        '<a href="'+this.event.url+'">'+this.event.url+'</a>'
    );

    // setup favorite control
    this.controller.setupWidget("favItemCheckbox",
        {},
        this.checkboxModel = {
            value: this.event.favorite,
            disabled: false
        }
    );

    // set up drawers
    this.locationDrawer = this.controller.setupWidget("event-drawer-timelocation",
        this.locationDrawerAttributes = {
            modelProperty: 'open',
            unstyled: true
        },
        this.locationDrawerModel = {
            open: true
        }
    );
    this.descriptionDrawer = this.controller.setupWidget("event-drawer-description",
        this.descriptionDrawerAttributes = {
            modelProperty: 'open',
            unstyled: true
        },
        this.descriptionDrawerModel = {
            open: true
        }
    );
    this.moreDrawer = this.controller.setupWidget("event-drawer-more",
        this.moreDrawerAttributes = {
            modelProperty: 'open',
            unstyled: true
        },
        this.moreDrawerModel = {
            open: true
        }
    );
    this.favoriteDrawer = this.controller.setupWidget("event-drawer-favorite",
        this.favoriteDrawerAttributes = {
            modelProperty: 'open',
            unstyled: true
        },
        this.favoriteDrawerModel = {
            open: true
        }
    );

};

ScheduleDetailAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */

    // setup favorite control
    Mojo.Event.listen(
        this.controller.get("favItemCheckbox"),
        Mojo.Event.propertyChange,
        this.favoritePropertyChanged
    );

    /* add event handlers to listen to events from widgets */

    // set up toggle buttons
    Mojo.Event.listen(this.controller.get('event-toggler-timelocation'), Mojo.Event.tap, this.toggleTimelocation);
    Mojo.Event.listen(this.controller.get('event-toggler-description'), Mojo.Event.tap, this.toggleDescription);
    Mojo.Event.listen(this.controller.get('event-toggler-more'), Mojo.Event.tap, this.toggleMore);
    Mojo.Event.listen(this.controller.get('event-toggler-favorite'), Mojo.Event.tap, this.toggleFavorite);

    // it seems like we have to re-set this variable after the scene was popped in again via back gesture
    that = this; // this allows accessing the assistant object from other scopes. Ugly!
};

ScheduleDetailAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    Mojo.Event.stopListening(
        this.controller.get("favItemCheckbox"),
        Mojo.Event.propertyChange,
        this.favoritePropertyChanged
    );

    Mojo.Event.stopListening(this.controller.get('event-toggler-timelocation'), Mojo.Event.tap, this.toggleTimelocation);
    Mojo.Event.stopListening(this.controller.get('event-toggler-description'), Mojo.Event.tap, this.toggleDescription);
    Mojo.Event.stopListening(this.controller.get('event-toggler-more'), Mojo.Event.tap, this.toggleMore);
    Mojo.Event.stopListening(this.controller.get('event-toggler-favorite'), Mojo.Event.tap, this.toggleFavorite);

    // since "that" is global, maybe it's better to cleanup after scene became inactive.
    that = null;
};

ScheduleDetailAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as
       a result of being popped off the scene stack */

    Mojo.Event.stopListening(
        this.controller.get("favItemCheckbox"),
        Mojo.Event.propertyChange,
        this.favoritePropertyChanged
    );

    Mojo.Event.stopListening(this.controller.get('event-toggler-timelocation'), Mojo.Event.tap, this.toggleTimelocation);
    Mojo.Event.stopListening(this.controller.get('event-toggler-description'), Mojo.Event.tap, this.toggleDescription);
    Mojo.Event.stopListening(this.controller.get('event-toggler-more'), Mojo.Event.tap, this.toggleMore);
    Mojo.Event.stopListening(this.controller.get('event-toggler-favorite'), Mojo.Event.tap, this.toggleFavorite);

    // since "that" is global, maybe it's better to cleanup after scene became inactive.
    that = null;
};

ScheduleDetailAssistant.prototype.toggleTimelocation = function() {
    that.locationDrawerModel.open = !that.locationDrawerModel.open;
    that.controller.modelChanged(that.locationDrawerModel);

    if( that.locationDrawerModel.open == true ) {
        that.controller.get("event-toggler-timelocation").removeClassName("palm-arrow-closed").addClassName("palm-arrow-expanded");
    } else {
        that.controller.get("event-toggler-timelocation").removeClassName("palm-arrow-expanded").addClassName("palm-arrow-closed");
    }
};

ScheduleDetailAssistant.prototype.toggleDescription = function() {
    that.descriptionDrawerModel.open = !that.descriptionDrawerModel.open;
    that.controller.modelChanged(that.descriptionDrawerModel);

    if( that.descriptionDrawerModel.open == true ) {
        that.controller.get("event-toggler-description").removeClassName("palm-arrow-closed").addClassName("palm-arrow-expanded");
    } else {
        that.controller.get("event-toggler-description").removeClassName("palm-arrow-expanded").addClassName("palm-arrow-closed");
    }
};

ScheduleDetailAssistant.prototype.toggleMore = function() {
    that.moreDrawerModel.open = !that.moreDrawerModel.open;
    that.controller.modelChanged(that.moreDrawerModel);

    if( that.moreDrawerModel.open == true ) {
        that.controller.get("event-toggler-more").removeClassName("palm-arrow-closed").addClassName("palm-arrow-expanded");
    } else {
        that.controller.get("event-toggler-more").removeClassName("palm-arrow-expanded").addClassName("palm-arrow-closed");
    }
};

ScheduleDetailAssistant.prototype.toggleFavorite = function() {
    that.favoriteDrawerModel.open = !that.favoriteDrawerModel.open;
    that.controller.modelChanged(that.favoriteDrawerModel);

    if( that.favoriteDrawerModel.open == true ) {
        that.controller.get("event-toggler-favorite").removeClassName("palm-arrow-closed").addClassName("palm-arrow-expanded");
    } else {
        that.controller.get("event-toggler-favorite").removeClassName("palm-arrow-expanded").addClassName("palm-arrow-closed");
    }
};

ScheduleDetailAssistant.prototype.handleDbError = function(transaction, error) {
    // console.log(error.message); console.log(error.code);

    if( error.code == 1 && error.message.indexOf('no such table') > -1 ) {
        // This means the database table is unavailable. The only reason could be
        // that there never was a schedule - so it's the first application start.

        Mojo.Controller.errorDialog($L("There are no schedule events to show."));
        //that.spinner('off');

        return;
    }
};

ScheduleDetailAssistant.prototype.favoritePropertyChanged = function(event) {

    if( event.value == true ) {
        jQuery('#ScheduleDetailContainer .star').addClass('starActive');
        that.event.favorite = true;
    } else {
        jQuery('#ScheduleDetailContainer .star').removeClass('starActive');
        that.event.favorite = false;
    }

    // save the item
    //this.bucket.save( this.scheduleItems[i] );
    //console.log(this.scheduleItems[i].key);
    that.bucket.save( that.event, function(r) {
        console.log( 'Updated item ' + r.key + ' from detail view.' );
    });
    //console.log(event.property+"#"+event.value+"##"+event.model.key+"##"+event.model.favorite+"###"+event.model.pbfeventid);
}

// TODO: put into utility class, currently duplicated!
ScheduleDetailAssistant.prototype.parseDate = function(xCalDate){
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
