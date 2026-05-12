var ASS = (function () {
  'use strict';

  function parseEffect(text) {
    var param = text
      .toLowerCase()
      .trim()
      .split(/\s*;\s*/);
    if (param[0] === 'banner') {
      return {
        name: param[0],
        delay: param[1] * 1 || 0,
        leftToRight: param[2] * 1 || 0,
        fadeAwayWidth: param[3] * 1 || 0,
      };
    }
    if (/^scroll\s/.test(param[0])) {
      return {
        name: param[0],
        y1: Math.min(param[1] * 1, param[2] * 1),
        y2: Math.max(param[1] * 1, param[2] * 1),
        delay: param[3] * 1 || 0,
        fadeAwayHeight: param[4] * 1 || 0,
      };
    }
    if (text !== '') {
      return { name: text };
    }
    return null;
  }

  function parseDrawing(text) {
    if (!text) { return []; }
    return text
      .toLowerCase()
      // numbers
      .replace(/([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/g, ' $1 ')
      // commands
      .replace(/([mnlbspc])/g, ' $1 ')
      .trim()
      .replace(/\s+/g, ' ')
      .split(/\s(?=[mnlbspc])/)
      .map(function (cmd) { return (
        cmd.split(' ')
          .filter(function (x, i) { return !(i && isNaN(x * 1)); })
      ); });
  }

  var numTags = [
    'b', 'i', 'u', 's', 'fsp',
    'k', 'K', 'kf', 'ko', 'kt',
    'fe', 'q', 'p', 'pbo', 'a', 'an',
    'fscx', 'fscy', 'fax', 'fay', 'frx', 'fry', 'frz', 'fr',
    'be', 'blur', 'bord', 'xbord', 'ybord', 'shad', 'xshad', 'yshad' ];

  var numRegexs = numTags.map(function (nt) { return ({ name: nt, regex: new RegExp(("^" + nt + "-?\\d")) }); });

  function parseTag(text) {
    var assign;

    var tag = {};
    for (var i = 0; i < numRegexs.length; i++) {
      var ref = numRegexs[i];
      var name = ref.name;
      var regex = ref.regex;
      if (regex.test(text)) {
        tag[name] = text.slice(name.length) * 1;
        return tag;
      }
    }
    if (/^fn/.test(text)) {
      tag.fn = text.slice(2);
    } else if (/^r/.test(text)) {
      tag.r = text.slice(1);
    } else if (/^fs[\d+-]/.test(text)) {
      tag.fs = text.slice(2);
    } else if (/^\d?c&?H?[0-9a-fA-F]+|^\d?c$/.test(text)) {
      var ref$1 = text.match(/^(\d?)c&?H?(\w*)/);
      var num = ref$1[1];
      var color = ref$1[2];
      tag[("c" + (num || 1))] = color && ("000000" + color).slice(-6);
    } else if (/^\da&?H?[0-9a-fA-F]+/.test(text)) {
      var ref$2 = text.match(/^(\d)a&?H?([0-9a-f]+)/i);
      var num$1 = ref$2[1];
      var alpha = ref$2[2];
      tag[("a" + num$1)] = ("00" + alpha).slice(-2);
    } else if (/^alpha&?H?[0-9a-fA-F]+/.test(text)) {
      (assign = text.match(/^alpha&?H?([0-9a-f]+)/i), tag.alpha = assign[1]);
      tag.alpha = ("00" + (tag.alpha)).slice(-2);
    } else if (/^(?:pos|org|move|fad|fade)\([^)]+/.test(text)) {
      var ref$3 = text.match(/^(\w+)\((.*?)\)?$/);
      var key = ref$3[1];
      var value = ref$3[2];
      tag[key] = value
        .trim()
        .split(/\s*,\s*/)
        .map(Number);
    } else if (/^i?clip\([^)]+/.test(text)) {
      var p = text
        .match(/^i?clip\((.*?)\)?$/)[1]
        .trim()
        .split(/\s*,\s*/);
      tag.clip = {
        inverse: /iclip/.test(text),
        scale: 1,
        drawing: null,
        dots: null,
      };
      if (p.length === 1) {
        tag.clip.drawing = parseDrawing(p[0]);
      }
      if (p.length === 2) {
        tag.clip.scale = p[0] * 1;
        tag.clip.drawing = parseDrawing(p[1]);
      }
      if (p.length === 4) {
        tag.clip.dots = p.map(Number);
      }
    } else if (/^t\(/.test(text)) {
      var p$1 = text
        .match(/^t\((.*?)\)?$/)[1]
        .trim()
        .replace(/\\.*/, function (x) { return x.replace(/,/g, '\n'); })
        .split(/\s*,\s*/);
      if (!p$1[0]) { return tag; }
      tag.t = {
        t1: 0,
        t2: 0,
        accel: 1,
        tags: p$1[p$1.length - 1]
          .replace(/\n/g, ',')
          .split('\\')
          .slice(1)
          .map(parseTag),
      };
      if (p$1.length === 2) {
        tag.t.accel = p$1[0] * 1;
      }
      if (p$1.length === 3) {
        tag.t.t1 = p$1[0] * 1;
        tag.t.t2 = p$1[1] * 1;
      }
      if (p$1.length === 4) {
        tag.t.t1 = p$1[0] * 1;
        tag.t.t2 = p$1[1] * 1;
        tag.t.accel = p$1[2] * 1;
      }
    }

    return tag;
  }

  function parseTags(text) {
    var tags = [];
    var depth = 0;
    var str = '';
    // `\b\c` -> `b\c\`
    // `a\b\c` -> `b\c\`
    var transText = text.split('\\').slice(1).concat('').join('\\');
    for (var i = 0; i < transText.length; i++) {
      var x = transText[i];
      if (x === '(') { depth++; }
      if (x === ')') { depth--; }
      if (depth < 0) { depth = 0; }
      if (!depth && x === '\\') {
        if (str) {
          tags.push(str);
        }
        str = '';
      } else {
        str += x;
      }
    }
    return tags.map(parseTag);
  }

  function parseText(text) {
    var pairs = text.split(/{(.*?)}/);
    var parsed = [];
    if (pairs[0].length) {
      parsed.push({ tags: [], text: pairs[0], drawing: [] });
    }
    for (var i = 1; i < pairs.length; i += 2) {
      var tags = parseTags(pairs[i]);
      var isDrawing = tags.reduce(function (v, tag) { return (tag.p === undefined ? v : !!tag.p); }, false);
      parsed.push({
        tags: tags,
        text: isDrawing ? '' : pairs[i + 1],
        drawing: isDrawing ? parseDrawing(pairs[i + 1]) : [],
      });
    }
    return {
      raw: text,
      combined: parsed.map(function (frag) { return frag.text; }).join(''),
      parsed: parsed,
    };
  }

  function parseTime(time) {
    var t = time.split(':');
    return t[0] * 3600 + t[1] * 60 + t[2] * 1;
  }

  function parseDialogue(text, format) {
    var fields = text.split(',');
    if (fields.length > format.length) {
      var textField = fields.slice(format.length - 1).join();
      fields = fields.slice(0, format.length - 1);
      fields.push(textField);
    }

    var dia = {};
    for (var i = 0; i < fields.length; i++) {
      var fmt = format[i];
      var fld = fields[i].trim();
      switch (fmt) {
        case 'Layer':
        case 'MarginL':
        case 'MarginR':
        case 'MarginV':
          dia[fmt] = fld * 1;
          break;
        case 'Start':
        case 'End':
          dia[fmt] = parseTime(fld);
          break;
        case 'Effect':
          dia[fmt] = parseEffect(fld);
          break;
        case 'Text':
          dia[fmt] = parseText(fld);
          break;
        default:
          dia[fmt] = fld;
      }
    }

    return dia;
  }

  var stylesFormat = ['Name', 'Fontname', 'Fontsize', 'PrimaryColour', 'SecondaryColour', 'OutlineColour', 'BackColour', 'Bold', 'Italic', 'Underline', 'StrikeOut', 'ScaleX', 'ScaleY', 'Spacing', 'Angle', 'BorderStyle', 'Outline', 'Shadow', 'Alignment', 'MarginL', 'MarginR', 'MarginV', 'Encoding'];
  var eventsFormat = ['Layer', 'Start', 'End', 'Style', 'Name', 'MarginL', 'MarginR', 'MarginV', 'Effect', 'Text'];

  function parseFormat(text) {
    var fields = stylesFormat.concat(eventsFormat);
    return text.match(/Format\s*:\s*(.*)/i)[1]
      .split(/\s*,\s*/)
      .map(function (field) {
        var caseField = fields.find(function (f) { return f.toLowerCase() === field.toLowerCase(); });
        return caseField || field;
      });
  }

  function parseStyle(text, format) {
    var values = text.match(/Style\s*:\s*(.*)/i)[1].split(/\s*,\s*/);
    return Object.assign.apply(Object, [ {} ].concat( format.map(function (fmt, idx) {
      var obj;

      return (( obj = {}, obj[fmt] = values[idx], obj ));
    }) ));
  }

  function parse(text) {
    var tree = {
      info: {},
      styles: { format: [], style: [] },
      events: { format: [], comment: [], dialogue: [] },
    };
    var lines = text.split(/\r?\n/);
    var state = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^;/.test(line)) { continue; }

      if (/^\[Script Info\]/i.test(line)) { state = 1; }
      else if (/^\[V4\+? Styles\]/i.test(line)) { state = 2; }
      else if (/^\[Events\]/i.test(line)) { state = 3; }
      else if (/^\[.*\]/.test(line)) { state = 0; }

      if (state === 0) { continue; }
      if (state === 1) {
        if (/:/.test(line)) {
          var ref = line.match(/(.*?)\s*:\s*(.*)/);
          var key = ref[1];
          var value = ref[2];
          tree.info[key] = value;
        }
      }
      if (state === 2) {
        if (/^Format\s*:/i.test(line)) {
          tree.styles.format = parseFormat(line);
        }
        if (/^Style\s*:/i.test(line)) {
          tree.styles.style.push(parseStyle(line, tree.styles.format));
        }
      }
      if (state === 3) {
        if (/^Format\s*:/i.test(line)) {
          tree.events.format = parseFormat(line);
        }
        if (/^(?:Comment|Dialogue)\s*:/i.test(line)) {
          var ref$1 = line.match(/^(\w+?)\s*:\s*(.*)/i);
          var key$1 = ref$1[1];
          var value$1 = ref$1[2];
          tree.events[key$1.toLowerCase()].push(parseDialogue(value$1, tree.events.format));
        }
      }
    }

    return tree;
  }

  function createCommand(arr) {
    var cmd = {
      type: null,
      prev: null,
      next: null,
      points: [],
    };
    if (/[mnlbs]/.test(arr[0])) {
      cmd.type = arr[0]
        .toUpperCase()
        .replace('N', 'L')
        .replace('B', 'C');
    }
    for (var len = arr.length - !(arr.length & 1), i = 1; i < len; i += 2) {
      cmd.points.push({ x: arr[i] * 1, y: arr[i + 1] * 1 });
    }
    return cmd;
  }

  function isValid(cmd) {
    if (!cmd.points.length || !cmd.type) {
      return false;
    }
    if (/C|S/.test(cmd.type) && cmd.points.length < 3) {
      return false;
    }
    return true;
  }

  function getViewBox(commands) {
    var ref;

    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    (ref = []).concat.apply(ref, commands.map(function (ref) {
      var points = ref.points;

      return points;
    })).forEach(function (ref) {
      var x = ref.x;
      var y = ref.y;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    return {
      minX: minX,
      minY: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Convert S command to B command
   * Reference from https://github.com/d3/d3/blob/v3.5.17/src/svg/line.js#L259
   * @param  {Array}  points points
   * @param  {String} prev   type of previous command
   * @param  {String} next   type of next command
   * @return {Array}         converted commands
   */
  function s2b(points, prev, next) {
    var results = [];
    var bb1 = [0, 2 / 3, 1 / 3, 0];
    var bb2 = [0, 1 / 3, 2 / 3, 0];
    var bb3 = [0, 1 / 6, 2 / 3, 1 / 6];
    var dot4 = function (a, b) { return (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); };
    var px = [points[points.length - 1].x, points[0].x, points[1].x, points[2].x];
    var py = [points[points.length - 1].y, points[0].y, points[1].y, points[2].y];
    results.push({
      type: prev === 'M' ? 'M' : 'L',
      points: [{ x: dot4(bb3, px), y: dot4(bb3, py) }],
    });
    for (var i = 3; i < points.length; i++) {
      px = [points[i - 3].x, points[i - 2].x, points[i - 1].x, points[i].x];
      py = [points[i - 3].y, points[i - 2].y, points[i - 1].y, points[i].y];
      results.push({
        type: 'C',
        points: [
          { x: dot4(bb1, px), y: dot4(bb1, py) },
          { x: dot4(bb2, px), y: dot4(bb2, py) },
          { x: dot4(bb3, px), y: dot4(bb3, py) } ],
      });
    }
    if (next === 'L' || next === 'C') {
      var last = points[points.length - 1];
      results.push({ type: 'L', points: [{ x: last.x, y: last.y }] });
    }
    return results;
  }

  function toSVGPath(instructions) {
    return instructions.map(function (ref) {
      var type = ref.type;
      var points = ref.points;

      return (
      type + points.map(function (ref) {
        var x = ref.x;
        var y = ref.y;

        return (x + "," + y);
      }).join(',')
    );
    }).join('');
  }

  function compileDrawing(rawCommands) {
    var ref$1;

    var commands = [];
    var i = 0;
    while (i < rawCommands.length) {
      var arr = rawCommands[i];
      var cmd = createCommand(arr);
      if (isValid(cmd)) {
        if (cmd.type === 'S') {
          var ref = (commands[i - 1] || { points: [{ x: 0, y: 0 }] }).points.slice(-1)[0];
          var x = ref.x;
          var y = ref.y;
          cmd.points.unshift({ x: x, y: y });
        }
        if (i) {
          cmd.prev = commands[i - 1].type;
          commands[i - 1].next = cmd.type;
        }
        commands.push(cmd);
        i++;
      } else {
        if (i && commands[i - 1].type === 'S') {
          var additionPoints = {
            p: cmd.points,
            c: commands[i - 1].points.slice(0, 3),
          };
          commands[i - 1].points = commands[i - 1].points.concat(
            (additionPoints[arr[0]] || []).map(function (ref) {
              var x = ref.x;
              var y = ref.y;

              return ({ x: x, y: y });
          })
          );
        }
        rawCommands.splice(i, 1);
      }
    }
    var instructions = (ref$1 = []).concat.apply(
      ref$1, commands.map(function (ref) {
        var type = ref.type;
        var points = ref.points;
        var prev = ref.prev;
        var next = ref.next;

        return (
        type === 'S'
          ? s2b(points, prev, next)
          : { type: type, points: points }
      );
    })
    );

    return Object.assign({ instructions: instructions, d: toSVGPath(instructions) }, getViewBox(commands));
  }

  var tTags = [
    'fs', 'fsp', 'clip',
    'c1', 'c2', 'c3', 'c4', 'a1', 'a2', 'a3', 'a4', 'alpha',
    'fscx', 'fscy', 'fax', 'fay', 'frx', 'fry', 'frz', 'fr',
    'be', 'blur', 'bord', 'xbord', 'ybord', 'shad', 'xshad', 'yshad' ];

  function compileTag(tag, key, presets) {
    var obj, obj$1, obj$2;

    if ( presets === void 0 ) presets = {};
    var value = tag[key];
    if (value === undefined) {
      return null;
    }
    if (key === 'pos' || key === 'org') {
      return value.length === 2 ? ( obj = {}, obj[key] = { x: value[0], y: value[1] }, obj ) : null;
    }
    if (key === 'move') {
      var x1 = value[0];
      var y1 = value[1];
      var x2 = value[2];
      var y2 = value[3];
      var t1 = value[4]; if ( t1 === void 0 ) t1 = 0;
      var t2 = value[5]; if ( t2 === void 0 ) t2 = 0;
      return value.length === 4 || value.length === 6
        ? { move: { x1: x1, y1: y1, x2: x2, y2: y2, t1: t1, t2: t2 } }
        : null;
    }
    if (key === 'fad' || key === 'fade') {
      if (value.length === 2) {
        var t1$1 = value[0];
        var t2$1 = value[1];
        return { fade: { type: 'fad', t1: t1$1, t2: t2$1 } };
      }
      if (value.length === 7) {
        var a1 = value[0];
        var a2 = value[1];
        var a3 = value[2];
        var t1$2 = value[3];
        var t2$2 = value[4];
        var t3 = value[5];
        var t4 = value[6];
        return { fade: { type: 'fade', a1: a1, a2: a2, a3: a3, t1: t1$2, t2: t2$2, t3: t3, t4: t4 } };
      }
      return null;
    }
    if (key === 'clip') {
      var inverse = value.inverse;
      var scale = value.scale;
      var drawing = value.drawing;
      var dots = value.dots;
      if (drawing) {
        return { clip: { inverse: inverse, scale: scale, drawing: compileDrawing(drawing), dots: dots } };
      }
      if (dots) {
        var x1$1 = dots[0];
        var y1$1 = dots[1];
        var x2$1 = dots[2];
        var y2$1 = dots[3];
        return { clip: { inverse: inverse, scale: scale, drawing: drawing, dots: { x1: x1$1, y1: y1$1, x2: x2$1, y2: y2$1 } } };
      }
      return null;
    }
    if (/^[xy]?(bord|shad)$/.test(key)) {
      value = Math.max(value, 0);
    }
    if (key === 'bord') {
      return { xbord: value, ybord: value };
    }
    if (key === 'shad') {
      return { xshad: value, yshad: value };
    }
    if (/^c\d$/.test(key)) {
      return ( obj$1 = {}, obj$1[key] = value || presets[key], obj$1 );
    }
    if (key === 'alpha') {
      return { a1: value, a2: value, a3: value, a4: value };
    }
    if (key === 'fr') {
      return { frz: value };
    }
    if (key === 'fs') {
      return {
        fs: /^\+|-/.test(value)
          ? (value * 1 > -10 ? (1 + value / 10) : 1) * presets.fs
          : value * 1,
      };
    }
    if (key === 'K') {
      return { kf: value };
    }
    if (key === 't') {
      var t1$3 = value.t1;
      var accel = value.accel;
      var tags = value.tags;
      var t2$3 = value.t2 || (presets.end - presets.start) * 1e3;
      var compiledTag = {};
      tags.forEach(function (t) {
        var k = Object.keys(t)[0];
        if (~tTags.indexOf(k) && !(k === 'clip' && !t[k].dots)) {
          Object.assign(compiledTag, compileTag(t, k, presets));
        }
      });
      return { t: { t1: t1$3, t2: t2$3, accel: accel, tag: compiledTag } };
    }
    return ( obj$2 = {}, obj$2[key] = value, obj$2 );
  }

  var a2an = [
    null, 1, 2, 3,
    null, 7, 8, 9,
    null, 4, 5, 6 ];

  var globalTags = ['r', 'a', 'an', 'pos', 'org', 'move', 'fade', 'fad', 'clip'];

  function inheritTag(pTag) {
    return JSON.parse(JSON.stringify(Object.assign({}, pTag, {
      k: undefined,
      kf: undefined,
      ko: undefined,
      kt: undefined,
    })));
  }

  function compileText(ref) {
    var styles = ref.styles;
    var style = ref.style;
    var parsed = ref.parsed;
    var start = ref.start;
    var end = ref.end;

    var alignment;
    var q = { q: styles[style].tag.q };
    var pos;
    var org;
    var move;
    var fade;
    var clip;
    var slices = [];
    var slice = { style: style, fragments: [] };
    var prevTag = {};
    for (var i = 0; i < parsed.length; i++) {
      var ref$1 = parsed[i];
      var tags = ref$1.tags;
      var text = ref$1.text;
      var drawing = ref$1.drawing;
      var reset = (void 0);
      for (var j = 0; j < tags.length; j++) {
        var tag = tags[j];
        reset = tag.r === undefined ? reset : tag.r;
      }
      var fragment = {
        tag: reset === undefined ? inheritTag(prevTag) : {},
        text: text,
        drawing: drawing.length ? compileDrawing(drawing) : null,
      };
      for (var j$1 = 0; j$1 < tags.length; j$1++) {
        var tag$1 = tags[j$1];
        alignment = alignment || a2an[tag$1.a || 0] || tag$1.an;
        q = compileTag(tag$1, 'q') || q;
        if (!move) {
          pos = pos || compileTag(tag$1, 'pos');
        }
        org = org || compileTag(tag$1, 'org');
        if (!pos) {
          move = move || compileTag(tag$1, 'move');
        }
        fade = fade || compileTag(tag$1, 'fade') || compileTag(tag$1, 'fad');
        clip = compileTag(tag$1, 'clip') || clip;
        var key = Object.keys(tag$1)[0];
        if (key && !~globalTags.indexOf(key)) {
          var sliceTag = styles[style].tag;
          var c1 = sliceTag.c1;
          var c2 = sliceTag.c2;
          var c3 = sliceTag.c3;
          var c4 = sliceTag.c4;
          var fs = prevTag.fs || sliceTag.fs;
          var compiledTag = compileTag(tag$1, key, { start: start, end: end, c1: c1, c2: c2, c3: c3, c4: c4, fs: fs });
          if (key === 't') {
            fragment.tag.t = fragment.tag.t || [];
            fragment.tag.t.push(compiledTag.t);
          } else {
            Object.assign(fragment.tag, compiledTag);
          }
        }
      }
      prevTag = fragment.tag;
      if (reset !== undefined) {
        slices.push(slice);
        slice = { style: styles[reset] ? reset : style, fragments: [] };
      }
      if (fragment.text || fragment.drawing) {
        var prev = slice.fragments[slice.fragments.length - 1] || {};
        if (prev.text && fragment.text && !Object.keys(fragment.tag).length) {
          // merge fragment to previous if its tag is empty
          prev.text += fragment.text;
        } else {
          slice.fragments.push(fragment);
        }
      }
    }
    slices.push(slice);

    return Object.assign({ alignment: alignment, slices: slices }, q, pos, org, move, fade, clip);
  }

  function compileDialogues(ref) {
    var styles = ref.styles;
    var dialogues = ref.dialogues;

    var minLayer = Infinity;
    var results = [];
    for (var i = 0; i < dialogues.length; i++) {
      var dia = dialogues[i];
      if (dia.Start >= dia.End) {
        continue;
      }
      if (!styles[dia.Style]) {
        dia.Style = 'Default';
      }
      var stl = styles[dia.Style].style;
      var compiledText = compileText({
        styles: styles,
        style: dia.Style,
        parsed: dia.Text.parsed,
        start: dia.Start,
        end: dia.End,
      });
      var alignment = compiledText.alignment || stl.Alignment;
      minLayer = Math.min(minLayer, dia.Layer);
      results.push(Object.assign({
        layer: dia.Layer,
        start: dia.Start,
        end: dia.End,
        style: dia.Style,
        name: dia.Name,
        // reset style by `\r` will not effect margin and alignment
        margin: {
          left: dia.MarginL || stl.MarginL,
          right: dia.MarginR || stl.MarginR,
          vertical: dia.MarginV || stl.MarginV,
        },
        effect: dia.Effect,
      }, compiledText, { alignment: alignment }));
    }
    for (var i$1 = 0; i$1 < results.length; i$1++) {
      results[i$1].layer -= minLayer;
    }
    return results.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
  }

  // same as Aegisub
  // https://github.com/Aegisub/Aegisub/blob/master/src/ass_style.h
  var DEFAULT_STYLE = {
    Name: 'Default',
    Fontname: 'Arial',
    Fontsize: '20',
    PrimaryColour: '&H00FFFFFF&',
    SecondaryColour: '&H000000FF&',
    OutlineColour: '&H00000000&',
    BackColour: '&H00000000&',
    Bold: '0',
    Italic: '0',
    Underline: '0',
    StrikeOut: '0',
    ScaleX: '100',
    ScaleY: '100',
    Spacing: '0',
    Angle: '0',
    BorderStyle: '1',
    Outline: '2',
    Shadow: '2',
    Alignment: '2',
    MarginL: '10',
    MarginR: '10',
    MarginV: '10',
    Encoding: '1',
  };

  /**
   * @param {String} color
   * @returns {Array} [AA, BBGGRR]
   */
  function parseStyleColor(color) {
    if (/^(&|H|&H)[0-9a-f]{6,}/i.test(color)) {
      var ref = color.match(/&?H?([0-9a-f]{2})?([0-9a-f]{6})/i);
      var a = ref[1];
      var c = ref[2];
      return [a || '00', c];
    }
    var num = parseInt(color, 10);
    if (!isNaN(num)) {
      var min = -2147483648;
      var max = 2147483647;
      if (num < min) {
        return ['00', '000000'];
      }
      var aabbggrr = (min <= num && num <= max)
        ? ("00000000" + ((num < 0 ? num + 4294967296 : num).toString(16))).slice(-8)
        : String(num).slice(0, 8);
      return [aabbggrr.slice(0, 2), aabbggrr.slice(2)];
    }
    return ['00', '000000'];
  }

  function compileStyles(ref) {
    var info = ref.info;
    var style = ref.style;
    var defaultStyle = ref.defaultStyle;

    var result = {};
    var styles = [Object.assign({}, defaultStyle, { Name: 'Default' })].concat(style);
    var loop = function ( i ) {
      var s = Object.assign({}, DEFAULT_STYLE, styles[i]);
      // this behavior is same as Aegisub by black-box testing
      if (/^(\*+)Default$/.test(s.Name)) {
        s.Name = 'Default';
      }
      Object.keys(s).forEach(function (key) {
        if (key !== 'Name' && key !== 'Fontname' && !/Colour/.test(key)) {
          s[key] *= 1;
        }
      });
      var ref$1 = parseStyleColor(s.PrimaryColour);
      var a1 = ref$1[0];
      var c1 = ref$1[1];
      var ref$2 = parseStyleColor(s.SecondaryColour);
      var a2 = ref$2[0];
      var c2 = ref$2[1];
      var ref$3 = parseStyleColor(s.OutlineColour);
      var a3 = ref$3[0];
      var c3 = ref$3[1];
      var ref$4 = parseStyleColor(s.BackColour);
      var a4 = ref$4[0];
      var c4 = ref$4[1];
      var tag = {
        fn: s.Fontname,
        fs: s.Fontsize,
        c1: c1,
        a1: a1,
        c2: c2,
        a2: a2,
        c3: c3,
        a3: a3,
        c4: c4,
        a4: a4,
        b: Math.abs(s.Bold),
        i: Math.abs(s.Italic),
        u: Math.abs(s.Underline),
        s: Math.abs(s.StrikeOut),
        fscx: s.ScaleX,
        fscy: s.ScaleY,
        fsp: s.Spacing,
        frz: s.Angle,
        xbord: s.Outline,
        ybord: s.Outline,
        xshad: s.Shadow,
        yshad: s.Shadow,
        fe: s.Encoding,
        // TODO: [breaking change] remove `q` from style
        q: /^[0-3]$/.test(info.WrapStyle) ? info.WrapStyle * 1 : 2,
      };
      result[s.Name] = { style: s, tag: tag };
    };

    for (var i = 0; i < styles.length; i++) loop( i );
    return result;
  }

  function compile(text, options) {
    if ( options === void 0 ) options = {};

    var tree = parse(text);
    var info = Object.assign(options.defaultInfo || {}, tree.info);
    var styles = compileStyles({
      info: info,
      style: tree.styles.style,
      defaultStyle: options.defaultStyle || {},
    });
    return {
      info: info,
      width: info.PlayResX * 1 || null,
      height: info.PlayResY * 1 || null,
      wrapStyle: /^[0-3]$/.test(info.WrapStyle) ? info.WrapStyle * 1 : 2,
      collisions: info.Collisions || 'Normal',
      styles: styles,
      dialogues: compileDialogues({
        styles: styles,
        dialogues: tree.events.dialogue,
      }),
    };
  }

  // https://github.com/weizhenye/ASS/wiki/Font-Size-in-ASS

  const useTextMetrics = 'fontBoundingBoxAscent' in TextMetrics.prototype;

  // It seems max line-height is 1200px in Firefox.
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
  const unitsPerEm = !useTextMetrics && isFirefox ? 512 : 2048;
  const lineSpacing = Object.create(null);

  const ctx = document.createElement('canvas').getContext('2d');

  const $div = document.createElement('div');
  $div.className = 'ASS-fix-font-size';
  $div.style.fontSize = `${unitsPerEm}px`;
  const $span = document.createElement('span');
  $span.textContent = '0';
  $div.append($span);

  const $fixFontSize = useTextMetrics ? null : $div;

  function getRealFontSize(fn, fs) {
    if (!lineSpacing[fn]) {
      if (useTextMetrics) {
        ctx.font = `${unitsPerEm}px "${fn}"`;
        const tm = ctx.measureText('');
        lineSpacing[fn] = tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent;
      } else {
        $span.style.fontFamily = `"${fn}"`;
        lineSpacing[fn] = $span.clientHeight;
      }
    }
    return fs * unitsPerEm / lineSpacing[fn];
  }

  var GLOBAL_CSS = '.ASS-box{pointer-events:none;font-family:Arial;position:absolute;overflow:hidden}.ASS-dialogue{z-index:0;width:max-content;transform:translate(calc(var(--ass-align-h) * -1), calc(var(--ass-align-v) * -1));font-size:0;position:absolute}.ASS-dialogue span{display:inline-block}.ASS-dialogue [data-text]{color:#fff;font-size:16px;line-height:16px;display:inline-block}.ASS-dialogue [data-is=br]+[data-is=br]{height:calc(var(--ass-scale) * var(--ass-tag-fs) * 1px / 2)}.ASS-dialogue[data-wrap-style="0"],.ASS-dialogue[data-wrap-style="3"]{text-wrap:balance;white-space:pre}.ASS-dialogue[data-wrap-style="1"]{word-break:break-word;white-space:pre-wrap}.ASS-dialogue[data-wrap-style="2"]{word-break:normal;white-space:pre}.ASS-dialogue [data-border-style="1"]{position:relative}.ASS-dialogue [data-border-style="3"]{background-color:var(--ass-border-color);box-shadow:calc(var(--ass-scale-stroke) * var(--ass-tag-xshad) * 1px) calc(var(--ass-scale-stroke) * var(--ass-tag-yshad) * 1px) var(--ass-shadow-color);padding:calc(var(--ass-scale-stroke) * var(--ass-tag-xbord) * 1px) calc(var(--ass-scale-stroke) * var(--ass-tag-ybord) * 1px);filter:blur(calc(var(--ass-scale-stroke) * var(--ass-tag-blur) * 1px));display:inline;position:relative}.ASS-dialogue [data-border-style="3"][data-no-border]{background-color:#0000}.ASS-dialogue [data-rotate]{transform:perspective(312.5px) rotateY(calc(var(--ass-tag-fry) * 1deg)) rotateX(calc(var(--ass-tag-frx) * 1deg)) rotateZ(calc(var(--ass-tag-frz) * -1deg))}.ASS-dialogue [data-rotate][data-text]{transform-style:preserve-3d;word-break:normal;white-space:nowrap}.ASS-dialogue [data-scale],.ASS-dialogue [data-skew]{transform:scale(var(--ass-tag-fscx), var(--ass-tag-fscy)) skew(calc(var(--ass-tag-fax) * 57.2958deg), calc(var(--ass-tag-fay) * 57.2958deg));transform-origin:var(--ass-align-h) var(--ass-align-v);display:inline-block}.ASS-fix-font-size{visibility:hidden;width:0;height:0;font-family:Arial;line-height:normal;position:absolute;overflow:hidden}.ASS-fix-font-size span{position:absolute}.ASS-clip-area{width:100%;height:100%;position:absolute;top:0;left:0}.ASS-effect-area{width:100%;height:fit-content;display:flex;position:absolute;overflow:hidden;mask-composite:intersect}.ASS-effect-area :scope[data-effect=banner]{flex-direction:column;height:100%}.ASS-effect-area .ASS-dialogue{position:static;transform:none}';

  function alpha2opacity(a) {
    return 1 - `0x${a}` / 255;
  }

  function color2rgba(c) {
    const t = c.match(/(\w\w)(\w\w)(\w\w)(\w\w)/);
    const a = alpha2opacity(t[1]);
    const b = +`0x${t[2]}`;
    const g = +`0x${t[3]}`;
    const r = +`0x${t[4]}`;
    return `rgba(${r},${g},${b},${a})`;
  }

  function addGlobalStyle() {
    let $style = document.head.querySelector('#ASS-global-style');
    if (!$style) {
      $style = document.createElement('style');
      $style.type = 'text/css';
      $style.id = 'ASS-global-style';
      $style.append(document.createTextNode(GLOBAL_CSS));
      document.head.append($style);
    }
  }

  function fixFloat(n) {
    return Math.round(n * 1e10) / 1e10;
  }

  function batchAnimate(dia, action) {
    (dia.animations || []).forEach((animation) => {
      animation[action]();
    });
  }

  function encodeText(text, q) {
    return text
      .replace(/\\h/g, ' ')
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, q === 2 ? '\n' : ' ');
  }

  function createDialogue(dialogue, store) {
    const strokeScale = store.sbas ? store.scale : 1;

    const { styles } = store;
    const $div = document.createElement('div');
    $div.className = 'ASS-dialogue';
    $div.dataset.wrapStyle = dialogue.q;

    const df = document.createDocumentFragment();
    const { align, slices } = dialogue;
    $div.style.setProperty('transform', `translate(-${['0%', '50%', '100%'][align.h]}, -${['100%', '50%', '0%'][align.v]})`);

    const animations = [];
    slices.forEach((slice) => {
      const style = styles[slice.style];

      const sliceTag = style.tag;
      const borderStyle = style.style.BorderStyle;
      slice.fragments.forEach((fragment) => {
        const { text, drawing } = fragment;
        const tag = { ...sliceTag, ...fragment.tag };

        let lastWasLineBreak = false;
        encodeText(text, dialogue.q).split('\n').forEach((content, idx) => {
          const $span = document.createElement('span');

          if (drawing) {
            console.warning("Drawings aren't supported yet");
            return;
          }

          if (idx) {
            const br = document.createElement('div');
            br.dataset.is = 'br';
            // Repeated line-breaks require fake/empty line height
            if (lastWasLineBreak) {
              br.style.setProperty('height', `${tag.fs * store.scale}px`);
            }
            df.append(br);
            lastWasLineBreak = true;
          }
          if (!content) return;
          lastWasLineBreak = false;

          $span.textContent = content;
          const el = $span;
          el.dataset.text = content;

          // Generate styling
          let cssText = 'position: relative;';
          cssText += `font-size:${getRealFontSize(tag.fn, tag.fs) * store.scale}px;`;
          cssText += `line-height: ${tag.fs * store.scale}px;`;
          cssText += `letter-spacing: ${tag.fsp * store.scale}px;`;
          cssText += `color:${color2rgba(tag.a1 + tag.c1)};`;
          cssText += `font-family:"${tag.fn}";`;
          cssText += tag.b ? `font-weight:${tag.b === 1 ? 'bold' : tag.b};` : '';
          cssText += tag.i ? 'font-style:italic;' : '';
          cssText += (tag.u || tag.s) ? `text-decoration:${tag.u ? 'underline' : ''} ${tag.s ? 'line-through' : ''};` : '';
          $span.style.cssText += cssText;

          if (borderStyle === 1) {
            // Determine shadow and outline pixels sizes.
            // Outline must be at least 1 if there's any shadow.
            const anyShadow = Math.max(tag.xshad, tag.yshad) > 0;
            const xbord = Math.max(anyShadow > 0 ? 1 : 0, tag.xbord) * 2 * strokeScale;
            const $shadowSpan = anyShadow ? $span.cloneNode(true) : null;
            const $borderSpan = xbord > 0 ? $span.cloneNode(true) : null;
            const $textNode = $span.firstChild;

            if (anyShadow) {
              // eslint-disable-next-line unicorn/prefer-modern-dom-apis
              $span.insertBefore($shadowSpan, $textNode);

              cssText = $shadowSpan.style.cssText;
              cssText += 'position: absolute;top: 0;left: 0;z-index: -1;';
              cssText += `-webkit-text-stroke-width: ${xbord}px;`;
              cssText += `-webkit-text-stroke-color: ${color2rgba(tag.a4 + tag.c4)};`;
              cssText += `transform: translate(${strokeScale * tag.xshad}px, ${strokeScale * tag.yshad}px);`;
              $shadowSpan.style.cssText = cssText;
            }

            if (xbord > 0) {
              // eslint-disable-next-line unicorn/prefer-modern-dom-apis
              $span.insertBefore($borderSpan, $textNode);

              cssText = $borderSpan.style.cssText;
              cssText += 'position: absolute;top: 0;left: 0;z-index: -1;';
              cssText += `-webkit-text-stroke-width: ${xbord}px;`;
              cssText += `-webkit-text-stroke-color: ${color2rgba(tag.a3 + tag.c3)};`;
              $borderSpan.style.cssText = cssText;
            }
          }

          df.append($span);
        });
      });
    });
    $div.append(df);
    return { $div, animations };
  }

  function allocate(dialogue, store) {
    const { video, space, scale } = store;
    const { layer, margin, width, height, alignment, end } = dialogue;
    const stageWidth = store.width - Math.trunc(scale * (margin.left + margin.right));
    const stageHeight = store.height;
    const vertical = Math.trunc(scale * margin.vertical);
    const vct = video.currentTime * 100;
    space[layer] = space[layer] || {
      left: { width: new Uint16Array(stageHeight + 1), end: new Uint32Array(stageHeight + 1) },
      center: { width: new Uint16Array(stageHeight + 1), end: new Uint32Array(stageHeight + 1) },
      right: { width: new Uint16Array(stageHeight + 1), end: new Uint32Array(stageHeight + 1) },
    };
    const channel = space[layer];
    const alignH = ['right', 'left', 'center'][alignment % 3];
    const willCollide = (y) => {
      const lw = channel.left.width[y];
      const cw = channel.center.width[y];
      const rw = channel.right.width[y];
      const le = channel.left.end[y];
      const ce = channel.center.end[y];
      const re = channel.right.end[y];
      return (
        (alignH === 'left' && (
          (le > vct && lw)
          || (ce > vct && cw && 2 * width + cw > stageWidth)
          || (re > vct && rw && width + rw > stageWidth)
        ))
        || (alignH === 'center' && (
          (le > vct && lw && 2 * lw + width > stageWidth)
          || (ce > vct && cw)
          || (re > vct && rw && 2 * rw + width > stageWidth)
        ))
        || (alignH === 'right' && (
          (le > vct && lw && lw + width > stageWidth)
          || (ce > vct && cw && 2 * width + cw > stageWidth)
          || (re > vct && rw)
        ))
      );
    };
    let count = 0;
    let result = 0;
    const find = (y) => {
      count = willCollide(y) ? 0 : count + 1;
      if (count >= height) {
        result = y;
        return true;
      }
      return false;
    };
    if (alignment <= 3) {
      result = stageHeight - vertical - 1;
      for (let i = result; i > vertical; i -= 1) {
        if (find(i)) break;
      }
    } else if (alignment >= 7) {
      result = vertical + 1;
      for (let i = result; i < stageHeight - vertical; i += 1) {
        if (find(i)) break;
      }
    } else {
      result = (stageHeight - height) >> 1;
      for (let i = result; i < stageHeight - vertical; i += 1) {
        if (find(i)) break;
      }
    }
    if (alignment > 3) {
      result -= height - 1;
    }
    for (let i = result; i < result + height; i += 1) {
      channel[alignH].width[i] = width;
      channel[alignH].end[i] = end * 100;
    }
    return result;
  }

  function getPosition(dialogue, store) {
    const { scale } = store;
    const { move, align, width, height, margin, slices } = dialogue;
    let x = 0;
    let y = 0;
    if (dialogue.pos || move) {
      const pos = dialogue.pos || { x: 0, y: 0 };
      const sx = scale * pos.x;
      const sy = scale * pos.y;
      x = [sx, sx - width / 2, sx - width][align.h];
      y = [sy - height, sy - height / 2, sy][align.v];
    } else {
      x = [
        0,
        (store.width - width) / 2,
        store.width - width - scale * margin.right,
      ][align.h];
      const hasT = slices.some((slice) => (
        slice.fragments.some(({ keyframes }) => keyframes?.length)
      ));
      y = hasT
        ? [
          store.height - height - margin.vertical,
          (store.height - height) / 2,
          margin.vertical,
        ][align.v]
        : allocate(dialogue, store);
    }
    return {
      x: x + [0, width / 2, width][align.h],
      y: y + [height, height / 2, 0][align.v],
    };
  }

  function createStyle(dialogue, store) {
    const { layer, align, effect, pos, margin, q } = dialogue;
    let cssText = '';
    if (layer) cssText += `z-index:${layer};`;
    cssText += `text-align:${['left', 'center', 'right'][align.h]};`;
    if (!effect) {
      if (q !== 2) {
        cssText += `max-width:calc(100% - ${store.scale} * ${margin.left + margin.right}px);`;
      }
      if (!pos) {
        if (align.h !== 0) {
          cssText += `padding-right:calc(${store.scale} * ${margin.right}px);`;
        }
        if (align.h !== 2) {
          cssText += `padding-left:calc(${store.scale} * ${margin.left}px);`;
        }
      }
    }
    return cssText;
  }

  function renderer(dialogue, store) {
    const { $div, animations } = createDialogue(dialogue, store);
    Object.assign(dialogue, { $div, animations });
    store.box.append($div);

    const { width } = $div.getBoundingClientRect();
    Object.assign(dialogue, { width });
    $div.style.cssText += createStyle(dialogue, store);

    // height may be changed after createStyle
    const { height } = $div.getBoundingClientRect();
    Object.assign(dialogue, { height });

    const { x, y } = getPosition(dialogue, store);
    Object.assign(dialogue, { x, y });
    $div.style.cssText += `left:${x}px;top:${y}px;`;

    return dialogue;
  }

  /* eslint-disable no-param-reassign */

  function clear(store) {
    const { box } = store;
    while (box.lastChild) {
      box.lastChild.remove();
    }
    store.actives = [];
    store.space = [];
  }

  function framing(store, mediaTime) {
    const { dialogues, actives } = store;
    const vct = fixFloat(mediaTime - store.delay);
    for (let i = actives.length - 1; i >= 0; i -= 1) {
      const dia = actives[i];
      const { end } = dia;
      if (end < vct) {
        dia.$div.remove();
        actives.splice(i, 1);
      }
    }
    while (
      store.index < dialogues.length
      && vct >= dialogues[store.index].start
    ) {
      if (vct < dialogues[store.index].end) {
        const dia = renderer(dialogues[store.index], store);
        (dia.animations || []).forEach((animation) => {
          animation.currentTime = (vct - dia.start) * 1000;
        });
        actives.push(dia);
        if (!store.video.paused) {
          batchAnimate(dia, 'play');
        }
      }
      store.index += 1;
    }
  }

  function createSeek(store) {
    return function seek() {
      clear(store);
      const { video, dialogues } = store;
      const vct = fixFloat(video.currentTime - store.delay);
      store.index = (() => {
        for (let i = 0; i < dialogues.length; i += 1) {
          if (vct < dialogues[i].end) {
            return i;
          }
        }
        return (dialogues.length || 1) - 1;
      })();
      framing(store, video.currentTime);
    };
  }

  function createFrame(video) {
    const useVFC = video.requestVideoFrameCallback;
    return [
      useVFC ? video.requestVideoFrameCallback.bind(video) : requestAnimationFrame,
      useVFC ? video.cancelVideoFrameCallback.bind(video) : cancelAnimationFrame,
    ];
  }

  function createPlay(store) {
    const { video } = store;
    const [requestFrame, cancelFrame] = createFrame(video);
    return function play() {
      const frame = (now, metadata) => {
        framing(store, metadata?.mediaTime || video.currentTime);
        store.requestId = requestFrame(frame);
      };
      cancelFrame(store.requestId);
      store.requestId = requestFrame(frame);
      store.actives.forEach((dia) => {
        batchAnimate(dia, 'play');
      });
    };
  }

  function createPause(store) {
    const [, cancelFrame] = createFrame(store.video);
    return function pause() {
      cancelFrame(store.requestId);
      store.requestId = 0;
      store.actives.forEach((dia) => {
        batchAnimate(dia, 'pause');
      });
    };
  }

  function createResize(that, store) {
    const { video, box, layoutRes } = store;
    return function resize() {
      const cw = video.clientWidth;
      const ch = video.clientHeight;
      const vw = video.videoWidth || cw;
      const vh = video.videoHeight || ch;
      const lw = layoutRes.width || vw;
      const lh = layoutRes.height || vh;
      const sw = store.scriptRes.width;
      const sh = store.scriptRes.height;
      let rw = sw;
      let rh = sh;
      const videoScale = Math.min(cw / lw, ch / lh);
      if (that.resampling === 'video_width') {
        rh = sw / lw * lh;
      }
      if (that.resampling === 'video_height') {
        rw = sh / lh * lw;
      }
      store.scale = Math.min(cw / rw, ch / rh);
      if (that.resampling === 'script_width') {
        store.scale = videoScale * (lw / rw);
      }
      if (that.resampling === 'script_height') {
        store.scale = videoScale * (lh / rh);
      }
      const bw = store.scale * rw;
      const bh = store.scale * rh;
      store.width = bw;
      store.height = bh;
      store.resampledRes = { width: rw, height: rh };

      box.style.cssText = `width:${bw}px;height:${bh}px;top:${(ch - bh) / 2}px;left:${(cw - bw) / 2}px;`;
      box.style.setProperty('--ass-scale', store.scale);
      box.style.setProperty('--ass-scale-stroke', store.sbas ? store.scale : 1);
      const boxScale = (vw / lw) / (vh / lh);
      if (boxScale > 1) {
        box.style.transform = `scaleX(${boxScale})`;
      }
      if (boxScale < 1) {
        box.style.transform = `scaleY(${1 / boxScale})`;
      }

      createSeek(store)();
    };
  }

  /* eslint-disable max-len */

  /**
   * @typedef {Object} ASSOption
   * @property {HTMLElement} [container] The container to display subtitles.
   * Its style should be set with `position: relative` for subtitles will absolute to it.
   * Defaults to `video.parentNode`
   * @property {`${"video" | "script"}_${"width" | "height"}`} [resampling="video_height"]
   * When script resolution(PlayResX and PlayResY) don't match the video resolution, this API defines how it behaves.
   * However, drawings and clips will be always depending on script origin resolution.
   * There are four valid values, we suppose video resolution is 1280x720 and script resolution is 640x480 in following situations:
   * + `video_width`: Script resolution will set to video resolution based on video width. Script resolution will set to 640x360, and scale = 1280 / 640 = 2.
   * + `video_height`(__default__): Script resolution will set to video resolution based on video height. Script resolution will set to 853.33x480, and scale = 720 / 480 = 1.5.
   * + `script_width`: Script resolution will not change but scale is based on script width. So scale = 1280 / 640 = 2. This may causes top and bottom subs disappear from video area.
   * + `script_height`: Script resolution will not change but scale is based on script height. So scale = 720 / 480 = 1.5. Script area will be centered in video area.
   */

  class ASS {
    #store = {
      /** @type {HTMLVideoElement} */
      video: null,
      /** the box to display subtitles */
      box: document.createElement('div'),
      scale: 1,
      width: 0,
      height: 0,
      /** resolution from ASS file, it's PlayResX and PlayResY */
      scriptRes: {},
      /** resolution from ASS file, it's LayoutResX and LayoutResY */
      layoutRes: {},
      /** resolution after resampling */
      resampledRes: {},
      /** current index of dialogues to match currentTime */
      index: 0,
      /** @type {boolean} ScaledBorderAndShadow */
      sbas: true,
      /** @type {import('ass-compiler').CompiledASSStyle} */
      styles: {},
      /** @type {import('ass-compiler').Dialogue[]} */
      dialogues: [],
      /**
       * active dialogues
       * @type {import('ass-compiler').Dialogue[]}
       */
      actives: [],
      /** record dialogues' position */
      space: [],
      requestId: 0,
      delay: 0,
    };

    #play;

    #pause;

    #seek;

    resize;

    /**
     * Initialize an ASS instance
     * @param {string} content ASS content
     * @param {HTMLVideoElement} video The video element to be associated with
     * @param {ASSOption} [option]
     * @returns {ASS}
     * @example
     *
     * HTML:
     * ```html
     * <div id="container" style="position: relative;">
     *   <video
     *     id="video"
     *     src="./example.mp4"
     *     style="position: absolute; width: 100%; height: 100%;"
     *   ></video>
     *   <!-- ASS will be added here -->
     * </div>
     * ```
     *
     * JavaScript:
     * ```js
     * import ASS from 'assjs';
     *
     * const content = await fetch('/path/to/example.ass').then((res) => res.text());
     * const ass = new ASS(content, document.querySelector('#video'), {
     *   container: document.querySelector('#container'),
     * });
     * ```
     */
    constructor(content, video, { container = video.parentNode, resampling } = {}) {
      this.#store.video = video;
      if (!container) throw new Error('Missing container.');

      const { info, width, height, styles, dialogues } = compile(content);
      this.#store.sbas = /yes/i.test(info.ScaledBorderAndShadow);
      this.#store.layoutRes = {
        width: info.LayoutResX * 1 || video.videoWidth || video.clientWidth,
        height: info.LayoutResY * 1 || video.videoHeight || video.clientHeight,
      };
      this.#store.scriptRes = {
        width: width || this.#store.layoutRes.width,
        height: height || this.#store.layoutRes.height,
      };
      this.#store.styles = styles;
      this.#store.dialogues = dialogues.map((dia) => Object.assign(dia, {
        effect: ['banner', 'scroll up', 'scroll down'].includes(dia.effect?.name) ? dia.effect : null,
        align: {
          // 0: left, 1: center, 2: right
          h: (dia.alignment + 2) % 3,
          // 0: bottom, 1: center, 2: top
          v: Math.trunc((dia.alignment - 1) / 3),
        },
      }));

      if ($fixFontSize) {
        container.append($fixFontSize);
      }

      const { box } = this.#store;
      box.className = 'ASS-box';
      container.append(box);

      addGlobalStyle();

      this.#play = createPlay(this.#store);
      this.#pause = createPause(this.#store);
      this.#seek = createSeek(this.#store);
      video.addEventListener('play', this.#play);
      video.addEventListener('pause', this.#pause);
      video.addEventListener('playing', this.#play);
      video.addEventListener('waiting', this.#pause);
      video.addEventListener('seeking', this.#seek);
      // The video might already be playing
      if (!video.paused && !video.ended && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        this.#play();
      }

      this.resize = createResize(this, this.#store);
      this.resize();
      this.resampling = resampling;

      return this;
    }

    /**
     * Destroy the ASS instance
     * @returns {ASS}
     */
    destroy() {
      const { video, box } = this.#store;
      this.#pause();
      clear(this.#store);
      video.removeEventListener('play', this.#play);
      video.removeEventListener('pause', this.#pause);
      video.removeEventListener('playing', this.#play);
      video.removeEventListener('waiting', this.#pause);
      video.removeEventListener('seeking', this.#seek);

      if ($fixFontSize) {
        $fixFontSize.remove();
      }
      box.remove();

      this.#store.styles = {};
      this.#store.dialogues = [];

      return this;
    }

    /**
     * Show subtitles in the container
     * @returns {ASS}
     */
    show() {
      this.#store.box.style.visibility = 'visible';
      return this;
    }

    /**
     * Hide subtitles in the container
     * @returns {ASS}
     */
    hide() {
      this.#store.box.style.visibility = 'hidden';
      return this;
    }

    #resampling = 'video_height';

    /** @type {ASSOption['resampling']} */
    get resampling() {
      return this.#resampling;
    }

    set resampling(r) {
      if (r === this.#resampling) return;
      if (/^(video|script)_(width|height)$/.test(r)) {
        this.#resampling = r;
        this.resize();
      }
    }

    /** @type {number} Subtitle delay in seconds. */
    get delay() {
      return this.#store.delay;
    }

    set delay(d) {
      if (typeof d !== 'number') return;
      this.#store.delay = d;
      this.#seek();
    }
  }

  return ASS;

})();
