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
        var fenceEditOptions;
        var ownFenceStyle = {
            color: '#ffffff',
            fillColor: '#42f4d7'
        };
        var otherFenceStyle = {
            color: '#808080',
            fillColor: '#808080'
        };
        function initializeMap(node) {
            map = L.map('node-geofence-map').setView([57.696, 11.9788], 9);

            var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
            var osm = L.tileLayer(osmUrl, { maxZoom: 18, attribution: osmAttrib });

            var googleUrl = 'http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}';
            var googleAttrib = 'Google';
            var google = L.tileLayer(googleUrl, { maxZoom: 25, attribution: googleAttrib });

            var customUrl = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFnbnVzc3AiLCJhIjoiY2lnM3AyeTlrMDJrcXYza2hwYXF1cWtidCJ9.wuim_DRupGAUe6gbLSY-jA'
            var customAttrib = 'MagnusMaps (c)';
            var custom = L.tileLayer(googleUrl, { maxZoom: 25, attribution: customAttrib });

            var mapLayers = {
                'osm': osm,
                'google': google,
                'custom': custom
            };

            window.node_geofence_map = map;

            var cookieMap = Cookies.get('map') || 'osm';
            
            Object.keys(mapLayers).forEach(function (key){
                mapLayers[key].on('add', function(){
                    Cookies.set('map', key);
                });
            });

            var currentMapLayer = mapLayers[cookieMap];

            currentMapLayer.addTo(map);
            
            fenceEditOptions = {
                showLength: true,
                icon: new L.DivIcon({
                    iconSize: new L.Point(8, 8),
                    className: 'leaflet-div-icon leaflet-editing-icon test'
                }),
                touchIcon: new L.DivIcon({
                    iconSize: new L.Point(15, 15),
                    className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon test'
                })
            };

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
                        showLength: true,
                        icon: new L.DivIcon({
                            iconSize: new L.Point(8, 8),
                            className: 'leaflet-div-icon leaflet-editing-icon test'
                        }),
                        touchIcon: new L.DivIcon({
                            iconSize: new L.Point(15, 15),
                            className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon test'
                        })
                    }
                }
            });
            map.addControl(drawControl);

            L.control.layers(mapLayers, { 'drawlayer': drawnItems }, { collapsed: true }).addTo(map);

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

                fence.setStyle(ownFenceStyle);

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
                changeNodeManager(nodeManager);
            });

            initialNodeManagerID = $("#node-input-manager option:selected").val();
            var nodeManager = RED.nodes.node(initialNodeManagerID);
            changeNodeManager(nodeManager);
        }

        function changeNodeManager(nodeM){
            
            drawnItems.clearLayers();
            nodeManager = nodeM;

            if(nodeManager == null){
                console.log("No node manager selected");
                drawControl.remove();
                return;
            }

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
                fence.editing.options = fenceEditOptions;
                fence.nodeID = nodeID;

                if(RED.nodes.node(nodeID) == null){
                    console.log("SKipping to show non-existing node!")
                    return
                }

                var myFence = nodeID == node.id;

                if (myFence == true) {
                    fence.setStyle(ownFenceStyle);
                } else {
                    fence.setStyle(otherFenceStyle);
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

        initializeMap(node);

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

