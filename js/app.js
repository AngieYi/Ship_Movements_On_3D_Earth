/**
 * Ships Movement Visualization
 * author: Hongyan Yi yih@oregonstate.edu
 */
var camera, scene, renderer, controls, stats;
var start_ship_idx = 0;
var end_ship_idx = vessels.length;  // how many ship points

var positions, sizes;
var ship_point_cloud_geom;

var ship_path_splines = [];
var ship_distance = [];

var ship_path_lines;
var ship_point_start_time = [];
var ship_point_end_time = [];


var ship_point_speed_changed = false;
var ship_point_speed_scaling = 1.0;
var ship_point_speed_min_scaling = 1.0;
var ship_point_speed_max_scaling = 25.0;

var ship_track_opacity = 0;
var ship_point_size = 0.015;

var sphere = 0;
var ships = 0;
var clouds = 0;
var radius = 0.5;
var segments = 64;
var rotation = 0;
var is_loading = false;

function start_app() {
    init();
    animate();
}

function init() {
    show_loading(true); //at the beginning, loading gif exists

    /* The renderer is responsible to render the scene in the browsers.
     Three.js supports different renderers like WebGL,Canvas,SVG and CSS 3D.
     We use window width and height to allow our earth to fill the browser window.*/
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x000000, 1.0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // The camera determines what we'll see when we render the scene.
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.z = 1.5;

    /* The scene is the container used to store and keep track
    of the objects (earth and stars) we want to render.*/
    scene = new THREE.Scene();

    // add Sphere
    sphere = createSphere(radius, segments); // radius = 0.5; defined at the beginning
    sphere.rotation.y = rotation;
    scene.add(sphere)

    //add Cloud
    clouds = createClouds(radius, segments); // radius is the same as sphere but + 0.001 when define a new sphere
    clouds.rotation.y = rotation;
    scene.add(clouds)

    //add Stars
    var stars = createStars(90, 64);    // radius = 90, much bigger than the sphere
    scene.add(stars);

    // add AmbientLight
    scene.add(new THREE.AmbientLight(0x777777));

    // add DirectionalLight
    var light1 = new THREE.DirectionalLight(0xffffff, 0.15);
    light1.position.set(5, 3, 5);
    scene.add(light1);

    // point is texture mapping, default color is random, vertex shader and fragment shader used here
    ships = createPointCloud();
    ships.rotation.y = rotation;
    scene.add(ships);

    /* set several control_points between each pair of points (start, end)
       transfer longitude and latitude to sphere coordinates x,y,z;
       set the ship_path_splines; ship_distance; and ship times
    */
    generateControlPoints(radius);

    // use ship_path_splines to set the line points, change the line color
    ship_path_lines = shipPathLines();
    ship_path_lines.rotation.y = rotation;
    scene.add(ship_path_lines);

    // after all the above staffs loaded,loading gif stops loading
    show_loading(false);

    // https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
    // src="js/dat.gui.min.js"
    var gui = new dat.GUI();

    gui.add(this, 'ship_point_size', 0.01, 0.2).name("Size").onChange(function(value)
    {
        ship_point_cloud_geom.attributes.size.needsUpdate = true;
        for (var i = start_ship_idx; i < end_ship_idx; ++i)
        {
            sizes[i] = ship_point_size;
        }
    });

    gui.add(this, 'ship_point_speed_scaling', ship_point_speed_min_scaling, ship_point_speed_max_scaling).name("Speed").onFinishChange(function(value)
    {
        ship_point_speed_changed = true;
        update_ships();    // update speed and position?
        ship_point_speed_changed = false;
    });

    gui.add(this, 'ship_track_opacity', 0, 1.0).name("Track Opacity").onChange(function(value) {
        ship_path_lines.material.opacity = value;
    });

    gui.add(this, "handle_about").name("Hongyan Yi| Credits");

    /*
     TrackballControls.js is in the js/controls sub-directory of the examples directory.
     which allows you to rotate, zoom and pan the scene.
     https://github.com/mrdoob/three.js/tree/master/examples/js/controls
     It is part of the examples -- not the library. You must include it explicitly in your project.
     You are free to modify it to your liking.
     You may also want to consider OrbitControls, which is appropriate if your scene has a natural "up" direction.
     */
    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 0.1;
    controls.noZoom = false;
    controls.noPan = true;
    controls.staticMoving = false;
    controls.minDistance = 0.75;  // zoomin level,if two small, might have frame buffer problem
    controls.maxDistance = 3.0;   // zoomin outlevel

    // http://matthewcasperson.blogspot.com/2013/11/threejs-2-getting-started-part-2.html
    // If you click on the stats counter, you will switch between two views.
    // The first displays the frames per second, while the second displays the milliseconds per frame.
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    // Goal: if resize the window after loaded, the whole graph should also be adaptable to the window.
    // This requires camera's aspect ratio, projection matrix and the renderer's size, to be updated if the window is resized.
    // We can specify a function to be run by adding an event listener to the window's resize event.
    window.addEventListener('resize', onWindowResize, false);
}


