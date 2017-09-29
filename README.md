node-red-node-geofence
======================

Geofence node for Node-RED

This uses the geolib node to check if points fall with in a given area. Points are 
taken from msg.location.lat & msg.location.lon

Areas can be rectangular or polygons.

Messages will have information as to whether they are inside or outside of a geofence, and will have readable events when they enter of exit a geofence 

