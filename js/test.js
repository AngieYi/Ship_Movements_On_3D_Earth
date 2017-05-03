


function easeOutQuadratic(t, b, c, d)
{
    t /= d / 2;
    if (t < 1)
        return c / 2 * t * t + b;
    --t;
    return -c / 2 * (t * (t - 2) - 1) + b;
}


// ship Control Points


function generateControlPoints(radius)
{
    for (var i = 0; i < length; ++i)
    {
        var s_lat = vessels[i]['slat'];
        var s_lng = vessels[i]['slng'];
        var e_lat = vessels[i]['elat'];
        var e_lng = vessels[i]['elng'];
        var points = [];
        var num_pnts = 8;
        for (var j = 0; j < num_pnts + 1; j++)
        {
            var t = j / num_pnts;
            var latlng = InnerPointLatLng(s_lat, s_lng, e_lat, e_lng, t);
            var arc_radius = radius + 0.005;
            var posXYZ = latLngToXYZ(latlng.lat, latlng.lng, arc_radius);
            points.push(new THREE.Vector3(posXYZ.x, posXYZ.y, posXYZ.z));
        }
        var spline = new THREE.SplineCurve3(points);
        path_splines.push(spline);
        var arc_length = spline.getLength();
        distance.push(arc_length);
        setShipTimes(i);
    }
}


function shipPathLines()
{
    var lineBufGeom = new THREE.BufferGeometry();
    var ctrl_pnts = 32;
    var vertices = new Float32Array(vessels.length * 6 * ctrl_pnts);
    var colors = new Float32Array(vessels.length * 6 * ctrl_pnts);

    for (var i = 0; i < length; ++i)
    {
        for (var j = 0; j < ctrl_pnts - 1; ++j)
        {
            var s_pos = path_splines[i].getPoint(j / (ctrl_pnts - 1));
            var e_pos = path_splines[i].getPoint((j + 1) / (ctrl_pnts - 1));

            vertices[(i * ctrl_pnts + j) * 6 + 0] = s_pos.x; // start point position
            vertices[(i * ctrl_pnts + j) * 6 + 1] = s_pos.y;
            vertices[(i * ctrl_pnts + j) * 6 + 2] = s_pos.z;

            vertices[(i * ctrl_pnts + j) * 6 + 3] = e_pos.x; // end point position
            vertices[(i * ctrl_pnts + j) * 6 + 4] = e_pos.y;
            vertices[(i * ctrl_pnts + j) * 6 + 5] = e_pos.z;

            colors[(i * ctrl_pnts + j) * 6 + 0] = 0.0; // start point color
            colors[(i * ctrl_pnts + j) * 6 + 1] = 1.0;
            colors[(i * ctrl_pnts + j) * 6 + 2] = 0.5;

            colors[(i * ctrl_pnts + j) * 6 + 3] = 0.0; // end point color
            colors[(i * ctrl_pnts + j) * 6 + 4] = 1.0;
            colors[(i * ctrl_pnts + j) * 6 + 5] = 0.5;
        }
    }


    lineBufGeom.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    lineBufGeom.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    lineBufGeom.computeBoundingSphere();

    var line_material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: ship_track_opacity,
        depthTest: true,
        depthWrite: false,
        linewidth: 0.003
    });

    return new THREE.Line(lineBufGeom, line_material, THREE.LinePieces);
}




// add AmbientLight
scene.add(new THREE.AmbientLight(0x777777));

// add DirectionalLight
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.15); // white,
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);


// The camera determines what we'll see when we render the scene.
scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.z = 1.5;

renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x000000, 1.0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


function createEarth(radius, segments)
{
    return new THREE.Mesh(
        new THREE.SphereGeometry(radius, segments, segments),
        new THREE.MeshPhongMaterial({
            map:         THREE.ImageUtils.loadTexture('images/no_cloud_surface.jpg'),
            bumpMap:     THREE.ImageUtils.loadTexture('images/bump_surface.jpg'),
            bumpScale:   0.005,
            specularMap: THREE.ImageUtils.loadTexture('images/water.png'),
            specular:    new THREE.Color('yellow')
        })
    );
}



function createClouds(radius, segments) {
    return new THREE.Mesh(
        new THREE.SphereGeometry(radius + 0.0025, segments, segments),
        new THREE.MeshPhongMaterial({
            map: THREE.ImageUtils.loadTexture('images/clouds.png'),
            transparent: true
        })
    );
}


controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 0.1;
controls.noZoom = false;
controls.noPan = true;
controls.staticMoving = false;
controls.minDistance = 0.75;
controls.maxDistance = 3.0;



function animate(time){
    requestAnimationFrame(animate);
    if ( ! is_loading ){
        controls.update();
        update_ships();
    }
    stats.update();
    earth.rotation.y += 0.0005;
    clouds.rotation.y += 0.00048;
    ships.rotation.y += 0.0005;
    path_lines.rotation.y += 0.0005;
    renderer.render(scene, camera);
}


point_cloud = new THREE.BufferGeometry();
point_cloud.addAttribute('position', new THREE.BufferAttribute(positions, 3));
point_cloud.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
point_cloud.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
point_cloud.computeBoundingBox();


var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    attributes: attributes,
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    transparent: true
});

THREE.PointCloud(point_cloud, shaderMaterial);


var uniforms = {
    color: {
        type: "c",
        value: new THREE.Color(0xffffff)
    },
    texture: {
        type: "t",
        value: THREE.ImageUtils.loadTexture("images/point.png")
    }
};


function latLngToXYZ(lat, lng, radius)
{
    var LAT = lat * Math.PI / 180;
    var LNG = lng * Math.PI / 180;

    return {
        x: radius * Math.cos(LAT) * Math.cos(LNG),
        y: radius * Math.sin(LAT),
        z: (-1) * radius * Math.cos(LAT) * Math.sin(LNG)
    };
}

function InnerPointLatLng(lat1, lng1, lat2, lng2, offset)
{
    lat1 = lat1 * Math.PI / 180.0;
    lng1 = lng1 * Math.PI / 180.0;
    lat2 = lat2 * Math.PI / 180.0;
    lng2 = lng2 * Math.PI / 180.0;

    d = 2 * Math.asin(Math.sqrt(Math.pow((Math.sin((lat1 - lat2) / 2)), 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)));
    A = Math.sin((1 - offset) * d) / Math.sin(d);
    B = Math.sin(offset * d) / Math.sin(d);

    x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    y = A * Math.sin(lat1) + B * Math.sin(lat2);
    z = (-1) * (A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2));

    lat = Math.atan2(y, Math.sqrt(Math.pow(x, 2) + Math.pow(z, 2))) * 180 / Math.PI;
    lng = (-1) * Math.atan2(z, x) * 180 / Math.PI;

    return {
        lat: lat,
        lng: lng
    };
}