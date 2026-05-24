### 1. Introduction and Features

The *Global Hydrology Explorer* is a web map project by [reachhydro.org](https://reachhydro.org) to enable convenient/interactive visualization/comparison/download of a number of *big* global hydrology datasets that are traditionally very hard to handle. These datasets can be:

- Millions of river lines and tens of thousands of gauge stations and dams;
- Dynamic data, for example, decades of daily time series over millions of rivers;
- Rasters at global scale, for example, meteorological fields.

Additionally:

- The web map can render the data on top of three basemaps from simplistic to rich, allowing the vector/raster data to be visualized over 3D terrain (topography) and satellite imagery.
- Time series data is plotted in popup windows as interactive plots with a CSV download button provided.
- The entire map view (including the popup) can be **bookmarked** as a URL to be easily shared. Loading the bookmark URL will fully restore the map view (zoom, center, pitch, bearing, projection, basemap, terrain, visibly layers) and popup (time sereis plot for clicked feature).

The web map also includes in the context menu (right-click or long-press) several tools to measure distance between any two points and identify and draw:
- contributing watersheds
- upstream rivers
- downstream flowpath
for a user clicked point on the map.

We hope this web map project can help support global reach scale hydrology research.

### 2. Contributors

[Dr. Ming Pan](mailto:m3pan@ucsd.edu) is the main contributor to this *Global Hydrology Explorer* project and contributors include those [who build reachydro.org](https://www.reachhydro.org/home/contributors) and [who build the map API tools](https://mghydro.com/). Of course, all the map data layers are from publicly available external products and they will be attributed in the next section.

### 3. Source Products

- Hydrography (Vectors)
  - MERIT Basins (v1.0):
    - Vector Rivers/Basins: [https://www.reachhydro.org/home/params/merit-basins](https://www.reachhydro.org/home/params/merit-basins)
    - MERIT Hydro - source of flow directions: [https://global-hydrodynamics.github.io/MERIT_Hydro/](https://global-hydrodynamics.github.io/MERIT_Hydro/)
  - HydroRIVERS (v1.0): [https://www.hydrosheds.org/products/hydrorivers](https://www.hydrosheds.org/products/hydrorivers)
  - GRIT (v0.6): [https://zenodo.org/records/8322965](https://zenodo.org/records/8322965)
  - SWORD Reaches (v17b): [https://www.swordexplorer.com/](https://www.swordexplorer.com/)
- Streamflow (Time Series over Vectors)
  - GRADES-hydroDL (v2.0): [https://www.reachhydro.org/home/records/grades-hydrodl](https://www.reachhydro.org/home/records/grades-hydrodl)
- Gauges and Dams (Vectors)
  - GSHA (v1.1): [https://zenodo.org/records/8090704](https://zenodo.org/records/8090704)
  - GeoDAR (v1.1): [https://zenodo.org/records/6163413](https://zenodo.org/records/6163413)
- Meteorology (Rasters)
  - MSWEP (v2.8) Precipitation: [https://www.gloh2o.org/](https://www.gloh2o.org/)
  - ERA5 Surface Air Temperature: [https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels)

Great appreciation to the creators of these products for making them publicly available!

### 4. Map API Tools in Context Menu

[Dr. Matthew Heberger](https://mghydro.com/) developed the map API tools in the right-click (or long-press on touch screen) context menu to identify contributing watersheds, upstream rivers, and downstream flowpath. These tools and more details are hosted at [https://mghydro.com/](https://mghydro.com/).

### 5. Basemaps

Three basemaps are provided from both open/free and paid proprietary sources.

- Flat (simplistic, least distracting)
  - Positron style from [https://openfreemap.org/](https://openfreemap.org/), which builds on top of data from [https://www.openstreetmap.org/](https://www.openstreetmap.org/)
- Terrain (3D capable, shows topography)
  - Terrain DEM source from [https://www.maptiler.com/](https://www.maptiler.com/) (proprietary)
  - Hillshade source from: [https://www.maptiler.com/](https://www.maptiler.com/) (proprietary)
  - Symbols and labels from: [https://stadiamaps.com/](https://stadiamaps.com/) (proprietary)
- Satellite (3D capable, shows landcover, river channels, etc.)
  - Satellite image source from [https://www.maptiler.com/](https://www.maptiler.com/) (proprietary)
  - Symbols and labels from: [https://stadiamaps.com/](https://stadiamaps.com/) (proprietary)

### 6. Source Code

The source code of this web map project can be found on this [GitHub repo](https://github.com/fallspinach/hydromet-map). Let [Dr. Ming Pan](mailto:m3pan@ucsd.edu) know if you're interested in contributing to (or forking) the source code. As AI coding agents have been heavily used in the development, tips and cautions can help speed things up a lot and avoid known bumps.  
