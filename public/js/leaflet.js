/* eslint-disable */

export const displayMap = (locations) => {
  const map = L.map('map', {
    scrollWheelZoom: false,
    dragging: false,
    zoomControl: false,
  });

  L.tileLayer(
    'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 15,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  ).addTo(map); // <- adds it to the map immediately

  const pinIcon = L.icon({
    iconUrl: '/img/pin.png',
    iconSize: [26, 32],
    iconAnchor: [13, 32],
    popupAnchor: [0, -32],
  });

  // need to use L.latLngBounds() to getCenter() later
  const bounds = L.latLngBounds();

  locations.forEach((loc) => {
    const [lng, lat] = loc.coordinates;
    bounds.extend([lat, lng]);

    L.marker([lat, lng], { icon: pinIcon })
      .addTo(map)
      .bindTooltip(`Day ${loc.day}: ${loc.description}`, {
        permanent: false, //  visible on mouse over
        direction: 'bottom', // position relative to the marker
        className: 'map-label', // optional CSS class
      });
  });

  const center = bounds.getCenter();

  // set the initial static view to the center of the bounds
  map.setView(center, 2, { animate: false });
  if (bounds.isValid()) {
    map.whenReady(() => {
      map.flyToBounds(bounds, {
        padding: [100, 100],
        duration: 2,
      });
    });
  }
};
