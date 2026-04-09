/*!
 * leaflet.us-states v0.1.0
 * A Leaflet plugin for rendering US state borders with customizable
 * colors, labels, and popups. Supports per-state data binding.
 * https://github.com/example/leaflet.us-states
 * MIT License
 */
(function (L) {
  'use strict';

  if (!L || !L.RegionsLayer) {
    throw new Error('leaflet.us-states requires leaflet.regions to be loaded first.');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Normalize anything to an uppercase string so state keys are consistent.
   */
  function toUpperSafe(val) {
    return (val === null || val === undefined) ? '' : String(val).toUpperCase();
  }

  /**
   * Accept ISO codes like "US-RI" and convert them to the 2-letter key "RI".
   */
  function normalizeStateKeyFromIso(iso3166) {
    if (!iso3166) return '';
    var iso = String(iso3166).toUpperCase();
    if (iso.indexOf('US-') === 0 && iso.length >= 5) {
      return iso.slice(3);
    }
    return '';
  }

  function escapeHtml(input) {
    if (input === null || input === undefined) return '';
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * The plugin lets options be either fixed values or functions.
   * This keeps that pattern readable in the rest of the file.
   */
  function resolveOption(option, feature, stateData) {
    return typeof option === 'function' ? option(feature, stateData) : option;
  }

  function syncStateAliases(layer) {
    layer._stateData = layer._data;
    layer.states = layer._stateData;
  }

  // ── Plugin ───────────────────────────────────────────────────────────────────

  /**
   * L.UsStatesLayer — renders US state borders from GeoJSON with customizable
   * colors, labels, and popups. Supports per-state data binding.
   *
   * @example
   * L.usStatesLayer({
   *   color: '#4a90e2',
   *   popupContent: function(feature) { return feature.properties.name; },
   *   popupAction: 'hover',
   *   data: [{ abbr: 'TX', color: 'red', label: 'The Lone Star State' }]
   * }).addTo(map);
   */
  L.UsStatesLayer = L.RegionsLayer.extend({

    /**
     * Default options for L.usStatesLayer.
     *
     * color: string|Function (default '#4a90e2')
     *   Fill color for states. Function gets (feature, stateData).
     * borderColor: string|Function (default '#555')
     *   Border color. Function gets (feature, stateData).
     * fillOpacity: number (default 1)
     *   Fill opacity used for all states unless per-state fillOpacity is set.
     * weight: number (default 1)
     *   Border stroke width.
     * labelColor: string|Function (default '#333333')
     *   Label text color. Function gets (feature, stateData).
     * label: null|string|Function (default null)
     *   Label text; null falls back to the state name.
     * popupContent: null|string|Function (default null)
     *   Popup HTML content; null disables popup content.
     * popupAction: 'click'|'hover'|null (default 'click')
     *   Event that opens popups.
     * data: Object|string|null (default null)
     *   State data object or JSON URL. Expected shape: { states: { RI: {...} } }.
     * labelMinZoom: number|null (default 4)
     *   Hide labels below this zoom.
     * labelAbbrBelowZoom: number|null (default 5)
     *   Show abbreviations below this zoom (and above labelMinZoom).
     * geoJsonUrl: string (default 'src/us-states.geojson')
     *   URL to GeoJSON state boundaries.
     */
    options: {
      geoJson: null,
      featureKey: function (feature) {
        var props = feature && feature.properties ? feature.properties : {};
        var fromProps = toUpperSafe(props.STUSPS || props.abbr || props.postal);
        if (fromProps) return fromProps;
        var fromIso = normalizeStateKeyFromIso(props.iso_3166_2);
        if (fromIso) return fromIso;
        return toUpperSafe(feature && feature.id ? feature.id : '');
      },
      color: '#4a90e2',
      borderColor: '#555',
      fillOpacity: 1,
      weight: 1,
      labelColor: '#333333',
      label: null,
      popupContent: null,
      popupAction: 'click',
      data: null,
      labelMinZoom: 4,
      labelAbbrBelowZoom: 5,
      geoJsonUrl: 'src/us-states.geojson'
    },

    initialize: function (options) {
      L.RegionsLayer.prototype.initialize.call(this, options);
      syncStateAliases(this);
    },

    // { states: { RI: {...}, MA: {...}, ... } }
    _indexData: function (input) {
      var normalized = {};

      // No data provided: keep an empty map.
      if (!input) {
        L.RegionsLayer.prototype._indexData.call(this, normalized);
        syncStateAliases(this);
        return;
      }

      if (typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('Invalid data format. Expected an object: { states: { RI: {...} } }.');
      }

      if (!input.states || typeof input.states !== 'object' || Array.isArray(input.states)) {
        throw new Error('Invalid data format. Expected a states map: { states: { RI: {...} } }.');
      }

      var sourceMap = input.states;

      for (var key in sourceMap) {
        if (!Object.prototype.hasOwnProperty.call(sourceMap, key)) continue;
        var value = sourceMap[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          normalized[toUpperSafe(key)] = value;
        }
      }

      // Let the base regions layer own how indexed data is stored.
      L.RegionsLayer.prototype._indexData.call(this, normalized);
      syncStateAliases(this);
    },

    _getStateAbbr: function (feature) {
      return toUpperSafe(this._keyForFeature(feature));
    },

    _getStateName: function (feature) {
      var props = feature && feature.properties ? feature.properties : {};
      return props.name || props.NAME || this._getStateAbbr(feature) || '';
    },

    _labelForFeatureAtZoom: function (feature, sd) {
      var labelText = (sd.label !== undefined && sd.label !== null)
        ? sd.label
        : resolveOption(this.options.label, feature, sd);

      if (labelText === null || labelText === undefined) {
        labelText = this._getStateName(feature);
      }

      if (!labelText || labelText.length === 0 || !this._map) {
        return labelText;
      }

      var zoom = this._map.getZoom();
      var labelMinZoom = this.options.labelMinZoom;
      var labelAbbrBelowZoom = this.options.labelAbbrBelowZoom;

      if (typeof labelMinZoom === 'number' && zoom < labelMinZoom) return '';
      if (typeof labelAbbrBelowZoom === 'number' && zoom < labelAbbrBelowZoom) {
        return this._getStateAbbr(feature) || labelText;
      }

      return labelText;
    },

    _configureFeature: function (feature, layer) {
      var sd = this._dataForFeature(feature);

      var popupContent = (sd.popupContent !== undefined && sd.popupContent !== null)
        ? sd.popupContent
        : resolveOption(this.options.popupContent, feature, sd);

      var popupAction = this.options.popupAction;

      if (popupContent && popupAction) {
        layer.bindPopup(popupContent, { maxWidth: 300 });

        if (popupAction === 'hover') {
          layer.on('mouseover', function (e) {
            this.openPopup(e.latlng);
          });
          layer.on('mouseout', function () {
            this.closePopup();
          });
        }
      }

      this.addLayer(layer);

      // Labels are attached to each shape so clearing the layer also clears
      // any old labels from previous renders.
      var labelText = this._labelForFeatureAtZoom(feature, sd);

      if (labelText && labelText.length > 0) {
        var labelColor = sd.labelColor || resolveOption(this.options.labelColor, feature, sd) || '#333';
        layer.unbindTooltip();
        layer.bindTooltip(
          '<span style="color:' + escapeHtml(labelColor) + '">' + escapeHtml(labelText) + '</span>',
          {
            permanent: true,
            direction: 'center',
            className: 'us-states-label',
            interactive: false,
            opacity: 1
          }
        );
      }
    },

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Replace the per-state data binding and re-render.
    * @param {Object|string} data - State data object or URL to JSON file.
     */
    setData: function (data) {
      L.RegionsLayer.prototype.setData.call(this, data);
      syncStateAliases(this);
    },

    /**
     * Direct access to the current state map.
     * Example: var states = layer.getStates(); states.RI = { color: 'red' }; layer.refresh();
     * @returns {Object}
     */
    getStates: function () {
      return this.getRegions();
    },

    /**
     * Upsert a single state entry.
     * @param {string} abbr - 2-letter state abbreviation.
     * @param {Object} patch - Partial state config.
     */
    setState: function (abbr, patch) {
      this.setRegion(abbr, patch);
      syncStateAliases(this);
    },

    /**
     * Re-render after direct mutations on layer.states / layer.getStates().
     */
    refresh: function () {
      L.RegionsLayer.prototype.refresh.call(this);
    },

    /**
     * Update one or more options and re-render.
    * @param {Object} opts - Option updates.
     */
    setOptions: function (opts) {
      L.RegionsLayer.prototype.setOptions.call(this, opts);
    }
  });

  /**
   * Factory function.
   * @param {Object} options
   * @returns {L.UsStatesLayer}
   */
  L.usStatesLayer = function (options) {
    return new L.UsStatesLayer(options);
  };
}(window.L));
