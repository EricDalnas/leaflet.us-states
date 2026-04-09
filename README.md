# leaflet.us-states

A simple Leaflet control for US states.

It is designed for hobbyist use:
- one state key format: `RI`, `TX`, `CA`
- easy JSON binding
- easy direct access like `states["RI"].color = "red"`
- small focused demos

## Quick start

Open one of the demo files in `demo/`.

```bash
# Optional: serve locally (no Node.js required)
python -m http.server 3000
# then open: http://localhost:3000/leaflet.us-states/demo/index.html
```

## Simple rule

Use the 2-letter state abbreviation everywhere.

- GeoJSON features should have `properties.STUSPS`
- bound JSON should use `states.RI`, `states.TX`, etc.
- direct access should use `states["RI"]`

## Usage

```html
<link  rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="/src/leaflet.us-states.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="/leaflet.regions/src/leaflet.regions.js"></script>
<script src="/src/leaflet.us-states.js"></script>

<script>
  var map = L.map('map').setView([39.5, -98.35], 4);

  L.usStatesLayer({
    color: '#4a90e2',
    popupContent: function (feature) {
      return '<b>' + feature.properties.name + '</b>';
    },
    popupAction: 'click'
  }).addTo(map);
</script>
```

`leaflet.us-states` is built on top of `leaflet.regions`, so load `leaflet.regions` before `leaflet.us-states` in browser builds.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `color` | `string \| Function` | `'#4a90e2'` | Fill color for all states. Function receives `(feature, stateDataEntry)`. |
| `borderColor` | `string \| Function` | `'#555'` | Border color for all states. Function receives `(feature, stateDataEntry)`. |
| `fillOpacity` | `number` | `1` | Polygon fill opacity. |
| `weight` | `number` | `1` | Border stroke width. |
| `labelColor` | `string \| Function` | `'#333333'` | Label text color. Function receives `(feature, stateDataEntry)`. |
| `label` | `null \| string \| Function` | `null` | Label text. `null` = state name from GeoJSON. Empty string = no label. |
| `popupContent` | `null \| string \| Function` | `null` | Popup HTML. `null` = no popup. |
| `popupAction` | `'click' \| 'hover' \| null` | `'click'` | When to show the popup. `null` disables popups entirely. |
| `data` | `Object \| string \| null` | `null` | State data object or URL. Required shape: `{ states: { RI: { ... } } }`. |
| `labelMinZoom` | `number \| null` | `4` | Hide labels below this zoom level. |
| `labelAbbrBelowZoom` | `number \| null` | `5` | Show state abbreviations below this zoom level (and above `labelMinZoom`). |
| `geoJsonUrl` | `string` | `src/us-states.geojson` | URL to fetch the GeoJSON from. Defaults to the bundled normalized states file. |

## Per-state data binding

Required format:

```json
{
  "format": "leaflet.us-states/standard-usage",
  "version": 1,
  "states": {
    "FL": {
      "color": "#ff0000",
      "label": "Florida",
      "labelColor": "#ffffff",
      "stateFacts": {
        "capital": "Tallahassee",
        "nickname": "The Sunshine State"
      }
    }
  },
  "metadata": {
    "anything": "allowed"
  }
}
```

Use it like this:

```js
L.usStatesLayer({
  data: '/data/state-usage.standard.json'
}).addTo(map);
```

Extra top-level fields are allowed, but state entries must live under `states`.

### Per-state entry fields

| Field | Type | Description |
|---|---|---|
| `color` | `string` | Fill color for this state. |
| `borderColor` | `string` | Border color for this state. |
| `strokeColor` | `string` | Alias of `borderColor` for this state. |
| `labelColor` | `string` | Label color for this state. |
| `label` | `string` | Label text for this state. |
| `popupContent` | `string` | Popup HTML content for the state. |
| `fillOpacity` | `number` | Optional per-state fill opacity value. |
| `stateFacts` | `object` | Optional extra info (capital, nickname, etc.) for popup templates. |

Use `fillOpacity` when you want predictable opacity control.

Label styles live in `src/leaflet.us-states.css`. Override `.us-states-label` in your app stylesheet if you want a different look.

## Direct state access

```js
var layer = L.usStatesLayer({
  color: '#4a90e2',
  borderColor: '#1f2937'
}).addTo(map);

// Option 1: direct map mutation
var states = layer.getStates();
states['RI'] = states['RI'] || {};
states['RI'].color = 'rgba(255, 0, 0, 0.5)';
states['RI'].borderColor = '#7a0000';
states['RI'].label = 'RI';
layer.refresh();

// Option 2: helper method
layer.setState('MA', {
  color: '#2f6fb5',
  popupContent: '<b>Massachusetts</b>'
});
```

## Methods

```js
var layer = L.usStatesLayer({ ... }).addTo(map);

// Replace per-state data and re-render
layer.setData('/data/new-data.json');

// Update any option and re-render
layer.setOptions({ fillOpacity: 0.6, popupAction: 'hover' });

// Get mutable state map
var states = layer.getStates();

// Upsert one state and re-render
layer.setState('RI', { color: 'red' });

// Re-render after direct mutation
layer.refresh();
```

## Demo Pages

- **[demo/index.html](demo/index.html)** — Simple example. Updates one state's color, border, and label using `layer.setState('RI', ...)` and shows a click popup.
- **[demo/standard-json-binding.html](demo/standard-json-binding.html)** — Standard JSON data binding demo. Loads per-state data (colors, labels, state facts) from a JSON file.
- **[demo/2024Election.html](demo/2024Election.html)** — 2024 US presidential election map. Full state-by-state results with candidate vote counts and percentage popups.
- **[demo/choropleth.html](demo/choropleth.html)** — Population density choropleth. Colors each state by 2020 US Census density using a 5-tier color scale.

## Choropleth example

See **[demo/choropleth.html](demo/choropleth.html)** for a working population density choropleth using 2020 US Census data bundled with the plugin.

## GeoJSON source

- `src/us-states.geojson` - smaller bundled file
- `src/us-states-detailed.geojson` - higher resolution bundled file

Both files are normalized to use state abbreviations in `feature.id` and `properties.STUSPS`.

## Data Sources

The bundled GeoJSON files (`us-states.geojson` and `us-states-detailed.geojson`) contain US state boundary geometry derived from **US Census Bureau TIGER/Line Shapefiles**. FIPS codes (`properties.fips`) and state postal codes (`properties.STUSPS`) are US Census Bureau identifiers. Population density values (`properties.density`) in `us-states.geojson` are from the **2020 US Census**.

US government geographic and census data is in the public domain as a work of the United States government (17 U.S.C. § 105).

For a clearly-documented alternative source, Natural Earth provides US state polygons under a Public Domain license:

> Made with Natural Earth. Free vector and raster map data @ [naturalearthdata.com](https://www.naturalearthdata.com/).