function createSphere(radius, segments) {
    return new THREE.Mesh(
        /* second and third parameter is the number of width and height segments.
         The sphere is drawn as a polygon mesh, and by adding more segments
         it will be less "blocky" and take more time to render.
         */
        new THREE.SphereGeometry(radius, segments, segments),

        // wrap map data around the sphere.
        /*
         1. This material is used to create shiny materials, and we use it to make the ocean reflective.
         4096 x 2048 px, which was the maximum texture size for the GPU of my computer.
         If you want more detailed textures you need to slice up the Earth.
         2. The result is an apparently bumpy surface rather than a smooth surface although
         the surface of the underlying object is not actually changed.
         You can adjust the bump effect (how much the map affects lighting) with the bumpScale parameter.
         3. I want to make the ocean and lakes reflective by applying a land/water mask.
         This specular map defines the surface's shininess. Only the sea is specular because water reflects
         water more than earth. You can control the specular color with specular parameter.
         */

        new THREE.MeshPhongMaterial({
            map:         THREE.ImageUtils.loadTexture('images/2_no_clouds_4k.jpg'),
            bumpMap:     THREE.ImageUtils.loadTexture('images/elevation.jpg'),
            bumpScale:   0.005,
            specularMap: THREE.ImageUtils.loadTexture('images/water.png'),
            specular:    new THREE.Color('grey')
        })
    );
}

/*
 I couldn't use this JPEG directly in three.js, so I used this technique to make a transparent PNG
 (available on GitHub). I then created a new sphere mesh with a slightly larger radius.
 */
function createClouds(radius, segments) {
    return new THREE.Mesh(
        new THREE.SphereGeometry(radius + 0.001, segments, segments),
        new THREE.MeshPhongMaterial({
            map: THREE.ImageUtils.loadTexture('images/fair_clouds_4k.png'),
            transparent: true
        })
    );
}

/*
 The starfield is created by adding a large sphere around the Earth and project the star texture on
 the backside or inside:
 var stars = createStars(90, 64);
 scene.add(stars);
 */
function createStars(radius, segments) {
    return new THREE.Mesh(
        new THREE.SphereGeometry(radius, segments, segments),
        new THREE.MeshBasicMaterial({
            map:  THREE.ImageUtils.loadTexture('images/galaxy_starfield.png'),
            side: THREE.BackSide,
            specular:    new THREE.Color('grey')
        })
    );
}

//set each ship point start and end time
function setShipTimes(index) {
    var scaling_factor = (ship_point_speed_scaling - ship_point_speed_min_scaling) /
        (ship_point_speed_max_scaling - ship_point_speed_min_scaling);

    var duration = (1-scaling_factor) * ship_distance[index] * 80000;   //ship_distance[index] arc_length for each ship

    var start_time = Date.now() + Math.random() * 5000; // ??? random
    ship_point_start_time[index] = start_time;
    ship_point_end_time[index] = start_time + duration;
}

function xyzFromLatLng(lat, lng, radius) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (360 - lng) * Math.PI / 180;

    return {
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta)
    };
}

function latlngInterPoint(lat1, lng1, lat2, lng2, offset) {
    lat1 = lat1 * Math.PI / 180.0;
    lng1 = lng1 * Math.PI / 180.0;
    lat2 = lat2 * Math.PI / 180.0;
    lng2 = lng2 * Math.PI / 180.0;

    d = 2 * Math.asin(Math.sqrt(Math.pow((Math.sin((lat1 - lat2) / 2)), 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)));
    A = Math.sin((1 - offset) * d) / Math.sin(d);
    B = Math.sin(offset * d) / Math.sin(d);
    x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    z = A * Math.sin(lat1) + B * Math.sin(lat2);
    lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))) * 180 / Math.PI;
    lng = Math.atan2(y, x) * 180 / Math.PI;

    return {
        lat: lat,
        lng: lng
    };
}

