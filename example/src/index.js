var Hammer = require('hammerjs');
var loadimages = require('loadimages');
var Model = require('./Model');
var toFixed = require('./toFixed');

var codeView = document.getElementById('codeView');
var canvasDomain = document.getElementById('canvasDomain');
var canvasRange = document.getElementById('canvasRange');
var ctxDomain = canvasDomain.getContext('2d');
var ctxRange = canvasRange.getContext('2d');

var drawPoint = function (ctx, px, py, label, color, ghost) {
  var radius = 10;
  ctx.font = '14px bold serif';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, 2 * Math.PI);
  if (ghost) {
    ctx.stroke();
  } else {
    ctx.fill();
  }
  ctx.fillStyle = 'white';
  ctx.fillText(label, px - 4, py + 6);
};


loadimages('blackletter.jpg', function (err, img) {
  var w = 400;
  var iw = w * 0.618;
  var ih = iw;
  var dx = Math.round((w - iw) / 2);
  var dy = dx;
  ctxDomain.drawImage(img, dx, dy, iw, ih);
  ctxRange.drawImage(img, dx, dy, iw, ih);

  var model = new Model();

  var hammerDomain = new Hammer(canvasDomain);
  var hammerRange = new Hammer(canvasRange);

  // Improve usability by tweaking the recognizers
  hammerRange.get('pan').set({ threshold: 5 });

  // Input; point creation
  hammerDomain.on('tap', function (ev) {
    // Transform to canvas coordinates
    var cr = canvasDomain.getBoundingClientRect();
    var x = ev.center.x - cr.left;
    var y = ev.center.y - cr.top;

    model.addToDomain(x, y);
  });

  (function defineHowToPanDomainPoints() {
    var movingPoint = null;
    var x0 = 0;
    var y0 = 0;
    hammerDomain.on('panstart', function (ev) {
      if (movingPoint === null) {
        // Transform to canvas coordinates
        var cr = canvasDomain.getBoundingClientRect();
        var x = ev.center.x - cr.left;
        var y = ev.center.y - cr.top;

        var np = model.findNearestDomainPoint(x, y);
        if (np !== null) {
          // Found
          movingPoint = np;
          x0 = np.x;
          y0 = np.y;
        }
      }
    });

    hammerDomain.on('panmove', function (ev) {
      if (movingPoint !== null) {
        movingPoint.moveTo(x0 + ev.deltaX, y0 + ev.deltaY);
      }
    });

    hammerDomain.on('panend pancancel', function (ev) {
      movingPoint = null;
    });
  }());

  (function defineHowToPanRangePoints() {
    var movingPoint = null;
    var x0 = 0;
    var y0 = 0;
    hammerRange.on('panstart', function (ev) {
      if (movingPoint === null) {
        // Transform to canvas coordinates
        var cr = canvasRange.getBoundingClientRect();
        var x = ev.center.x - cr.left;
        var y = ev.center.y - cr.top;

        var np = model.findNearestRangePoint(x, y);
        if (np !== null) {
          // Found
          movingPoint = np;
          x0 = np.x;
          y0 = np.y;
        }
      }
    });

    hammerRange.on('panmove', function (ev) {
      if (movingPoint !== null) {
        movingPoint.moveTo(x0 + ev.deltaX, y0 + ev.deltaY);
      }
    });

    hammerRange.on('panend pancancel', function (ev) {
      movingPoint = null;
    });
  }());


  // Output: view update
  model.on('update', function () {
    var dom = model.getDomain();
    var ran = model.getRange();
    var tra = model.getTransform();
    var invtra = tra.getInverse();

    // Clear
    ctxDomain.clearRect(0, 0, canvasDomain.width, canvasDomain.height);
    ctxRange.clearRect(0, 0, canvasRange.width, canvasRange.height);

    ctxDomain.drawImage(img, dx, dy, iw, ih);

    // Apply transform
    ctxRange.setTransform(tra.s, tra.r, -tra.r, tra.s, tra.tx, tra.ty);
    ctxRange.drawImage(img, dx, dy, iw, ih);
    ctxRange.resetTransform();

    // Draw points to canvases
    dom.forEach(function (dp) {
      // Transform the domain points to the range
      var dpHat = tra.transform([dp.x, dp.y]);
      drawPoint(ctxRange,  dpHat[0], dpHat[1], dp.label, 'red', true);
      drawPoint(ctxDomain, dp.x,     dp.y,     dp.label, 'red', false);
    });
    ran.forEach(function (rp) {
      // Inverse transform the range points to the domain
      var rpHat = invtra.transform([rp.x, rp.y]);
      drawPoint(ctxDomain, rpHat[0], rpHat[1], rp.label, 'blue', true);
      drawPoint(ctxRange, rp.x, rp.y, rp.label, 'blue', false);
    });

    // Show how the points and transformation looks in code
    var pointToArray = function (p) {
      return [Math.round(p.x), Math.round(p.y)];
    };
    var domparam = dom.map(pointToArray);
    var ranparam = ran.map(pointToArray);
    var m = toFixed(tra.getMatrix(), 2);
    var html = 'var domain = ' + JSON.stringify(domparam) + ';<br>' +
      'var range = ' + JSON.stringify(ranparam) + ';<br>' +
      'var trans = nudged.estimate(domain, range);<br>' +
      'trans.getMatrix();<br>' +
      '-> [[' + m[0][0] + ', ' + m[0][1] + ', ' + m[0][2] + '],<br>' +
      '    [' + m[1][0] + ', ' + m[1][1] + ', ' + m[1][2] + '],<br>' +
      '    [' + m[2][0] + ', ' + m[2][1] + ', ' + m[2][2] + ']]';
    codeView.innerHTML = html;
  });
});
