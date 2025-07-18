import * as L from "leaflet";

declare module "leaflet" {
  function heatLayer(
    latlngs: L.LatLngExpression[],
    options?: any
  ): L.Layer;
}