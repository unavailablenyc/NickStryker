var layer = document.getElementById("bubble-layer");
var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (layer && !reduceMotion.matches) {
  import("https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js")
    .then(function (THREE) {
      start(THREE);
    })
    .catch(function () {
      layer.remove();
    });
}

function start(THREE) {
  var count = 20;
  var avgSpeed = 0.2;
  var baseSize = 1.185;
  var sizeVar = 1.54;
  var speedVar = 0.38;
  var bubbles = [];
  var sparks = [];
  var width = window.innerWidth;
  var height = window.innerHeight;
  var clock = new THREE.Clock();
  var elapsed = 0;
  var frame = 0;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
  camera.position.z = 20;

  var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  layer.appendChild(renderer.domElement);

  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  var sparkPositions = new Float32Array(900);
  var sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeometry.setDrawRange(0, 0);
  var sparkPoints = new THREE.Points(
    sparkGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  scene.add(sparkPoints);

  var vertexShader = [
    "varying vec3 vNormal;",
    "varying vec3 vViewPosition;",
    "void main() {",
    "  vNormal = normalize(normalMatrix * normal);",
    "  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
    "  vViewPosition = -mvPosition.xyz;",
    "  gl_Position = projectionMatrix * mvPosition;",
    "}"
  ].join("\n");

  var fragmentShader = [
    "uniform float time;",
    "uniform float opacityMult;",
    "varying vec3 vNormal;",
    "varying vec3 vViewPosition;",
    "vec3 spectral(float t) {",
    "  vec3 a = vec3(0.5);",
    "  vec3 b = vec3(0.5);",
    "  vec3 c = vec3(1.0);",
    "  vec3 d = vec3(0.00, 0.33, 0.67);",
    "  return a + b * cos(6.28318 * (c * t + d));",
    "}",
    "void main() {",
    "  vec3 normal = normalize(vNormal);",
    "  vec3 viewDir = normalize(vViewPosition);",
    "  float fresnel = pow(1.0 - dot(normal, viewDir), 3.0);",
    "  vec3 iri = spectral(fresnel * 2.0 + normal.y * 0.2 + time * 0.1);",
    "  vec3 reflected = reflect(-viewDir, normal);",
    "  float shine = pow(max(0.0, dot(reflected, normalize(vec3(-1.0, 1.0, 0.5)))), 200.0) * 2.0;",
    "  shine += pow(max(0.0, dot(reflected, normalize(vec3(1.0, -0.5, 0.2)))), 100.0);",
    "  vec3 color = iri * 0.6 + vec3(0.1, 0.15, 0.25) + vec3(shine * 1.5);",
    "  gl_FragColor = vec4(color, (0.15 + fresnel * 0.85) * opacityMult);",
    "}"
  ].join("\n");

  function material(opacity, wire) {
    var shader = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      wireframe: wire,
      uniforms: {
        time: { value: 0 },
        opacityMult: { value: opacity }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });
    shader.userData.baseOpacity = opacity;
    return shader;
  }

  var looks = {
    glassy: material(0.4, false),
    normal: material(1, false),
    opaque: material(3, false),
    outline: material(0.05, true),
    clear: material(0.2, false)
  };
  var lookNames = ["normal", "glassy", "outline", "clear"];
  var coarse = new THREE.SphereGeometry(1, 16, 16);
  var fine = new THREE.SphereGeometry(1, 32, 32);

  function place(mesh, scattered) {
    if (scattered) {
      mesh.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 20 - 10);
      return;
    }
    if (Math.random() < 0.7) {
      mesh.position.set((Math.random() - 0.5) * 60, -40, (Math.random() - 0.5) * 20 - 10);
    } else {
      mesh.position.set(Math.random() < 0.5 ? -35 : 35, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 20 - 10);
    }
  }

  function bind(mesh, look, offset) {
    var shader = looks[look];
    mesh.material = shader;
    mesh.userData.baseOpacity = shader.userData.baseOpacity;
    mesh.userData.currentOpacity = shader.userData.baseOpacity;
    mesh.userData.timeOffset = offset;
    mesh.onBeforeRender = function () {
      shader.uniforms.time.value = elapsed + mesh.userData.timeOffset;
      shader.uniforms.opacityMult.value = mesh.userData.currentOpacity;
    };
  }

  for (var i = 0; i < count; i += 1) {
    var look = Math.random() < 0.05 ? "opaque" : lookNames[Math.floor(Math.random() * lookNames.length)];
    var size = baseSize + Math.random() * sizeVar;
    var mesh = new THREE.Mesh(size > 1.8 ? fine : coarse);
    bind(mesh, look, Math.random() * 100);
    mesh.scale.setScalar(size);
    place(mesh, true);
    var fizzy = Math.random() < 0.2;
    var speed = avgSpeed * Math.max(0.1, 1 + (Math.random() - 0.5) * 2 * speedVar);
    var drift = (Math.random() - 0.5) * 0.02;
    if (fizzy) {
      mesh.scale.multiplyScalar(0.3);
      speed *= 2.5;
      drift *= 2;
    }
    scene.add(mesh);
    bubbles.push({ mesh: mesh, speed: speed, drift: drift, offset: mesh.userData.timeOffset });
  }

  function burst(position, scale) {
    var room = 300 - sparks.length;
    var amount = Math.min(18 + Math.floor(scale * 5), room);
    for (var n = 0; n < amount; n += 1) {
      var upward = n < amount * 0.4;
      sparks.push({
        life: 1,
        decay: 0.03 + Math.random() * 0.05,
        x: position.x,
        y: position.y,
        z: position.z,
        vx: (Math.random() - 0.5) * (upward ? 0.08 : 0.15),
        vy: upward ? -0.1 - Math.random() * 0.15 : (Math.random() - 0.5) * 0.15,
        vz: (Math.random() - 0.5) * (upward ? 0.08 : 0.15)
      });
    }
  }

  function pop(mesh) {
    if (!mesh || mesh.userData.popping) return false;
    mesh.userData.popping = true;
    burst(mesh.position, mesh.scale.x);
    return true;
  }

  function popAt(x, y) {
    pointer.x = (x / width) * 2 - 1;
    pointer.y = -(y / height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(bubbles.map(function (bubble) {
      return bubble.mesh;
    }).filter(function (mesh) {
      return !mesh.userData.popping;
    }));
    if (hits.length) {
      pop(hits[0].object);
      return;
    }
    var closest = null;
    var closestDistance = Infinity;
    bubbles.forEach(function (bubble) {
      if (bubble.mesh.userData.popping) return;
      var projected = bubble.mesh.position.clone().project(camera);
      var sx = (projected.x + 1) / 2 * width;
      var sy = (-projected.y + 1) / 2 * height;
      var dx = x - sx;
      var dy = y - sy;
      var distance = dx * dx + dy * dy;
      if (distance < 54 * 54 && distance < closestDistance) {
        closest = bubble.mesh;
        closestDistance = distance;
      }
    });
    if (closest) pop(closest);
  }

  function tick() {
    if (document.hidden) {
      frame = requestAnimationFrame(tick);
      return;
    }
    var step = Math.min(clock.getDelta(), 0.05) * 60;
    elapsed += step / 60;
    bubbles.forEach(function (bubble) {
      var mesh = bubble.mesh;
      if (mesh.userData.popping) {
        mesh.scale.multiplyScalar(1 + 0.2 * step);
        mesh.userData.currentOpacity *= Math.pow(0.7, step);
        if (mesh.scale.x > 10) {
          mesh.userData.popping = false;
          mesh.userData.currentOpacity = 0;
          place(mesh, false);
          var next = baseSize + Math.random() * sizeVar;
          mesh.scale.setScalar(next);
        }
        return;
      }
      var base = mesh.userData.baseOpacity;
      if (mesh.userData.currentOpacity < base) {
        mesh.userData.currentOpacity = Math.min(base, mesh.userData.currentOpacity + base * 0.012 * step);
      }
      mesh.position.y += bubble.speed * 0.2 * step;
      mesh.position.x += (Math.sin(elapsed * 0.5 + bubble.offset) * 0.02 + bubble.drift) * step;
      if (mesh.position.y > 30) {
        mesh.position.y = -35;
        mesh.position.x = (Math.random() - 0.5) * 60;
      }
    });

    var sparkIndex = 0;
    for (var s = 0; s < sparks.length; s += 1) {
      var spark = sparks[s];
      spark.life -= spark.decay * step;
      if (spark.life <= 0) continue;
      spark.x += spark.vx * step;
      spark.y += spark.vy * step;
      spark.z += spark.vz * step;
      spark.vy -= 0.01 * step;
      sparkPositions[sparkIndex * 3] = spark.x;
      sparkPositions[sparkIndex * 3 + 1] = spark.y;
      sparkPositions[sparkIndex * 3 + 2] = spark.z;
      sparks[sparkIndex] = spark;
      sparkIndex += 1;
    }
    sparks.length = sparkIndex;
    sparkGeometry.setDrawRange(0, sparkIndex);
    sparkGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  window.addEventListener("pointerdown", function (event) {
    if (event.target.closest("a, button, input, textarea, select, label")) return;
    popAt(event.clientX, event.clientY);
  });

  window.addEventListener("resize", function () {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  reduceMotion.addEventListener("change", function () {
    if (!reduceMotion.matches) return;
    cancelAnimationFrame(frame);
    layer.remove();
  });

  tick();
}
