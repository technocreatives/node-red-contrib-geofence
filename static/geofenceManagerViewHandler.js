RED.nodes.registerType('geofence-manager', {
    category: 'config',
    defaults: {
        geofences: { value: {} }
    },
    label: function () {
        return "geofence manager";
    },
    oneditprepare: function () {
        console.log("in edit prepare of geofenceManager");

        var node = this;

        function setupMap(node) {

            var map = L.map('node-geofence-map').setView([57.696, 11.9788], 9);

            window.node_geofence_map = map;
            L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 20,
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
            }).addTo(map);

            var drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            createOtherGeofenceLayers(node, map, drawnItems);
        }

        console.log("loading leaflet");
        $.getScript('geofence/js/leaflet/leaflet-src.js')
            .done(function (data, textStatus, jqxhr) {
                $.getScript('geofence/js/Leaflet.draw/dist/leaflet.draw.js')
                    .done(function (data, textStatus, jqxhr) {
                        $.getScript('geofence/js/L.GeoSearch/src/js/l.control.geosearch.js')
                            .done(function (data, textStatus, jqxhr) {
                                $.getScript('geofence/js/L.GeoSearch/src/js/l.geosearch.provider.openstreetmap.js')
                                    .done(function (data, textStatus, jqxhr) {
                                        setupMap(node);

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
    }
});

function createOtherGeofenceLayers(node, map, drawnItems) {

    var mapElement = document.getElementById("node-geofence-map");

    var shapeList = [];

    Object.keys(node.geofences).map(function (key, index) {
        var fence = L.geoJSON(node.geofences[key]);

        var deleteButton = document.createElement('button');
        var deleteID = "delete" + i;
        deleteButton.id = deleteID;
        deleteButton.innerHTML = "delete " + fence.name;
        mapElement.parentNode.insertBefore(deleteButton, mapElement.nextSibling);
        fence.deleteID = deleteID;

        deleteButton.onclick = function () {
            deleteGeofence(node, key, fence, drawnItems);
        }.bind(node, fence);

        var leafletShape;

        if (fence.mode === "circle") {
            if (fence._mRadius != 0) {
                leafletShape = L.circle(
                    [fence.centre.latitude, fence.centre.longitude],
                    fence._mRadius
                );
                leafletShape.addTo(drawnItems);
                leafletShape.bindTooltip(fence.name + " ");
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

                leafletShape.addTo(drawnItems);
                leafletShape.bindTooltip(fence.name);
            }
        }

        leafletShape.setStyle({ color: '#ffffff' });
        leafletShape.setStyle({ fillColor: '#42f4d7' });

        shapeList.push(leafletShape);
    });


    if (shapeList.length > 0) {
        map.fitBounds(new L.featureGroup(shapeList).getBounds());
    }
}


function deleteGeofence(node, nodeID, fenceToRemove, drawnItems) {

    deleteElem(fenceToRemove.deleteID);

   drawnItems.removeLayer(fenceToRemove);


    var evt = $.Event('geofenceDeleted');
    evt.manager = node;
    evt.nodeID = nodeID;
    $(window).trigger(evt);


}

function deleteElem(elemName) {
    var elem = document.getElementById(elemName);
    elem.parentNode.removeChild(elem);
}