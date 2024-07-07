const socket = io();
const map = L.map('map').setView([0, 0], 10); // Initialize map with a default center and zoom level

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ''
}).addTo(map);

const markers = {};
let userMarker = null; // Store the marker for the current user
let routingControl = null; // Store the routing control for the current route

// Function to update or create markers on the map
function updateMarker(id, latitude, longitude) {
    // Calculate a random offset for the marker to avoid overlapping markers
    const offset = 0.0001; // Adjust this value to change the distance between markers
    const randomLat = latitude + (Math.random() - 0.5) * offset;
    const randomLng = longitude + (Math.random() - 0.5) * offset;

    if (markers[id]) {
        markers[id].setLatLng([randomLat, randomLng]);
    } else {
        markers[id] = L.marker([randomLat, randomLng], {
            icon: L.icon({
                iconUrl: 'https://img.icons8.com/?size=100&id=PZTTDl8ML4vy&format=png&color=000000', 
                iconSize: [32, 32], // Adjust the size of the marker icon
                iconAnchor: [16, 32] // Adjust the anchor point of the marker icon
            })
        }).addTo(map);
        markers[id].bindPopup(`User: ${id}`);
    }
}

// Function to update or create the marker for the current user
function updateUserMarker(latitude, longitude) {
    if (userMarker) {
        userMarker.setLatLng([latitude, longitude]);
    } else {
        userMarker = L.marker([latitude, longitude], {
            icon: L.icon({
                iconUrl: 'https://img.icons8.com/ios-filled/50/000000/marker.png', 
                iconSize: [32, 32], // Adjust the size of the marker icon
                iconAnchor: [16, 32] // Adjust the anchor point of the marker icon
            })
        }).addTo(map);
    }
}

// Function to calculate distance between two points (in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius of the Earth in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Function to display the route between two points
function displayRoute(start, end) {
    if (routingControl) {
        map.removeControl(routingControl);
    }

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(start),
            L.latLng(end)
        ],
        lineOptions: {
            styles: [{ color: 'blue', opacity: 0.6, weight: 4 }]
        }
    }).addTo(map);
}

// Listen for location updates from the server
socket.on('receive-location', (data) => {
    const { id, latitude, longitude } = data;

    // Update the marker for the user
    updateMarker(id, latitude, longitude);

    // If this is the current user's location, update the marker and calculate distance/routes
    if (id === socket.id) {
        updateUserMarker(latitude, longitude);
        
        // Calculate distance and display route to all other users
        for (const userId in markers) {
            if (userId !== socket.id) {
                const marker = markers[userId];
                const markerLatLng = marker.getLatLng();
                const distance = calculateDistance(latitude, longitude, markerLatLng.lat, markerLatLng.lng);
                
                console.log(`Distance to User ${userId}: ${distance.toFixed(2)} meters`);
                displayRoute([latitude, longitude], [markerLatLng.lat, markerLatLng.lng]);
            }
        }
    }
});

// Handle user disconnection
socket.on('user-disconnected', (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});

// Fetch initial geolocation and send to server
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit('send-location', { latitude, longitude });
            map.setView([latitude, longitude], 19); // Center map on initial location
        },
        (error) => {
            console.error('Error fetching initial location', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );

    // Watch for changes in geolocation and send updates to server
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit('send-location', { latitude, longitude });
        },
        (error) => {
            console.error('Error fetching location updates', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
} else {
    console.error('Geolocation is not supported by this browser.');
}
