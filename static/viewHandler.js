var textBox;
var configButton;
var textLabel;
var drawnItems;
var drawControl;
var map;

/// This will find the node in the geofence map retrieve the geofence. 
function getGeofence(fenceArray, nodeID) {

    if (fenceArray == null) {
        console.log("tried to retrieve a null fenceArray");
        return null;
    }

    for (var i = 0; i < fenceArray.length; i++) {
        var element = fenceArray[i];

        if (element[0] == nodeID.toString()) {
            return element[1];
        }
    }

    return null;
}

/// This will find the node in the geofence map and assign it's geofence to newFence 
function setGeofenceData(fenceArray, nodeID, newFence) {

    if (fenceArray == null) {
        console.log("tried to assign to a null fenceArray");
    } else {

        for (let i = 0; i < fenceArray.length; i++) {
            var element = fenceArray[i];

            if (element[0] == nodeID.toString()) {

                if (newFence == null) {
                    fenceArray.splice(i, 1);
                    console.log("removed " + nodeID + "from the geofence map.");
                    return;
                } else {
                    element[1] = newFence;
                    console.log("added " + nodeID + "to the geofence map (" + newFence.name + ")");
                    return;
                }
            }
        }

        if (newFence != null) {
            //if we didn't find the element in the list of nodes with geofences, add this node to the list
            fenceArray.push([nodeID.toString(), newFence]);
        }
    }
}

function areGeofencesTheSame(shape1, shape2) {

    if (shape1._mRadius != undefined && shape2._mRadius != undefined) {
        if(shape1._mRadius > 0 && shape2._mRadius > 0) {
            if (shape1._mRadius == shape2._mRadius) {
                return true;
            }
        }
    }
    
    if (shape1._bounds != undefined && shape2._bounds != undefined) {
        if (shape1._bounds._northEast.lat == shape2._bounds._northEast.lat &&
            shape1._bounds._northEast.lng == shape2._bounds._northEast.lng &&
            shape1._bounds._southWest.lat == shape2._bounds._southWest.lat &&
            shape1._bounds._southWest.lng == shape2._bounds._southWest.lng) {
            return true;
        }
    }

    return false;
}

