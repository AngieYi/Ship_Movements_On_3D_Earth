# Web_Map_ShipData
The automatic identification system (AIS) is an automatic tracking system used on ships and by vessel traffic services (VTS) for identifying and locating vessels by electronically exchanging data with other nearby ships, AIS base stations, and satellites.


##About the earth##

1. draw a sphere and texture mapping a glaxy png to the sphere.

2. draw a sphere and texture mapping a pure cloud png to the sphere.

3. draw a sphere and texture mapping a clear earth map png to the sphere.

4. draw a sphere and texture mapping water/ocean png to the sphere, to highlight the water area, since water is more reflactive than earth.

5. draw a sphere and texture mapping water/ocean png to the sphere, to hightlight the mountain area, it's called bump map.

More details refer to: http://blog.mastermaps.com/2013/09/creating-webgl-earth-with-threejs.html



##About the AIS Data Visualization##

1. Each ship has two points, a start point with longitude and latitude, an end point with longitude and latitude.

2. The point cloud is handled by vertex and fragment shader, each point is a texture image. 

3. The ship path line is visuzlized by some controll points. 
