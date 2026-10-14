(function () {
  var canvas = document.getElementById("clouds");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var ctx = canvas.getContext("2d");
  var clouds = [];
  var colors = ["255, 176, 64", "255, 122, 48", "255, 96, 132", "120, 176, 232", "255, 206, 120"];
  var width = 0;
  var height = 0;
  var last = 0;

  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function seed() {
    clouds = [];
    var count = Math.max(8, Math.round(width / 140));
    for (var i = 0; i < count; i += 1) {
      clouds.push({
        x: Math.random() * (width + 400) - 100,
        y: Math.random() * height * 0.58,
        rx: 180 + Math.random() * 320,
        ry: 48 + Math.random() * 90,
        speed: 48 + Math.random() * 36,
        color: colors[i % colors.length],
        alpha: 0.34 + Math.random() * 0.28,
        drift: Math.random() * Math.PI * 2
      });
    }
  }

  function drawCloud(cloud, time) {
    var y = cloud.y + Math.sin(time * 0.15 + cloud.drift) * 8;
    var parts = [
      [0, 0, 1],
      [0.42, -0.18, 0.7],
      [-0.38, 0.08, 0.62]
    ];
    parts.forEach(function (part) {
      var cx = cloud.x + cloud.rx * part[0];
      var cy = y + cloud.ry * part[1];
      var rx = cloud.rx * part[2];
      var ry = cloud.ry * part[2];
      var gradient = ctx.createRadialGradient(cx, cy, rx * 0.1, cx, cy, rx);
      gradient.addColorStop(0, "rgba(" + cloud.color + "," + cloud.alpha + ")");
      gradient.addColorStop(1, "rgba(" + cloud.color + ",0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function frame(now) {
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    ctx.clearRect(0, 0, width, height);
    clouds.forEach(function (cloud) {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -cloud.rx * 2.2) cloud.x = width + cloud.rx;
      drawCloud(cloud, now / 1000);
    });
    window.requestAnimationFrame(frame);
  }

  resize();
  seed();
  window.addEventListener("resize", function () {
    resize();
    seed();
  });
  window.requestAnimationFrame(frame);
})();