RED.nodes.registerType('geofence', {
    category: 'input',
    color: "#DEBD5C",
    defaults: {
        name: { value: "no geofence assigned." },
        manager: { type: "geofence-manager", required: true },
        centre: { value: null },
        radius: { value: null },
        points: { value: [] },
        geofenceName: { value: null },
        fenceID: { value: null },
        mode: { value: null }
    },
    inputs: 1,
    outputs: 1,
    icon: "white-globe.png",
    label: function () {

        var node = RED.nodes.node(this.id);
        var nodeManager = RED.nodes.node(node.manager);

        if (nodeManager == undefined) {
            return "no geofence assigned";
        }

        let ourGeofence = getGeofence(nodeManager.geofenceMap, this.id);

        if (ourGeofence == null) {
            return "no geofence assigned";
        }
        else {
            return ourGeofence.name;
        }
    },
    labelStyle: function () {
        return this.name ? "node_label_italic" : "";
    },
    oneditprepare: function () {
        var node = RED.nodes.node(this.id);
        var nodeManager = RED.nodes.node(node.manager);
        console.log(node.manager)
        console.log("Manager: " + nodeManager)
        
        function setupMap(node) {
            map = L.map('node-geofence-map').setView([57.696, 11.9788], 9);

            window.node_geofence_map = map;
            L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 20,
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
            }).addTo(map);

            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            drawControl = new L.Control.Draw({
                draw: {
                    position: 'topleft',
                    polyline: false,
                    marker: false,
                    circle: {
                        shapeOptions: {
                            color: '#ffffff',
                            fillColor: '#42f4d7'
                        }
                    }
                },
                edit: false
            });

            if (nodeManager == undefined) {
                console.log("can't find config node!");
                return;
            }

            var lastTextBox = document.getElementById("node-geofence-map");

            map.on('draw:created', function (e) {
                var layer = e.layer;
                var type = e.layerType;
                layer.shape = "geofence";
                if (drawnItems.hasLayer(layer) == false) {
                    drawnItems.addLayer(layer);
                }
                
                layer.setStyle({color: '#ffffff'});
                layer.setStyle({fillColor: '#42f4d7'});

                map.fitBounds(
                    layer.getBounds(),
                    { padding: L.point(30, 30) }
                );

                var elementName = 'input'
                var input = document.createElement('input');
                input.id = elementName;
                input.type = "text";
                input.placeholder = "shape name";
                lastTextBox.parentNode.insertBefore(input, lastTextBox.nextSibling);

                var newBoxLabel = document.createElement('label');
                newBoxLabel.innerHTML = "shape name";
                newBoxLabel.setAttribute("for", input);
                newBoxLabel.id = 'labelID';
                textLabel = newBoxLabel;
                input.parentNode.insertBefore(newBoxLabel, input);
                textBox = input;

                drawControl.remove(map);
            });

            map.on('draw:edited', function (e) {
                console.log("edited", e);
                var layers = e.layers;
                layers.eachLayer(function (layer) {
                    layer.shape = "geofence";
                    if (drawnItems.hasLayer(layer) == false) {
                        drawnItems.addLayer(layer);
                    }
                });
            });

            map.on('draw:deleted', function (e) {
                console.log("deleted", e);
                drawControl.addTo(map);
            });


            new L.Control.GeoSearch({
                provider: new L.GeoSearch.Provider.OpenStreetMap(),
                position: 'bottomleft',
                showMarker: false,
                zoomLevel: 12
            }).addTo(map);



            var doesOurGeofenceExist = false;
            var ourShape = getGeofence(nodeManager.geofenceMap, node.id);

            if (ourShape == null) {
                drawControl.addTo(map);
            }

            var i = -1;
            var shapeList = [];

            for (var key of nodeManager.geofenceMap) {
                var fence = key[1];

                if (fence == null) continue;
                i++;

                var leafletShape;
                var isOurShape = false;
                if (ourShape != undefined) {
                    isOurShape = areGeofencesTheSame(fence, ourShape);
                }

                console.log("here in geofence setupmap");

                if (fence.mode === "circle") {
                    if (fence._mRadius != 0) {
                        leafletShape = L.circle(
                            [fence.centre.latitude, fence.centre.longitude],
                            fence._mRadius
                        );
                    }

                } else {
                    if (fence.points.length >= 3) {
                        var corners = [];
                        for (var j = 0; j < fence.points.length; j++) {
                            var latlng = [fence.points[j].latitude, fence.points[j].longitude];
                            corners.push(latlng);
                        }
                        leafletShape = L.polygon(
                            corners
                        );
                    }
                }

                if (isOurShape == true) {
                    leafletShape.setStyle({color: '#ffffff'});
                    leafletShape.setStyle({fillColor: '#42f4d7'});
                } else {
                    leafletShape.setStyle({color: '#000000'});
                    leafletShape.setStyle({fillColor: '#7f8082'});
                }

                shapeList.push(leafletShape);
                leafletShape.addTo(drawnItems);
                leafletShape.bindTooltip(fence.name);

                if (ourShape != null) {
                    if (isOurShape) {

                        map.fitBounds(
                            leafletShape.getBounds(),
                            { padding: L.point(30, 30) }
                        );
                    }
                }

                var shouldDrawThisShape = true;

                if (ourShape == undefined) {
                    shouldDrawThisShape = false;
                } else if (ourShape == null) {
                    shouldDrawThisShape = false
                } else if (ourShape.shape._bounds != fence.shape._bounds || ourShape.shape._radius != fence.shape._radius) {
                    shouldDrawThisShape = false;
                }
            }

            map.invalidateSize(true);


            $(window).on('geofenceDeleted', function (e) {

                var thisNodesShape = getGeofence(nodeManager.geofenceMap, node.id);

                drawnItems.getLayers().forEach(function (shape) {

                    if (areGeofencesTheSame(shape, e.shape)) {
                        drawnItems.removeLayer(shape);
                    }
                }, this);

                if (thisNodesShape == null) {
                    return;
                }

                if (areGeofencesTheSame(e.shape, thisNodesShape)) {
                    node.name = "no geofence assigned.";
                    node.label = "no geofence assigned.";
                }


            }).bind(node);

            if (ourShape == null) {
                map.fitBounds(new L.featureGroup(shapeList).getBounds());
            }
        }

        var n = this;
        $.getScript('geofence/js/leaflet/leaflet-src.js')
            .done(function (data, textStatus, jqxhr) {
                $.getScript('geofence/js/Leaflet.draw/dist/leaflet.draw.js')
                    .done(function (data, textStatus, jqxhr) {
                        $.getScript('geofence/js/L.GeoSearch/src/js/l.control.geosearch.js')
                            .done(function (data, textStatus, jqxhr) {
                                $.getScript('geofence/js/L.GeoSearch/src/js/l.geosearch.provider.openstreetmap.js')
                                    .done(function (data, textStatus, jqxhr) {
                                        setupMap(n);

                                    })
                                    .fail(function (jqxhr, settings, exception) {
                                        console.log("failed4");
                                        console.log(exception);
                                        console.log(exception.stack);
                                    });
                            })
                            .fail(function (jqxhr, settings, exception) {
                                console.log("failed3");
                                console.log(exception);
                                console.log(exception.stack);
                            });
                    })
                    .fail(function (jqxhr, settings, exception) {
                        console.log("failed2");
                        console.log(exception);
                        console.log(exception.stack);
                    });
            })
            .fail(function (jqxhr, settings, exception) {
                console.log("failed");
                console.log(exception);
                console.log(exception.stack);
            });

    },
    oneditsave: function () {

        var map = window.node_geofence_map;
        var n = this;

        console.log("this");
        console.log(this);
        var node = RED.nodes.node(this.id);
        console.log(node);
        console.log(nodeManager);
        var nodeManager = RED.nodes.node(node.manager);

        if (nodeManager == undefined) {
            console.log("can't find config node!");
            return;
        }


        var newFence = new Object();

        map.eachLayer(function (layer) {

            if (layer.shape === "geofence") {
                console.log(layer.toGeoJSON());

                if (layer._radius) {
                    newFence.mode = "circle";
                    newFence.centre = { latitude: layer._latlng.lat, longitude: layer._latlng.lng };
                    newFence._mRadius = layer._mRadius;
                    newFence.points = [];
                    newFence.id = newFence.centre.latitude * newFence.centre.longitude;
                } else {
                    newFence.mode = "polyline";
                    newFence.points = [];
                    newFence._mRadius = 0;
                    newFence.centre = {};
                    for (var j = 0; j < layer._latlngs[0].length; j++) {

                        var nextElem = { latitude: layer._latlngs[0][j].lat, longitude: layer._latlngs[0][j].lng };

                        newFence.points.push(nextElem);
                    }

                    newFence.id = newFence.points[0].latitude * newFence.points[0].longitude;
                }

                newFence.shape = {};
                newFence.shape._bounds = layer._bounds;
                newFence._bounds = layer._bounds;
                newFence.shape._radius = layer._radius;
                newFence.name = textBox.value;

                setGeofenceData(nodeManager.geofenceMap, n.id, newFence);

                n.name = textBox.value;
            }


        });

        if (nodeManager != undefined) {

            var ourGeofence = getGeofence(nodeManager.geofenceMap, n.id);

            if (ourGeofence != null) {
                n.points = ourGeofence.points;
                n.radius = ourGeofence._mRadius;
                n.centre = ourGeofence.centre;
                n.fenceID = ourGeofence.id;
                n.geofenceName = ourGeofence.name;
                n.mode = ourGeofence.mode;
            }


        }
        delete window.node_geofence_map;
    },
    oneditresize: function () {
        if (window.node_geofence_map) {
            window.node_geofence_map.invalidateSize(true);
        }
    },
},
);

