/* GG Learning Labs — Hand-rolled inline SVG charts (theme-aware, accessible) */
(function (GGL) {
  'use strict';

  var U = GGL.utils;
  var Charts = {};
  var SERIES = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)', 'var(--viz-6)'];

  function niceMax(max) {
    if (max <= 0) return 10;
    var mag = Math.pow(10, Math.floor(Math.log10(max)));
    var n = Math.ceil(max / mag * 2) / 2 * mag;
    return n === max ? n + mag / 2 : n;
  }

  function svgWrap(inner, w, h, label, cls) {
    return '<svg class="chart ' + (cls || '') + '" viewBox="0 0 ' + w + ' ' + h + '" ' +
           'preserveAspectRatio="none" role="img" aria-label="' + U.esc(label || 'Chart') + '" ' +
           'style="width:100%;height:100%;display:block;overflow:visible">' + inner + '</svg>';
  }

  Charts.line = function (data, opts) {
    opts = opts || {};
    var W = 640, H = opts.height || 240;
    var padL = 38, padR = 12, padT = 14, padB = 26;
    var iw = W - padL - padR, ih = H - padT - padB;
    if (!data || !data.length) return Charts.noData(opts.label);

    var max = niceMax(Math.max.apply(null, data.map(function (d) { return d.value; })));
    var min = opts.zeroBased === false
      ? Math.max(0, Math.min.apply(null, data.map(function (d) { return d.value; })) * 0.85) : 0;
    var range = max - min || 1;
    var x = function (i) { return padL + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw); };
    var y = function (v) { return padT + ih - ((v - min) / range) * ih; };

    var g = '';
    for (var t = 0; t <= 4; t++) {
      var val = min + (range / 4) * t;
      var gy = y(val);
      g += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) +
           '" stroke="var(--viz-grid)" stroke-width="1" shape-rendering="crispEdges"/>' +
           '<text x="' + (padL - 8) + '" y="' + (gy + 3.5).toFixed(1) + '" text-anchor="end" ' +
           'font-size="10" fill="var(--text-subtle)">' + Math.round(val) + (opts.suffix || '') + '</text>';
    }

    var line = data.map(function (d, i) {
      return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d.value).toFixed(1);
    }).join(' ');
    var area = line + ' L' + x(data.length - 1).toFixed(1) + ' ' + (padT + ih) +
               ' L' + x(0).toFixed(1) + ' ' + (padT + ih) + ' Z';
    var gid = U.uid('grad');

    var pts = data.map(function (d, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(d.value).toFixed(1) + '" r="3.5" ' +
             'fill="var(--surface)" stroke="' + (opts.color || SERIES[0]) + '" stroke-width="2">' +
             '<title>' + U.esc(d.label) + ': ' + d.value + (opts.suffix || '') + '</title></circle>';
    }).join('');

    var labels = data.map(function (d, i) {
      if (data.length > 8 && i % 2) return '';
      return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" ' +
             'font-size="10" fill="var(--text-subtle)">' + U.esc(d.label) + '</text>';
    }).join('');

    var inner = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + (opts.color || SERIES[0]) + '" stop-opacity="0.22"/>' +
      '<stop offset="100%" stop-color="' + (opts.color || SERIES[0]) + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' + g +
      (opts.area === false ? '' : '<path d="' + area + '" fill="url(#' + gid + ')"/>') +
      '<path d="' + line + '" fill="none" stroke="' + (opts.color || SERIES[0]) + '" stroke-width="2.5" ' +
      'stroke-linejoin="round" stroke-linecap="round"/>' + pts + labels;

    return '<div class="chart-box" style="height:' + H + 'px">' +
           svgWrap(inner, W, H, opts.label || 'Trend chart') + '</div>';
  };

  Charts.bar = function (data, opts) {
    opts = opts || {};
    var W = 640, H = opts.height || 240;
    var padL = 38, padR = 12, padT = 14, padB = 28;
    var iw = W - padL - padR, ih = H - padT - padB;
    if (!data || !data.length) return Charts.noData(opts.label);

    var max = niceMax(Math.max.apply(null, data.map(function (d) { return d.value; })));
    var slot = iw / data.length;
    var bw = Math.min(opts.barWidth || 30, slot * 0.62);

    var g = '';
    for (var t = 0; t <= 4; t++) {
      var val = (max / 4) * t;
      var gy = padT + ih - (val / max) * ih;
      g += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) +
           '" stroke="var(--viz-grid)" stroke-width="1" shape-rendering="crispEdges"/>' +
           '<text x="' + (padL - 8) + '" y="' + (gy + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" ' +
           'fill="var(--text-subtle)">' + Math.round(val) + (opts.suffix || '') + '</text>';
    }

    var bars = data.map(function (d, i) {
      var h = Math.max(2, (d.value / max) * ih);
      var bx = padL + slot * i + (slot - bw) / 2;
      var by = padT + ih - h;
      return '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + bw.toFixed(1) +
             '" height="' + h.toFixed(1) + '" rx="4" fill="' + (opts.color || SERIES[i % SERIES.length]) +
             '" opacity="0.9"><title>' + U.esc(d.label) + ': ' + d.value + (opts.suffix || '') +
             '</title></rect><text x="' + (bx + bw / 2).toFixed(1) + '" y="' + (H - 9) +
             '" text-anchor="middle" font-size="10" fill="var(--text-subtle)">' + U.esc(d.label) + '</text>';
    }).join('');

    return '<div class="chart-box" style="height:' + H + 'px">' +
           svgWrap(g + bars, W, H, opts.label || 'Bar chart') + '</div>';
  };

  Charts.donut = function (data, opts) {
    opts = opts || {};
    var size = opts.size || 180, stroke = opts.stroke || 26;
    var r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
    if (!data || !data.length) return Charts.noData(opts.label);

    var total = U.sum(data, 'value') || 1;
    var offset = 0;
    var arcs = data.map(function (d, i) {
      var len = (d.value / total) * circ;
      var seg = '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' +
        (d.color || SERIES[i % SERIES.length]) + '" stroke-width="' + stroke + '" ' +
        'stroke-dasharray="' + (len - 2).toFixed(2) + ' ' + (circ - len + 2).toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-offset).toFixed(2) + '" stroke-linecap="butt" ' +
        'transform="rotate(-90 ' + c + ' ' + c + ')"><title>' + U.esc(d.label) + ': ' + d.value +
        ' (' + Math.round((d.value / total) * 100) + '%)</title></circle>';
      offset += len;
      return seg;
    }).join('');

    var centre = opts.centreValue !== undefined
      ? '<text x="' + c + '" y="' + (c - 2) + '" text-anchor="middle" font-size="26" font-weight="700" ' +
        'fill="var(--text)">' + U.esc(opts.centreValue) + '</text>' +
        '<text x="' + c + '" y="' + (c + 16) + '" text-anchor="middle" font-size="11" ' +
        'fill="var(--text-muted)">' + U.esc(opts.centreLabel || '') + '</text>' : '';

    var legend = opts.legend === false ? '' :
      '<ul class="chart-legend">' + data.map(function (d, i) {
        return '<li><i style="background:' + (d.color || SERIES[i % SERIES.length]) + '"></i>' +
               '<span class="lbl">' + U.esc(d.label) + '</span>' +
               '<span class="val">' + Math.round((d.value / total) * 100) + '%</span></li>';
      }).join('') + '</ul>';

    return '<div class="chart-donut"><svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size +
      '" height="' + size + '" role="img" aria-label="' + U.esc(opts.label || 'Distribution chart') + '">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--viz-grid)" ' +
      'stroke-width="' + stroke + '"/>' + arcs + centre + '</svg>' + legend + '</div>';
  };

  Charts.hbars = function (data, opts) {
    opts = opts || {};
    if (!data || !data.length) return Charts.noData(opts.label);
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    return '<ul class="hbars">' + data.map(function (d, i) {
      return '<li><span class="hb-label truncate" title="' + U.esc(d.label) + '">' + U.esc(d.label) + '</span>' +
        '<span class="hb-track"><span class="hb-fill" style="width:' + ((d.value / max) * 100).toFixed(1) +
        '%;background:' + (d.color || SERIES[i % SERIES.length]) + '"></span></span>' +
        '<span class="hb-value">' + U.esc(d.value) + (opts.suffix || '') + '</span></li>';
    }).join('') + '</ul>';
  };

  Charts.gauge = function (value, opts) {
    opts = opts || {};
    var size = opts.size || 150, stroke = 14;
    var r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
    var v = Math.max(0, Math.min(100, Number(value) || 0));
    var tone = v >= 80 ? 'var(--viz-5)' : v >= 55 ? 'var(--viz-1)' : v >= 35 ? 'var(--viz-3)' : 'var(--viz-6)';

    return '<div class="chart-gauge"><svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size +
      '" height="' + size + '" role="img" aria-label="' + U.esc(opts.label || 'Score') + ': ' + v + ' percent">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--viz-grid)" ' +
      'stroke-width="' + stroke + '"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + (opts.color || tone) +
      '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' +
      ((v / 100) * circ).toFixed(2) + ' ' + circ + '" transform="rotate(-90 ' + c + ' ' + c + ')"/>' +
      '<text x="' + c + '" y="' + (c + 2) + '" text-anchor="middle" font-size="28" font-weight="700" ' +
      'fill="var(--text)">' + v + '</text>' +
      '<text x="' + c + '" y="' + (c + 20) + '" text-anchor="middle" font-size="10" ' +
      'fill="var(--text-muted)">' + U.esc(opts.unit || '%') + '</text></svg>' +
      (opts.caption ? '<p class="chart-caption">' + U.esc(opts.caption) + '</p>' : '') + '</div>';
  };

  Charts.spark = function (values, opts) {
    opts = opts || {};
    if (!values || values.length < 2) return '';
    var W = 120, H = 32;
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    var range = (max - min) || 1;
    var d = values.map(function (v, i) {
      return (i ? 'L' : 'M') + ((i / (values.length - 1)) * W).toFixed(1) + ' ' +
        (H - ((v - min) / range) * (H - 4) - 2).toFixed(1);
    }).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="' + (opts.color || SERIES[0]) + '" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };

  Charts.noData = function (label) {
    return '<div class="chart-nodata">' + GGL.icon('barChart', 'ico') +
           '<span>No data for ' + U.esc(label || 'this period') + '</span></div>';
  };

  Charts.colors = SERIES;
  GGL.charts = Charts;
})(window.GGL = window.GGL || {});