// create point cloud using shader
function createPointCloud() {
    ship_point_cloud_geom = new THREE.BufferGeometry();

    num_points = vessels.length;

    positions = new Float32Array(num_points * 3); // positions and sizes are global variables
    sizes = new Float32Array(num_points);
    var colors = new Float32Array(num_points * 3);

    for (var i = 0; i < num_points; i++) {
        positions[3 * i + 0] = 0;
        positions[3 * i + 1] = 0;
        positions[3 * i + 2] = 0;

        // colors[3 * i + 0] = Math.random(); //originally geometry color is random
        // colors[3 * i + 1] = Math.random();
        // colors[3 * i + 2] = Math.random();

        colors[3 * i + 0] = 1.0;    //set geometry color to white
        colors[3 * i + 1] = 1.0;
        colors[3 * i + 2] = 1.0;

        sizes[i] = 0.02;    // can be updated by GUI, ship_point_size variable.
    }

    ship_point_cloud_geom.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    ship_point_cloud_geom.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    ship_point_cloud_geom.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
    ship_point_cloud_geom.computeBoundingBox();



    var uniforms = {
        color: {
            type: "c",
            value: new THREE.Color(0xffffff) // default is white color
        },
        texture: {
            type: "t", // texture picture influences the effect
            value: THREE.ImageUtils.loadTexture("images/point.png")
        }
    };

    var attributes = {
        size: {
            type: 'f',
            value: null
        },
        customColor: {
            type: 'c',
            value: null
        }
    };

    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        attributes: attributes,
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        blending: THREE.AdditiveBlending,//what is blending?difference between additive blending & NormalBlending?
        // blending: THREE.NormalBlending,
        depthTest: true,
        depthWrite: false,
        transparent: true
    });

    return new THREE.PointCloud(ship_point_cloud_geom, shaderMaterial);
}

// ship Control Points
function generateControlPoints(radius) {
    for (var f = start_ship_idx; f < end_ship_idx; ++f)
    {
        var start_lat = vessels[f]['slat'];
        var start_lng = vessels[f]['slng'];
        var end_lat = vessels[f]['elat'];
        var end_lng = vessels[f]['elng'];

        var max_height = Math.random() * 0.003;

        var points = [];
        var spline_control_points = 8;
        for (var i = 0; i < spline_control_points + 1; i++) {
            var arc_angle = i * 180.0 / spline_control_points;
            var arc_radius = radius + (Math.sin(arc_angle * Math.PI / 180.0)) * max_height;
            var latlng = latlngInterPoint(start_lat, start_lng, end_lat, end_lng, i / spline_control_points);

            var pos = xyzFromLatLng(latlng.lat, latlng.lng, arc_radius); // with height
            // var pos = xyzFromLatLng(latlng.lat, latlng.lng, 0.5);           // without height
            points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        }

        //https://threejs.org/docs/api/extras/curves/SplineCurve3.html
        var spline = new THREE.SplineCurve3(points);
        ship_path_splines.push(spline);   //ship_path_splines is a global array

        var arc_length = spline.getLength();
        ship_distance.push(arc_length);   //ship_distance is a global array

        setShipTimes(f); //set each ship point start and end time
    }
}

