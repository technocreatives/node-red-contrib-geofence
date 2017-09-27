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
                var isInShape = false;

                var managerID = RED.nodes.node(node.id).manager;
                var manager = RED.nodes.node(managerID);

                var fence = manager.geofences[node.id];


                if (fence._radius) {

                    var centre = { latitude: fence._latlng.lat, longitude: fence._latlng.lng };

                    isInShape = geolib.isPointInCircle(loc, centre, Math.round(fence._mRadius));
                } else {

                    var points = [];
                    for (var j = 0; j < fence._latlngs[0].length; j++) {

                        var nextElem = { latitude: fence._latlngs[0][j].lat, longitude: fence._latlngs[0][j].lng };

                        points.push(nextElem);
                    }

                    isInShape = geolib.isPointInside(loc, points);
                }

                var fenceData = {};
                fenceData.id = node.fenceID;
                fenceData.name = node.geofenceName;

                if (isInShape) {
                    fenceData.in = true;
                } else {
                    fenceData.in = false;
                }

                msg.fenceData = fenceData;

            }

            message.push(msg);
            node.send(message);
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
