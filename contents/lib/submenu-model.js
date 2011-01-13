var ScheduleViewSubmenuModel = {
    label: $L('Show'), 
    items: [
        {label: $L('Schedule'), command: 'cmdSchedule', shortcut: 's'},
        {label: $L('Feeds (online)'), command: 'cmdFeeds', shortcut: 'f'},
        {label: $L('Maps'), command: 'cmdMap', shortcut: 'm'},
        {label: $L('Help'), command: 'cmdHelp', shortcut: 'h'}
	]
};

var FeedViewSubmenuModel = {
    label: $L('Select feed'), 
    items: [
        {label: $L('FOSDEM website'), command: 'cmdFeedWebsite'},
        {label: $L('identi.ca account'), command: 'cmdFeedSnAccount'},
        {label: $L('identi.ca group'), command: 'cmdFeedSnGroup'},
        {label: $L('identi.ca tag'), command: 'cmdFeedSnTag'},
        {label: $L('twitter account'), command: 'cmdFeedTwAccount'},
        {label: $L('twitter tag'), command: 'cmdFeedTwTag'}
	]
};

var MapViewSubmenuModel = {
    label: $L('Select map'), 
    items: [
        {label: $L('Campus map'), command: 'cmdCampusMap', shortcut: 'm'},
        {label: $L('Neighborhood map'), command: 'cmdNeighborhoodMap', shortcut: 'n'},
        {label: $L('STIB-MIVB (web)'), command: 'cmdMetroMap', shortcut: 'p'},
        {label: $L('Tram map'), command: 'cmdTramMap', shortcut: 't'},
	]
};