function shipPathLines() {
    var geometry = new THREE.BufferGeometry();
    var material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: ship_track_opacity,
        depthTest: true,
        depthWrite: false,
        linewidth: 0.003
    });

    var num_control_points = 32;
    var line_positions = new Float32Array(vessels.length * 3 * 2 * num_control_points);
    var colors = new Float32Array(vessels.length * 3 * 2 * num_control_points);

    for (var i = start_ship_idx; i < end_ship_idx; ++i) {
        for (var j = 0; j < num_control_points - 1; ++j) {

            //ship_path_splines are generated in generateControlPoints
            //refer: SplineCurve3.getPoint http://jsfiddle.net/epjfczz8/
            var start_pos = ship_path_splines[i].getPoint(j / (num_control_points - 1));
            var end_pos = ship_path_splines[i].getPoint((j + 1) / (num_control_points - 1));

            line_positions[(i * num_control_points + j) * 6 + 0] = start_pos.x;
            line_positions[(i * num_control_points + j) * 6 + 1] = start_pos.y;
            line_positions[(i * num_control_points + j) * 6 + 2] = start_pos.z;

            line_positions[(i * num_control_points + j) * 6 + 3] = end_pos.x;
            line_positions[(i * num_control_points + j) * 6 + 4] = end_pos.y;
            line_positions[(i * num_control_points + j) * 6 + 5] = end_pos.z;

            // colors[(i * num_control_points + j) * 6 + 0] = 1.0;
            // colors[(i * num_control_points + j) * 6 + 1] = 0.4;
            // colors[(i * num_control_points + j) * 6 + 2] = 1.0;
            //
            // colors[(i * num_control_points + j) * 6 + 3] = 1.0;
            // colors[(i * num_control_points + j) * 6 + 4] = 0.4;// make the line color to pink
            // colors[(i * num_control_points + j) * 6 + 5] = 1.0;

            colors[(i * num_control_points + j) * 6 + 0] = 3.0;
            colors[(i * num_control_points + j) * 6 + 1] = 0.2;
            colors[(i * num_control_points + j) * 6 + 2] = 0.2;

            colors[(i * num_control_points + j) * 6 + 3] = 0.2;
            colors[(i * num_control_points + j) * 6 + 4] = 3.0;
            colors[(i * num_control_points + j) * 6 + 5] = 0.2;
        }
    }

    geometry.addAttribute('position', new THREE.BufferAttribute(line_positions, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();

    return new THREE.Line(geometry, material, THREE.LinePieces);
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function easeOutQuadratic(t, b, c, d) {
    if ((t /= d / 2) < 1)
        return c / 2 * t * t + b;
    return -c / 2 * ((--t) * (t - 2) - 1) + b;
}


//change the speed of the ship
function update_ships() {
    ship_point_cloud_geom.attributes.position.needsUpdate = true;

    for (var i = start_ship_idx; i < end_ship_idx; ++i) {
        if ( Date.now() > ship_point_start_time[i] ) {
            var ease_val = easeOutQuadratic(Date.now() - ship_point_start_time[i], 0, 1, ship_point_end_time[i] - ship_point_start_time[i]);

            if (ease_val < 0 || ship_point_speed_changed) {
                ease_val = 0;
                setShipTimes(i);
            }

            var pos = ship_path_splines[i].getPoint(ease_val);
            positions[3 * i + 0] = pos.x;
            positions[3 * i + 1] = pos.y;
            positions[3 * i + 2] = pos.z;
        }
    }
}

function show_about(visible) {
    if (visible) {
        document.getElementById("about_box_bkg").className = "show";
        document.getElementById("about_box").className = "show";
        document.getElementById("about_box").style.pointerEvents = "all";
    } else {
        document.getElementById("about_box_bkg").className = "hide";
        document.getElementById("about_box").className = "hide";
        document.getElementById("about_box").style.pointerEvents = "none";
    }
}

function show_loading(visible) {
    if (visible) {
        is_loading = true;
        document.getElementById("loading_overlay").className = "show";
        document.getElementById("loading_overlay").style.pointerEvents = "all";
    } else {
        is_loading = false;
        document.getElementById("loading_overlay").className = "hide";
        document.getElementById("loading_overlay").style.pointerEvents = "none";
    }
}

function handle_about() {
    show_about(true);
}

function animate(time) {
    /*
     http://creativejs.com/resources/requestanimationframe/
     So how often is the draw function called?
     That all depends on the frame rate of your browser and computer,but typically it’s 60fps,
     which is cool as your computer’s display typically refreshes at a rate of 60Hz.
     The key difference here is that you are requesting the browser to draw your animation at the next available opportunity,
     not at a predetermined interval. It has also been hinted that browsers could choose to optimize performance
     of requestAnimationFrame based on load, element visibility (being scrolled out of view) and battery status.

     The other beauty of requestAnimationFrame is that it will group all of your animations into a single browser repaint.
     This saves CPU cycles and allows your device to live a longer, happier life.
     So if you use requestAnimationFrame all your animations should become silky smooth,synced with your GPU and hog much less CPU.
     And if you browse to a new tab, the browser will throttle the animation to a crawl, preventing it from taking over your computer whilst you’re busy.
     */

    requestAnimationFrame(animate);

    // loading.gif by default false
    if ( ! is_loading ) {
        controls.update();
        update_ships();
    }

    stats.update();
    sphere.rotation.y += 0.0005;
    clouds.rotation.y += 0.00048;
    ships.rotation.y += 0.0005;
    ship_path_lines.rotation.y += 0.0005;
    renderer.render(scene, camera);
}



function author()
{


}