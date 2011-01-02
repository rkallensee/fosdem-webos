var ScheduleViewSubmenuModel = {
    label: $L('Show'), 
    items: [
        {label: $L('Schedule'), command: 'cmdSchedule', shortcut: 's'},
        {label: $L('Feeds (online)'), command: 'cmdFeeds', shortcut: 'f'},
        {label: $L('Campus map'), command: 'cmdMap', shortcut: 'm'},
        {label: $L('Neighborhood map'), command: 'cmdNeighborhoodMap', shortcut: 'n'},
        {label: $L('Public transport map'), command: 'cmdMetroMap', shortcut: 'p'},
        {label: $L('Tram map'), command: 'cmdTramMap', shortcut: 't'},
        {label: $L('Help'), command: 'cmdHelp', shortcut: 'h'}
	]
};
