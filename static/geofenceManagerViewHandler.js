RED.nodes.registerType('geofence-manager', {
    category: 'config',
    defaults: {
        name: { value: "Geofence manager." },
        geofences: { value: {} }
    },
    label: function () {
        return this.name || "";
    },
});