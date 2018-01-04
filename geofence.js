/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {

    var geolib = require('geolib');
    var path = require('path');


    function geofenceNode(n) {
        RED.nodes.createNode(this, n);

        this.manager = n.manager;
        this.points = n.points;
        this.mode = n.mode;
        this.centre = n.centre;
        this.radius = n.radius;
        this.geofenceName = n.geofenceName;
        this.fenceID = n.fenceID;
        var node = this;
        var previousInFence = false;

        node.on('input', function (msg) {

            var message = [];

            var loc;

            if (msg.location && msg.location.lat && msg.location.lon) {
                loc = {
                    latitude: msg.location.lat,
                    longitude: msg.location.lon
                };
            } else if (msg.lon && msg.lat) {
                loc = {
                    latitude: msg.lat,
                    longitude: msg.lon
                };
            } else if (typeof (msg.payload) === 'object' && msg.payload.lat && msg.payload.lon) {
                loc = {
                    latitude: msg.payload.lat,
                    longitude: msg.payload.lon
                };
            }

            if (loc) {

                var managerID = RED.nodes.getNode(node.id).manager;
                var manager = RED.nodes.getNode(managerID);

                var fence = manager.geofences[node.id];

                RED.comms.publish(node.id + "/locationUpdate", loc);

                if(fence == null){
                    node.warn("No geofence defined");
                    return;
                }

                var points = [];
                var fenceCoordinates = fence.geometry.coordinates[0];
                
                for (var j = 0; j < fenceCoordinates.length; j++) {

                    var nextElem = { latitude: fenceCoordinates[j][1], longitude: fenceCoordinates[j][0] };

                    points.push(nextElem);
                }
                var inFence = geolib.isPointInside(loc, points);
                
                var payload = {};
                payload.name = n.name;

                payload.in = inFence;

                payload.onEnter = !previousInFence && inFence;
                payload.onExit = previousInFence && !inFence;

                previousInFence = inFence;

                msg.payload = payload;
            }

            message.push(msg);
            node.send(message);
        });

        node.on('close', function() {
            console.log("Deleting node " + node.id)
            node.manager[node.id]
        });

    }

    RED.nodes.registerType("geofence", geofenceNode);

    RED.httpAdmin.get('/geofence/js/*', function (req, res) {
        var options = {
            root: __dirname + '/static/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });

};
