var configButton;
var drawnItems;
var drawControl;
var map;
var node;
var initialNodeManagerID;

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
        node = this;
        
        function initializeMap(node) {
            map = L.map('node-geofence-map').setView([57.696, 11.9788], 9);

            var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
            var osm = L.tileLayer(osmUrl, { maxZoom: 18, attribution: osmAttrib });

            window.node_geofence_map = map;
            L.tileLayer(osmUrl, {
                maxZoom: 18,
                attribution: osmAttrib
            }).addTo(map);


            new L.Control.GeoSearch({
                provider: new L.GeoSearch.Provider.OpenStreetMap(),
                position: 'bottomleft',
                showMarker: false,
                zoomLevel: 12
            }).addTo(map);

            drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);
            
            drawControl = new L.Control.Draw({
                draw: {
                    position: 'topleft',
                    polyline: false,
                    marker: false,                    
                    circle: false,
                    circlemarker: false,
                    polygon: {
                        showLength: true
                    }

                }
            });
            map.addControl(drawControl);


            L.control.layers(
                {
                    'osm': osm.addTo(map),
                    "google": L.tileLayer('http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}', {
                        attribution: 'google'
                    })
                }, { 'drawlayer': drawnItems }, { collapsed: true }).addTo(map);

            var editControl = new L.Control.Draw({
                draw: false,
                edit: {
                    featureGroup: drawnItems
                }
            });
            map.addControl(editControl);

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

                drawControl.remove();
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
                drawControl.addTo(map);
            });

            $("#node-input-manager").change(function(val, pal){
                var nodeManagerId = $("#node-input-manager option:selected").val();
                nodeManager = RED.nodes.node(nodeManagerId);
                if(nodeManagerId != "_ADD_"){
                    changeNodeManager(nodeManager);
                }
            });

            initialNodeManagerID = $("#node-input-manager option:selected").val();
            var nodeManager = RED.nodes.node(initialNodeManagerID);
            if(nodeManager != null){
                changeNodeManager(nodeManager);
            }
        }

        function changeNodeManager(nodeM){
            
            drawnItems.clearLayers();
            nodeManager = nodeM;

            var shapeList = [];

            var marker;
            RED.comms.subscribe(node.id + "/locationUpdate", function(topic, location) {

                var location = new L.LatLng(location.latitude, location.longitude)
                if(marker == null){
                    marker = L.marker(location);
                    marker.addTo(map);
                }
	            marker.setLatLng(location)
            });

            Object.keys(nodeManager.geofences).map(function (nodeID, index) {
                var fence = L.GeoJSON.geometryToLayer(nodeManager.geofences[nodeID]);
                fence.nodeID = nodeID;


                var myFence = nodeID == node.id;

                if (myFence == true) {
                    fence.setStyle({color: '#ffffff'});
                    fence.setStyle({fillColor: '#42f4d7'});
                } else {
                    fence.setStyle({color: '#808080'});
                    fence.setStyle({fillColor: '#808080'});
                }

                shapeList.push(fence);
                fence.addTo(drawnItems);

                var fenceName = RED.nodes.node(nodeID).name;
                fence.bindTooltip(fenceName);
            });
            map.invalidateSize(true);

            var ourShape;
            if(nodeManager.geofences[node.id]) {
                drawControl.remove();
                ourShape = L.geoJSON(nodeManager.geofences[node.id]);
                map.fitBounds(
                    ourShape.getBounds(),
                    { padding: L.point(30, 30) }
                );
            }
            else {
                drawControl.addTo(map);
                if(shapeList.length > 0) {
                    map.fitBounds(new L.featureGroup(shapeList).getBounds());
                }
            }
        }

        $.getScript('geofence/js/leaflet/leaflet-src.js')
            .done(function (data, textStatus, jqxhr) {
                $.getScript('geofence/js/Leaflet.draw/dist/leaflet.draw.js')
                    .done(function (data, textStatus, jqxhr) {
                        $.getScript('geofence/js/L.GeoSearch/src/js/l.control.geosearch.js')
                            .done(function (data, textStatus, jqxhr) {
                                $.getScript('geofence/js/L.GeoSearch/src/js/l.geosearch.provider.openstreetmap.js')
                                    .done(function (data, textStatus, jqxhr) {
                                        initializeMap(node);

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

        //Remove old geofence
        if(initialNodeManagerID != null){
            var oldNodeManager = RED.nodes.node(initialNodeManagerID);
            if(oldNodeManager != null){
                delete oldNodeManager.geofences[n.id];
            }
        }


        if (nodeManager == undefined) {
            console.log("can't find config node!");
            return;
        }

        var geofences = {};

        drawnItems.eachLayer(function (layer) {
            var nodeID = layer.nodeID;

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

