FOSDEM schedule for WebOS
=========================

This application is a simple [WebOS](http://en.wikipedia.org/wiki/Palm_webOS)
schedule application for [FOSDEM](http://fosdem.org/) (Free and Open source
Software Developers' European Meeting) in Brussels. It downloads the schedule
from FOSDEM server, saves it to your device and shows a list of events.

There is also a [FrOSCon](http://www.froscon.de/en/) (Free and Open Source
Software Conference) version of this application (see the branch in git).
The features are pretty identical, as well as the technical basis, since both
conferences use Pentabarf for planning and provide an xCal schedule.

There is another version for [re:publica 2011](http://re-publica.de/11/), a
German conference for bloggers, digital culture and web. The technical basis
is similar to the FOSDEM 2011 version, but the re:publica version consumes a
custom JSON source for the schedule.

Status
------

The final FOSDEM 2011/2012 version of the application is available in the
[official Palm App Catalog](http://developer.palm.com/appredirect/?packageid=net.webpresso.fosdem).
The FrOSCon version is also available in the
[official Palm App Catalog](http://developer.palm.com/appredirect/?packageid=net.webpresso.froscon),
as well as the [re:publica application](http://developer.palm.com/appredirect/?packageid=net.webpresso.republica).
The 2010 application was distributed via
[Palm Web channel](http://developer.palm.com/webChannel/index.php?packageid=net.webpresso.fosdem2010).
IPK files are available under the [Files](http://forge.webpresso.net/projects/fosdem-webos/files)
section on the project website (they can be installed e.g. via the SDK or Preware).


Used libraries
--------------

The application includes the following libraries: [jQuery](http://jquery.com)
(MIT or GPLv2), [Timeago](http://timeago.yarp.com/jquery.timeago.js) (MIT),
[Lawnchair](http://blog.westcoastlogic.com/lawnchair/) (MIT) and the
[DP_DateExtensions](http://www.depressedpress.com/Content/Development/JavaScript/Extensions/DP_DateExtensions/)
(BSD). The filter icons are from the [Tango Icon Library](http://tango.freedesktop.org/Tango_Icon_Library)
(Public Domain).


Bug tracker
-----------

Bugs are tracked in the project Redmine installation:
https://forge.webpresso.net/projects/fosdem-webos/issues


Source code
-----------

The source code of the application can be found in a Git repository. Browse it
online (https://forge.webpresso.net/projects/fosdem-webos/repository) or

`git clone https://code.webpresso.net/git/fosdem-webos`


Authors
-------

**Raphael Kallensee**

+ http://raphael.kallensee.name
+ http://identi.ca/rkallensee
+ http://twitter.com/rkallensee


License
---------------------

Copyright 2011-2012 Raphael Kallensee.

[![GPLv3](http://www.gnu.org/graphics/gplv3-127x51.png)](http://www.gnu.org/licenses/gpl-3.0.html)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
