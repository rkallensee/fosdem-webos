var ScheduleViewSubmenuModel = {
    label: $L('Show'),
    items: [
        {label: $L('Schedule'), command: 'cmdSchedule', shortcut: 's'},
        {label: $L('Feeds'), command: 'cmdFeeds', shortcut: 'f'},
        {label: $L('Maps'), command: 'cmdMap', shortcut: 'm'},
        {label: $L('Help'), command: 'cmdHelp', shortcut: 'h'}
    ]
};

var FeedViewSubmenuModel = {
    label: $L('Select feed'),
    items: [
        {label: $L('re-publica.de'), command: 'cmdFeedWebsite'},
        {label: $L('@republica'), command: 'cmdFeedTwAccount'},
        {label: $L('#rp11 (Twitter)'), command: 'cmdFeedTwTag'},
        {label: $L('#rp11 (Identi.ca)'), command: 'cmdFeedSnTag'}
    ]
};

var MapViewSubmenuModel = {
    label: $L('Select map'),
    items: [
        {label: $L('Site plan'), command: 'cmdSitePlan', shortcut: 'm'},
        {label: $L('Kalkscheune ground floor'), command: 'cmdKalkscheuneEgMap', shortcut: 'n'},
        {label: $L('Kalkscheune first floor'), command: 'cmdKalkscheuneOgMap', shortcut: 't'},
    ]
};
