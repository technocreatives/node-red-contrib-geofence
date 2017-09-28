var configButton;
var drawnItems;
var drawControl;
var map;


RED.nodes.registerType('geofence', {
    category: 'input',
    color: "#DEBD5C",
    defaults: {
        name: { value: "No geofence assigned." },
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
        return this.name || "No geofence assigned.";
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
                    circle: false,
                    circlemarker: false
                }
            });
            map.addControl(drawControl);


            if (nodeManager == undefined) {
                console.log("can't find config node!");
                return;
            }

            var lastTextBox = document.getElementById("node-geofence-map");

            map.on(L.Draw.Event.CREATED, function (e) {
                var fence = e.layer;
                fence.nodeID = node.id;
                if (drawnItems.hasLayer(fence) == false) {
                    drawnItems.addLayer(fence);
                }
                

                fence.setStyle({color: '#ffffff'});
                fence.setStyle({fillColor: '#42f4d7'});

                map.fitBounds(
                    fence.getBounds(),
                    { padding: L.point(30, 30) }
                );

                drawControl.remove(map);
            });

            map.on('draw:edited', function (e) {
                console.log("edited", e);
                var fences = e.layers;
                fences.eachLayer(function (fence) {
                    fence.shape = "geofence";
                    if (drawnItems.hasLayer(fence) == false) {
                        drawnItems.addLayer(fence);
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
            var ourShape;
            if(nodeManager.geofences[node.id]) {
                ourShape = L.geoJSON(nodeManager.geofences[node.id]);
                map.fitBounds(
                    ourShape.getBounds(),
                    { padding: L.point(30, 30) }
                );
            }
            else {
                drawControl.addTo(map);
            }
            console.log("this is our shape");
            console.log(nodeManager.geofences[node.id]);


            var shapeList = [];

            console.log(node);

            Object.keys(nodeManager.geofences).map(function (nodeID, index) {
                var fence = L.GeoJSON.geometryToLayer(nodeManager.geofences[nodeID]);
                fence.nodeID = nodeID;


                var myFence = nodeID == node.id;

                console.log("here in geofence setupmap");
                console.log(fence);


                if (myFence == true) {
                    fence.setStyle({color: '#ffffff'});
                    fence.setStyle({fillColor: '#42f4d7'});
                } else {
                    fence.setStyle({color: '#000000'});
                    fence.setStyle({fillColor: '#7f8082'});
                }

                shapeList.push(fence);
                fence.addTo(drawnItems);

                var fenceName = RED.nodes.node(nodeID).name;
                fence.bindTooltip(fenceName);
            });

            var editControl = new L.Control.Draw({
                draw: false,
                edit: {
                    featureGroup: drawnItems
                }
            });

            
            map.addControl(editControl);
            map.invalidateSize(true);


            $(window).on('geofenceDeleted', function (e) {
                
                drawnItems.removeLayer(L.geoJSON(nodeManager.geofences[e.nodeID]));
                
                if (node.id == e.nodeID) {
                    node.name = "No geofence assigned.";
                    delete nodeManager.geofences[e.nodeID]; 
                }

            }).bind(node);

            if (ourShape == null && shapeList.length > 0) {
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
        var nodeManager = RED.nodes.node(node.manager);
        console.log(node);
        console.log(nodeManager);

        if (nodeManager == undefined) {
            console.log("can't find config node!");
            return;
        }

        var geofences = {};

        console.log(drawnItems);

        drawnItems.eachLayer(function (layer) {
            var nodeID = layer.nodeID;
            console.log(nodeID);
            console.log(layer);

            var geoJSON = layer.toGeoJSON();

            geofences[nodeID] = geoJSON;
        });

        nodeManager.geofences = geofences;


       
        delete window.node_geofence_map;
    },
    oneditresize: function () {
        if (window.node_geofence_map) {
            window.node_geofence_map.invalidateSize(true);
        }
    },
}
);

