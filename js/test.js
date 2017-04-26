

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